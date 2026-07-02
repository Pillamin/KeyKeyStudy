'use client';
import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
type ToastType = 'success' | 'error' | 'warning';
interface Toast { id: string; message: string; type: ToastType; exiting?: boolean; }
interface ToastContextValue { showToast: (message: string, type?: ToastType) => void; }
const ToastContext = createContext<ToastContextValue | null>(null);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, exiting: true } : t));
      setTimeout(() => { setToasts((prev) => prev.filter((t) => t.id !== id)); }, 300);
    }, 3000);
  }, []);
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container" role="alert" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type} ${toast.exiting ? 'exit' : ''}`}>
            <span>{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '⚠️'}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
