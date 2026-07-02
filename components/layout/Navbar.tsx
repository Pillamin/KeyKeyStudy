'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';

export default function Navbar({ roleLabel, dashboardPath }: { roleLabel: string, dashboardPath: string }) {
  const router = useRouter();
  const { user, profile, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="nav" style={{ boxShadow: 'var(--shadow-sm)', borderBottom: '1px solid var(--color-border-default)', padding: 'var(--spacing-md) var(--spacing-lg)', display: 'flex', justifyContent: 'space-between', background: 'var(--color-bg-primary)', position: 'relative', zIndex: 100 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        <Link href={dashboardPath} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.25rem' }}>⌨️</span>
          <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>KeyKeyStudy</span>
        </Link>
        <button onClick={() => router.push(dashboardPath)} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.875rem', display: 'flex', gap: 4, alignItems: 'center' }}>
          <span>🏠</span> 홈으로
        </button>
        <button onClick={() => router.back()} className="btn btn-secondary" style={{ padding: '6px 10px', fontSize: '0.875rem', display: 'flex', gap: 4, alignItems: 'center' }}>
          <span>←</span> 뒤로가기
        </button>
      </div>
      
      <div style={{ position: 'relative' }} ref={menuRef}>
        <div 
          className="nav-user" 
          onClick={() => setMenuOpen(!menuOpen)} 
          style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer', padding: '6px 12px', borderRadius: 'var(--radius-md)', transition: 'background 0.2s', background: menuOpen ? 'var(--color-bg-secondary)' : 'transparent' }} 
          onMouseOver={e => !menuOpen && (e.currentTarget.style.background='var(--color-bg-secondary)')} 
          onMouseOut={e => !menuOpen && (e.currentTarget.style.background='transparent')}
        >
          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{profile?.displayName || user?.email}</span>
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
            {profile?.displayName?.includes(roleLabel) ? '' : roleLabel}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 4 }}>▼</span>
        </div>

        {menuOpen && (
          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', minWidth: '180px', padding: 'var(--spacing-xs)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--color-border-default)', marginBottom: 4 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{profile?.displayName || user?.email}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{user?.email}</div>
            </div>

            <button 
              onClick={() => router.push(roleLabel === '교사' || roleLabel === '선생님' ? '/teacher/mypage' : '/student/mypage')} 
              style={{ padding: '8px 12px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: 'var(--color-text-primary)', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '8px' }}
              onMouseOver={e => e.currentTarget.style.background='var(--color-bg-secondary)'}
              onMouseOut={e => e.currentTarget.style.background='transparent'}
            >
              👤 마이페이지
            </button>

            <button 
              onClick={logout} 
              style={{ padding: '8px 12px', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: 'var(--color-error)', transition: 'background 0.2s' }}
              onMouseOver={e => e.currentTarget.style.background='var(--color-error-bg)'}
              onMouseOut={e => e.currentTarget.style.background='transparent'}
            >
              🚪 로그아웃
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
