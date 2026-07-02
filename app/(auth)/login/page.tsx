'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

const aiGuides = [
  { values: ['주도성', '합목적성'], title: '가이드 1. 활용 목적', subtitle: '생성형 AI의 활용 이유와 범위를 스스로 설명할 수 있어야 해요.', desc: '생성형 AI를 활용하는 이유가 진짜 궁금한 것을 탐구하기 위해 보조 도구로 활용하려는 것인지, 숙제를 빨리 끝내려고 쓰는 것인지 스스로에게 먼저 물어봐요. 선생님이 허락하신 범위에서 내가 정한 학습 목표를 달성하기 위해 생성형 AI를 보조 도구로 활용해요.' },
  { values: ['주도성'], title: '가이드 2. 주도적 학습', subtitle: '생성형 AI를 사용하기 전, 내가 아는 것을 정리하고 질문을 설계해요.', desc: '생성형 AI를 사용하기 전에 내 생각을 먼저 적어봐요. 내가 모르는 것이 무엇인지 파악한 다음, 이를 배우기 위해 어떤 도움을 받을지 구체적인 질문(프롬프트)을 만들어요.' },
  { values: ['주도성'], title: '가이드 3. 비판적 검증', subtitle: '생성형 AI의 답변 속 오류나 편향된 시각을 직접 찾아보고 비교해요.', desc: '생성형 AI는 가끔 그럴듯한 거짓말(할루시네이션)을 할 수 있어요. 생성형 AI의 답변을 맹신하지 않고 교과서나 공식 자료를 통해 한 번 더 교차 검증해요. 한쪽으로 치우친 생각은 아닌지 비판적으로 검증하는 습관을 가져요.' },
  { values: ['주도성', '합목적성'], title: '가이드 4. 사고의 확장', subtitle: '단순한 질문을 넘어 좋은 질문을 설계하며 생각의 범위를 넓혀요.', desc: '생성형 AI에게 단순히 정답만을 요구하는 것은 바람직하지 않아요. 생성형 AI 답변의 근거와 다른 관점을 고려하여, "왜 그럴까?", "다른 방법은 없을까?"라고 다각도의 심화 질문을 이어가요. 생성형 AI를 토론 파트너처럼 활용하여 나의 생각을 키워가요.' },
  { values: ['안전성'], title: '가이드 5. 안전과 관계', subtitle: '개인정보를 스스로 지키고, 생성형 AI와 정서적 거리를 유지해요.', desc: '나 또는 타인의 이름, 연락처, 주소, 계정 정보 등을 함부로 생성형 AI에 입력하지 않아요. 이러한 정보가 생성형 AI 학습에 활용될 수 있어요. 속상하거나 힘든 일이 있을 때는 생성형 AI보다 나를 진심으로 이해해 줄 수 있는 가족, 선생님, 친구들과 마음을 나누어요.' },
  { values: ['투명성'], title: '가이드 6. 투명성·윤리', subtitle: '생성형 AI를 활용한 부분과 내 생각을 명확하게 구분해서 밝혀요.', desc: '수업이나 평가 및 과제에서 생성형 AI의 도움을 받았다면, 어떤 도구를 어떤 방식으로 참고하였는지 투명하게 밝혀요. 생성형 AI의 답변을 내가 쓴 것처럼 제출하는 것은 표절(부정행위)임을 명심해요.' },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, profile, role, loading, loginWithGoogle, loginAsMock, loginAsNewMock } = useAuth();
  const [showAIGuide, setShowAIGuide] = useState(true);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);

  const handleAgreeAIGuide = () => {
    setShowAIGuide(false);
  };

  useEffect(() => {
    if (showAIGuide) {
      const el = document.getElementById('ai-guide-content');
      if (el && el.scrollHeight <= el.clientHeight + 10) {
        setIsScrolledToBottom(true);
      }
    }
  }, [showAIGuide]);

  useEffect(() => {
    // Seed mock data
    const seed = async () => {
      try {
        const { getWhitelistDoc, createWhitelistDoc, updateWhitelistDoc } = await import('@/lib/firebase/queries');
        const ts = { seconds: Math.floor(new Date('2026-07-01').getTime() / 1000), nanoseconds: 0 } as any;
        const tNames = ['김철수', '이영희', '박지민'];
        const sNames = ['서준', '도윤', '시우', '지호', '예준', '하준', '주원', '은우', '건우', '선우', '서진', '연우', '하온', '유안', '민준'];
        const lastNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권'];
        
        const seedUsers = [
          { email: 't1@mock.com', role: 'teacher', displayName: `${tNames[0]} 선생님`, homeroom: '1학년 1반', subject: '국어' },
          { email: 't2@mock.com', role: 'teacher', displayName: `${tNames[1]} 선생님`, homeroom: '1학년 2반', subject: '수학' },
          { email: 't3@mock.com', role: 'teacher', displayName: `${tNames[2]} 선생님`, homeroom: '1학년 3반', subject: '영어' },
        ];
        
        let sIdx = 0;
        for (let c = 1; c <= 3; c++) {
          for (let n = 1; n <= 5; n++) {
            const name = lastNames[sIdx % 15] + sNames[sIdx % 15];
            seedUsers.push({ email: `s${c}_${n}@mock.com`, role: 'student', displayName: name, grade: '1', classNumber: `${c}`, studentNumber: `${n}` } as any);
            sIdx++;
          }
        }
        for (const u of seedUsers) {
          if (!(await getWhitelistDoc(u.email))) {
            await createWhitelistDoc(u.email, { ...u, registeredAt: ts } as any);
          } else {
            await updateWhitelistDoc(u.email, { ...u, registeredAt: ts } as any);
          }
        }
      } catch (err) {
        console.error('Mock seeding failed (likely due to Firestore permissions):', err);
      }
    };
    seed();
  }, []);

  useEffect(() => {
    if (!loading && user) {
      if (!profile || !role) {
        // No role assigned -> go to signup onboarding
        router.push('/signup');
      } else {
        if (role === 'admin') router.push('/admin/users');
        else if (role === 'teacher') router.push('/teacher/dashboard');
        else router.push('/student/dashboard');
      }
    }
  }, [user, profile, role, loading, router]);

  return (
    <main style={{ minHeight: '100vh', background: 'var(--color-bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-md)' }}>
      <div style={{ width: '100%', maxWidth: 540 }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-2xl)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 'var(--spacing-md)' }}>⌨️</div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-sm)' }}>KeyKeyStudy</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>교과서 기반 3단계 타자·어휘·퀴즈 학습 서비스</p>
        </div>

        <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-sm)', lineHeight: 1.6 }}>
            원활한 서비스 이용을 위해 로그인해 주세요.
          </p>
          
          <button className="btn btn-primary" onClick={loginWithGoogle} disabled={loading} style={{ padding: '16px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ background: '#fff', borderRadius: '50%', padding: '2px', display: 'inline-flex' }}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width={18} height={18} alt="Google" />
            </span>
            Google 계정으로 로그인
          </button>

          <button className="btn btn-outline" onClick={loginAsNewMock} disabled={loading} style={{ padding: '12px', fontSize: '0.9375rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: '2px dashed var(--color-primary)' }}>
            ✨ 최초 로그인 (가입) 체험하기
          </button>

          <div style={{ marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border-default)' }}>
            <div style={{ display: 'inline-block', background: 'var(--color-primary-light)', color: 'var(--color-primary)', fontWeight: 800, padding: '6px 16px', borderRadius: '100px', fontSize: '0.875rem', marginBottom: 'var(--spacing-md)' }}>✨ 기능 체험용 임시 계정</div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {/* 1-1 */}
              <div style={{ border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-sm)' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 'var(--spacing-xs)', textAlign: 'left', color: 'var(--color-text-primary)' }}>1학년 1반</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '100px' }} onClick={() => loginAsMock('teacher', 't1@mock.com', '김철수 선생님', { homeroom: '1학년 1반' })} disabled={loading}>👨‍🏫 김철수 교사</button>
                  {[{n:1, name:'김서준'}, {n:2, name:'이도윤'}, {n:3, name:'박시우'}, {n:4, name:'최지호'}, {n:5, name:'정예준'}].map(s => (
                    <button key={s.n} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '100px' }} onClick={() => loginAsMock('student', `s1_${s.n}@mock.com`, s.name, { grade: '1', classNumber: '1', studentNumber: `${s.n}` })} disabled={loading}>{s.name}</button>
                  ))}
                </div>
              </div>
              {/* 1-2 */}
              <div style={{ border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-sm)' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 'var(--spacing-xs)', textAlign: 'left', color: 'var(--color-text-primary)' }}>1학년 2반</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '100px' }} onClick={() => loginAsMock('teacher', 't2@mock.com', '이영희 선생님', { homeroom: '1학년 2반' })} disabled={loading}>👨‍🏫 이영희 교사</button>
                  {[{n:1, name:'강하준'}, {n:2, name:'조주원'}, {n:3, name:'윤은우'}, {n:4, name:'장건우'}, {n:5, name:'임선우'}].map(s => (
                    <button key={s.n} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '100px' }} onClick={() => loginAsMock('student', `s2_${s.n}@mock.com`, s.name, { grade: '1', classNumber: '2', studentNumber: `${s.n}` })} disabled={loading}>{s.name}</button>
                  ))}
                </div>
              </div>
              {/* 1-3 */}
              <div style={{ border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-sm)' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 'var(--spacing-xs)', textAlign: 'left', color: 'var(--color-text-primary)' }}>1학년 3반</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '100px' }} onClick={() => loginAsMock('teacher', 't3@mock.com', '박지민 선생님', { homeroom: '1학년 3반' })} disabled={loading}>👨‍🏫 박지민 교사</button>
                  {[{n:1, name:'한서진'}, {n:2, name:'오연우'}, {n:3, name:'서하온'}, {n:4, name:'신유안'}, {n:5, name:'권민준'}].map(s => (
                    <button key={s.n} className="btn btn-outline" style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '100px' }} onClick={() => loginAsMock('student', `s3_${s.n}@mock.com`, s.name, { grade: '1', classNumber: '3', studentNumber: `${s.n}` })} disabled={loading}>{s.name}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAIGuide && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-md)' }}>
          <div style={{ maxWidth: 740, width: '100%', maxHeight: '90vh', background: '#FAFAFA', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ background: 'linear-gradient(135deg, #4F46E5, #3730A3)', padding: 'var(--spacing-lg)', color: '#fff', textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>생성형 AI 사용 핵심 가이드</h2>
              <p style={{ opacity: 0.9, marginTop: '8px', fontSize: '0.9rem', fontWeight: 500 }}>올바른 AI 활용을 위해 아래 6가지 핵심 가이드를 확인하고 동의해 주세요.</p>
            </div>
            
            <div 
              id="ai-guide-content"
              style={{ padding: 'var(--spacing-xl)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)', background: '#FAFAFA' }}
              onScroll={(e) => {
                const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                if (scrollHeight - scrollTop <= clientHeight + 50) {
                  setIsScrolledToBottom(true);
                }
              }}
            >
              {aiGuides.map((g, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 'var(--spacing-lg)', background: '#fff', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-lg)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ flexShrink: 0, width: '80px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                    {g.values.map(v => (
                      <span key={v} style={{ background: '#E0E7FF', color: '#3730A3', border: '1px solid #C7D2FE', fontSize: '0.7rem', fontWeight: 800, padding: '4px 10px', borderRadius: '16px', textAlign: 'center', width: '100%' }}>
                        {v}
                      </span>
                    ))}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#4F46E5', fontWeight: 800, fontSize: '0.8125rem', marginBottom: '6px' }}>{g.title}</div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '8px', color: 'var(--color-text-primary)', letterSpacing: '-0.01em', wordBreak: 'keep-all' }}>{g.subtitle}</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, wordBreak: 'keep-all' }}>{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div style={{ padding: 'var(--spacing-lg) var(--spacing-xl)', borderTop: '1px solid var(--color-border-default)', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleAgreeAIGuide} 
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
