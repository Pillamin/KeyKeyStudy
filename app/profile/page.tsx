'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { updateWhitelistDoc } from '@/lib/firebase/queries';
import { useToast } from '@/components/ui/ToastContext';
import { Button } from '@/components/ui/Button';

export default function ProfilePage() {
  const { user, profile, logout, role } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    homeroom: '',
    subject: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setEditData({
        displayName: profile.displayName || '',
        homeroom: profile.homeroom || '',
        subject: profile.subject || ''
      });
    }
  }, [profile]);

  if (!user || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>로딩 중...</p>
      </div>
    );
  }

  const dashboardPath = role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
  const roleLabel = role === 'teacher' ? '선생님' : '학생';

  const handleSave = async () => {
    if (!user.email) return;
    setIsSaving(true);
    try {
      await updateWhitelistDoc(user.email, editData);
      showToast('프로필이 업데이트되었습니다.', 'success');
      setIsEditing(false);
      // Wait a moment before reloading to show the toast, or just reload
      setTimeout(() => window.location.reload(), 500);
    } catch {
      showToast('업데이트 중 오류가 발생했습니다.', 'error');
      setIsSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-secondary)', display: 'flex', flexDirection: 'column' }}>
      <Navbar roleLabel={roleLabel} dashboardPath={dashboardPath} />
      
      <main style={{ flex: 1, padding: 'var(--spacing-xl)', display: 'flex', justifyContent: 'center' }}>
        <div className="card" style={{ width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--spacing-sm)' }}>내 정보</h1>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>가입 시 입력한 기본 정보입니다.</p>
            </div>
            {role === 'teacher' && !isEditing && (
              <Button variant="secondary" onClick={() => setIsEditing(true)}>정보 수정</Button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div style={{ background: 'var(--color-bg-primary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-default)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>이름</div>
              {isEditing ? (
                <input type="text" className="input" value={editData.displayName} onChange={e => setEditData({...editData, displayName: e.target.value})} style={{ width: '100%' }} />
              ) : (
                <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{profile.displayName}</div>
              )}
            </div>
            
            <div style={{ background: 'var(--color-bg-primary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-default)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>이메일 계정</div>
              <div style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--color-text-muted)' }}>{user.email} (수정 불가)</div>
            </div>

            <div style={{ background: 'var(--color-bg-primary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-default)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>역할</div>
              <div style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--color-text-muted)' }}>{roleLabel}</div>
            </div>

            {role === 'teacher' && (
              <>
                <div style={{ background: 'var(--color-bg-primary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-default)' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>소속 (학년/반 또는 비담임)</div>
                  {isEditing ? (
                    <input type="text" className="input" value={editData.homeroom} onChange={e => setEditData({...editData, homeroom: e.target.value})} style={{ width: '100%' }} />
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{profile.homeroom || '-'}</div>
                  )}
                </div>
                <div style={{ background: 'var(--color-bg-primary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-default)' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>담당 과목</div>
                  {isEditing ? (
                    <input type="text" className="input" value={editData.subject} onChange={e => setEditData({...editData, subject: e.target.value})} style={{ width: '100%' }} />
                  ) : (
                    <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>{profile.subject || '-'}</div>
                  )}
                </div>
              </>
            )}

            {role === 'student' && (
              <div style={{ background: 'var(--color-bg-primary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-default)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xs)' }}>학년 / 반 / 번호</div>
                <div style={{ fontWeight: 600, fontSize: '1.125rem' }}>
                  {profile.grade ? `${profile.grade}학년 ` : ''}
                  {profile.classNumber ? `${profile.classNumber}반 ` : ''}
                  {profile.studentNumber ? `${profile.studentNumber}번` : '-'}
                </div>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid var(--color-border-default)', paddingTop: 'var(--spacing-xl)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)' }}>
            {isEditing ? (
              <>
                <Button variant="secondary" onClick={() => setIsEditing(false)}>취소</Button>
                <Button variant="primary" loading={isSaving} onClick={handleSave}>저장하기</Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => router.push(dashboardPath)}>대시보드로 돌아가기</Button>
                <Button variant="ghost" onClick={logout} style={{ color: 'var(--color-error)' }}>로그아웃</Button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
