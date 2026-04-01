// src/lib/rate-limit.ts
// Fixed-window in-memory rate limiter (counter resets at the end of each window).
// NOTE: A client can burst up to 2× limit across a window boundary — acceptable for this use case.
// Resets on server restart — fine for single-instance dev/staging.
// Swap the store for Redis (ioredis) to make it production-grade.

interface RateLimitWindow {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitWindow>();

/** How often stale entries are pruned from the in-memory store */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  let win = store.get(key);

  if (!win || now >= win.resetAt) {
    win = { count: 0, resetAt: now + options.windowMs };
    store.set(key, win);
  }

  // Safe without locks — Node.js event loop is single-threaded
  win.count += 1;

  return {
    success: win.count <= options.limit,
    remaining: Math.max(0, options.limit - win.count),
    resetAt: win.resetAt,
  };
}

// Prune stale entries to prevent unbounded memory growth.
// Store the handle so callers (and tests) can cancel the timer.
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function startCleanup(): void {
  if (cleanupTimer) return; // already running
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, win] of Array.from(store.entries())) {
      if (now >= win.resetAt) store.delete(key);
    }
  }, CLEANUP_INTERVAL_MS);
  // Allow Node.js to exit without waiting for this timer
  if (cleanupTimer.unref) cleanupTimer.unref();
}

export function stopCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// Auto-start cleanup when the module is first imported in a server context
startCleanup();
