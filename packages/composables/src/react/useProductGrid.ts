import { useMemo, useSyncExternalStore } from 'react';
import { createProductGridComposable } from '../productGrid/ProductGridComposable';
import type { ProductGridComposableConfig } from '../productGrid/types';

export function useProductGrid(config: ProductGridComposableConfig) {
  const composable = useMemo(
    () => createProductGridComposable(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.graphqlClient, config.user, config.companyId, config.language],
  );

  const state = useSyncExternalStore(composable.subscribe, composable.getState);

  return {
    ...state,
    fetch: composable.fetch,
    goToPage: composable.goToPage,
    setSort: composable.setSort,
  };
}
