'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

export default function RootPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (role === 'admin')   router.replace('/admin/users');
    else if (role === 'teacher') router.replace('/teacher/dashboard');
    else router.replace('/student/dashboard');
  }, [user, role, loading, router]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" style={{ width: 36, height: 36, borderColor: 'var(--color-border-default)', borderTopColor: 'var(--color-primary)' }} />
    </div>
  );
}
