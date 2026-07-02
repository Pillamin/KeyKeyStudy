'use client';
import type { ReactNode } from 'react';
interface ModalProps { open: boolean; title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; }
export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
          <h2 id="modal-title" style={{ fontSize: '1.125rem', fontWeight: 700 }}>{title}</h2>
          <button onClick={onClose} aria-label="닫기" style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--color-text-muted)', lineHeight: 1 }}>✕</button>
        </div>
        <div>{children}</div>
        {footer && <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  );
}
