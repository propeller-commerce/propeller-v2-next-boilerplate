'use client';

import { useEffect, useState } from 'react';

/**
 * Fetches one named metric from /api/tracker and re-polls it (PWP-910).
 *
 * "Real time" here is a 30-second poll, paused while the tab is hidden —
 * deliberately not SSE or a websocket, which would hold a connection open for a
 * dashboard nobody watches continuously. Revisit only if 30s proves too slow to
 * be useful.
 */

export const POLL_MS = 30_000;

export interface MetricState<T> {
  data: T | null;
  error: string | null;
  /**
   * Set when the API reports a setup problem (503) rather than a query fault.
   * The dashboard shows one banner for this instead of an error per panel —
   * the cause is global, so nine copies of it is noise.
   */
  setup: { status: string; hint: string } | null;
  loading: boolean;
}

export function useMetric<T = unknown>(
  metric: string,
  from: string,
  to: string,
  limit = 20
): MetricState<T> {
  const [state, setState] = useState<MetricState<T>>({
    data: null,
    error: null,
    setup: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      try {
        const url = `/api/tracker?metric=${encodeURIComponent(metric)}&from=${from}&to=${to}&limit=${limit}`;
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({
            data: null,
            error: json?.error ?? `HTTP ${res.status}`,
            setup: json?.status ? { status: json.status, hint: json.hint ?? '' } : null,
            loading: false,
          });
          return;
        }
        setState({ data: json.data as T, error: null, setup: null, loading: false });
      } catch (error) {
        if (cancelled || (error as Error)?.name === 'AbortError') return;
        setState({
          data: null,
          error: (error as Error)?.message ?? 'failed',
          setup: null,
          loading: false,
        });
      }
    }

    load();

    // Polling stops while hidden so a backgrounded tab does not keep hitting
    // the database all afternoon, and refreshes immediately on return.
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') load();
    }, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [metric, from, to, limit]);

  return state;
}
