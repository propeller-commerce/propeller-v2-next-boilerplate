import { type DeepReadonly, type ShallowRef } from 'vue';
import type { ProductGridComposableConfig, ProductGridState, ProductGridComposable } from '../productGrid/types';
type UseProductGridReturn = Omit<ProductGridComposable, 'getState' | 'subscribe'> & {
    state: DeepReadonly<ShallowRef<ProductGridState>>;
};
export declare function useProductGrid(config: ProductGridComposableConfig): UseProductGridReturn;
export {};
//# sourceMappingURL=useProductGrid.d.ts.map