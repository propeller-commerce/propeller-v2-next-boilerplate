import { shallowRef, readonly, onUnmounted, type DeepReadonly, type ShallowRef } from 'vue';
import { createProductGridComposable } from '../productGrid/ProductGridComposable';
import type { ProductGridComposableConfig, ProductGridState, ProductGridComposable } from '../productGrid/types';

type UseProductGridReturn = Omit<ProductGridComposable, 'getState' | 'subscribe'> & {
  state: DeepReadonly<ShallowRef<ProductGridState>>;
};

export function useProductGrid(config: ProductGridComposableConfig): UseProductGridReturn {
  const composable = createProductGridComposable(config);
  const state = shallowRef(composable.getState());

  const unsubscribe = composable.subscribe(() => {
    state.value = composable.getState();
  });

  onUnmounted(unsubscribe);

  return {
    state: readonly(state),
    fetch: composable.fetch,
    goToPage: composable.goToPage,
    setSort: composable.setSort,
  };
}
