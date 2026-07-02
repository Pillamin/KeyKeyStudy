'use client';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { WhitelistDoc, UserRole } from '@/lib/firebase/types';
import { auth, googleProvider } from '@/lib/firebase/client';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getWhitelistDoc } from '@/lib/firebase/queries';

interface AuthContextValue {
  user: User | null;
  profile: WhitelistDoc | null;
  role: UserRole | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsMock: (role: UserRole, email: string, name: string, options?: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<WhitelistDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for mock session first
    const mockSessionStr = localStorage.getItem('eduapp_mock_session');
    if (mockSessionStr) {
      try {
        const mockSession = JSON.parse(mockSessionStr);
        setUser({ email: mockSession.email, uid: mockSession.email } as User);
        setProfile(mockSession.profile);
        document.cookie = 'auth=true; path=/; max-age=86400';
        setLoading(false);
        return;
      } catch (err) {
        console.error(err);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Don't override if mock session exists
      if (localStorage.getItem('eduapp_mock_session')) return;
      
      setUser(firebaseUser);
      if (firebaseUser?.email) {
        document.cookie = 'auth=true; path=/; max-age=86400';
        const doc = await getWhitelistDoc(firebaseUser.email);
        setProfile(doc);
      } else {
        document.cookie = 'auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google login failed:', err);
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        alert('구글 로그인에 실패했습니다. Firebase 콘솔에서 Authentication -> Sign-in method -> Google 제공업체가 사용 설정되어 있는지 확인해 주세요.\n\n에러 상세: ' + err.message);
      }
      setLoading(false);
    }
  };

  const loginAsMock = async (role: UserRole, email: string, name: string, options?: any) => {
    setLoading(true);
    try {
      const { createWhitelistDoc, getWhitelistDoc } = await import('@/lib/firebase/queries');
      let doc = await getWhitelistDoc(email);
      if (!doc) {
        const ts = { seconds: Math.floor(new Date('2026-07-01').getTime() / 1000), nanoseconds: 0 } as any;
        const data: any = { role, displayName: name, email, registeredAt: ts };
        if (role === 'teacher') {
          data.homeroom = options?.homeroom || '테스트 반';
          data.subject = options?.subject || '테스트 과목';
        } else {
          data.grade = options?.grade || '3';
          data.classNumber = options?.classNumber || '1';
          data.studentNumber = options?.studentNumber || (email.replace(/[^0-9]/g, '') || '1');
        }
        await createWhitelistDoc(email, data);
        doc = await getWhitelistDoc(email);
      }
      const mockSession = { email, profile: doc };
      localStorage.setItem('eduapp_mock_session', JSON.stringify(mockSession));
      document.cookie = 'auth=true; path=/; max-age=86400';
      setUser({ email, uid: email } as User);
      setProfile(doc);
    } catch (err: any) {
      console.error('Mock login error:', err);
      alert('데이터베이스 연결 또는 권한 문제가 발생했습니다. Firebase 콘솔의 Firestore 보안 규칙을 확인해주세요.\n\n에러 상세: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loginAsNewMock = () => {
    setLoading(true);
    const email = 'new_user@mock.com';
    const mockSession = { email, profile: null };
    localStorage.setItem('eduapp_mock_session', JSON.stringify(mockSession));
    document.cookie = 'auth=true; path=/; max-age=86400';
    setUser({ email, uid: email, displayName: '최초 로그인 교사 테스트' } as any);
    setProfile(null);
    setLoading(false);
  };

  const logout = async () => {
    localStorage.removeItem('eduapp_mock_session');
    document.cookie = 'auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    await signOut(auth);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, profile, role: profile?.role ?? null, loading, loginWithGoogle, loginAsMock, loginAsNewMock, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
