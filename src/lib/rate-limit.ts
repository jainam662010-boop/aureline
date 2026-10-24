/**
 * Sliding-window rate limiter (in-memory).
 *
 * NOTE: this is process-local. On serverless hosts (Vercel) each isolate keeps
 * its own map, so limits are approximate per-region. For strict limits, swap
 * the store for Upstash Redis / Vercel KV — the interface below stays the same.
 */

type Bucket = { hits: number[] };

const store = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key) ?? { hits: [] };

  bucket.hits = bucket.hits.filter((t) => now - t < windowMs);

  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0]!;
    return { ok: false, remaining: 0, retryAfterMs: oldest + windowMs - now };
  }

  bucket.hits.push(now);
  store.set(key, bucket);

  if (store.size > MAX_BUCKETS) {
    // crude eviction of the oldest buckets
    const keys = [...store.keys()].slice(0, MAX_BUCKETS / 2);
    keys.forEach((k) => store.delete(k));
  }

  return { ok: true, remaining: limit - bucket.hits.length, retryAfterMs: 0 };
}

/** Best-effort client IP from headers (works behind Vercel/proxy). */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

export const RATE_LIMITS = {
  auth: { limit: 10, windowMs: 60_000 },
  upload: { limit: 30, windowMs: 60_000 },
  enquiry: { limit: 5, windowMs: 60 * 60_000 },
  checkout: { limit: 20, windowMs: 60_000 },
  generic: { limit: 120, windowMs: 60_000 },
} as const;
