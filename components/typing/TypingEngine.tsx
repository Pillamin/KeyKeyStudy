'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { saveProgress } from '@/lib/cache/localSync';

interface TypingEngineProps {
  lines: string[];
  contentId: string;
  onComplete: (wpm: number, accuracy: number, score: number) => void;
}
interface LineResult { wpm: number; accuracy: number; }

export function TypingEngine({ lines, contentId, onComplete }: TypingEngineProps) {
  const [currentLineIdx, setCurrentLineIdx] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [lineResults, setLineResults] = useState<LineResult[]>([]);
  const [lineStartTime, setLineStartTime] = useState<number>(Date.now());
  const [isComplete, setIsComplete] = useState(false);
  const [liveWpm, setLiveWpm] = useState(0);
  const [liveAccuracy, setLiveAccuracy] = useState(100);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentLine = lines[currentLineIdx] ?? '';
  const progress = (currentLineIdx / lines.length) * 100;

  useEffect(() => { inputRef.current?.focus(); }, [currentLineIdx]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    if (val.length >= currentLine.length) {
      const elapsedMin = (Date.now() - lineStartTime) / 60000;
      const correctChars = val.split('').filter((ch, i) => ch === currentLine[i]).length;
      const accuracy = currentLine.length > 0 ? (correctChars / currentLine.length) * 100 : 0;
      const wpm = elapsedMin > 0 ? Math.round((currentLine.replace(/ /g, '').length / 5) / elapsedMin) : 0;
      const result: LineResult = { wpm, accuracy };
      const newResults = [...lineResults, result];
      setLineResults(newResults);
      saveProgress(contentId, 1, { currentLineIdx: currentLineIdx + 1, lineResults: newResults });
      if (currentLineIdx + 1 >= lines.length) {
        const avgWpm = Math.round(newResults.reduce((s, r) => s + r.wpm, 0) / newResults.length);
        const avgAccuracy = Math.round(newResults.reduce((s, r) => s + r.accuracy, 0) / newResults.length);
        const finalScore = Math.round(avgWpm * (avgAccuracy / 100));
        setIsComplete(true);
        onComplete(avgWpm, avgAccuracy, finalScore);
      } else {
        setCurrentLineIdx((i) => i + 1);
        setInputValue('');
        setLineStartTime(Date.now());
      }
    }
  }, [currentLine, currentLineIdx, lineResults, lineStartTime, lines.length, contentId, onComplete]);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsedMin = (Date.now() - lineStartTime) / 60000;
      const correctChars = inputValue.split('').filter((ch, i) => ch === currentLine[i]).length;
      const acc = inputValue.length > 0 ? Math.round((correctChars / inputValue.length) * 100) : 100;
      const wpm = elapsedMin > 0.001 ? Math.round((correctChars / 5) / elapsedMin) : 0;
      setLiveWpm(wpm); setLiveAccuracy(acc);
    }, 300);
    return () => clearInterval(interval);
  }, [inputValue, currentLine, lineStartTime]);

  const renderLine = (text: string, typed: string) =>
    text.split('').map((char, i) => {
      let cls = 'typing-char-pending';
      if (i < typed.length) cls = typed[i] === char ? 'typing-char-correct' : 'typing-char-incorrect';
      else if (i === typed.length) cls = 'typing-char-current';
      return <span key={i} className={cls}>{char === ' ' ? '\u00A0' : char}</span>;
    });

  if (isComplete) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{currentLineIdx + 1} / {lines.length} 줄</span>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <div style={{ textAlign: 'center' }}><div className="stat-value" style={{ fontSize: '1.25rem' }}>{liveWpm}</div><div className="stat-label">WPM</div></div>
          <div style={{ textAlign: 'center' }}><div className="stat-value" style={{ fontSize: '1.25rem' }}>{liveAccuracy}%</div><div className="stat-label">정확도</div></div>
        </div>
      </div>
      <div className="progress-bar-track"><div className="progress-bar-fill" style={{ width: `${progress}%` }} /></div>
      {currentLineIdx > 0 && (
        <div style={{ opacity: 0.35, fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>
          {lines.slice(Math.max(0, currentLineIdx - 1), currentLineIdx).map((line, i) => <p key={i} style={{ marginBottom: 4 }}>{line}</p>)}
        </div>
      )}
      <div className="card" style={{ padding: 'var(--spacing-md) var(--spacing-lg)' }}>
        <div className="typing-display" style={{ marginBottom: 'var(--spacing-sm)', fontSize: '1.1rem' }}>{renderLine(currentLine, inputValue)}</div>
        <input ref={inputRef} id="typing-input" type="text" value={inputValue} onChange={handleInput} className="form-input" placeholder="여기에 타자를 입력하세요..." autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem' }} />
      </div>
      {currentLineIdx + 1 < lines.length && (
        <div style={{ opacity: 0.4, fontSize: '0.875rem', fontFamily: 'var(--font-mono)', padding: '0 var(--spacing-sm)' }}>다음: {lines[currentLineIdx + 1]}</div>
      )}
    </div>
  );
}
