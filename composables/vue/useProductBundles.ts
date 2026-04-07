/**
 * useProductBundles (Vue) — Bundle fetching and add-to-cart flow.
 *
 * Covers: ProductBundles component.
 *
 * Responsibilities:
 * - BundleService.getBundles for a given product
 * - 3-step cart init (reuses shared cartInit utility)
 * - CartService.addBundleToCart
 * - Bundle discount calculation
 */

import { ref, type Ref } from 'vue';
import { BundleService, CartService } from 'propeller-sdk-v2';
import type {
  GraphQLClient,
  Cart,
  Contact,
  Customer,
  MediaImageProductSearchInput,
  TransformationsInput,
} from 'propeller-sdk-v2';
import { initCart } from '../shared/utils/cartInit';
import type { AnyUser } from '../shared/utils/userIdentity';

// ── Types ────────────────────────────────────────────────────────────────────

export interface UseProductBundlesOptions {
  graphqlClient: GraphQLClient;
  user: Ref<AnyUser>;
  companyId?: Ref<number | undefined>;
  language?: Ref<string>;
  configuration: {
    language?: string;
    imageSearchFiltersGrid: MediaImageProductSearchInput;
    imageVariantFiltersSmall: TransformationsInput;
  };
  onCartCreated?: (cart: Cart) => void;
}

export interface BundleItem {
  id: number;
  name: string;
  products: any[];
  discount?: number;
  originalTotal?: number;
  bundleTotal?: number;
}

export interface UseProductBundlesReturn {
  bundles: Ref<BundleItem[]>;
  loading: Ref<boolean>;
  adding: Ref<boolean>;
  error: Ref<string | null>;
  cartId: Ref<string>;
  fetchBundles: (productId: number) => Promise<void>;
  addBundleToCart: (bundleId: number, existingCartId?: string) => Promise<{ success: boolean; cart?: Cart; error?: string }>;
  calcDiscountPercent: (original: number, discounted: number) => number;
}

export function useProductBundles(options: UseProductBundlesOptions): UseProductBundlesReturn {
  const { graphqlClient, user, configuration, onCartCreated } = options;
  const companyIdRef = options.companyId ?? ref<number | undefined>(undefined);
  const languageRef = options.language ?? ref('NL');

  const bundles = ref<BundleItem[]>([]) as Ref<BundleItem[]>;
  const loading = ref(false);
  const adding = ref(false);
  const error = ref<string | null>(null);
  const cartId = ref('');

  async function fetchBundles(productId: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const service = new BundleService(graphqlClient);
      const language = languageRef.value || configuration.language || 'NL';
      const result = await service.getBundles({
        input: { productIds: [productId], page: 1, offset: 100 },
        language,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        imageVariantFilters: configuration.imageVariantFiltersSmall,
      });
      bundles.value = ((result as any)?.items || []) as BundleItem[];
    } catch (e: any) {
      error.value = e?.message || 'Failed to fetch bundles';
    } finally {
      loading.value = false;
    }
  }

  async function addBundleToCart(
    bundleId: number,
    existingCartId?: string
  ): Promise<{ success: boolean; cart?: Cart; error?: string }> {
    adding.value = true;
    error.value = null;
    try {
      const language = languageRef.value || configuration.language || 'NL';

      // Resolve cart ID
      let resolvedCartId = existingCartId || cartId.value;
      if (!resolvedCartId) {
        const cart = await initCart({
          graphqlClient,
          user: user.value,
          companyId: companyIdRef.value,
          language,
          imageSearchFilters: configuration.imageSearchFiltersGrid,
          imageVariantFilters: configuration.imageVariantFiltersSmall,
          onCartCreated: (c) => {
            cartId.value = c.cartId;
            onCartCreated?.(c);
          },
        });
        resolvedCartId = cart.cartId;
        cartId.value = resolvedCartId;
      }

      const cartService = new CartService(graphqlClient);
      const cart = await cartService.addBundleToCart({
        id: resolvedCartId,
        input: { bundleId: String(bundleId) },
        language,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        imageVariantFilters: configuration.imageVariantFiltersSmall,
      });

      return { success: true, cart };
    } catch (e: any) {
      const msg = e?.message || 'Failed to add bundle to cart';
      error.value = msg;
      return { success: false, error: msg };
    } finally {
      adding.value = false;
    }
  }

  function calcDiscountPercent(original: number, discounted: number): number {
    if (!original || original === 0) return 0;
    return Math.round(((original - discounted) / original) * 100);
  }

  return {
    bundles,
    loading,
    adding,
    error,
    cartId,
    fetchBundles,
    addBundleToCart,
    calcDiscountPercent,
  };
}
