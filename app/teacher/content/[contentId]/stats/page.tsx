'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { getContentDoc, subscribeLeaderboard, getStudentsByClass } from '@/lib/firebase/queries';
import type { ContentDoc, ScoreDoc, WhitelistDoc } from '@/lib/firebase/types';
import Navbar from '@/components/layout/Navbar';

type SortOption = 'score' | 'number';

export default function StatsPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  
  const contentId = params.contentId as string;
  const [contentDoc, setContentDoc] = useState<ContentDoc | null>(null);
  const [scores, setScores] = useState<ScoreDoc[]>([]);
  const [classStudents, setClassStudents] = useState<WhitelistDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('number');

  useEffect(() => {
    if (!contentId) return;
    let unsub: (() => void) | null = null;

    getContentDoc(contentId).then(doc => {
      setContentDoc(doc);
      const classId = doc?.classId;
      if (classId) {
        getStudentsByClass(classId).then(students => {
          setClassStudents(students);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
      // Subscribe filtered by classId
      unsub = subscribeLeaderboard(contentId, (newScores) => {
        setScores(newScores);
      }, classId);
    });
    
    return () => { if (unsub) unsub(); };
  }, [contentId]);

  const displayData = useMemo(() => {
    let rawList: any[] = [];
    
    if (classStudents.length > 0) {
      // 수업에 있는 학생 목록을 기준으로 병합
      rawList = classStudents.map(student => {
        const score = scores.find(s => s.studentEmail === student.email);
        return {
          id: student.email,
          studentName: student.displayName || '이름 없음',
          studentEmail: student.email,
          studentNumber: student.studentNumber || '',
          scoreData: score || null
        };
      });
    } else {
      // 수업 정보가 없으면 기존 기록만
      rawList = scores.map(s => ({
        id: s.id,
        studentName: s.studentName,
        studentEmail: s.studentEmail,
        studentNumber: '', // no student number in score alone
        scoreData: s
      }));
    }

    // 정렬
    rawList.sort((a, b) => {
      if (sortBy === 'score') {
        const scoreA = a.scoreData?.total_score || 0;
        const scoreB = b.scoreData?.total_score || 0;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.studentName.localeCompare(b.studentName);
      } else {
        const numA = parseInt(a.studentNumber) || 9999;
        const numB = parseInt(b.studentNumber) || 9999;
        if (numA !== numB) return numA - numB;
        return a.studentName.localeCompare(b.studentName);
      }
    });

    return rawList;
  }, [scores, classStudents, sortBy]);

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!contentDoc) return <div style={{ padding: 20 }}>콘텐츠를 찾을 수 없습니다.</div>;

  let wpmSum = 0;
  let wpmCount = 0;
  let accSum = 0;
  let accCount = 0;

  const validScores = displayData.map(d => d.scoreData).filter(s => s !== null) as ScoreDoc[];

  validScores.forEach(s => {
    if (s.step1_wpm !== undefined) { wpmSum += s.step1_wpm; wpmCount++; }
    if (s.step2_wpm !== undefined) { wpmSum += s.step2_wpm; wpmCount++; }
    if (s.step1_accuracy !== undefined) { accSum += s.step1_accuracy; accCount++; }
    if (s.step2_accuracy !== undefined) { accSum += s.step2_accuracy; accCount++; }
  });

  const avgWpm = wpmCount > 0 ? Math.round(wpmSum / wpmCount) : 0;
  const avgAccuracy = accCount > 0 ? Math.round(accSum / accCount) : 0;

  const validQuizScores = validScores.filter(s => s.total_score !== undefined);
  const avgQuizScore = validQuizScores.length > 0 ? Math.round(validQuizScores.reduce((acc, curr) => acc + (curr.total_score || 0), 0) / validQuizScores.length) : 0;

  const completedCount = validScores.filter(s => s.step1_completedAt && s.step2_completedAt && s.step3_completedAt).length;
  const totalStudentsCount = classStudents.length > 0 ? classStudents.length : validScores.length;

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
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>{completedCount}<span style={{ fontSize: '1.25rem', color: 'var(--color-text-muted)' }}> / {totalStudentsCount}명</span></div>
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
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>평균 총점</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-secondary)' }}>{avgQuizScore}<span style={{ fontSize: '1rem', color: 'var(--color-text-muted)' }}>점</span></div>
          </div>
        </div>

        <div className="card" style={{ padding: 'var(--spacing-xl)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>학생별 상세 기록</h2>
            <div style={{ display: 'flex', gap: '8px', background: 'var(--color-bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
              <button 
                onClick={() => setSortBy('number')} 
                style={{ padding: '6px 12px', fontSize: '0.8125rem', fontWeight: 600, borderRadius: '4px', background: sortBy === 'number' ? 'white' : 'transparent', color: sortBy === 'number' ? 'var(--color-text-primary)' : 'var(--color-text-muted)', boxShadow: sortBy === 'number' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', border: 'none', cursor: 'pointer' }}
              >학번순 정렬</button>
              <button 
                onClick={() => setSortBy('score')} 
                style={{ padding: '6px 12px', fontSize: '0.8125rem', fontWeight: 600, borderRadius: '4px', background: sortBy === 'score' ? 'white' : 'transparent', color: sortBy === 'score' ? 'var(--color-text-primary)' : 'var(--color-text-muted)', boxShadow: sortBy === 'score' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', border: 'none', cursor: 'pointer' }}
              >점수순 정렬</button>
            </div>
          </div>
          
          {displayData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border-default)', borderRadius: 'var(--radius-md)' }}>
              해당 수업에 등록된 학생이 없거나 데이터가 없습니다.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-border-default)' }}>
                    <th style={{ padding: 'var(--spacing-sm) 0', color: 'var(--color-text-secondary)', fontWeight: 600 }}>이름 / 학번</th>
                    <th style={{ padding: 'var(--spacing-sm) 0', color: 'var(--color-text-secondary)', fontWeight: 600 }}>타수 (평균)</th>
                    <th style={{ padding: 'var(--spacing-sm) 0', color: 'var(--color-text-secondary)', fontWeight: 600 }}>정확도 (평균)</th>
                    <th style={{ padding: 'var(--spacing-sm) 0', color: 'var(--color-text-secondary)', fontWeight: 600 }}>학습 상태</th>
                    <th style={{ padding: 'var(--spacing-sm) 0', color: 'var(--color-text-secondary)', fontWeight: 600, textAlign: 'right' }}>총점</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.map(item => {
                    const s = item.scoreData;
                    const hasStarted = !!s;
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                        <td style={{ padding: 'var(--spacing-sm) 0', fontWeight: 500 }}>
                          {item.studentName}
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{item.studentNumber ? `${item.studentNumber}번` : item.studentEmail}</div>
                        </td>
                        <td style={{ padding: 'var(--spacing-sm) 0' }}>
                          {hasStarted && (s.step1_wpm || s.step2_wpm) ? `${Math.round(((s.step1_wpm || 0) + (s.step2_wpm || 0)) / ((s.step1_wpm ? 1 : 0) + (s.step2_wpm ? 1 : 0)))}타` : '-'}
                        </td>
                        <td style={{ padding: 'var(--spacing-sm) 0' }}>
                          {hasStarted && (s.step1_accuracy || s.step2_accuracy) ? `${Math.round(((s.step1_accuracy || 0) + (s.step2_accuracy || 0)) / ((s.step1_accuracy ? 1 : 0) + (s.step2_accuracy ? 1 : 0)))}%` : '-'}
                        </td>
                        <td style={{ padding: 'var(--spacing-sm) 0' }}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <span style={{ background: hasStarted && s.step1_completedAt ? 'var(--color-primary)' : 'var(--color-bg-secondary)', color: hasStarted && s.step1_completedAt ? 'white' : 'var(--color-text-muted)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>1단계</span>
                            <span style={{ background: hasStarted && s.step2_completedAt ? 'var(--color-primary)' : 'var(--color-bg-secondary)', color: hasStarted && s.step2_completedAt ? 'white' : 'var(--color-text-muted)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>2단계</span>
                            <span style={{ background: hasStarted && s.step3_completedAt ? 'var(--color-primary)' : 'var(--color-bg-secondary)', color: hasStarted && s.step3_completedAt ? 'white' : 'var(--color-text-muted)', padding: '2px 6px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>3단계</span>
                          </div>
                        </td>
                        <td style={{ padding: 'var(--spacing-sm) 0', textAlign: 'right', fontWeight: 700, color: 'var(--color-secondary)' }}>
                          {hasStarted && s.total_score !== undefined ? `${s.total_score}점` : '0점'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
