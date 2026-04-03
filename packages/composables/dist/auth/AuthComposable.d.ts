import type { AuthComposableConfig, AuthComposable } from './types';
/**
 * Creates an auth composable -- framework-agnostic state + actions for authentication.
 *
 * Wrap with a React hook (useSyncExternalStore) or Vue composable (shallowRef)
 * to get reactive state in your framework.
 */
export declare function createAuthComposable(config: AuthComposableConfig): AuthComposable;
//# sourceMappingURL=AuthComposable.d.ts.map