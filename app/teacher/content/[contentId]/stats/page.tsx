'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { getContentDoc, subscribeLeaderboard } from '@/lib/firebase/queries';
import type { ContentDoc, ScoreDoc } from '@/lib/firebase/types';
import Navbar from '@/components/layout/Navbar';

export default function StatsPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  
  const contentId = params.contentId as string;
  const [contentDoc, setContentDoc] = useState<ContentDoc | null>(null);
  const [scores, setScores] = useState<ScoreDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contentId) return;
    getContentDoc(contentId).then(doc => {
      setContentDoc(doc);
      setLoading(false);
    });
    
    const unsub = subscribeLeaderboard(contentId, (newScores) => {
      setScores(newScores);
    });
    return () => unsub();
  }, [contentId]);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!contentDoc) return <div style={{ padding: 20 }}>콘텐츠를 찾을 수 없습니다.</div>;

  let wpmSum = 0;
  let wpmCount = 0;
  let accSum = 0;
  let accCount = 0;

  scores.forEach(s => {
    if (s.step1_wpm !== undefined) { wpmSum += s.step1_wpm; wpmCount++; }
    if (s.step2_wpm !== undefined) { wpmSum += s.step2_wpm; wpmCount++; }
    if (s.step1_accuracy !== undefined) { accSum += s.step1_accuracy; accCount++; }
    if (s.step2_accuracy !== undefined) { accSum += s.step2_accuracy; accCount++; }
  });

  const avgWpm = wpmCount > 0 ? Math.round(wpmSum / wpmCount) : 0;
  const avgAccuracy = accCount > 0 ? Math.round(accSum / accCount) : 0;

  const validQuizScores = scores.filter(s => s.step3_score !== undefined);
  const avgQuizScore = validQuizScores.length > 0 ? Math.round(validQuizScores.reduce((acc, curr) => acc + (curr.step3_score || 0), 0) / validQuizScores.length) : 0;

  const completedCount = scores.filter(s => s.step1_completedAt && s.step2_completedAt && s.step3_completedAt).length;

  return (
    <div className="page-wrapper" style={{ background: 'var(--color-bg-secondary)', minHeight: '100vh' }}>
      <Navbar roleLabel="선생님" dashboardPath="/teacher/dashboard" />
      <main className="container" style={{ flex: 1, padding: 'var(--spacing-lg)', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <a onClick={() => router.back()} style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 'var(--spacing-md)' }}>← 대시보드로 돌아가기</a>
        
        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 4 }}>
            <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>{contentDoc.subject}</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>📊 통계: {contentDoc.unit} - {contentDoc.title}</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>학생들의 참여도와 학습 성취도를 확인합니다.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
          <div className="card" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>완료 인원 (모든 단계)</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>{completedCount}<span style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>명</span></div>
          </div>
          <div className="card" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>평균 타수 (1, 2단계)</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{avgWpm}<span style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>타</span></div>
          </div>
          <div className="card" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>평균 정확도 (1, 2단계)</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-success)' }}>{avgAccuracy}<span style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>%</span></div>
          </div>
          <div className="card" style={{ padding: 'var(--spacing-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>평균 퀴즈 점수</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-secondary)' }}>{avgQuizScore}<span style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>점</span></div>
          </div>
        </div>

        <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-primary)' }}>학생별 상세 기록</h2>
          {scores.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border-default)', borderRadius: 'var(--radius-md)' }}>
              아직 학습을 시작한 학생이 없습니다.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border-default)' }}>
                    <th style={{ padding: 'var(--spacing-sm) 0', color: 'var(--color-text-secondary)', fontWeight: 600 }}>이름</th>
                    <th style={{ padding: 'var(--spacing-sm) 0', color: 'var(--color-text-secondary)', fontWeight: 600 }}>타수 (평균)</th>
                    <th style={{ padding: 'var(--spacing-sm) 0', color: 'var(--color-text-secondary)', fontWeight: 600 }}>정확도 (평균)</th>
                    <th style={{ padding: 'var(--spacing-sm) 0', color: 'var(--color-text-secondary)', fontWeight: 600 }}>학습 상태</th>
                    <th style={{ padding: 'var(--spacing-sm) 0', color: 'var(--color-text-secondary)', fontWeight: 600, textAlign: 'right' }}>퀴즈 점수</th>
                  </tr>
                </thead>
                <tbody>
                  {[...scores].sort((a, b) => (b.step3_score || 0) - (a.step3_score || 0)).map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                      <td style={{ padding: 'var(--spacing-sm) 0', fontWeight: 500 }}>
                        {s.studentName}
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.studentEmail}</div>
                      </td>
                      <td style={{ padding: 'var(--spacing-sm) 0' }}>
                        {s.step1_wpm || s.step2_wpm ? `${Math.round(((s.step1_wpm || 0) + (s.step2_wpm || 0)) / ((s.step1_wpm ? 1 : 0) + (s.step2_wpm ? 1 : 0)))}타` : '-'}
                      </td>
                      <td style={{ padding: 'var(--spacing-sm) 0' }}>
                        {s.step1_accuracy || s.step2_accuracy ? `${Math.round(((s.step1_accuracy || 0) + (s.step2_accuracy || 0)) / ((s.step1_accuracy ? 1 : 0) + (s.step2_accuracy ? 1 : 0)))}%` : '-'}
                      </td>
                      <td style={{ padding: 'var(--spacing-sm) 0' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <span style={{ background: s.step1_completedAt ? 'var(--color-primary)' : 'var(--color-bg-secondary)', color: s.step1_completedAt ? 'white' : 'var(--color-text-muted)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>1단계</span>
                          <span style={{ background: s.step2_completedAt ? 'var(--color-primary)' : 'var(--color-bg-secondary)', color: s.step2_completedAt ? 'white' : 'var(--color-text-muted)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>2단계</span>
                          <span style={{ background: s.step3_completedAt ? 'var(--color-primary)' : 'var(--color-bg-secondary)', color: s.step3_completedAt ? 'white' : 'var(--color-text-muted)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>3단계</span>
                        </div>
                      </td>
                      <td style={{ padding: 'var(--spacing-sm) 0', textAlign: 'right', fontWeight: 700, color: 'var(--color-secondary)' }}>
                        {s.step3_score || 0}점
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
