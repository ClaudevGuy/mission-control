/** Simple staleness cache for Zustand store fetch methods.
 *  Prevents re-fetching data within `ttl` milliseconds. */

const cache = new Map<string, number>();
const inflight = new Set<string>();

const STALE_MS = 120_000; // 2 minutes

export function isFresh(key: string): boolean {
  // Block duplicate in-flight requests
  if (inflight.has(key)) return true;
  const last = cache.get(key);
  return !!last && Date.now() - last < STALE_MS;
}

export function markFetched(key: string): void {
  cache.set(key, Date.now());
  inflight.delete(key);
}

export function markInflight(key: string): void {
  inflight.add(key);
}

export function invalidate(key: string): void {
  cache.delete(key);
  inflight.delete(key);
}
