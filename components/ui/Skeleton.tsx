'use client';
interface SkeletonProps { width?: string; height?: string; borderRadius?: string; count?: number; }
export function Skeleton({ width = '100%', height = '20px', borderRadius = 'var(--radius-md)', count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ width, height, borderRadius, marginBottom: count > 1 ? 'var(--spacing-sm)' : 0 }} />
      ))}
    </>
  );
}
export function ContentCardSkeleton() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
      <Skeleton height="22px" width="60%" /><Skeleton height="16px" width="40%" /><Skeleton height="16px" /><Skeleton height="16px" width="80%" />
    </div>
  );
}
export function AnalysisResultSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <Skeleton height="28px" width="40%" /><Skeleton height="16px" count={5} /><Skeleton height="28px" width="40%" /><Skeleton height="16px" count={4} />
    </div>
  );
}
