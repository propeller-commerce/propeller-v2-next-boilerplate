/**
 * useProductBundles (React) — Bundle fetching and add-to-cart flow.
 *
 * React mirror of vue/useProductBundles.ts.
 */

import { useState, useCallback } from 'react';
import { getServices } from '@/lib/api';
import type { GraphQLClient, Cart, MediaImageProductSearchInput, TransformationsInput, Product } from 'propeller-sdk-v2';
import { initCart } from '../shared/utils/cartInit';
import type { AnyUser } from '../shared/utils/userIdentity';

export interface BundleItem {
  id: number;
  name: string;
  products: Product[];
  discount?: number;
  originalTotal?: number;
  bundleTotal?: number;
}

export interface UseProductBundlesOptions {
  graphqlClient: GraphQLClient;
  user: AnyUser;
  companyId?: number;
  language?: string;
  configuration: {
    language?: string;
    imageSearchFiltersGrid: MediaImageProductSearchInput;
    imageVariantFiltersSmall: TransformationsInput;
  };
  onCartCreated?: (cart: Cart) => void;
}

export interface UseProductBundlesReturn {
  bundles: BundleItem[];
  loading: boolean;
  adding: boolean;
  error: string | null;
  cartId: string;
  fetchBundles: (productId: number) => Promise<void>;
  addBundleToCart: (bundleId: number, existingCartId?: string) => Promise<{ success: boolean; cart?: Cart; error?: string }>;
  calcDiscountPercent: (original: number, discounted: number) => number;
}

export function useProductBundles(options: UseProductBundlesOptions): UseProductBundlesReturn {
  const { graphqlClient, user, companyId, configuration, onCartCreated } = options;
  const language = options.language || configuration.language || 'NL';

  const [bundles, setBundles] = useState<BundleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartId, setCartId] = useState('');

  const fetchBundles = useCallback(async (productId: number): Promise<void> => {
    setLoading(true); setError(null);
    try {
      const service = getServices(graphqlClient).bundle;
      const result = await service.getBundles({ input: { productIds: [productId], page: 1, offset: 100 }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      setBundles(((result as any)?.items || []) as BundleItem[]);
    } catch (e: any) { setError(e?.message || 'Failed to fetch bundles'); }
    finally { setLoading(false); }
  }, [graphqlClient, language, configuration]);

  const addBundleToCart = useCallback(
    async (bundleId: number, existingCartId?: string): Promise<{ success: boolean; cart?: Cart; error?: string }> => {
      setAdding(true); setError(null);
      try {
        let resolvedCartId = existingCartId || cartId;
        if (!resolvedCartId) {
          const cart = await initCart({ graphqlClient, user, companyId, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall, onCartCreated: (c) => { setCartId(c.cartId); onCartCreated?.(c); } });
          resolvedCartId = cart.cartId;
          setCartId(resolvedCartId);
        }
        const cartService = getServices(graphqlClient).cart;
        const cart = await cartService.addBundleToCart({ id: resolvedCartId, input: { bundleId: String(bundleId) }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
        return { success: true, cart };
      } catch (e: any) {
        const msg = e?.message || 'Failed to add bundle to cart';
        setError(msg); return { success: false, error: msg };
      } finally { setAdding(false); }
    },
    [graphqlClient, user, companyId, language, configuration, cartId, onCartCreated]
  );

  const calcDiscountPercent = useCallback((original: number, discounted: number): number => {
    if (!original || original === 0) return 0;
    return Math.round(((original - discounted) / original) * 100);
  }, []);

  return { bundles, loading, adding, error, cartId, fetchBundles, addBundleToCart, calcDiscountPercent };
}
