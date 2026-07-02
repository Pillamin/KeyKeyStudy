'use client';
import { useEffect, useState } from 'react';
import { flushQueue } from '@/lib/cache/localSync';
import { upsertScore } from '@/lib/firebase/queries';
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOffline = () => setIsOffline(true);
    const handleOnline = async () => {
      setIsOffline(false);
      await flushQueue(async (contentId, userId, data) => { await upsertScore(contentId, userId, data as Parameters<typeof upsertScore>[2]); });
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => { window.removeEventListener('offline', handleOffline); window.removeEventListener('online', handleOnline); };
  }, []);
  if (!isOffline) return null;
  return (
    <div className="offline-banner" role="status">
      <span>⚠️</span>
      <span>로컬 안전 저장 중 — 네트워크 연결이 끊겼습니다.</span>
    </div>
  );
}
