'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { getContentDoc, upsertScore, subscribeLeaderboard, getMyScore } from '@/lib/firebase/queries';
import type { ContentDoc, QuizItem, ScoreDoc } from '@/lib/firebase/types';
import { LeaderboardSlide } from '@/components/leaderboard/LeaderboardSlide';
import Navbar from '@/components/layout/Navbar';

export default function Step3Page() {
  const router = useRouter();
  const params = useParams();
  const { user, profile, logout } = useAuth();
  
  const contentId = params.contentId as string;
  const [contentDoc, setContentDoc] = useState<ContentDoc | null>(null);
  const [loading, setLoading] = useState(true);

  // Quiz state
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [scores, setScores] = useState<ScoreDoc[]>([]);
  const [myFinalScoreDoc, setMyFinalScoreDoc] = useState<ScoreDoc | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'assistant', text: string}[]>([
    { role: 'assistant', text: '안녕하세요! 학습 중 궁금한 점이 있으면 무엇이든 물어보세요. 😊' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (!contentId) return;
    let unsub: (() => void) | null = null;
    getContentDoc(contentId).then(doc => {
      if (doc) {
        setContentDoc(doc);
        setQuizzes(doc.step3_quiz_list || []);
      }
      setLoading(false);
      unsub = subscribeLeaderboard(contentId, (newScores) => {
        setScores(newScores);
      }, doc?.classId);
    });
    return () => { if (unsub) unsub(); };
  }, [contentId]);

  const currentQuiz = quizzes[currentIndex];

  const handleOptionClick = (index: number) => {
    if (isAnswerRevealed) return; // already confirmed, can't change
    setSelectedOption(index);
  };

  const handleCheckAnswer = () => {
    if (selectedOption === null || isAnswerRevealed) return;
    setIsAnswerRevealed(true);
    const correct = selectedOption === currentQuiz.answer;
    setIsCorrect(correct);
    if (correct) {
      setCorrectAnswersCount(prev => prev + 1);
      setChatMessages(prev => [...prev, { role: 'assistant', text: '정답입니다! 🎉 잘하셨어요.' }]);
    } else {
      setChatMessages(prev => [...prev, { role: 'assistant', text: '아쉽네요. 다시 한 번 생각해보거나, 궁금한 점을 물어보세요.' }]);
    }
  };

  const handleNext = () => {
    if (currentIndex < quizzes.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setIsCorrect(null);
    } else {
      finishStep();
    }
  };

  const finishStep = async () => {
    setIsFinished(true);
    const step3Score = Math.round((correctAnswersCount / quizzes.length) * 100) || 0;
    
    if (user?.uid && profile) {
      const existingScore = await getMyScore(contentId, user.uid);
      const s1 = existingScore?.step1_score || 0;
      const s2 = existingScore?.step2_score || 0;
      const totalScore = s1 + s2 + step3Score;

      await upsertScore(contentId, user.uid, {
        classId: profile.classId!,
        studentName: profile.displayName,
        studentEmail: user.email!,
        step3_score: step3Score,
        step3_completedAt: new Date() as any,
        total_score: totalScore
      });
      
      const finalScoreDoc = await getMyScore(contentId, user.uid);
      setMyFinalScoreDoc(finalScoreDoc);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = chatInput.trim();
    const newMessages = [...chatMessages, { role: 'user' as const, text: userMsg }];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          contentContext: currentQuiz ? {
            unit: contentDoc?.unit,
            title: contentDoc?.title,
            question: currentQuiz.question,
            options: currentQuiz.options
          } : null
        })
      });

      if (!response.ok) {
        throw new Error('API Error');
      }

      setChatMessages(prev => [...prev, { role: 'assistant', text: '' }]);
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        let aiText = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunkText = decoder.decode(value, { stream: true });
          aiText += chunkText;
          setChatMessages(prev => {
            const copy = [...prev];
            copy[copy.length - 1].text = aiText;
            return copy;
          });
        }
      }
    } catch (e) {
      console.error(e);
      setChatMessages(prev => [...prev, { role: 'assistant', text: '죄송합니다. 오류가 발생하여 답변을 생성하지 못했습니다.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!contentDoc || quizzes.length === 0) return <div style={{ padding: 20 }}>콘텐츠를 찾을 수 없습니다.</div>;

  if (isFinished) {
    const s1 = myFinalScoreDoc?.step1_score || 0;
    const s2 = myFinalScoreDoc?.step2_score || 0;
    const s3 = myFinalScoreDoc?.step3_score || 0;
    const t = myFinalScoreDoc?.total_score || 0;

    const sortedScores = [...scores].sort((a, b) => (b.total_score || 0) - (a.total_score || 0));
    let myRank = sortedScores.findIndex(s => s.userId === user?.uid) + 1;
    if (myRank === 0) myRank = sortedScores.length + 1;
    const totalStudents = Math.max(sortedScores.length, myRank);

    return (
      <div className="page-wrapper" style={{ background: 'var(--color-bg-secondary)', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Navbar roleLabel="학생" dashboardPath="/student/dashboard" />
        <main className="container" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-lg)' }}>
          <div className="card" style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', maxWidth: 600, width: '100%', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ fontSize: '5rem', marginBottom: 'var(--spacing-md)' }}>🏆</div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 'var(--spacing-sm)', color: 'var(--color-text-primary)' }}>모든 학습을 완료했습니다!</h1>
            <p style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xl)' }}>{contentDoc.title} 단원의 학습이 모두 끝났습니다.</p>
            
            <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>1단계 점수</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>{s1}점</div>
                </div>
                <div style={{ borderLeft: '1px solid var(--color-border-default)', borderRight: '1px solid var(--color-border-default)' }}>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>2단계 점수</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>{s2}점</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>3단계 점수</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>{s3}점</div>
                </div>
              </div>
              
              <div style={{ borderTop: '2px dashed var(--color-border-default)', paddingTop: 'var(--spacing-lg)' }}>
                <div style={{ fontSize: '1rem', color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 600 }}>최종 종합 점수</div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--color-secondary)', marginBottom: 'var(--spacing-md)' }}>{t}점</div>
                <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', background: '#fff', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-primary-light)' }}>
                  전체 통합 랭킹: <span style={{ color: 'var(--color-primary)', fontSize: '1.25rem' }}>{myRank}위</span> / {totalStudents}명
                </div>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', padding: 'var(--spacing-md)', fontSize: '1.125rem' }} onClick={() => router.push('/student/dashboard')}>
              대시보드로 돌아가기
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ background: 'var(--color-bg-secondary)', minHeight: '100vh' }}>
      <Navbar roleLabel="학생" dashboardPath="/student/dashboard" />

      <main className="container" style={{ flex: 1, padding: 'var(--spacing-lg)', display: 'grid', gridTemplateColumns: '1fr 350px', gap: 'var(--spacing-lg)', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        
        {/* Main Quiz Content */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
            <span className="step-badge active" style={{ background: 'var(--gradient-ai-sparkle)' }}>3</span>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>단원 종합 퀴즈</h1>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>— {contentDoc.unit}: {contentDoc.title}</span>
          </div>

          <div className="card" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>문제 {currentIndex + 1} / {quizzes.length}</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 600 }}>진행도 {Math.round(((currentIndex) / quizzes.length) * 100)}%</span>
            </div>
            
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-lg)', lineHeight: 1.6 }}>
              {currentQuiz.question}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {currentQuiz.options?.map((opt, i) => {
                let border = '1px solid var(--color-border-default)';
                let bg = 'var(--color-bg-primary)';
                let icon = '';
                
                if (isAnswerRevealed) {
                  if (i === currentQuiz.answer) {
                    border = '2px solid var(--color-success)';
                    bg = 'var(--color-success-bg)';
                    icon = '✅ ';
                  } else if (i === selectedOption) {
                    border = '2px solid var(--color-error)';
                    bg = 'var(--color-error-bg)';
                    icon = '❌ ';
                  }
                } else if (i === selectedOption) {
                  border = '2px solid var(--color-primary)';
                  bg = 'var(--color-primary-light)';
                }

                return (
                  <div key={i} onClick={() => handleOptionClick(i)} style={{ padding: 'var(--spacing-md)', border, background: bg, borderRadius: 'var(--radius-md)', cursor: isAnswerRevealed ? 'default' : 'pointer', transition: 'all 0.2s ease' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                      {icon && <span style={{ fontSize: '1.125rem' }}>{icon}</span>}
                      <span style={{ fontWeight: isAnswerRevealed && (i === currentQuiz.answer || i === selectedOption) ? 600 : 500 }}>
                        {opt}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {isAnswerRevealed && currentQuiz.explanation && (
              <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>
                <strong>해설:</strong> {currentQuiz.explanation}
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border-default)' }}>
              {!isAnswerRevealed ? (
                <button
                  className="btn btn-primary"
                  style={{ padding: '0 var(--spacing-lg)' }}
                  onClick={handleCheckAnswer}
                  disabled={selectedOption === null}
                >
                  정답 확인
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ padding: '0 var(--spacing-lg)' }}
                  onClick={handleNext}
                >
                  {currentIndex < quizzes.length - 1 ? '다음 문제 →' : '학습 완료 🎉'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar / AI Chatbot */}
        <aside style={{ height: 'calc(100vh - 120px)', position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          
          <div className="card" style={{ padding: 'var(--spacing-md)' }}>
            <LeaderboardSlide scores={scores} step={3} />
          </div>

          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            
            <div style={{ background: 'var(--gradient-ai-sparkle)', padding: 'var(--spacing-md)', color: '#fff', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <span style={{ fontSize: '1.25rem' }}>✨</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>AI 학습 튜터</h3>
            </div>
            
            <div style={{ flex: 1, padding: 'var(--spacing-md)', overflowY: 'auto', background: 'var(--color-bg-primary)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              {chatMessages.map((msg, i) => (
                <div key={i} style={{ alignSelf: msg.role === 'assistant' ? 'flex-start' : 'flex-end', background: msg.role === 'assistant' ? 'var(--color-bg-tertiary)' : 'var(--color-primary-light)', padding: 'var(--spacing-sm) var(--spacing-md)', borderRadius: 'var(--radius-lg)', borderTopLeftRadius: msg.role === 'assistant' ? 4 : 'var(--radius-lg)', borderTopRightRadius: msg.role === 'user' ? 4 : 'var(--radius-lg)', maxWidth: '85%' }}>
                  <p style={{ fontSize: '0.875rem', color: msg.role === 'assistant' ? 'var(--color-text-primary)' : 'var(--color-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </p>
                </div>
              ))}
              
              {chatLoading && (
                <div style={{ alignSelf: 'flex-start', background: 'var(--color-bg-tertiary)', padding: 'var(--spacing-sm) var(--spacing-md)', borderRadius: 'var(--radius-lg)', borderTopLeftRadius: 4, maxWidth: '85%' }}>
                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)', padding: 'var(--spacing-xs) 0' }}>
                    <div className="spinner" style={{ width: 14, height: 14, borderColor: 'var(--color-border-default)', borderTopColor: 'var(--color-primary)' }} />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>AI가 답변을 생성하고 있어요...</span>
                  </div>
                </div>
              )}
            </div>

            <div style={{ padding: 'var(--spacing-md)', borderTop: '1px solid var(--color-border-default)', background: 'var(--color-bg-primary)' }}>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <input type="text" className="form-input" placeholder="궁금한 점을 질문해 보세요" style={{ flex: 1 }} value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSendChat()} disabled={chatLoading} />
                <button className="btn btn-sparkle" style={{ padding: '8px var(--spacing-md)' }} onClick={handleSendChat} disabled={chatLoading || !chatInput.trim()}>전송</button>
              </div>
            </div>

          </div>
        </aside>

      </main>
    </div>
  );
}
