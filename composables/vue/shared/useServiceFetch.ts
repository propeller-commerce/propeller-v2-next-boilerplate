/**
 * useServiceFetch (Vue) — Generic async service call wrapper with reactive state.
 *
 * Wraps any async function with loading / error / data refs.
 * Used by all composables that make SDK calls.
 */

import { ref, type Ref } from 'vue';

export interface ServiceFetchState<T> {
  data: Ref<T>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  execute: (...args: any[]) => Promise<T | undefined>;
  reset: () => void;
}

export function useServiceFetch<T>(
  fetchFn: (...args: any[]) => Promise<T>,
  defaultValue: T
): ServiceFetchState<T> {
  const data = ref<T>(defaultValue) as Ref<T>;
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function execute(...args: any[]): Promise<T | undefined> {
    loading.value = true;
    error.value = null;
    try {
      const result = await fetchFn(...args);
      data.value = result;
      return result;
    } catch (e: any) {
      error.value = e?.message || 'An error occurred';
      console.error('[useServiceFetch] error:', e);
      return undefined;
    } finally {
      loading.value = false;
    }
  }

  function reset() {
    data.value = defaultValue;
    loading.value = false;
    error.value = null;
  }

  return { data, loading, error, execute, reset };
}
