// LocalStorage 기반 오프라인 캐싱 및 동기화 큐
export interface SyncOperation {
  id: string; timestamp: number; type: 'upsert_score';
  contentId: string; userId: string; data: Record<string, unknown>;
}
const QUEUE_KEY = 'edu_sync_queue';

export function saveProgress(contentId: string, step: 1 | 2 | 3, data: Record<string, unknown>): void {
  try { localStorage.setItem(`progress_${contentId}_step${step}`, JSON.stringify({ ...data, savedAt: Date.now() })); } catch {}
}
export function loadProgress(contentId: string, step: 1 | 2 | 3): Record<string, unknown> | null {
  try { const raw = localStorage.getItem(`progress_${contentId}_step${step}`); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function clearProgress(contentId: string, step: 1 | 2 | 3): void {
  try { localStorage.removeItem(`progress_${contentId}_step${step}`); } catch {}
}

function loadQueue(): SyncOperation[] {
  try { const raw = localStorage.getItem(QUEUE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveQueue(queue: SyncOperation[]): void {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch {}
}
export function queueSync(op: Omit<SyncOperation, 'id' | 'timestamp'>): void {
  const queue = loadQueue();
  const existing = queue.findIndex((q) => q.contentId === op.contentId && q.userId === op.userId && q.type === op.type);
  const newOp: SyncOperation = { ...op, id: `${op.contentId}_${op.userId}_${Date.now()}`, timestamp: Date.now() };
  if (existing >= 0) { queue[existing] = newOp; } else { queue.push(newOp); }
  saveQueue(queue);
}
export async function flushQueue(upsertFn: (contentId: string, userId: string, data: Record<string, unknown>) => Promise<void>): Promise<void> {
  if (!navigator.onLine) return;
  const queue = loadQueue();
  if (queue.length === 0) return;
  const remaining: SyncOperation[] = [];
  for (const op of queue) {
    try { await upsertFn(op.contentId, op.userId, op.data); } catch { remaining.push(op); }
  }
  saveQueue(remaining);
}
