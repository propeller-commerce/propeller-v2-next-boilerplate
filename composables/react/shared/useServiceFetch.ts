/**
 * useServiceFetch (React) — Generic async service call wrapper with state.
 *
 * React hook mirror of vue/shared/useServiceFetch.ts.
 */

import { useState, useCallback } from 'react';

export interface ServiceFetchState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<T | undefined>;
  reset: () => void;
}

export function useServiceFetch<T>(
  fetchFn: (...args: any[]) => Promise<T>,
  defaultValue: T
): ServiceFetchState<T> {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (...args: any[]): Promise<T | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchFn(...args);
        setData(result);
        return result;
      } catch (e: any) {
        const msg = e?.message || 'An error occurred';
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
