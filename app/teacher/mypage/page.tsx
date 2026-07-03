'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { updateWhitelistDoc, deleteWhitelistDoc } from '@/lib/firebase/queries';
import Navbar from '@/components/layout/Navbar';

export default function TeacherMyPage() {
  const router = useRouter();
  const { user, profile, loading, logout } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    isHomeroom: false,
    grade: '',
    classNumber: '',
    subject: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (user && profile) {
      let defaultIsHomeroom = false;
      let defaultGrade = '';
      let defaultClass = '';
      
      if (profile.homeroom && profile.homeroom !== '비담임' && profile.homeroom !== '미지정') {
        defaultIsHomeroom = true;
        const match = profile.homeroom.match(/(\d+)학년\s*(\d+)반/);
        if (match) {
          defaultGrade = match[1];
          defaultClass = match[2];
        }
      }

      setEditData({
        displayName: profile.displayName || '',
        isHomeroom: defaultIsHomeroom,
        grade: defaultGrade,
        classNumber: defaultClass,
        subject: profile.subject || ''
      });
    }
  }, [user, profile, loading, router]);

  if (loading || !user) return <div style={{ padding: 20 }}>Loading...</div>;

  const handleSave = async () => {
    if (!user?.email) return;
    setIsSaving(true);
    try {
      let homeroomStr = '비담임';
      if (editData.isHomeroom && editData.grade && editData.classNumber) {
        homeroomStr = `${editData.grade}학년 ${editData.classNumber}반`;
      }
      const updates = {
        displayName: editData.displayName,
        homeroom: homeroomStr,
        subject: editData.subject
      };
      
      if (user.email.endsWith('@mock.com')) {
        const sessionStr = localStorage.getItem('eduapp_mock_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          session.profile = { ...session.profile, ...updates };
          localStorage.setItem('eduapp_mock_session', JSON.stringify(session));
        }
      } else {
        await updateWhitelistDoc(user.email, updates);
      }
      
      setIsEditing(false);
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user?.email) return;
    if (user.email.endsWith('@mock.com')) {
      setAlertMessage('목업(테스트) 계정은 탈퇴(삭제)할 수 없습니다.');
      return;
    }

    if (!confirm('정말로 탈퇴하시겠습니까?\n모든 회원 정보가 삭제되며 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setIsWithdrawing(true);
    try {
      await deleteWhitelistDoc(user.email);
      alert('정상적으로 탈퇴 처리되었습니다.');
      logout();
      router.replace('/');
    } catch (e) {
      console.error(e);
      alert('탈퇴 처리 중 오류가 발생했습니다.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ background: 'var(--color-bg-secondary)', minHeight: '100vh' }}>
      <Navbar roleLabel="교사" dashboardPath="/teacher/dashboard" />

      <main className="container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-xl)', maxWidth: '800px', margin: '0 auto', width: '100%', paddingLeft: 'var(--spacing-lg)', paddingRight: 'var(--spacing-lg)' }}>
        
        <div className="card" style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}>👩‍🏫</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-xs)' }}>
            {profile?.displayName || user.email}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', marginBottom: 'var(--spacing-xl)' }}>
            교사 마이페이지
          </p>

          <div style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--spacing-2xl)', textAlign: 'left', border: '1px solid var(--color-border-default)', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 'var(--spacing-xl)', color: 'var(--color-text-primary)' }}>기본 정보 관리</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--spacing-lg)' }}>
              
              {/* 역할 / 담당 학급 */}
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 8, fontWeight: 700 }}>담당 학급 (담임 여부)</div>
                {isEditing ? (
                  <div style={{ background: 'var(--color-bg-secondary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-default)' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-xl)', marginBottom: editData.isHomeroom ? 'var(--spacing-md)' : 0 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="radio" name="homeroom_toggle" style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} checked={editData.isHomeroom} onChange={() => setEditData({...editData, isHomeroom: true})} />
                        <span style={{ fontSize: '1rem', fontWeight: 600 }}>담임 교사</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input type="radio" name="homeroom_toggle" style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} checked={!editData.isHomeroom} onChange={() => setEditData({...editData, isHomeroom: false})} />
                        <span style={{ fontSize: '1rem', fontWeight: 600 }}>비담임 (교과 전담)</span>
                      </label>
                    </div>
                    {editData.isHomeroom && (
                      <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', transition: 'all 0.2s' }}>
                          <input type="number" min="1" max="6" style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }} placeholder="학년 입력" value={editData.grade} onChange={e => setEditData({...editData, grade: e.target.value})} />
                          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600, marginLeft: '8px', whiteSpace: 'nowrap' }}>학년</span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', transition: 'all 0.2s' }}>
                          <input type="number" min="1" max="20" style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }} placeholder="반 입력" value={editData.classNumber} onChange={e => setEditData({...editData, classNumber: e.target.value})} />
                          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600, marginLeft: '8px', whiteSpace: 'nowrap' }}>반</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg-secondary)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '1.5rem' }}>🏫</span> 
                    {profile?.homeroom && profile.homeroom !== '비담임' && profile.homeroom !== '미지정' ? profile.homeroom : '비담임 (교과 전담)'}
                  </div>
                )}
              </div>

              {/* 담당 과목 */}
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 8, fontWeight: 700 }}>담당 과목</div>
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                    <input type="text" placeholder="예: 과학, 영어" style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }} value={editData.subject} onChange={e => setEditData({...editData, subject: e.target.value})} />
                  </div>
                ) : (
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg-secondary)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '1.5rem' }}>📚</span> 
                    {profile?.subject || '전과목'}
                  </div>
                )}
              </div>

              {/* 이름 */}
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 8, fontWeight: 700 }}>이름</div>
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
                    <input type="text" placeholder="선생님 성함" style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }} value={editData.displayName} onChange={e => setEditData({...editData, displayName: e.target.value})} />
                  </div>
                ) : (
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg-secondary)', padding: '12px 16px', borderRadius: 'var(--radius-md)' }}>
                    <span style={{ fontSize: '1.5rem' }}>👤</span> 
                    {profile?.displayName}
                  </div>
                )}
              </div>

              {/* 이메일 (수정 불가) */}
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 8, fontWeight: 700 }}>이메일 계정 (로그인용)</div>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-secondary)', border: '1px dashed var(--color-border-default)', borderRadius: 'var(--radius-md)', padding: '12px 16px', opacity: 0.7 }}>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.25rem' }}>📧</span> 
                    {user.email}
                  </div>
                </div>
              </div>

            </div>

            <div style={{ marginTop: 'var(--spacing-2xl)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)', borderTop: '1px solid var(--color-border-default)', paddingTop: 'var(--spacing-xl)' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                {isEditing ? (
                  <>
                    <button className="btn btn-secondary" onClick={() => setIsEditing(false)} disabled={isSaving || isWithdrawing} style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: 700, borderRadius: 'var(--radius-full)' }}>취소하기</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={isSaving || isWithdrawing} style={{ padding: '12px 32px', fontSize: '1rem', fontWeight: 700, borderRadius: 'var(--radius-full)' }}>저장완료</button>
                  </>
                ) : (
                  <button className="btn btn-primary" onClick={() => setIsEditing(true)} disabled={isWithdrawing} style={{ padding: '12px 32px', fontSize: '1rem', fontWeight: 700, borderRadius: 'var(--radius-full)' }}>정보 수정하기</button>
                )}
              </div>
              
              {!isEditing && (
                <button 
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                  style={{ 
                    background: 'transparent', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.875rem', fontWeight: 600, 
                    textDecoration: 'underline', cursor: 'pointer', marginTop: 'var(--spacing-sm)' 
                  }}
                >
                  {isWithdrawing ? '탈퇴 처리 중...' : '회원 탈퇴'}
                </button>
              )}
            </div>
          </div>
        </div>

      </main>
      {/* Alert Modal */}
      {alertMessage && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>🚫</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 'var(--spacing-md)' }}>알림</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)', lineHeight: 1.5 }}>
              {alertMessage}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setAlertMessage(null)}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
