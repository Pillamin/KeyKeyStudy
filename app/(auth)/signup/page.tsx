'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { createWhitelistDoc } from '@/lib/firebase/queries';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastContext';

export default function SignupPage() {
  const router = useRouter();
  const { user, profile, loading, logout } = useAuth();
  const { showToast } = useToast();

  const [role, setRole] = useState<'teacher' | 'student' | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [legalContent, setLegalContent] = useState<{ terms: string, privacy: string } | null>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  
  const fetchLegalContent = async () => {
    try {
      const [termsRes, privacyRes] = await Promise.all([
        fetch('/api/legal?type=terms'),
        fetch('/api/legal?type=privacy')
      ]);
      const termsText = await termsRes.text();
      const privacyText = await privacyRes.text();
      setLegalContent({
        terms: termsText || '이용약관을 불러올 수 없습니다.',
        privacy: privacyText || '개인정보처리방침을 불러올 수 없습니다.'
      });
    } catch (err) {
      console.error('Failed to fetch legal content:', err);
    }
  };

  const openLegalModal = () => {
    if (!legalContent) fetchLegalContent();
    setIsScrolledToBottom(false);
    setIsLegalModalOpen(true);
  };
  
  // Teacher form
  const [authCode, setAuthCode] = useState('');
  const [teacherGrade, setTeacherGrade] = useState('');
  const [teacherClass, setTeacherClass] = useState('');
  const [isHomeroom, setIsHomeroom] = useState<boolean>(true);
  const [subject, setSubject] = useState('');
  const [teacherName, setTeacherName] = useState('');

  // Student form
  const [grade, setGrade] = useState('');
  const [classNum, setClassNum] = useState('');
  const [studentNum, setStudentNum] = useState('');
  const [studentName, setStudentName] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      if (profile) {
        if (profile.role === 'admin') router.push('/admin/users');
        else if (profile.role === 'teacher') router.push('/teacher/dashboard');
        else router.push('/student/dashboard');
      } else {
        if (user.displayName === '최초 로그인 교사 테스트' || user.email === 'new_user@mock.com') {
          setTeacherName('최초 로그인 교사 테스트');
          setStudentName('최초 로그인 학생 테스트');
        } else if (user.displayName) {
          setTeacherName(user.displayName);
          setStudentName(user.displayName);
        }
      }
    }
  }, [user, profile, loading, router]);

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;
    
    setIsSubmitting(true);
    
    try {
      const res = await fetch('/api/verify-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCode }),
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        showToast(data.message || '교사 인증코드가 올바르지 않습니다.', 'error');
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      showToast('인증 처리 중 오류가 발생했습니다.', 'error');
      setIsSubmitting(false);
      return;
    }
    try {
      if (user.email === 'new_user@mock.com') {
        const mockSessionStr = localStorage.getItem('eduapp_mock_session');
        if (mockSessionStr) {
          const mockSession = JSON.parse(mockSessionStr);
          mockSession.profile = {
            role: 'teacher',
            displayName: teacherName,
            email: user.email,
            registeredAt: { seconds: Math.floor(new Date('2026-07-01').getTime() / 1000), nanoseconds: 0 },
            homeroom: isHomeroom ? `${teacherGrade}학년 ${teacherClass}반` : '비담임',
            subject: subject,
          };
          localStorage.setItem('eduapp_mock_session', JSON.stringify(mockSession));
        }
      } else {
        await createWhitelistDoc(user.email, {
          role: 'teacher',
          displayName: teacherName,
          email: user.email,
          registeredAt: new Date() as any,
          homeroom: isHomeroom ? `${teacherGrade}학년 ${teacherClass}반` : '비담임',
          subject: subject,
        });
      }
      showToast('교사로 가입되었습니다.', 'success');
      window.location.href = '/teacher/dashboard';
    } catch (err) {
      console.error(err);
      showToast('가입 중 오류가 발생했습니다.', 'error');
      setIsSubmitting(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email) return;

    setIsSubmitting(true);
    try {
      if (user.email === 'new_user@mock.com') {
        const mockSessionStr = localStorage.getItem('eduapp_mock_session');
        if (mockSessionStr) {
          const mockSession = JSON.parse(mockSessionStr);
          mockSession.profile = {
            role: 'student',
            displayName: studentName,
            email: user.email,
            registeredAt: { seconds: Math.floor(new Date('2026-07-01').getTime() / 1000), nanoseconds: 0 },
            grade,
            classNumber: classNum,
            studentNumber: studentNum,
          };
          localStorage.setItem('eduapp_mock_session', JSON.stringify(mockSession));
        }
      } else {
        await createWhitelistDoc(user.email, {
          role: 'student',
          displayName: studentName,
          email: user.email,
          registeredAt: new Date() as any,
          grade,
          classNumber: classNum,
          studentNumber: studentNum,
        });
      }
      showToast('학생으로 가입되었습니다.', 'success');
      window.location.href = '/student/dashboard';
    } catch (err) {
      console.error(err);
      showToast('가입 중 오류가 발생했습니다.', 'error');
      setIsSubmitting(false);
    }
  };

  if (loading || !user) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{ width: 40, height: 40 }} /></div>;

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-lg)' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)', position: 'relative' }}>
          <button onClick={logout} style={{ position: 'absolute', left: 0, top: 0, background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem' }}>
            ← 뒤로가기
          </button>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-sm)' }}>추가 정보 입력</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>원활한 서비스 이용을 위해 역할을 선택하고 정보를 입력해주세요.</p>
        </div>

        {!role ? (
          <div>
            <div 
              style={{ textAlign: 'left', marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-sm)', background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-default)', cursor: 'pointer' }}
              onClick={(e) => {
                e.preventDefault();
                if (!agreed) openLegalModal();
                else setAgreed(false);
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={agreed} readOnly style={{ width: 16, height: 16, cursor: 'pointer', pointerEvents: 'none' }} />
                <span style={{ color: 'var(--color-text-primary)' }}>
                  <span style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>이용약관</span> 및 <span style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>개인정보처리방침</span>에 동의합니다. (필수)
                </span>
              </label>
            </div>
            
            <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
              <div 
                onClick={() => {
                  if (!agreed) { openLegalModal(); return; }
                  setRole('teacher');
                }}
                className="card" 
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-xl)', transition: 'all 0.2s ease', border: '2px solid transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
              >
                <div style={{ fontSize: '2.5rem' }}>👨‍🏫</div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4, color: 'var(--color-text-primary)' }}>선생님이신가요?</h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>수업을 생성하고 콘텐츠를 배포할 수 있습니다.</p>
                </div>
              </div>
              <div 
                onClick={() => {
                  if (!agreed) { openLegalModal(); return; }
                  setRole('student');
                }}
                className="card" 
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-xl)', transition: 'all 0.2s ease', border: '2px solid transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
              >
                <div style={{ fontSize: '2.5rem' }}>👦</div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4, color: 'var(--color-text-primary)' }}>학생인가요?</h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>선생님이 배포한 콘텐츠를 학습할 수 있습니다.</p>
                </div>
              </div>
            </div>
          </div>
        ) : role === 'teacher' ? (
          <div className="card" style={{ padding: 'var(--spacing-xl)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
            <button onClick={() => setRole(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem' }}>
              ← 다시 선택하기
            </button>
            <div className="fade-in">
              <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>👨‍🏫</div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 'var(--spacing-xs)' }}>추가 정보 입력</h1>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-2xl)' }}>교사 인증이 필요합니다. 담당 학급 정보를 설정해 주세요.</p>
              
              <form onSubmit={handleTeacherSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>교사 인증코드</label>
                  <input type="password" required value={authCode} onChange={e => setAuthCode(e.target.value)} className="input" placeholder="인증코드를 입력하세요 (임시코드 : edu2026)" style={{ width: '100%', padding: '12px' }} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>* 선생님들께만 안내된 코드를 입력해 주세요.</p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>선생님 성함</label>
                  <input type="text" required value={teacherName} onChange={e => setTeacherName(e.target.value)} className="input" style={{ width: '100%', padding: '12px', background: 'var(--color-bg-secondary)' }} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>* 구글 계정에서 연동된 이름입니다. 필요시 수정 가능합니다.</p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>역할</label>
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: isHomeroom ? '2px solid var(--color-primary)' : '1px solid var(--color-border-default)', background: isHomeroom ? 'var(--color-primary-light)' : 'var(--color-bg-primary)', padding: '12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <input type="radio" checked={isHomeroom} onChange={() => setIsHomeroom(true)} style={{ display: 'none' }} />
                      <span style={{ fontWeight: isHomeroom ? 700 : 500, color: isHomeroom ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>담임 교사</span>
                    </label>
                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: !isHomeroom ? '2px solid var(--color-primary)' : '1px solid var(--color-border-default)', background: !isHomeroom ? 'var(--color-primary-light)' : 'var(--color-bg-primary)', padding: '12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <input type="radio" checked={!isHomeroom} onChange={() => setIsHomeroom(false)} style={{ display: 'none' }} />
                      <span style={{ fontWeight: !isHomeroom ? 700 : 500, color: !isHomeroom ? 'var(--color-primary)' : 'var(--color-text-primary)' }}>교과 전담</span>
                    </label>
                  </div>
                </div>
                
                {isHomeroom && (
                  <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>학년</label>
                      <input type="number" required={isHomeroom} min="1" max="6" value={teacherGrade} onChange={e => setTeacherGrade(e.target.value)} className="input" placeholder="3" style={{ width: '100%', padding: '12px' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>반</label>
                      <input type="number" required={isHomeroom} min="1" value={teacherClass} onChange={e => setTeacherClass(e.target.value)} className="input" placeholder="2" style={{ width: '100%', padding: '12px' }} />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>담당 과목 (선택)</label>
                  <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="input" placeholder="예: 과학, 수학" style={{ width: '100%', padding: '12px' }} />
                </div>

                <Button type="submit" variant="primary" loading={isSubmitting} style={{ width: '100%', padding: '16px', fontSize: '1.125rem', fontWeight: 700, borderRadius: 'var(--radius-full)', marginTop: 'var(--spacing-md)' }}>가입 완료</Button>
              </form>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 'var(--spacing-xl)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
            <button onClick={() => setRole(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.875rem' }}>
              ← 다시 선택하기
            </button>
            <div className="fade-in" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}>📝</div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 'var(--spacing-xs)' }}>추가 정보 입력</h1>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-2xl)' }}>반 친구들이 알아볼 수 있게 내 정보를 입력해요.</p>
              
              <form onSubmit={handleStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                  <div style={{ textAlign: 'left' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>학년</label>
                    <input type="number" required min="1" max="6" value={grade} onChange={e => setGrade(e.target.value)} className="input" placeholder="3" style={{ width: '100%', padding: '12px' }} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>반</label>
                    <input type="number" required min="1" value={classNum} onChange={e => setClassNum(e.target.value)} className="input" placeholder="2" style={{ width: '100%', padding: '12px' }} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>번호</label>
                    <input type="number" required min="1" value={studentNum} onChange={e => setStudentNum(e.target.value)} className="input" placeholder="15" style={{ width: '100%', padding: '12px' }} />
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>이름</label>
                  <input type="text" required value={studentName} onChange={e => setStudentName(e.target.value)} className="input" style={{ width: '100%', padding: '12px', background: 'var(--color-bg-secondary)' }} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>* 구글 계정에서 연동된 이름입니다. 필요시 수정 가능합니다.</p>
                </div>

                <Button type="submit" variant="primary" loading={isSubmitting} style={{ width: '100%', padding: '16px', fontSize: '1.125rem', fontWeight: 700, borderRadius: 'var(--radius-full)', background: '#FACC15', color: '#422006', border: 'none', marginTop: 'var(--spacing-md)' }}>수업 입장하기</Button>
              </form>
            </div>
          </div>
        )}
      </div>
      
      {isLegalModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-md)' }}>
          <div style={{ maxWidth: 740, width: '100%', maxHeight: '90vh', background: '#FAFAFA', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ background: 'var(--color-bg-primary)', padding: 'var(--spacing-lg)', borderBottom: '1px solid var(--color-border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>이용약관 및 개인정보처리방침</h2>
              <button onClick={() => setIsLegalModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>&times;</button>
            </div>
            
            <div 
              style={{ padding: 'var(--spacing-xl)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)', background: '#fff', flex: 1 }}
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                if (scrollHeight - scrollTop <= clientHeight + 50) {
                  setIsScrolledToBottom(true);
                }
              }}
            >
              {!legalContent ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>불러오는 중...</div>
              ) : (
                <div className="prose" style={{ maxWidth: '100%', fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--color-text-secondary)' }}>
                  <h3 style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-default)', paddingBottom: 8, marginBottom: 16 }}>이용약관</h3>
                  <div style={{ whiteSpace: 'pre-wrap', marginBottom: 'var(--spacing-2xl)' }}>{legalContent.terms}</div>
                  
                  <h3 style={{ color: 'var(--color-text-primary)', borderBottom: '1px solid var(--color-border-default)', paddingBottom: 8, marginBottom: 16 }}>개인정보처리방침</h3>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{legalContent.privacy}</div>
                </div>
              )}
            </div>
            
            <div style={{ padding: 'var(--spacing-lg) var(--spacing-xl)', borderTop: '1px solid var(--color-border-default)', background: 'var(--color-bg-primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  setAgreed(true);
                  setIsLegalModalOpen(false);
                }} 
                disabled={!isScrolledToBottom}
                style={{ 
                  padding: '16px 48px', fontSize: '1.1rem', fontWeight: 800, border: 'none', borderRadius: 'var(--radius-full)', transition: 'all 0.2s ease',
                  background: isScrolledToBottom ? '#4F46E5' : '#E5E7EB',
                  color: isScrolledToBottom ? '#fff' : '#9CA3AF',
                  boxShadow: isScrolledToBottom ? '0 4px 6px -1px rgba(79, 70, 229, 0.4)' : 'none',
                  cursor: isScrolledToBottom ? 'pointer' : 'not-allowed'
                }}>
                내용을 모두 확인했으며, 이에 동의합니다
              </button>
              {!isScrolledToBottom && <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 500 }}>※ 스크롤을 맨 아래까지 내려야 동의할 수 있습니다.</span>}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
