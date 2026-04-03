import { useMemo, useSyncExternalStore } from 'react';
import { createCartComposable } from '../cart/CartComposable';
import type { CartComposableConfig } from '../cart/types';

export function useCart(config: CartComposableConfig) {
  const composable = useMemo(
    () => createCartComposable(config),
    // Re-create when identity-stable config values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.graphqlClient, config.user, config.companyId, config.language],
  );

  const state = useSyncExternalStore(composable.subscribe, composable.getState);

  return {
    ...state,
    resolveOrCreateCart: composable.resolveOrCreateCart,
    addItem: composable.addItem,
    updateItemQuantity: composable.updateItemQuantity,
    deleteItem: composable.deleteItem,
    setCart: composable.setCart,
    clearCart: composable.clearCart,
  };
}
