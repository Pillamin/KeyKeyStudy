import fs from 'fs';
import path from 'path';

export default function TermsPage() {
  const filePath = path.join(process.cwd(), '이용약관.md');
  const fileContent = fs.readFileSync(filePath, 'utf8');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-secondary)', padding: 'var(--spacing-xl)' }}>
      <div className="card" style={{ maxWidth: 800, margin: '0 auto', padding: 'var(--spacing-xl)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 'var(--spacing-lg)', borderBottom: '2px solid var(--color-border-default)', paddingBottom: 'var(--spacing-sm)' }}>이용약관</h1>
        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>
          {fileContent}
        </div>
      </div>
    </div>
  );
}
