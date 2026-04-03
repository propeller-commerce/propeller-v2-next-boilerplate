import { useMemo, useSyncExternalStore } from 'react';
import { createAuthComposable } from '../auth/AuthComposable';
import type { AuthComposableConfig } from '../auth/types';

export function useAuth(config: AuthComposableConfig) {
  const composable = useMemo(
    () => createAuthComposable(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.graphqlClient],
  );

  const state = useSyncExternalStore(composable.subscribe, composable.getState);

  return {
    ...state,
    login: composable.login,
    logout: composable.logout,
    refreshUser: composable.refreshUser,
    setUser: composable.setUser,
  };
}
