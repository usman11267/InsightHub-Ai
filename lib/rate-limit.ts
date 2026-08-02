import "server-only";

/**
 * Lightweight fixed-window rate limiter for Server Actions / Route Handlers.
 * In-memory by default (per instance). Swap STORE for a Redis client when
 * REDIS_URL is configured — the interface stays the same.
 */

type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as unknown as { __rateLimit?: Map<string, Bucket> };
const STORE: Map<string, Bucket> = globalStore.__rateLimit ?? new Map();
globalStore.__rateLimit = STORE;

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSeconds: number };

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const bucket = STORE.get(key);

  if (!bucket || bucket.resetAt <= now) {
    STORE.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count };
}

/** Standard result type returned by all Server Actions. */
export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export function actionError(error: unknown): ActionResult<never> {
  const message =
    error instanceof Error ? error.message : "Something went wrong. Please try again.";
  return { success: false, error: message };
}

export class RateLimitError extends Error {
  constructor(public retryAfterSeconds: number) {
    super(`Too many requests. Try again in ${retryAfterSeconds}s.`);
    this.name = "RateLimitError";
  }
}

export function assertRateLimited(key: string, opts: { limit: number; windowMs: number }): void {
  const result = rateLimit(key, opts);
  if (!result.ok) throw new RateLimitError(result.retryAfterSeconds);
}
