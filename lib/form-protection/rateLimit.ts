export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number };

export interface RateLimiter {
  hit(key: string, rule: RateLimitRule): RateLimitResult;
  size(): number;
}

interface Entry {
  count: number;
  resetAt: number;
}

const SWEEP_EVERY_MS = 60_000;

// In-memory fixed-window limiter; per instance only.
export function createRateLimiter(opts: { now?: () => number; maxKeys?: number } = {}): RateLimiter {
  const now = opts.now ?? Date.now;
  const maxKeys = opts.maxKeys ?? 10_000;
  const entries = new Map<string, Entry>();
  let nextSweep = 0;

  function sweep(t: number) {
    for (const [key, entry] of entries) if (entry.resetAt <= t) entries.delete(key);
    nextSweep = t + SWEEP_EVERY_MS;
  }

  return {
    hit(key, rule) {
      const t = now();
      if (t >= nextSweep || entries.size >= maxKeys) sweep(t);

      const entry = entries.get(key);
      if (!entry || entry.resetAt <= t) {
        // Oldest insertion goes first when the store is full.
        while (entries.size >= maxKeys) entries.delete(entries.keys().next().value as string);
        entries.set(key, { count: 1, resetAt: t + rule.windowMs });
        return { ok: true };
      }
      if (entry.count >= rule.limit) {
        return { ok: false, retryAfter: Math.max(1, Math.ceil((entry.resetAt - t) / 1000)) };
      }
      entry.count++;
      return { ok: true };
    },
    size: () => entries.size,
  };
}
