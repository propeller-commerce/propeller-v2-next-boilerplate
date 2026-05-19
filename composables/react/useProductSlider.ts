/**
 * useProductSlider (React) — Crossupsell/product fetch + scroll tracking.
 *
 * React mirror of vue/useProductSlider.ts.
 * Mirrors the fetch logic of components/propeller/ProductSlider.tsx exactly.
 *
 * Responsibilities:
 * - fetchCrossupsells: CrossupsellService with priceCalculateProductInput + extract productTo/clusterTo
 * - fetchProducts: ProductService.getProducts() batch call (NOT per-item getProduct())
 *   with statuses filter and filterAvailableAttributeInput
 * - Scroll position tracking for responsive sliding
 */

import { useState, useCallback } from 'react';
import { getServices } from '@/lib/api';
import { CrossupsellType, ProductStatus } from 'propeller-sdk-v2';
import type {
  GraphQLClient,
  Product,
  Cluster,
  Contact,
  Customer,
  Crossupsell,
  CrossupsellsQueryVariables,
  ProductsQueryVariables,
  ProductSearchInput,
  PriceCalculateProductInput,
  FilterAvailableAttributeInput,
  MediaImageProductSearchInput,
  TransformationsInput,
} from 'propeller-sdk-v2';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FetchCrossupsellsInput {
  productId?: number;
  clusterId?: number;
  types?: CrossupsellType[];
}

export interface UseProductSliderOptions {
  graphqlClient: GraphQLClient;
  language?: string;
  taxZone?: string;
  user?: Contact | Customer | null;
  companyId?: number;
  configuration?: {
    imageSearchFiltersGrid?: MediaImageProductSearchInput;
    imageVariantFiltersMedium?: TransformationsInput;
  };
}

export interface UseProductSliderReturn {
  products: (Product | Cluster)[];
  loading: boolean;
  error: string | null;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  fetchCrossupsells: (input: FetchCrossupsellsInput) => Promise<void>;
  fetchProducts: (productIds: number[], clusterIds?: number[]) => Promise<void>;
  scrollLeft: (containerEl: HTMLElement, itemWidth?: number) => void;
  scrollRight: (containerEl: HTMLElement, itemWidth?: number) => void;
  onScroll: (containerEl: HTMLElement) => void;
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useProductSlider(options: UseProductSliderOptions): UseProductSliderReturn {
  const { graphqlClient, configuration = {} } = options;
  const language = options.language ?? 'NL';
  const taxZone = options.taxZone ?? 'NL';

  const [products, setProducts] = useState<(Product | Cluster)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // ── Price input builder ───────────────────────────────────────────────────

  function buildPriceInput(): PriceCalculateProductInput {
    const input: PriceCalculateProductInput = { taxZone };
    if (options.companyId) input.companyId = options.companyId;
    if (options.user && 'contactId' in options.user) input.contactId = (options.user as Contact).contactId;
    if (options.user && 'customerId' in options.user) input.customerId = (options.user as Customer).customerId;
    return input;
  }

  // ── Fetch crossupsells ────────────────────────────────────────────────────
  // Mirrors ProductSlider.tsx fetchCrossUpsells():
  // - includes priceCalculateProductInput
  // - extracts productTo / clusterTo from each Crossupsell

  const fetchCrossupsells = useCallback(async (input: FetchCrossupsellsInput): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const service = getServices(graphqlClient).crossupsell;
      const variables: CrossupsellsQueryVariables = {
        input: {
          page: 1,
          offset: 50,
          ...(input.types && input.types.length > 0 && { types: input.types }),
          ...(input.productId && { productIdsFrom: [input.productId] }),
          ...(input.clusterId && { clusterIdsFrom: [input.clusterId] }),
        },
        language,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        imageVariantFilters: configuration.imageVariantFiltersMedium as TransformationsInput,
        priceCalculateProductInput: buildPriceInput(),
      };

      const result = await service.getCrossupsells(variables);
      const crossupsells: Crossupsell[] = result?.items ?? [];

      const items: (Product | Cluster)[] = [];
      for (const cu of crossupsells) {
        if (cu.productTo) items.push(cu.productTo as Product);
        else if (cu.clusterTo) items.push(cu.clusterTo as Cluster);
      }
      setProducts(items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch crossupsells');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [graphqlClient, language, taxZone, options.user, options.companyId, configuration]);

  // ── Fetch products (batch) ────────────────────────────────────────────────
  // Mirrors ProductSlider.tsx fetchItems():
  // - uses ProductService.getProducts() (batch), NOT per-item getProduct()
  // - includes statuses filter and filterAvailableAttributeInput

  const fetchProducts = useCallback(async (productIds: number[], clusterIds: number[] = []): Promise<void> => {
    if (!productIds.length && !clusterIds.length) return;
    setLoading(true);
    setError(null);
    try {
      const service = getServices(graphqlClient).product;

      const searchInput: ProductSearchInput = {
        productIds,
        clusterIds,
        language,
        page: 1,
        offset: 50,
        statuses: [
          ProductStatus.A,
          ProductStatus.P,
          ProductStatus.T,
          ProductStatus.S,
        ],
      };

      const filterAvailableAttributeInput: FilterAvailableAttributeInput = { isSearchable: true };

      const variables: ProductsQueryVariables = {
        input: searchInput,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        imageVariantFilters: configuration.imageVariantFiltersMedium as TransformationsInput,
        filterAvailableAttributeInput,
      };

      const response = await service.getProducts(variables);
      setProducts((response?.items ?? []) as (Product | Cluster)[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [graphqlClient, language, configuration]);

  // ── Scroll helpers ────────────────────────────────────────────────────────

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

  return {
    products,
    loading,
    error,
    canScrollLeft,
    canScrollRight,
    fetchCrossupsells,
    fetchProducts,
    scrollLeft,
    scrollRight,
    onScroll,
  };
}
