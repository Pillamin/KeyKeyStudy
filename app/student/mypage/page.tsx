'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { getMyScores, updateWhitelistDoc } from '@/lib/firebase/queries';
import type { ScoreDoc } from '@/lib/firebase/types';
import Navbar from '@/components/layout/Navbar';

export default function StudentMyPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [scores, setScores] = useState<ScoreDoc[]>([]);
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (user) {
      getMyScores(user.uid).then(setScores);
    }
  }, [user, profile, loading, router]);

  if (loading || !user) return <div style={{ padding: 20 }}>Loading...</div>;

  const totalExp = scores.reduce((sum, s) => sum + (s.total_score || 0), 0);
  const currentLevel = Math.floor(totalExp / 1000) + 1;
  const expInCurrentLevel = totalExp % 1000;
  const progressPercent = (expInCurrentLevel / 1000) * 100;

  const studentIdStr = profile?.grade && profile?.classNumber && profile?.studentNumber 
    ? `${profile.grade}학년 ${profile.classNumber}반 ${profile.studentNumber}번` 
    : '정보 없음';

  return (
    <div className="page-wrapper" style={{ background: 'var(--color-bg-secondary)', minHeight: '100vh' }}>
      <Navbar roleLabel="학생" dashboardPath="/student/dashboard" />

      <main className="container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-xl)', maxWidth: '800px', margin: '0 auto', width: '100%', paddingLeft: 'var(--spacing-lg)', paddingRight: 'var(--spacing-lg)' }}>
        
        <div className="card" style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}>👦</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-xs)' }}>
            {profile?.displayName || user.email}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem', marginBottom: 'var(--spacing-xl)' }}>
            학생 마이페이지
          </p>

          <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-xl)', textAlign: 'left' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 4, fontWeight: 600 }}>학적 정보</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{studentIdStr}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 4, fontWeight: 600 }}>이름</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{profile?.displayName}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 4, fontWeight: 600 }}>이메일 계정</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{user.email}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 4, fontWeight: 600 }}>현재 레벨</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-primary)' }}>Lv.{currentLevel}</div>
              </div>
            </div>

            <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--color-border-default)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: 'var(--spacing-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                <span>다음 레벨까지 남은 경험치</span>
                <span style={{ color: 'var(--color-primary)' }}>{expInCurrentLevel} <span style={{ color: 'var(--color-text-muted)' }}>/ 1000 EXP</span></span>
              </div>
              <div className="progress-bar-track" style={{ background: 'var(--color-border-default)', height: 12, borderRadius: 6, overflow: 'hidden' }}>
                <div className="progress-bar-fill" style={{ width: `${progressPercent}%`, background: 'var(--color-primary)', height: '100%', transition: 'width 0.5s ease-out' }}></div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
