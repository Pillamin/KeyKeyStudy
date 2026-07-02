'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import type { UserRole } from '@/lib/firebase/types';
interface ProtectedRouteProps { allowedRoles: UserRole[]; children: React.ReactNode; }
export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    if (!allowedRoles.includes(role as UserRole)) {
      if (role === 'admin') router.replace('/admin/users');
      else if (role === 'teacher') router.replace('/teacher/dashboard');
      else router.replace('/student/dashboard');
    }
  }, [user, role, loading, router, allowedRoles]);
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(var(--vh, 1vh) * 100)' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3, borderColor: 'var(--color-border-default)', borderTopColor: 'var(--color-primary)', margin: '0 auto 16px' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>인증 확인 중...</p>
      </div>
    </div>
  );
  if (!user || (role && !allowedRoles.includes(role as UserRole))) return null;
  return <>{children}</>;
}
