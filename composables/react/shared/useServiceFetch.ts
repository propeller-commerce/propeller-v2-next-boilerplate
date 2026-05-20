/**
 * useServiceFetch (React) — Generic async service call wrapper with state.
 *
 * React hook mirror of vue/shared/useServiceFetch.ts.
 */

import { useState, useCallback } from 'react';

export interface ServiceFetchState<T, A extends unknown[]> {
  data: T;
  loading: boolean;
  error: string | null;
  execute: (...args: A) => Promise<T | undefined>;
  reset: () => void;
}

export function useServiceFetch<T, A extends unknown[]>(
  fetchFn: (...args: A) => Promise<T>,
  defaultValue: T
): ServiceFetchState<T, A> {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: A): Promise<T | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchFn(...args);
        setData(result);
        return result;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'An error occurred';
        setError(msg);
        console.error('[useServiceFetch] error:', e);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [fetchFn]
  );

  const reset = useCallback(() => {
    setData(defaultValue);
    setLoading(false);
    setError(null);
  }, [defaultValue]);

  return { data, loading, error, execute, reset };
}
