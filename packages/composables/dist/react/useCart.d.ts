import type { CartComposableConfig } from '../cart/types';
export declare function useCart(config: CartComposableConfig): {
    resolveOrCreateCart: () => Promise<import("propeller-sdk-v2").Cart>;
    addItem: (input: import("../cart/types").AddItemInput) => Promise<import("propeller-sdk-v2").Cart>;
    updateItemQuantity: (itemId: string, quantity: number) => Promise<import("propeller-sdk-v2").Cart>;
    deleteItem: (itemId: string) => Promise<import("propeller-sdk-v2").Cart>;
    setCart: (cart: import("propeller-sdk-v2").Cart) => void;
    clearCart: () => void;
    cart: import("propeller-sdk-v2").Cart | null;
    cartId: string | null;
    addingItem: boolean;
    lastAddedItem: import("propeller-sdk-v2").CartMainItem | null;
    loading: boolean;
    error: string | null;
};
//# sourceMappingURL=useCart.d.ts.map