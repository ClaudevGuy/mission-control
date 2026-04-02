/** Store fetch cache — prevents redundant API calls.
 *  Once data is loaded, it stays cached until explicitly invalidated.
 *  No TTL-based expiry — data persists for the session. */

const loaded = new Set<string>();
const inflight = new Set<string>();

/** Returns true if this key has been successfully fetched this session */
export function isFresh(key: string): boolean {
  if (inflight.has(key)) return true;
  return loaded.has(key);
}

/** Mark a key as successfully loaded */
export function markFetched(key: string): void {
  loaded.add(key);
  inflight.delete(key);
}

/** Mark a key as currently being fetched (dedup in-flight) */
export function markInflight(key: string): void {
  inflight.add(key);
}

/** Force a key to refetch on next access (call after mutations) */
export function invalidate(key: string): void {
  loaded.delete(key);
  inflight.delete(key);
}

/** Invalidate all cached keys (full refresh) */
export function invalidateAll(): void {
  loaded.clear();
  inflight.clear();
}
