'use client';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'sparkle';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}
export function Button({ variant = 'primary', size = 'md', loading = false, children, disabled, style, ...props }: ButtonProps) {
  const sizeStyle = size === 'sm' ? { padding: '6px 12px', fontSize: '0.8125rem' } : size === 'lg' ? { padding: '13px 24px', fontSize: '1rem' } : {};
  return (
    <button className={`btn btn-${variant}`} disabled={disabled || loading} style={{ ...sizeStyle, ...style }} {...props}>
      {loading ? <span className="spinner" /> : children}
    </button>
  );
}
