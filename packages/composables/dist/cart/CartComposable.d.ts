import type { CartComposableConfig, CartComposable } from './types';
/**
 * Creates a cart composable -- framework-agnostic state + actions for cart operations.
 *
 * Wrap with a React hook (useSyncExternalStore) or Vue composable (shallowRef)
 * to get reactive state in your framework.
 */
export declare function createCartComposable(config: CartComposableConfig): CartComposable;
//# sourceMappingURL=CartComposable.d.ts.map