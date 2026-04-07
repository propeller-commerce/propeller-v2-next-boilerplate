/**
 * useProductSlider (React) — Crossupsell/product fetch + scroll tracking.
 *
 * React mirror of vue/useProductSlider.ts.
 */

import { useState, useCallback } from 'react';
import { CrossupsellService, ProductService } from 'propeller-sdk-v2';
import type { GraphQLClient, Product } from 'propeller-sdk-v2';

export interface UseProductSliderOptions {
  graphqlClient: GraphQLClient;
  language?: string;
  configuration?: {
    imageSearchFiltersGrid?: any;
    imageVariantFiltersSmall?: any;
  };
}

export interface UseProductSliderReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  fetchCrossupsells: (productId: number) => Promise<void>;
  fetchProducts: (productIds: number[]) => Promise<void>;
  scrollLeft: (containerEl: HTMLElement, itemWidth?: number) => void;
  scrollRight: (containerEl: HTMLElement, itemWidth?: number) => void;
  onScroll: (containerEl: HTMLElement) => void;
}

export function useProductSlider(options: UseProductSliderOptions): UseProductSliderReturn {
  const { graphqlClient, configuration = {} } = options;
  const language = options.language || 'NL';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const fetchCrossupsells = useCallback(async (productId: number): Promise<void> => {
    setLoading(true); setError(null);
    try {
      const service = new CrossupsellService(graphqlClient);
      const result = await service.getCrossupsells({ input: { productIdsFrom: [productId] }, language });
      setProducts(((result as any)?.items ?? []) as Product[]);
    } catch (e: any) { setError(e?.message || 'Failed to fetch crossupsells'); }
    finally { setLoading(false); }
  }, [graphqlClient, language]);

  const fetchProducts = useCallback(async (productIds: number[]): Promise<void> => {
    if (!productIds.length) return;
    setLoading(true); setError(null);
    try {
      const service = new ProductService(graphqlClient);
      const results = await Promise.all(productIds.map((id) => service.getProduct({ productId: id, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall })));
      setProducts(results.filter(Boolean) as Product[]);
    } catch (e: any) { setError(e?.message || 'Failed to fetch products'); }
    finally { setLoading(false); }
  }, [graphqlClient, language, configuration]);

  const onScroll = useCallback((containerEl: HTMLElement): void => {
    setCanScrollLeft(containerEl.scrollLeft > 0);
    setCanScrollRight(containerEl.scrollLeft + containerEl.clientWidth < containerEl.scrollWidth - 1);
  }, []);

  const scrollLeft = useCallback((containerEl: HTMLElement, itemWidth = 280): void => {
    containerEl.scrollBy({ left: -itemWidth, behavior: 'smooth' });
  }, []);

  const scrollRight = useCallback((containerEl: HTMLElement, itemWidth = 280): void => {
    containerEl.scrollBy({ left: itemWidth, behavior: 'smooth' });
  }, []);

  return { products, loading, error, canScrollLeft, canScrollRight, fetchCrossupsells, fetchProducts, scrollLeft, scrollRight, onScroll };
}
