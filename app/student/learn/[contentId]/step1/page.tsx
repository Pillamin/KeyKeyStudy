'use client';
import { useState, useEffect, useRef } from 'react';
import { splitIntoLines } from '@/lib/utils/textSplitter';

function normalizeText(text: string) {
  if (!text) return '';
  return text.replace(/[‘’]/g, "'").replace(/[“”]/g, '"');
}

import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { getContentDoc, upsertScore, subscribeLeaderboard } from '@/lib/firebase/queries';
import type { ContentDoc, ScoreDoc } from '@/lib/firebase/types';
import { LeaderboardSlide } from '@/components/leaderboard/LeaderboardSlide';
import Navbar from '@/components/layout/Navbar';

export default function Step1Page() {
  const router = useRouter();
  const params = useParams();
  const { user, profile, logout } = useAuth();
  
  const contentId = params.contentId as string;
  const [contentDoc, setContentDoc] = useState<ContentDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // Text state
  const [paragraphs, setParagraphs] = useState<string[][]>([]);
  const [currentParaIndex, setCurrentParaIndex] = useState(0);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  
  const [inputValue, setInputValue] = useState('');
  const [completedInputs, setCompletedInputs] = useState<string[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const isAdvancingRef = useRef(false);
  
  // Stats
  const [startTime, setStartTime] = useState<number | null>(null);
  const [totalTimeMs, setTotalTimeMs] = useState(0);
  const [totalTypedChars, setTotalTypedChars] = useState(0);
  
  const [currentWpm, setCurrentWpm] = useState(0);
  const [currentAccuracy, setCurrentAccuracy] = useState(100);
  const [isFinished, setIsFinished] = useState(false);
  const [scores, setScores] = useState<ScoreDoc[]>([]);

  useEffect(() => {
    if (!contentId) return;
    getContentDoc(contentId).then(doc => {
      if (doc) {
        setContentDoc(doc);
        const rawTexts = doc.step1_text_list || [];
        // Replace full-width quotes with ascii quotes so they don't look like spaces
        const normalizedTexts = rawTexts.map(normalizeText);
        const splitParas = normalizedTexts.map(para => splitIntoLines(para, 45));
        setParagraphs(splitParas);
      }
      setLoading(false);
    });
    
    const unsub = subscribeLeaderboard(contentId, (newScores) => {
      setScores(newScores);
    });
    return () => unsub();
  }, [contentId]);

  useEffect(() => {
    if (isFinished) return;
    const interval = setInterval(() => {
      const currentSessionTime = startTime ? Date.now() - startTime : 0;
      const totalMin = (totalTimeMs + currentSessionTime) / 60000;
      
      if (totalMin > 0) {
        setCurrentWpm(Math.round((totalTypedChars + inputValue.length) / totalMin));
      }
    }, 500);
    return () => clearInterval(interval);
  }, [startTime, isFinished, totalTypedChars, inputValue.length, totalTimeMs]);

  useEffect(() => {
    isAdvancingRef.current = false;
  }, [currentLineIndex, currentParaIndex]);

  const currentLines = paragraphs[currentParaIndex] || [];
  const currentSentence = currentLines[currentLineIndex] || '';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const now = Date.now();
    
    // Start timer on first input
    if (!startTime && val.length > 0) {
      setStartTime(now);
    }
    
    setInputValue(val);

    let correctChars = 0;
    const checkLength = isComposing ? Math.max(0, val.length - 1) : val.length;
    for (let i = 0; i < checkLength; i++) {
      if (currentSentence[i] && normalizeText(val[i]) === normalizeText(currentSentence[i])) {
        correctChars++;
      }
    }
    setCurrentAccuracy(checkLength > 0 ? Math.round((correctChars / checkLength) * 100) : 100);

    const currentSessionTime = startTime ? now - startTime : 0;
    const totalMin = (totalTimeMs + currentSessionTime || 1) / 60000;
    setCurrentWpm(Math.round((totalTypedChars + val.length) / totalMin));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isAdvancingRef.current) {
      e.preventDefault();
      return;
    }

    const isAtEnd = inputValue.length >= currentSentence.length;
    const isPerfectMatch = normalizeText(inputValue) === normalizeText(currentSentence);

    if (e.key === 'Enter' || (e.key === ' ' && (isAtEnd || isPerfectMatch))) {
      e.preventDefault();
      isAdvancingRef.current = true;
      
      setTotalTypedChars(prev => prev + currentSentence.length);
      
      if (currentLineIndex < currentLines.length - 1) {
        setCompletedInputs(prev => [...prev, inputValue]);
        setCurrentLineIndex(prev => prev + 1);
        setInputValue('');
        setCurrentAccuracy(100);
      } else if (currentParaIndex < paragraphs.length - 1) {
        if (startTime) {
          setTotalTimeMs(prev => prev + (Date.now() - startTime));
          setStartTime(null);
        }
        setCurrentParaIndex(prev => prev + 1);
        setCurrentLineIndex(0);
        setCompletedInputs([]);
        setInputValue('');
        setCurrentAccuracy(100);
      } else {
        if (startTime) {
          setTotalTimeMs(prev => prev + (Date.now() - startTime));
          setStartTime(null);
        }
        finishStep();
      }
    }
  };

  const finishStep = async () => {
    setIsFinished(true);
    
    if (user?.uid && profile) {
      const finalScore = currentAccuracy <= 50 ? 0 : Math.min(100, Math.round((currentWpm / 300) * currentAccuracy));
      await upsertScore(contentId, user.uid, {
        classId: profile.classId!,
        studentName: profile.displayName,
        studentEmail: user.email!,
        step1_wpm: currentWpm,
        step1_accuracy: currentAccuracy,
        step1_score: finalScore,
        step1_completedAt: new Date() as any
      });
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!contentDoc || paragraphs.length === 0) return <div style={{ padding: 20 }}>콘텐츠를 찾을 수 없습니다.</div>;

  if (isFinished) {
    const finalScore = currentAccuracy <= 50 ? 0 : Math.min(100, Math.round((currentWpm / 300) * currentAccuracy));
    const sortedScores = [...scores].sort((a, b) => (b.step1_score || 0) - (a.step1_score || 0));
    let myRank = sortedScores.findIndex(s => s.userId === user?.uid) + 1;
    if (myRank === 0) myRank = sortedScores.length + 1; // Fallback if not yet synced
    const totalStudents = Math.max(sortedScores.length, myRank);

    return (
      <div className="page-wrapper" style={{ background: 'var(--color-bg-secondary)', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar roleLabel="학생" dashboardPath="/student/dashboard" />
        <main className="container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-lg)' }}>
          <div className="card" style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', maxWidth: 500, width: '100%', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--spacing-md)' }}>🎉</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--spacing-lg)', color: 'var(--color-text-primary)' }}>1단계 학습 완료!</h1>
            
            <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>평균 타수</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>{currentWpm}타</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>정확도</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-success)' }}>{currentAccuracy}%</div>
              </div>
              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--color-border-default)', paddingTop: 'var(--spacing-md)', marginTop: 'var(--spacing-xs)' }}>
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>종합 점수</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-secondary)' }}>{finalScore}점</div>
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: 'var(--spacing-xs)' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>현재 반 등수: <span style={{ color: 'var(--color-primary)' }}>{myRank}위</span> / {totalStudents}명</div>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', padding: 'var(--spacing-md)', fontSize: '1.125rem' }} onClick={() => router.push(`/student/learn/${contentId}/step2`)}>
              2단계로 넘어가기 →
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ background: 'var(--color-bg-secondary)', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Navbar roleLabel="학생" dashboardPath="/student/dashboard" />

      <main className="container" style={{ flex: 1, minHeight: 0, padding: 'var(--spacing-lg)', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--spacing-lg)', maxWidth: 1300, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)', flexShrink: 0 }}>
            <span className="step-badge active" style={{ background: 'var(--color-text-primary)' }}>1</span>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>본문 타자 학습</h1>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>— {contentDoc.unit}: {contentDoc.title}</span>
          </div>

          <div className="card" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: 'var(--spacing-xl)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)', fontSize: '0.875rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
              <span>문단 {currentParaIndex + 1} / {paragraphs.length}</span>
            </div>
            <div className="progress-bar-track" style={{ marginBottom: 'var(--spacing-md)', background: 'var(--color-border-default)', flexShrink: 0 }}>
              <div className="progress-bar-fill" style={{ width: `${((currentParaIndex) / paragraphs.length) * 100}%`, background: 'var(--color-primary)' }} />
            </div>

            {/* 본문 원본 미리보기 */}
            <div style={{ 
              background: 'var(--color-bg-primary)', 
              padding: 'var(--spacing-md)', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: 'var(--spacing-lg)', 
              border: '1px solid var(--color-border-default)',
              fontSize: '0.9375rem',
              lineHeight: 1.6,
              color: 'var(--color-text-secondary)',
              flexShrink: 0
            }}>
              <div style={{ fontWeight: 700, marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-primary)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <span>📖</span> 원본 문단 미리보기
              </div>
              {contentDoc.step1_text_list?.[currentParaIndex] || ''}
            </div>

            <div style={{ 
                flex: 1, 
                minHeight: 0,
                background: '#fff', 
                border: '1px solid var(--color-border-default)', 
                borderRadius: 'var(--radius-md)', 
                padding: 'var(--spacing-lg)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-md)',
                overflowY: 'auto',
                overflowX: 'auto'
              }}>
              {currentLines.map((line, i) => {
                const isCurrent = i === currentLineIndex;
                const isPast = i < currentLineIndex;
                const currentInputStr = isCurrent ? inputValue : (isPast ? completedInputs[i] : '');
                
                return (
                  <div key={i} className={isCurrent ? "active-line" : ""} style={{ opacity: i > currentLineIndex ? 0.3 : 1, transition: 'opacity 0.3s', whiteSpace: 'pre' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', letterSpacing: '0.5px', color: 'var(--color-text-primary)' }}>
                      {line.split('').map((char, idx) => {
                        let color = 'var(--color-text-secondary)';
                        // Removed fontWeight changes to prevent layout shift
                        if (idx < currentInputStr.length) {
                          color = normalizeText(currentInputStr[idx]) === normalizeText(char) ? 'var(--color-success)' : 'var(--color-error)';
                        }
                        return <span key={idx} style={{ color }}>{char}</span>;
                      })}
                    </div>
                    
                    <div style={{ marginTop: '2px' }}>
                      {isCurrent ? (
                        <input
                          autoFocus
                          maxLength={currentSentence.length}
                          style={{  
                            fontFamily: 'var(--font-mono)', 
                            fontSize: '1.125rem', 
                            letterSpacing: '0.5px', 
                            width: '100%', 
                            padding: '2px 0', 
                            border: 'none', 
                            borderBottom: '2px solid var(--color-primary)', 
                            background: 'transparent',
                            outline: 'none',
                            color: 'var(--color-primary)'
                          }}
                          value={inputValue}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          onCompositionStart={() => setIsComposing(true)}
                          onCompositionEnd={(e) => {
                            setIsComposing(false);
                            const val = (e.target as HTMLInputElement).value;
                            let correctChars = 0;
                            for (let idx = 0; idx < val.length; idx++) {
                              if (currentSentence[idx] && normalizeText(val[idx]) === normalizeText(currentSentence[idx])) correctChars++;
                            }
                            setCurrentAccuracy(val.length > 0 ? Math.round((correctChars / val.length) * 100) : 100);
                          }}
                          disabled={isFinished}
                        />
                      ) : (
                        <div style={{ 
                          fontFamily: 'var(--font-mono)', 
                          fontSize: '1.125rem', 
                          letterSpacing: '0.5px', 
                          width: '100%', 
                          padding: '2px 0', 
                          borderBottom: '1px solid var(--color-border-default)', 
                          color: 'var(--color-text-primary)',
                          minHeight: '26px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {currentInputStr}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-md)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>현재 타수</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)' }}>{currentWpm}타/분</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>정확도</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: currentAccuracy >= 90 ? 'var(--color-success)' : 'var(--color-error)' }}>{currentAccuracy}%</span>
                </div>
                {!startTime && (currentParaIndex > 0 || currentLineIndex > 0) && !isFinished && (
                  <div style={{ marginLeft: 'var(--spacing-md)', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                    타이핑을 시작하면 타수가 다시 측정됩니다.
                  </div>
                )}
              </div>
              
              <button className="btn btn-secondary" onClick={() => router.push(`/student/learn/${contentId}/step2`)} style={{ padding: '0 var(--spacing-lg)' }}>
                건너뛰기 →
              </button>
            </div>
          </div>
        </div>
        
        <aside style={{ height: '100%', overflowY: 'auto' }}>
          <div className="card" style={{ padding: 'var(--spacing-md)' }}>
            <LeaderboardSlide scores={scores} step={1} />
          </div>
        </aside>

      </main>
    </div>
  );
}
