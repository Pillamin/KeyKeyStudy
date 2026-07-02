'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Navigation } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastContext';
import { createClass } from '@/lib/firebase/queries';
import { Timestamp } from 'firebase/firestore';

function generateClassCode(): string { return Math.random().toString(36).toUpperCase().slice(2, 8); }

export default function NewClassPage() {
  return <ProtectedRoute allowedRoles={['teacher', 'admin']}><NewClassContent /></ProtectedRoute>;
}

function NewClassContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim() || !user?.email) return;
    setLoading(true);
    try {
      await createClass({
        className: className.trim(),
        classCode: generateClassCode(),
        createdBy: user.uid,
        createdByEmail: user.email,
        createdAt: Timestamp.now(),
      });
      showToast(`'${className}' 수업이 생성되었습니다.`, 'success');
      router.push('/teacher/dashboard');
    } catch { showToast('수업 생성에 실패했습니다.', 'error'); setLoading(false); }
  };

  return (
    <div className="page-wrapper">
      <Navigation />
      <main style={{ flex: 1, padding: 'var(--spacing-lg)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 'var(--spacing-2xl)' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ marginBottom: 'var(--spacing-xl)' }}>
            <a onClick={() => router.back()} style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 'var(--spacing-md)' }}>← 뒤로</a>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>수업 생성</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>새로운 수업을 개설합니다.</p>
          </div>
          <div className="card">
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
              <div className="form-group">
                <label htmlFor="className" className="form-label">수업 이름 <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input id="className" className="form-input" type="text" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="예: 3학년 1반, 과학 2반" required autoFocus />
              </div>
              <div style={{ background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-md)', padding: 'var(--spacing-md)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                <p>📌 수업 생성 후 <strong>수업 관리</strong> 페이지에서 학생 이메일로 학생을 배정할 수 있습니다.</p>
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                <Button variant="secondary" type="button" onClick={() => router.back()}>취소</Button>
                <Button variant="primary" type="submit" loading={loading} disabled={!className.trim()}>수업 생성</Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
