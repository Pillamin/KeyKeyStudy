'use client';
type QuizState = 'default' | 'selected' | 'correct' | 'incorrect';
interface QuizCardProps { index: number; text: string; state: QuizState; optionNumber: number; onClick?: () => void; disabled?: boolean; }
export function QuizCard({ text, state, optionNumber, onClick, disabled }: QuizCardProps) {
  const stateClasses: Record<QuizState, string> = { default: '', selected: 'selected', correct: 'correct', incorrect: 'incorrect' };
  const stateIcons: Record<QuizState, string> = { default: '', selected: '', correct: '✓', incorrect: '✕' };
  return (
    <div className={`quiz-card ${stateClasses[state]}`} onClick={disabled ? undefined : onClick} role="button" tabIndex={disabled ? -1 : 0}
      aria-label={`보기 ${optionNumber}: ${text}`} onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) onClick?.(); }}
      style={{ cursor: disabled ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: state === 'correct' ? 'var(--color-success)' : state === 'incorrect' ? 'var(--color-error)' : state === 'selected' ? 'var(--color-primary)' : 'var(--color-bg-tertiary)', color: state !== 'default' ? '#fff' : 'var(--color-text-secondary)', fontSize: '0.8125rem', fontWeight: 700, flexShrink: 0, transition: 'all var(--transition-base)' }}>
        {stateIcons[state] || optionNumber}
      </div>
      <span style={{ fontSize: '0.9375rem', lineHeight: 1.5, flex: 1 }}>{text}</span>
    </div>
  );
}
