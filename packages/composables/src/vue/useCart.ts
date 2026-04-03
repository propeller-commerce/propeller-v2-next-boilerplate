import { shallowRef, readonly, onUnmounted, type DeepReadonly, type ShallowRef } from 'vue';
import { createCartComposable } from '../cart/CartComposable';
import type { CartComposableConfig, CartState, CartComposable } from '../cart/types';

type UseCartReturn = Omit<CartComposable, 'getState' | 'subscribe'> & {
  state: DeepReadonly<ShallowRef<CartState>>;
};

export function useCart(config: CartComposableConfig): UseCartReturn {
  const composable = createCartComposable(config);
  const state = shallowRef(composable.getState());

  const unsubscribe = composable.subscribe(() => {
    state.value = composable.getState();
  });

  onUnmounted(unsubscribe);

  return {
    state: readonly(state),
    resolveOrCreateCart: composable.resolveOrCreateCart,
    addItem: composable.addItem,
    updateItemQuantity: composable.updateItemQuantity,
    deleteItem: composable.deleteItem,
    setCart: composable.setCart,
    clearCart: composable.clearCart,
  };
}
