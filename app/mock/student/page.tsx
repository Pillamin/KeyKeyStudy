'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentOnboardingMock() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  return (
    <div style={{ background: 'var(--color-bg-secondary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <header style={{ background: '#fff', padding: 'var(--spacing-md) var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-default)' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⌨️</span> KeyKeyStudy
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>학생 초기 설정 (목업)</div>
      </header>

      <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 'var(--spacing-2xl)' }}>
        <div className="card" style={{ maxWidth: '480px', width: '100%', padding: 'var(--spacing-2xl)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
          
          <div className="fade-in" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}>📝</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 'var(--spacing-xs)' }}>추가 정보 입력</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-2xl)' }}>학생 인증이 완료되었습니다! 반 친구들이 알아볼 수 있게 내 정보를 입력해요.</p>
            
            <div style={{ marginBottom: 'var(--spacing-md)', textAlign: 'left' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>이름</label>
              <input type="text" className="input" defaultValue="이영희" style={{ width: '100%', padding: '12px', background: 'var(--color-bg-secondary)' }} />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>* 구글 계정에서 연동된 이름입니다. 필요시 수정 가능합니다.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-2xl)' }}>
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>학년</label>
                <input type="number" className="input" placeholder="3" style={{ width: '100%', padding: '12px' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>반</label>
                <input type="number" className="input" placeholder="2" style={{ width: '100%', padding: '12px' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px' }}>번호</label>
                <input type="number" className="input" placeholder="15" style={{ width: '100%', padding: '12px' }} />
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.125rem', fontWeight: 700, borderRadius: 'var(--radius-full)', background: '#FACC15', color: '#422006', border: 'none' }} onClick={() => { alert('반갑습니다!'); router.push('/student/dashboard'); }}>수업 입장하기</button>
          </div>

        </div>
      </main>
    </div>
  );
}
