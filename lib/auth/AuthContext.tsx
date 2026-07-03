'use client';
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { WhitelistDoc, UserRole } from '@/lib/firebase/types';
import { auth, googleProvider } from '@/lib/firebase/client';
import { signInWithPopup, signInWithEmailAndPassword, signInAnonymously, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { getWhitelistDoc, createWhitelistDoc } from '@/lib/firebase/queries';
import { Modal } from '@/components/ui/Modal';

interface AuthContextValue {
  user: User | null;
  profile: WhitelistDoc | null;
  role: UserRole | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsMock: (role: UserRole, email: string, name: string, options?: any) => Promise<void>;
  loginAsNewMock: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<WhitelistDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorAlert, setErrorAlert] = useState<{ title: string; message: string } | null>(null);

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
      await signInAnonymously(auth);
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
          data.classIds = [];
        }
        await createWhitelistDoc(email, data);
        doc = await getWhitelistDoc(email);
      }
      const mockSession = { email, profile: doc };
      localStorage.setItem('eduapp_mock_session', JSON.stringify(mockSession));
      document.cookie = 'auth=true; path=/; max-age=86400';
      setUser({ email, uid: email } as User);
      setProfile(doc);
      if (role === 'admin') window.location.href = '/admin/users';
      else if (role === 'teacher') window.location.href = '/teacher/dashboard';
      else window.location.href = '/student/dashboard';
    } catch (error: any) {
      console.error(error);
      alert('목업 로그인 실패: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loginAsNewMock = async () => {
    setLoading(true);
    try {
      const email = 'demo@mock.com';
      // Firebase에 실제로 로그인 시도 (사전에 Firebase Console에서 생성 필요)
      const credential = await signInWithEmailAndPassword(auth, email, 'demo2026!');
      const firebaseUser = credential.user;
      
      try {
        await deleteDoc(doc(db, 'whitelist', email));
      } catch (e) {
        console.error('Failed to reset mock profile', e);
      }
      
      const mockSession = { email, profile: null };
      localStorage.setItem('eduapp_mock_session', JSON.stringify(mockSession));
      document.cookie = 'auth=true; path=/; max-age=86400';
      setUser({ email, uid: firebaseUser.uid, displayName: '최초 로그인 교사 테스트' } as any);
      setProfile(null);
      
      window.location.href = '/signup';
    } catch (err: any) {
      console.error('Demo login error:', err);
      setErrorAlert({
        title: '체험용 계정 설정 안내',
        message: '체험용 계정 로그인을 위해 Firebase 콘솔에서 demo@mock.com (비밀번호: demo2026!) 계정을 생성하고 이메일/비밀번호 로그인을 활성화해 주세요!'
      });
    } finally {
      setLoading(false);
    }
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
      <Modal open={!!errorAlert} title={errorAlert?.title || '오류'} onClose={() => setErrorAlert(null)} footer={
        <button className="btn btn-primary" onClick={() => setErrorAlert(null)}>확인</button>
      }>
        <p style={{ whiteSpace: 'pre-wrap' }}>{errorAlert?.message}</p>
      </Modal>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
