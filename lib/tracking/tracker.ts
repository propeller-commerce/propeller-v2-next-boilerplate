import type { Subscriber, TrackedEvent, TrackingContext } from './types';

/**
 * The event bus.
 *
 * The package fires events; the host decides what they mean. Everything a
 * consumer could want — push to `window.dataLayer` for GA4, POST to our own
 * store, forward to Prepr, log to the console — is a `subscribe()` callback, so
 * nothing in here knows about any of them.
 *
 * Three properties this must have, in order of how badly they bite if missing:
 *
 * 1. DEDUPE. React 19 StrictMode double-invokes effects, App Router remounts
 *    islands on back/forward, and a retried POST replays a batch. The ticket's
 *    deliverable is a COUNT a sales rep reads, so an inflated number is worse
 *    than no number — it looks authoritative. Deduping here, once, protects
 *    every emit path by construction instead of asking each call site to
 *    remember a useRef guard.
 * 2. BUFFERING. Context (user, company, language) resolves asynchronously after
 *    hydration, but the first `page_viewed` fires immediately. Dropping events
 *    that arrive before context would lose the single most important one on
 *    every visit, so they queue and flush once context lands.
 * 3. NEVER THROW. A subscriber that fails must not break the page. Same rule
 *    `lib/preprEvent.ts` already follows.
 */

/** How long a key is remembered. Comfortably longer than a StrictMode remount. */
const DEDUPE_WINDOW_MS = 30_000;
/** Bounded so a long session cannot grow the key map without limit. */
const MAX_DEDUPE_KEYS = 500;
/** Events accepted before context resolves. */
const MAX_PENDING = 100;

export interface Tracker {
  subscribe(fn: Subscriber): () => void;
  setContext(context: TrackingContext): void;
  getContext(): TrackingContext | null;
  track(name: string, props?: Record<string, unknown>, key?: string): void;
  reset(): void;
}

/**
 * Default idempotency key: the event name plus the identifying scalars of the
 * payload. Objects and arrays are skipped — they are payload detail, not
 * identity, and including them would make the key unstable across renders.
 */
export function defaultKey(name: string, props: Record<string, unknown>): string {
  const parts: string[] = [name];
  for (const k of Object.keys(props).sort()) {
    const v = props[k];
    if (v === null || v === undefined) continue;
    if (typeof v === 'object') continue;
    parts.push(`${k}=${String(v)}`);
  }
  return parts.join('|');
}

export function createTracker(): Tracker {
  let context: TrackingContext | null = null;
  const subscribers = new Set<Subscriber>();
  const seen = new Map<string, number>();
  let pending: Array<{ name: string; props: Record<string, unknown>; key: string; ts: number }> = [];

  function isDuplicate(key: string, now: number): boolean {
    const previous = seen.get(key);
    if (previous !== undefined && now - previous < DEDUPE_WINDOW_MS) return true;
    seen.set(key, now);
    if (seen.size > MAX_DEDUPE_KEYS) {
      for (const [k, t] of seen) {
        if (now - t >= DEDUPE_WINDOW_MS) seen.delete(k);
        if (seen.size <= MAX_DEDUPE_KEYS) break;
      }
    }
    return false;
  }

  function emit(event: TrackedEvent): void {
    for (const fn of subscribers) {
      try {
        fn(event);
      } catch {
        /* ignore — tracking must never affect the user flow */
      }
    }
  }

  function flush(ctx: TrackingContext): void {
    if (pending.length === 0) return;
    const queued = pending;
    pending = [];
    for (const item of queued) {
      emit({ name: item.name, ts: item.ts, key: item.key, context: ctx, props: item.props });
    }
  }

  return {
    subscribe(fn) {
      subscribers.add(fn);
      return () => {
        subscribers.delete(fn);
      };
    },

    setContext(next) {
      context = next;
      flush(next);
    },

    getContext() {
      return context;
    },

    track(name, props = {}, key) {
      try {
        const now = Date.now();
        const dedupeKey = key ?? defaultKey(name, props);
        if (isDuplicate(dedupeKey, now)) return;

        if (!context) {
          if (pending.length < MAX_PENDING) {
            pending.push({ name, props, key: dedupeKey, ts: now });
          }
          return;
        }
        emit({ name, ts: now, key: dedupeKey, context, props });
      } catch {
        /* ignore */
      }
    },

    reset() {
      context = null;
      seen.clear();
      pending = [];
      subscribers.clear();
    },
  };
}

/**
 * The app-wide instance. A module singleton rather than a hook return value:
 * React Compiler lint is enforced in this repo, so a freshly-bound `track` on
 * every render would either break the build or silently re-fire every effect
 * that depends on it. This way `track` is stable forever and is callable from
 * effects, event handlers and non-React code alike.
 */
export const tracker = createTracker();

/** Convenience binding so call sites read `track('add_to_cart', …)`. */
export const track: Tracker['track'] = (name, props, key) => tracker.track(name, props, key);
