'use client';
import { useState, useEffect } from 'react';

export default function Footer() {
  const [modalContent, setModalContent] = useState<'terms' | 'privacy' | null>(null);
  const [termsText, setTermsText] = useState('');
  const [privacyText, setPrivacyText] = useState('');

  useEffect(() => {
    if (modalContent) {
      fetch(`/api/legal?type=${modalContent}`)
        .then(res => res.text())
        .then(text => {
          if (modalContent === 'terms') setTermsText(text);
          else setPrivacyText(text);
        });
    }
  }, [modalContent]);

  return (
    <>
      <footer style={{ background: 'var(--color-bg-primary)', borderTop: '1px solid var(--color-border-default)', padding: 'var(--spacing-md) 0', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--spacing-md)', marginBottom: '8px' }}>
          <button onClick={() => setModalContent('terms')} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.875rem' }}>이용약관</button>
          <button onClick={() => setModalContent('privacy')} style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.875rem' }}>개인정보처리방침</button>
        </div>
        <p>© 2026 KeyKeyStudy. All rights reserved.</p>
      </footer>

      {modalContent && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 'var(--spacing-lg)' }}>
          <div className="card fade-in" style={{ width: '100%', maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 'var(--spacing-xl)', position: 'relative' }}>
            <button onClick={() => setModalContent(null)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-secondary)' }}>✕</button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--spacing-md)' }}>
              {modalContent === 'terms' ? '이용약관' : '개인정보처리방침'}
            </h2>
            <div style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg-secondary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              {modalContent === 'terms' ? termsText : privacyText}
            </div>
            <div style={{ textAlign: 'right', marginTop: 'var(--spacing-md)' }}>
              <button className="btn btn-primary" onClick={() => setModalContent(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
