'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { getPublishedContentsByClass, getMyScores, getClassByCode, updateWhitelistDoc, getClassDoc, subscribeLeaderboard, getTopicsByParent } from '@/lib/firebase/queries';
import type { ContentDoc, ScoreDoc, ClassDoc, TopicDoc } from '@/lib/firebase/types';
import Navbar from '@/components/layout/Navbar';
import { LeaderboardSlide } from '@/components/leaderboard/LeaderboardSlide';

function LeaderboardModal({ contentId, contentTitle, onClose }: { contentId: string, contentTitle: string, onClose: () => void }) {
  const [scores, setScores] = useState<ScoreDoc[]>([]);
  const [tab, setTab] = useState<1 | 2 | 3 | 'final'>('final');

  useEffect(() => {
    const unsub = subscribeLeaderboard(contentId, setScores);
    return () => unsub();
  }, [contentId]);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--spacing-lg)' }} onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', padding: 'var(--spacing-xl)', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>×</button>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 'var(--spacing-md)' }}>🏆 랭킹보드 <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>- {contentTitle}</span></h2>
        
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)', overflowX: 'auto', paddingBottom: 'var(--spacing-xs)' }}>
          <button className={`btn ${tab === 'final' ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 12px', fontSize: '0.875rem', flexShrink: 0 }} onClick={() => setTab('final')}>최종 종합</button>
          <button className={`btn ${tab === 1 ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 12px', fontSize: '0.875rem', flexShrink: 0 }} onClick={() => setTab(1)}>1단계</button>
          <button className={`btn ${tab === 2 ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 12px', fontSize: '0.875rem', flexShrink: 0 }} onClick={() => setTab(2)}>2단계</button>
          <button className={`btn ${tab === 3 ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 12px', fontSize: '0.875rem', flexShrink: 0 }} onClick={() => setTab(3)}>3단계</button>
        </div>

        <div style={{ background: 'var(--color-bg-secondary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)' }}>
          <LeaderboardSlide scores={scores} step={tab} />
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const router = useRouter();
  const { user, profile, loading, logout } = useAuth();
  
  const [contents, setContents] = useState<ContentDoc[]>([]);
  const [topics, setTopics] = useState<TopicDoc[]>([]);
  const [scores, setScores] = useState<ScoreDoc[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('전체');
  const [classCodeInput, setClassCodeInput] = useState('');
  const [joining, setJoining] = useState(false);
  const [selectedLeaderboardContent, setSelectedLeaderboardContent] = useState<ContentDoc | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (user) {
      getMyScores(user.uid).then(setScores);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (profile?.classId) {
      Promise.all([
        getPublishedContentsByClass(profile.classId),
        getClassDoc(profile.classId),
        getTopicsByParent(profile.classId)
      ]).then(([list, classDoc, topicsList]) => {
        if (classDoc && classDoc.contentOrder) {
          const orderMap = new Map(classDoc.contentOrder.map((id, index) => [id, index]));
          list.sort((a, b) => {
            const aOrder = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
            const bOrder = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
            return aOrder - bOrder;
          });
        }
        setContents(list);
        setTopics(topicsList);
      });
    }
  }, [profile?.classId]);

  const subjects = ['전체', ...Array.from(new Set(contents.map(c => c.subject)))];
  const filteredContents = selectedSubject === '전체' ? contents : contents.filter(c => c.subject === selectedSubject);

  const handleJoinClass = async () => {
    if (!classCodeInput || !user?.email) return;
    setJoining(true);
    try {
      const classDoc = await getClassByCode(classCodeInput);
      if (classDoc) {
        await updateWhitelistDoc(user.email, { classId: classDoc.id });
        
        // Update mock session in localStorage to reflect the new classId
        const mockSession = localStorage.getItem('eduapp_mock_session');
        if (mockSession) {
          const parsed = JSON.parse(mockSession);
          parsed.profile.classId = classDoc.id;
          localStorage.setItem('eduapp_mock_session', JSON.stringify(parsed));
        }

        alert(`'${classDoc.className}' 수업에 등록되었습니다!`);
        window.location.reload();
      } else {
        alert('해당 참여 코드를 가진 수업이 없습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('수업 등록 중 오류가 발생했습니다.');
    }
    setJoining(false);
  };

  if (loading || !user) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div className="page-wrapper" style={{ background: 'var(--color-bg-secondary)', minHeight: '100vh' }}>
      <Navbar roleLabel="학생" dashboardPath="/student/dashboard" />

      <main className="container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-xl)', maxWidth: '900px', margin: '0 auto', width: '100%', paddingLeft: 'var(--spacing-lg)', paddingRight: 'var(--spacing-lg)' }}>
        
        {user?.email === 'new_user@mock.com' && (
          <div className="fade-in" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E3A8A', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.25rem' }}>💡</span>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.5 }}>
              가입 절차 체험이 완료되었습니다! <br/>
              전체적인 학생 기능을 모두 둘러보시려면 우측 상단 프로필을 눌러 <strong>[로그아웃]</strong> 하신 후, 로그인 화면 하단의 <strong>[목업 학생 계정(김서준 등)]</strong>을 클릭하여 접속해 주세요.
            </div>
          </div>
        )}

        <div style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-xs)' }}>
              안녕하세요, {profile?.displayName || user.email}님! 👋
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '1rem' }}>
              오늘도 완전 학습에 도전해 보세요.
            </p>
          </div>
          
          {(() => {
            const totalExp = scores.reduce((sum, s) => sum + (s.total_score || 0), 0);
            const currentLevel = Math.floor(totalExp / 1000) + 1;
            const expInCurrentLevel = totalExp % 1000;
            const progressPercent = (expInCurrentLevel / 1000) * 100;
            
            return (
              <div className="card" style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', minWidth: '240px', padding: 'var(--spacing-md)' }}>
                <div style={{ textAlign: 'center', background: 'var(--color-bg-secondary)', padding: 'var(--spacing-sm)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>내 레벨</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>Lv.{currentLevel}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 'var(--spacing-xs)', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                    <span>EXP</span>
                    <span style={{ color: 'var(--color-primary)' }}>{expInCurrentLevel} <span style={{ color: 'var(--color-text-muted)' }}>/ 1000</span></span>
                  </div>
                  <div className="progress-bar-track" style={{ background: 'var(--color-border-default)', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                    <div className="progress-bar-fill" style={{ width: `${progressPercent}%`, background: 'var(--color-primary)', height: '100%', transition: 'width 0.5s ease-out' }}></div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {!profile?.classId ? (
          <div className="card" style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', marginTop: 'var(--spacing-xl)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 'var(--spacing-sm)' }}>🏫 아직 수업에 등록되지 않았습니다.</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-lg)' }}>선생님께서 알려주신 6자리 참여 코드를 입력해주세요.</p>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', maxWidth: 400, margin: '0 auto' }}>
              <input 
                className="form-input" 
                placeholder="참여 코드 6자리" 
                value={classCodeInput} 
                onChange={e => setClassCodeInput(e.target.value)} 
                maxLength={6}
                style={{ flex: 1, textAlign: 'center', fontSize: '1.25rem', letterSpacing: '4px', fontWeight: 700 }}
              />
              <button className="btn btn-primary" onClick={handleJoinClass} disabled={joining || classCodeInput.length < 6}>
                {joining ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 'var(--spacing-md)' }}>
              📖 오늘의 학습 콘텐츠
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 'var(--spacing-xl)', alignItems: 'start' }}>
              
              {/* Sidebar Menu */}
              <div className="card" style={{ padding: 'var(--spacing-md)', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)', padding: '0 var(--spacing-sm)' }}>수업별 모아보기</h3>
                {subjects.map(subject => (
                  <button 
                    key={subject} 
                    onClick={() => setSelectedSubject(subject)}
                    style={{
                      textAlign: 'left',
                      padding: 'var(--spacing-sm)',
                      background: selectedSubject === subject ? 'var(--color-primary-light)' : 'transparent',
                      color: selectedSubject === subject ? 'var(--color-primary)' : 'var(--color-text-primary)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      fontWeight: selectedSubject === subject ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '0.9375rem'
                    }}
                  >
                    {subject === '전체' ? '🌐 전체 학습' : `📚 ${subject}`}
                  </button>
                ))}
              </div>

              {/* Main Content List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                {filteredContents.length === 0 ? (
                  <div className="card" style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    선택한 수업에 배포된 학습 콘텐츠가 아직 없습니다.
                  </div>
                ) : (
                  <>
                    {topics.map(topic => {
                      const topicContents = filteredContents.filter(c => c.topicId === topic.id);
                      if (topicContents.length === 0) return null;
                      return (
                        <div key={topic.id}>
                          <h4 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-primary)', marginBottom: 'var(--spacing-sm)', paddingBottom: 'var(--spacing-xs)', borderBottom: '2px solid var(--color-primary)' }}>
                            {topic.name}
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            {topicContents.map(content => {
                              const isCompleted = scores.find(s => s.contentId === content.id)?.total_score !== undefined;
                              return (
                                <div key={content.id} className="card" style={{ padding: 'var(--spacing-lg)', opacity: isCompleted ? 0.9 : 1, transition: 'all 0.2s ease', position: 'relative' }}>
                                  <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)', alignItems: 'center' }}>
                                      <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>{content.subject}</span>
                                      <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', borderRadius: 'var(--radius-full)', fontWeight: 500 }}>{content.unit}</span>
                                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button className="btn btn-secondary" onClick={() => setSelectedLeaderboardContent(content)} style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#fff', border: '1px solid var(--color-border-default)', height: 'auto', minHeight: 'unset', borderRadius: 'var(--radius-full)' }}>🏆 랭킹</button>
                                        {isCompleted && <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: 'var(--radius-full)', fontWeight: 800 }}>✅ 완료</span>}
                                      </div>
                                    </div>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{content.title}</h3>
                                  </div>
                                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <button className="btn btn-secondary" onClick={() => router.push(`/student/learn/${content.id}/step1`)} style={{ fontSize: '0.8125rem', padding: '6px 12px' }}><span>⌨️ 1단계 본문 타자 학습</span></button>
                                    <span style={{ color: 'var(--color-border-default)' }}>›</span>
                                    <button className="btn btn-primary" onClick={() => router.push(`/student/learn/${content.id}/step2`)} style={{ fontSize: '0.8125rem', padding: '6px 12px' }}><span>📝 2단계 핵심 어휘 학습</span></button>
                                    <span style={{ color: 'var(--color-border-default)' }}>›</span>
                                    <button className="btn btn-sparkle" onClick={() => router.push(`/student/learn/${content.id}/step3`)} style={{ fontSize: '0.8125rem', padding: '6px 12px' }}><span>✨ 3단계 단원 종합 퀴즈</span></button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}

                    {filteredContents.filter(c => !c.topicId).length > 0 && (
                      <div>
                        {topics.length > 0 && <h4 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-sm)', paddingBottom: 'var(--spacing-xs)', borderBottom: '2px solid var(--color-border-default)' }}>미분류 학습 콘텐츠</h4>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                          {filteredContents.filter(c => !c.topicId).map(content => {
                            const isCompleted = scores.find(s => s.contentId === content.id)?.total_score !== undefined;
                            return (
                              <div key={content.id} className="card" style={{ padding: 'var(--spacing-lg)', opacity: isCompleted ? 0.9 : 1, transition: 'all 0.2s ease', position: 'relative' }}>
                                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>{content.subject}</span>
                                    <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', borderRadius: 'var(--radius-full)', fontWeight: 500 }}>{content.unit}</span>
                                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <button className="btn btn-secondary" onClick={() => setSelectedLeaderboardContent(content)} style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#fff', border: '1px solid var(--color-border-default)', height: 'auto', minHeight: 'unset', borderRadius: 'var(--radius-full)' }}>🏆 랭킹</button>
                                      {isCompleted && <span style={{ fontSize: '0.75rem', padding: '4px 10px', background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: 'var(--radius-full)', fontWeight: 800 }}>✅ 완료</span>}
                                    </div>
                                  </div>
                                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{content.title}</h3>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <button className="btn btn-secondary" onClick={() => router.push(`/student/learn/${content.id}/step1`)} style={{ fontSize: '0.8125rem', padding: '6px 12px' }}><span>⌨️ 1단계 본문 타자 학습</span></button>
                                  <span style={{ color: 'var(--color-border-default)' }}>›</span>
                                  <button className="btn btn-primary" onClick={() => router.push(`/student/learn/${content.id}/step2`)} style={{ fontSize: '0.8125rem', padding: '6px 12px' }}><span>📝 2단계 핵심 어휘 학습</span></button>
                                  <span style={{ color: 'var(--color-border-default)' }}>›</span>
                                  <button className="btn btn-sparkle" onClick={() => router.push(`/student/learn/${content.id}/step3`)} style={{ fontSize: '0.8125rem', padding: '6px 12px' }}><span>✨ 3단계 단원 종합 퀴즈</span></button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {selectedLeaderboardContent && (
        <LeaderboardModal 
          contentId={selectedLeaderboardContent.id} 
          contentTitle={selectedLeaderboardContent.title}
          onClose={() => setSelectedLeaderboardContent(null)} 
        />
      )}
    </div>
  );
}

