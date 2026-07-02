'use client';
import { useState, useEffect, useRef } from 'react';
import type { ScoreDoc } from '@/lib/firebase/types';
interface LeaderboardSlideProps { scores: ScoreDoc[]; step: 1 | 2 | 3 | 'final'; title?: string; }
interface RankedScore extends ScoreDoc { rank: number; displayScore: number; }
export function LeaderboardSlide({ scores, step, title }: LeaderboardSlideProps) {
  const [rankedScores, setRankedScores] = useState<RankedScore[]>([]);
  useEffect(() => {
    const sorted = [...scores]
      .filter((s) => step === 1 ? s.step1_score !== undefined : step === 2 ? s.step2_score !== undefined : step === 3 ? s.step3_score !== undefined : (s.step1_score !== undefined && s.step2_score !== undefined && s.step3_score !== undefined && s.total_score !== undefined))
      .sort((a, b) => {
        if (step === 1) return (b.step1_score ?? 0) - (a.step1_score ?? 0);
        if (step === 2) return (b.step2_score ?? 0) - (a.step2_score ?? 0);
        if (step === 3) return (b.step3_score ?? 0) - (a.step3_score ?? 0);
        return (b.total_score ?? 0) - (a.total_score ?? 0);
      })
      .map((s, i) => ({ 
        ...s, 
        rank: i + 1, 
        displayScore: step === 1 ? (s.step1_score ?? 0) : step === 2 ? (s.step2_score ?? 0) : step === 3 ? (s.step3_score ?? 0) : (s.total_score ?? 0) 
      }));
    setRankedScores(sorted);
  }, [scores, step]);
  const rankClasses: Record<number, string> = { 1: 'rank-1', 2: 'rank-2', 3: 'rank-3' };
  const rankIcons: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const stepLabel = step === 1 ? '1단계 점수 순위' : step === 2 ? '2단계 점수 순위' : step === 3 ? '3단계 퀴즈 순위' : '최종 종합 랭킹';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 700 }}>🏆 {title ?? stepLabel}</h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{rankedScores.length}명 참여</span>
      </div>
      {rankedScores.length === 0 && <div style={{ textAlign: 'center', padding: 'var(--spacing-lg)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>아직 제출한 학생이 없습니다</div>}
      {rankedScores.map((score) => (
        <div key={score.userId} className={`leaderboard-item ${rankClasses[score.rank] ?? ''}`} style={{ animation: 'leaderboardSlide 0.4s ease' }}>
          <div style={{ width: 28, textAlign: 'center', flexShrink: 0, fontSize: score.rank <= 3 ? '1.25rem' : '0.875rem', fontWeight: 700 }}>{score.rank <= 3 ? rankIcons[score.rank] : score.rank}</div>
          <div style={{ flex: 1, fontWeight: score.rank <= 3 ? 700 : 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{score.studentName}</div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem', flexShrink: 0 }}>
            {score.displayScore}점
          </div>
        </div>
      ))}
      <style>{`@keyframes leaderboardSlide { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
