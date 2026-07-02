import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { ToastProvider } from '@/components/ui/ToastContext';
import { ViewportProvider } from '@/components/layout/ViewportProvider';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'KeyKeyStudy - AI 성장형 완전 학습 서비스',
  description: '키보드(Key)로 핵심 내용(Key)을 배우는 교과서 기반 AI 3단계 타자·퀴즈 학습 서비스입니다.',
  keywords: '교육, AI, 타자, 퀴즈, 학습, 교과서, KeyKeyStudy',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          <ToastProvider>
            <ViewportProvider>
              <OfflineBanner />
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <main style={{ flex: 1 }}>{children}</main>
                <Footer />
              </div>
            </ViewportProvider>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
