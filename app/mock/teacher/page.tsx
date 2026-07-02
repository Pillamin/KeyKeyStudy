'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TeacherOnboardingMock() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isHomeroom, setIsHomeroom] = useState(true);

  return (
    <div style={{ background: 'var(--color-bg-secondary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 간소화된 헤더 */}
      <header style={{ background: '#fff', padding: 'var(--spacing-md) var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-default)' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⌨️</span> KeyKeyStudy
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>초기 설정 (목업)</div>
      </header>

      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'var(--spacing-2xl)' }}>
        <div className="card" style={{ maxWidth: '560px', width: '100%', padding: 'var(--spacing-2xl)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
          
          <div className="fade-in">
            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>👨‍🏫</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 'var(--spacing-xs)' }}>추가 정보 입력</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-2xl)' }}>교사 인증이 완료되었습니다! 담당 학급 정보를 설정해 주세요.</p>
            
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>선생님 성함</label>
              <input type="text" className="input" defaultValue="김철수" style={{ width: '100%', padding: '12px', background: 'var(--color-bg-secondary)' }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>* 구글 계정에서 연동된 이름입니다. 필요시 수정 가능합니다.</p>
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
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
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>학년</label>
                  <input type="number" className="input" placeholder="예: 3" style={{ width: '100%', padding: '12px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>반</label>
                  <input type="number" className="input" placeholder="예: 2" style={{ width: '100%', padding: '12px' }} />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>담당 과목 (선택)</label>
              <input type="text" className="input" placeholder="예: 과학, 수학" style={{ width: '100%', padding: '12px' }} />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.125rem', fontWeight: 700, borderRadius: 'var(--radius-full)' }} onClick={() => { alert('설정이 완료되었습니다!'); router.push('/teacher/dashboard'); }}>시작하기</button>
          </div>

        </div>
      </main>
    </div>
  );
}
