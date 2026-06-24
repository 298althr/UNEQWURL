/**
 * Simple in-memory TTL cache for API responses.
 * Synchronous reads, async writes. Auto-expires stale entries.
 */

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(
  key: string,
  ttlMs: number,
  factory: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) {
    return Promise.resolve(hit.data as T);
  }
  return factory().then((data) => {
    store.set(key, { data, expires: now + ttlMs });
    return data;
  });
}

export function invalidate(keyPrefix: string): void {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(keyPrefix)) store.delete(key);
  }
}

export function cacheStats(): { size: number } {
  return { size: store.size };
}
