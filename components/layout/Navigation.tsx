'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import type { UserRole } from '@/lib/firebase/types';
export function Navigation() {
  const { user, profile, role, logout } = useAuth();
  const router = useRouter();
  const roleLabel: Record<UserRole, string> = { admin: '관리자', teacher: '교사', student: '학생' };
  const navLinks: Record<string, { href: string; label: string }[]> = {
    admin: [{ href: '/admin/users', label: '사용자 관리' }, { href: '/teacher/dashboard', label: '교사 대시보드' }],
    teacher: [{ href: '/teacher/dashboard', label: '내 수업' }, { href: '/teacher/classes/new', label: '수업 생성' }],
    student: [{ href: '/student/dashboard', label: '학습 목록' }],
  };
  const links = role ? navLinks[role] ?? [] : [];
  return (
    <nav className="nav" role="navigation">
      <div className="nav-logo"><span>📚</span><span>AI 학습</span></div>
      <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
        {links.map((link) => (
          <a key={link.href} href={link.href} style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 500, padding: '4px 8px', borderRadius: 'var(--radius-sm)', transition: 'all var(--transition-base)' }}>{link.label}</a>
        ))}
      </div>
      {user && (
        <div className="nav-user">
          <span style={{ fontSize: '0.75rem', padding: '3px 8px', background: 'var(--color-primary-light)', color: 'var(--color-primary)', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>{role ? roleLabel[role as UserRole] : ''}</span>
          <span style={{ fontWeight: 500 }}>{profile?.displayName ?? user.displayName}</span>
          <button className="btn btn-ghost" onClick={async () => { await logout(); router.push('/login'); }} style={{ fontSize: '0.8125rem', padding: '4px 10px' }}>로그아웃</button>
        </div>
      )}
    </nav>
  );
}
