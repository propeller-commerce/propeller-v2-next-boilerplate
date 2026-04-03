import { type DeepReadonly, type ShallowRef } from 'vue';
import type { CartComposableConfig, CartState, CartComposable } from '../cart/types';
type UseCartReturn = Omit<CartComposable, 'getState' | 'subscribe'> & {
    state: DeepReadonly<ShallowRef<CartState>>;
};
export declare function useCart(config: CartComposableConfig): UseCartReturn;
export {};
//# sourceMappingURL=useCart.d.ts.map