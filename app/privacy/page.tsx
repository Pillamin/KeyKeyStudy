import fs from 'fs';
import path from 'path';
import { marked } from 'marked';

export default function PrivacyPage() {
  const filePath = path.join(process.cwd(), '개인정보처리방침.md');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const html = marked(fileContent) as string;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-secondary)', padding: 'var(--spacing-xl)' }}>
      <div className="card" style={{ maxWidth: 800, margin: '0 auto', padding: 'var(--spacing-xl)' }}>
        <div
          className="legal-content"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
