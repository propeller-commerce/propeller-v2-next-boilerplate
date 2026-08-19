import type { Subscriber, TrackedEvent } from './types';

/**
 * A subscriber that batches events and POSTs them to an ingest URL.
 *
 * Optional by design — a host that wants GA4 instead writes
 * `tracker.subscribe(e => window.dataLayer.push(e))` and never imports this.
 *
 * Delivery is best-effort on purpose: a failed batch is dropped, never retried.
 * Tracking must never affect the user flow, and a retry queue for analytics is
 * a memory leak waiting to happen on a long session.
 */

export interface BatchOptions {
  /** Flush once this many events are queued. */
  maxSize?: number;
  /** Flush this long after the first event in a batch. */
  maxWaitMs?: number;
}

const DEFAULTS = { maxSize: 20, maxWaitMs: 5_000 };

export function batchTo(url: string, options: BatchOptions = {}): Subscriber {
  const maxSize = options.maxSize ?? DEFAULTS.maxSize;
  const maxWaitMs = options.maxWaitMs ?? DEFAULTS.maxWaitMs;

  let queue: TrackedEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  function send(useBeacon: boolean): void {
    if (queue.length === 0) return;
    const batch = queue;
    queue = [];
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    // Context is identical across a batch, so send it once rather than per event.
    const body = JSON.stringify({ context: batch[0].context, events: batch.map(toWire) });

    try {
      // On page hide the tab may be killed before fetch resolves; sendBeacon is
      // the only transport the browser guarantees to flush.
      if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
        return;
      }
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
        credentials: 'same-origin',
      }).catch(() => {
        /* dropped — see above */
      });
    } catch {
      /* dropped */
    }
  }

  function toWire(event: TrackedEvent) {
    return { name: event.name, ts: event.ts, key: event.key, props: event.props };
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') send(true);
    });
    // Safari/iOS do not reliably fire visibilitychange on tab close.
    window.addEventListener('pagehide', () => send(true));
  }

  return (event) => {
    queue.push(event);
    if (queue.length >= maxSize) {
      send(false);
      return;
    }
    if (!timer) {
      timer = setTimeout(() => send(false), maxWaitMs);
    }
  };
}
