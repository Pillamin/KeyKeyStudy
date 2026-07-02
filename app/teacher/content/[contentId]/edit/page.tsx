'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { getContentDoc, updateContent, getClassesByTeacher, createContent, getClassDoc, updateClass } from '@/lib/firebase/queries';
import type { ContentDoc, ClassDoc } from '@/lib/firebase/types';
import Navbar from '@/components/layout/Navbar';

export default function EditContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { user, profile, logout } = useAuth();
  
  const contentId = params.contentId as string;
  const fromClass = searchParams.get('from') === 'class';
  
  const [contentDoc, setContentDoc] = useState<ContentDoc | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  
  const [step1List, setStep1List] = useState<string[]>([]);
  const [step2List, setStep2List] = useState<any[]>([]);
  const [step3List, setStep3List] = useState<any[]>([]);

  const [draggedItem, setDraggedItem] = useState<{step: number, index: number} | null>(null);
  const [draggableItem, setDraggableItem] = useState<{step: number, index: number} | null>(null);

  const handleDragStart = (e: React.DragEvent, step: number, index: number) => {
    setDraggedItem({ step, index });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, step: number, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.step !== step) return;
    const sourceIndex = draggedItem.index;
    if (sourceIndex === targetIndex) return;

    if (step === 1) {
      const newArr = [...step1List];
      const [movedItem] = newArr.splice(sourceIndex, 1);
      newArr.splice(targetIndex, 0, movedItem);
      setStep1List(newArr);
    } else if (step === 2) {
      const newArr = [...step2List];
      const [movedItem] = newArr.splice(sourceIndex, 1);
      newArr.splice(targetIndex, 0, movedItem);
      setStep2List(newArr);
    } else if (step === 3) {
      const newArr = [...step3List];
      const [movedItem] = newArr.splice(sourceIndex, 1);
      newArr.splice(targetIndex, 0, movedItem);
      setStep3List(newArr);
    }
    setDraggedItem({ step, index: targetIndex });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  useEffect(() => {
    if (!contentId) return;
    getContentDoc(contentId).then(doc => {
      if (doc) {
        setContentDoc(doc);
        setStep1List(doc.step1_text_list || []);
        setStep2List(doc.step2_keywords_list || []);
        setStep3List(doc.step3_quiz_list || []);
        setSelectedClassIds(doc.classIds || (doc.classId ? [doc.classId] : []));
      }
      setLoading(false);
    });
  }, [contentId]);

  useEffect(() => {
    if (user?.email) {
      getClassesByTeacher(user.email).then(setClasses);
    }
  }, [user]);

  const toggleClassSelection = (id: string) => {
    if (selectedClassIds.includes(id)) {
      setSelectedClassIds(selectedClassIds.filter(c => c !== id));
    } else {
      setSelectedClassIds([...selectedClassIds, id]);
    }
  };

  const handleSave = async (publish = false) => {
    setSaving(true);
    try {
      const updateData: any = {
        step1_text_list: step1List,
        step2_keywords_list: step2List,
        step3_quiz_list: step3List,
      };

      // Always save current content modifications
      await updateContent(contentId, updateData);
      
      if (publish && !fromClass) {
        // Deploy as independent copies
        for (const classId of selectedClassIds) {
          const classCopyData: any = {
            ...contentDoc,
            ...updateData,
            classId,
            classIds: [],
            status: 'published',
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          delete classCopyData.id;
          delete classCopyData.type;
          delete classCopyData.folderId; // Copies do not belong to library folders
          
          const newId = await createContent(classCopyData);
          
          // Add to class's contentOrder
          const classDoc = await getClassDoc(classId);
          if (classDoc) {
            const newOrder = classDoc.contentOrder ? [...classDoc.contentOrder, newId] : [newId];
            await updateClass(classId, { contentOrder: newOrder });
          }
        }
        setShowPublishModal(false);
        router.push('/teacher/dashboard');
      } else {
        alert('저장되었습니다.');
      }
    } catch (err) {
      console.error(err);
      alert('저장 중 오류가 발생했습니다.');
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;
  if (!contentDoc) return <div style={{ padding: 20 }}>콘텐츠를 찾을 수 없습니다.</div>;

  return (
    <div className="page-wrapper" style={{ background: 'var(--color-bg-secondary)', minHeight: '100vh' }}>
      <Navbar roleLabel="선생님" dashboardPath="/teacher/dashboard" />

      <main className="container" style={{ flex: 1, padding: 'var(--spacing-lg)', maxWidth: 860, margin: '0 auto', width: '100%' }}>
        <a onClick={() => router.back()} style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 'var(--spacing-md)' }}>← 뒤로</a>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xl)' }}>
          <div>
            <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 4 }}>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>{contentDoc.subject}</span>
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#FEF3C7', color: '#92400E', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>{contentDoc.status === 'draft' ? '임시저장' : '배포됨'}</span>
            </div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{contentDoc.unit} - {contentDoc.title}</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: 4 }}>AI가 PDF를 분석하여 추출한 내용입니다. 필요 시 직접 수정할 수 있습니다.</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <button className="btn btn-secondary" onClick={() => handleSave(false)} disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
            {!fromClass && (
              <button className="btn btn-primary" onClick={() => setShowPublishModal(true)}>🚀 배포</button>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          
          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <span className="step-badge active" style={{ background: 'var(--color-text-primary)' }}>1</span> 본문 타자 문장 (추출 완료)
            </h2>
            {step1List.map((line, index) => (
              <div 
                key={index} 
                draggable={draggableItem?.step === 1 && draggableItem?.index === index}
                onDragStart={(e) => handleDragStart(e, 1, index)}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, 1, index)}
                onDragEnd={handleDragEnd}
                style={{ 
                  display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)', 
                  opacity: draggedItem?.step === 1 && draggedItem?.index === index ? 0.5 : 1,
                  background: 'var(--color-bg-primary)', padding: 'var(--spacing-xs)', borderRadius: 'var(--radius-md)'
                }}
              >
                <div 
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'grab', color: 'var(--color-text-muted)' }}
                  onMouseEnter={() => setDraggableItem({step: 1, index})}
                  onMouseLeave={() => setDraggableItem(null)}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 4 }}>{index + 1}</span>
                  <span style={{ fontSize: '1.25rem' }}>☰</span>
                </div>
                <textarea 
                  className="form-input" 
                  value={line} 
                  rows={3}
                  onChange={(e) => {
                    const newArr = [...step1List];
                    newArr[index] = e.target.value;
                    setStep1List(newArr);
                  }} 
                  style={{ flex: 1, resize: 'vertical', lineHeight: '1.6' }} 
                />
                <button onClick={() => setStep1List(step1List.filter((_, i) => i !== index))} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: '1rem', alignSelf: 'flex-start', marginTop: 'var(--spacing-xs)' }} title="삭제">✕</button>
              </div>
            ))}
            <button onClick={() => setStep1List([...step1List, "새 문장"])} className="btn btn-ghost" style={{ fontSize: '0.875rem', marginTop: 'var(--spacing-xs)' }}>+ 줄 추가</button>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <span className="step-badge active" style={{ background: 'var(--color-text-primary)' }}>2</span> 핵심 어휘 추출
            </h2>
            {step2List.map((item, index) => (
              <div 
                key={index} 
                draggable={draggableItem?.step === 2 && draggableItem?.index === index}
                onDragStart={(e) => handleDragStart(e, 2, index)}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, 2, index)}
                onDragEnd={handleDragEnd}
                style={{ 
                  display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)', alignItems: 'center',
                  opacity: draggedItem?.step === 2 && draggedItem?.index === index ? 0.5 : 1,
                  background: 'var(--color-bg-primary)', padding: 'var(--spacing-xs)', borderRadius: 'var(--radius-md)'
                }}
              >
                <div 
                  style={{ cursor: 'grab', color: 'var(--color-text-muted)', fontSize: '1.25rem', padding: '0 4px' }}
                  onMouseEnter={() => setDraggableItem({step: 2, index})}
                  onMouseLeave={() => setDraggableItem(null)}
                >☰</div>
                <input className="form-input" value={item.keyword} onChange={(e) => {
                  const newArr = [...step2List];
                  newArr[index].keyword = e.target.value;
                  setStep2List(newArr);
                }} style={{ width: 140 }} />
                <input className="form-input" value={item.description} onChange={(e) => {
                  const newArr = [...step2List];
                  newArr[index].description = e.target.value;
                  setStep2List(newArr);
                }} style={{ flex: 1 }} />
                <button onClick={() => setStep2List(step2List.filter((_, i) => i !== index))} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: '1rem' }} title="삭제">✕</button>
              </div>
            ))}
            <button onClick={() => setStep2List([...step2List, {keyword: '새 단어', description: '설명'}])} className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>+ 어휘 추가</button>
          </div>

          <div className="card">
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <span className="step-badge active" style={{ background: 'var(--color-text-primary)' }}>3</span> AI 자동 생성 퀴즈
            </h2>
            {step3List.map((quiz, index) => (
              <div 
                key={index} 
                draggable={draggableItem?.step === 3 && draggableItem?.index === index}
                onDragStart={(e) => handleDragStart(e, 3, index)}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, 3, index)}
                onDragEnd={handleDragEnd}
                style={{ 
                  border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)',
                  opacity: draggedItem?.step === 3 && draggedItem?.index === index ? 0.5 : 1,
                  background: 'var(--color-bg-primary)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div 
                      style={{ cursor: 'grab', color: 'var(--color-text-muted)', fontSize: '1.25rem' }}
                      onMouseEnter={() => setDraggableItem({step: 3, index})}
                      onMouseLeave={() => setDraggableItem(null)}
                    >☰</div>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: '#FEF3C7', color: '#92400E', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>단어 맞추기 #{index + 1}</span>
                  </div>
                  <button onClick={() => setStep3List(step3List.filter((_, i) => i !== index))} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', fontSize: '1rem' }} title="삭제">✕</button>
                </div>
                <input className="form-input" value={quiz.question} onChange={(e) => {
                  const newArr = [...step3List];
                  newArr[index].question = e.target.value;
                  setStep3List(newArr);
                }} style={{ marginBottom: 'var(--spacing-sm)' }} />
                
                {quiz.options && quiz.options.map((opt: string, optIndex: number) => (
                  <div key={optIndex} style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 4, alignItems: 'center' }}>
                    <input type="radio" name={`quiz-${index}`} checked={quiz.answer === (optIndex + 1)} readOnly />
                    <input className="form-input" value={opt} onChange={(e) => {
                      const newArr = [...step3List];
                      newArr[index].options[optIndex] = e.target.value;
                      setStep3List(newArr);
                    }} style={{ flex: 1 }} />
                  </div>
                ))}
                
                <input className="form-input" value={quiz.explanation || ''} onChange={(e) => {
                  const newArr = [...step3List];
                  newArr[index].explanation = e.target.value;
                  setStep3List(newArr);
                }} placeholder="해설을 입력하세요" style={{ marginTop: 'var(--spacing-sm)' }} />
              </div>
            ))}
            <button onClick={() => setStep3List([...step3List, {type: 'multiple_choice', question: '새 문제', options: ['보기1', '보기2'], answer: 1, explanation: ''}])} className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>+ 퀴즈 추가</button>
          </div>

        </div>

        {showPublishModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="card" style={{ width: '90%', maxWidth: 400, padding: 'var(--spacing-xl)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 'var(--spacing-md)' }}>배포할 수업 선택</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--spacing-md)' }}>
                이 템플릿을 배포할 수업을 선택해주세요. 각 수업마다 독립된 복사본이 생성됩니다.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xl)', maxHeight: 200, overflowY: 'auto' }}>
                {classes.length === 0 ? (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>생성된 수업이 없습니다. 대시보드에서 수업을 먼저 개설해주세요.</div>
                ) : (
                  classes.map(c => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                      <input 
                        type="checkbox" 
                        checked={selectedClassIds.includes(c.id)}
                        onChange={() => toggleClassSelection(c.id)}
                        style={{ width: 18, height: 18 }}
                      />
                      <span style={{ fontWeight: 600 }}>{c.className}</span>
                    </label>
                  ))
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)' }}>
                <button className="btn btn-secondary" onClick={() => setShowPublishModal(false)}>취소</button>
                <button className="btn btn-primary" onClick={() => handleSave(true)} disabled={classes.length > 0 && selectedClassIds.length === 0}>
                  선택한 반에 배포
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
