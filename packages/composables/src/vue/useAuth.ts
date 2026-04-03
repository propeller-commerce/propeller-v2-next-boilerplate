import { shallowRef, readonly, onUnmounted, type DeepReadonly, type ShallowRef } from 'vue';
import { createAuthComposable } from '../auth/AuthComposable';
import type { AuthComposableConfig, AuthState, AuthComposable } from '../auth/types';

type UseAuthReturn = Omit<AuthComposable, 'getState' | 'subscribe'> & {
  state: DeepReadonly<ShallowRef<AuthState>>;
};

export function useAuth(config: AuthComposableConfig): UseAuthReturn {
  const composable = createAuthComposable(config);
  const state = shallowRef(composable.getState());

  const unsubscribe = composable.subscribe(() => {
    state.value = composable.getState();
  });

  onUnmounted(unsubscribe);

  return {
    state: readonly(state),
    login: composable.login,
    logout: composable.logout,
    refreshUser: composable.refreshUser,
    setUser: composable.setUser,
  };
}
