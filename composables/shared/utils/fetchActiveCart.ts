/**
 * fetchActiveCart — fetches the user's existing OPEN cart filtered by user/company.
 *
 * Framework-agnostic helper extracted from React's `Header.tsx` so login/register
 * pages can reuse the same logic. Mirrors the Vue `useCart.fetchActiveCart`
 * behavior on the React side without forcing the Vue Pinia store dependency.
 */

import { CartStatus } from 'propeller-sdk-v2';
import { getServices } from '@/lib/api';
import type {
  Cart,
  CartSearchInput,
  Contact,
  Customer,
  GraphQLClient,
  MediaImageProductSearchInput,
  TransformationsInput,
} from 'propeller-sdk-v2';
import type { CartQueryVariables } from 'propeller-sdk-v2';

export interface FetchActiveCartConfig {
  graphqlClient: GraphQLClient;
  user: Contact | Customer;
  companyId?: number;
  language: string;
  imageSearchFilters: MediaImageProductSearchInput;
  imageVariantFilters: TransformationsInput;
}

export async function fetchActiveCart(
  cfg: FetchActiveCartConfig,
): Promise<Cart | null> {
  const cartService = getServices(cfg.graphqlClient).cart;
  try {
    const searchInput: CartSearchInput = {
      offset: 100,
      statuses: [CartStatus.OPEN],
    };
    if ('contactId' in cfg.user && cfg.user.contactId) {
      searchInput.contactIds = [cfg.user.contactId];
      if (cfg.companyId) searchInput.companyIds = [cfg.companyId];
    } else if ('customerId' in cfg.user && cfg.user.customerId) {
      searchInput.customerIds = [cfg.user.customerId];
    }
    const carts = await cartService.getCarts(searchInput);
    if (carts?.items?.length) {
      const existingCartId = carts.items[carts.items.length - 1].cartId;
      const cartVars: CartQueryVariables = {
        cartId: existingCartId,
        imageSearchFilters: cfg.imageSearchFilters,
        imageVariantFilters: cfg.imageVariantFilters,
        language: cfg.language,
      };
      return (await cartService.getCart(cartVars)) ?? null;
    }
    return null;
  } catch (e) {
    console.error('[fetchActiveCart] Failed to fetch active cart:', e);
    return null;
  }
}
