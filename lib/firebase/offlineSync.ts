export function saveToLocalCache(key: string, data: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`eduapp_cache_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (err) {
    console.error('Failed to save to local cache', err);
  }
}

export function getFromLocalCache<T>(key: string, maxAgeMs: number = 1000 * 60 * 60 * 24): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`eduapp_cache_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > maxAgeMs) {
      localStorage.removeItem(`eduapp_cache_${key}`);
      return null;
    }
    return parsed.data as T;
  } catch (err) {
    console.error('Failed to get from local cache', err);
    return null;
  }
}
