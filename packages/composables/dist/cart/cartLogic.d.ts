import { CartService, Cart, Contact, Customer, MediaImageProductSearchInput, TransformationsInput } from 'propeller-sdk-v2';
import type { AddItemInput } from './types';
interface CartLogicConfig {
    language?: string;
    imageSearchFilters?: MediaImageProductSearchInput;
    imageVariantFilters?: TransformationsInput;
}
/**
 * Resolve an existing cart for the given user, or return null.
 * Picks the last cart from the user's cart list (matching the Mitosis AddToCart behavior).
 */
export declare function resolveExistingCart(cartService: CartService, user: Contact | Customer, companyId?: number, config?: CartLogicConfig): Promise<Cart | null>;
/**
 * Start a new cart and assign default invoice/delivery addresses from the user profile.
 */
export declare function startCartWithAddresses(cartService: CartService, user: Contact | Customer, companyId?: number, config?: CartLogicConfig): Promise<Cart>;
/**
 * Add a product to an existing cart.
 */
export declare function addItemToCart(cartService: CartService, cartId: string, input: AddItemInput, config?: CartLogicConfig): Promise<Cart>;
/**
 * Validate stock availability for a product.
 * Returns true if stock is sufficient, false otherwise.
 */
export declare function validateStock(product: {
    inventory?: {
        totalQuantity?: number;
    };
}, requestedQuantity: number): boolean;
export {};
//# sourceMappingURL=cartLogic.d.ts.map