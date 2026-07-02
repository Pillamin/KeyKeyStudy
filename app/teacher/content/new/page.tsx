'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { getFoldersByTeacher, createContent } from '@/lib/firebase/queries';
import type { FolderDoc } from '@/lib/firebase/types';
import Navbar from '@/components/layout/Navbar';

export default function NewContent() {
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [analyzing, setAnalyzing] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageRange, setPageRange] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [folders, setFolders] = useState<FolderDoc[]>([]);
  const [folderId, setFolderId] = useState('none');
  const [subject, setSubject] = useState('');
  const [unit, setUnit] = useState('');
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (user?.uid) {
      getFoldersByTeacher(user.uid).then(setFolders);
    }
  }, [user]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !pageRange || !subject || !unit || !title || !user?.uid) {
      setErrorMsg('모든 필수 항목을 입력해주세요.');
      return;
    }

    setAnalyzing(true);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('pageRange', pageRange);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || '분석 중 오류가 발생했습니다.');
      }

      if (!res.body) throw new Error('응답 스트림이 없습니다.');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let resultText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resultText += decoder.decode(value, { stream: true });
      }

      const cleanedText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      let data;
      try {
        data = JSON.parse(cleanedText);
        if (data.result && !data.step1_text_list) data = data.result;
      } catch (e) {
        console.error(e, resultText);
        throw new Error('AI가 유효한 데이터를 생성하지 못했습니다.');
      }

      // Create draft content in Firestore
      const newContentId = await createContent({
        classIds: [],
        ...(folderId !== 'none' && { folderId }),
        subject,
        unit,
        title,
        status: 'draft',
        step1_text_list: data.step1_text_list || [],
        step2_keywords_list: data.step2_keywords_list || [],
        step3_quiz_list: data.step3_quiz_list || [],
        createdBy: user.uid,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      });
      
      router.push(`/teacher/content/${newContentId}/edit`);
    } catch (err: any) {
      setErrorMsg(err.message);
      setAnalyzing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPdfFile(file);
  };

  return (
    <div className="page-wrapper" style={{ background: 'var(--color-bg-secondary)' }}>
      <Navbar roleLabel="선생님" dashboardPath="/teacher/dashboard" />

      <main className="container" style={{ flex: 1, padding: 'var(--spacing-lg)', maxWidth: 720, margin: '0 auto', width: '100%' }}>
        <a onClick={() => router.back()} style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 'var(--spacing-md)' }}>← 뒤로</a>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-primary)' }}>✨ AI 학습 콘텐츠 생성</h1>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)' }}>교과서 PDF를 업로드하고 페이지 범위를 지정하면 Gemini AI가 내용을 추출하여 학습 콘텐츠를 자동 생성합니다.</p>

        {analyzing ? (
          <div className="card" style={{ padding: 'var(--spacing-2xl)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--spacing-sm)' }}>🤖</div>
            <p style={{ fontWeight: 700, marginBottom: 'var(--spacing-xs)', color: 'var(--color-primary)' }}>PDF 텍스트 추출 및 AI 분석 중입니다...</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>문서 크기에 따라 시간이 소요될 수 있습니다.</p>
            
            <div className="progress-bar-track" style={{ maxWidth: 400, margin: '0 auto' }}>
              <div className="progress-bar-fill" style={{ width: '50%', background: 'var(--color-primary)' }} />
            </div>
          </div>
        ) : (
          <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            
            {errorMsg && (
              <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-error-bg)', color: 'var(--color-error-text)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-error)' }}>
                {errorMsg}
              </div>
            )}

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>📋 기본 정보</h2>
              
              <div className="form-group" style={{ marginBottom: 'var(--spacing-xs)' }}>
                <label className="form-label" style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>라이브러리 폴더</label>
                <select className="form-select" value={folderId} onChange={e => setFolderId(e.target.value)}>
                  <option value="none">선택 안 함 (모든 콘텐츠)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>생성된 콘텐츠가 저장될 라이브러리 폴더를 선택합니다.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>과목 <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input className="form-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="예: 국어, 과학" required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>단원 <span style={{ color: 'var(--color-error)' }}>*</span></label>
                  <input className="form-input" value={unit} onChange={e => setUnit(e.target.value)} placeholder="예: 3. 자석의 이용" required />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>차시 제목 <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="예: 1차시. 자석이 붙는 물체" required />
              </div>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>📄 교과서 PDF 업로드</h2>
              
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>단원 교과서 PDF <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <div style={{ border: pdfFile ? '2px solid var(--color-primary)' : '2px dashed var(--color-border-default)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-lg)', textAlign: 'center', cursor: 'pointer', background: 'var(--color-bg-primary)' }} onClick={() => fileInputRef.current?.click()}>
                  <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileChange} required />
                  <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{pdfFile ? '📄' : '📎'}</div>
                  <p style={{ fontSize: '0.875rem', color: pdfFile ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                    {pdfFile ? pdfFile.name : 'PDF 파일을 드래그하거나 클릭하여 업로드 (필수)'}
                  </p>
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, color: 'var(--color-text-secondary)' }}>추출할 페이지 범위 <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input type="text" className="form-input" value={pageRange} onChange={(e) => setPageRange(e.target.value)} placeholder="예: 12-15" required />
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>지정된 페이지의 텍스트를 AI가 자동 추출하여 콘텐츠를 생성합니다.</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-error)', marginTop: 4, fontWeight: 600 }}>※ 교과서에 인쇄된 쪽수가 아닌, PDF 파일 자체의 쪽수 기준으로 입력해주세요.</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)' }}>
              <button className="btn btn-secondary" type="button" onClick={() => router.back()}>취소</button>
              <button className="btn btn-sparkle" type="submit" disabled={!pdfFile}>✨ AI 내용 추출 및 콘텐츠 생성</button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
