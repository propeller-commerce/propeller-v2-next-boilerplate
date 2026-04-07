import type {
  Cart,
  CartMainItem,
  CartBaseItem,
  CartSearchInput,
  CartStartInput,
  CartStartVariables,
  Address,
  GraphQLClient,
} from 'propeller-sdk-v2';

export interface CartInitOptions {
  graphqlClient: GraphQLClient;
  user: import('propeller-sdk-v2').Contact | import('propeller-sdk-v2').Customer | null;
  /** Active company ID (overrides user's default company) */
  companyId?: number;
  /** Configuration object carrying imageSearchFilters, imageVariantFilters, language */
  configuration: {
    language?: string;
    imageSearchFiltersGrid: import('propeller-sdk-v2').MediaImageProductSearchInput;
    imageVariantFiltersSmall: import('propeller-sdk-v2').TransformationsInput;
  };
  onCartCreated?: (cart: Cart) => void;
}

export interface CartInitResult {
  cartId: string;
  cart: Cart;
}

export type AddToCartResult =
  | { success: true; cart: Cart; item: CartMainItem | null }
  | { success: false; error: string };

export type CartItemUpdateResult =
  | { success: true; cart: Cart }
  | { success: false; error: string };

export type { Cart, CartMainItem, CartBaseItem };
