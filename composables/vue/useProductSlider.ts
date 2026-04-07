/**
 * useProductSlider (Vue) — Crossupsell/product fetch + DOM scroll tracking.
 *
 * Covers: ProductSlider component.
 *
 * Responsibilities:
 * - CrossupsellService or ProductService fetch
 * - Scroll position tracking for responsive sliding
 * - Scroll left/right by calculated width
 */

import { ref, type Ref } from 'vue';
import { CrossupsellService, ProductService } from 'propeller-sdk-v2';
import type { GraphQLClient, Product } from 'propeller-sdk-v2';

// ── Types ────────────────────────────────────────────────────────────────────

export interface UseProductSliderOptions {
  graphqlClient: GraphQLClient;
  language?: Ref<string>;
  configuration?: {
    imageSearchFiltersGrid?: any;
    imageVariantFiltersSmall?: any;
  };
}

export interface UseProductSliderReturn {
  products: Ref<Product[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  canScrollLeft: Ref<boolean>;
  canScrollRight: Ref<boolean>;
  fetchCrossupsells: (productId: number) => Promise<void>;
  fetchProducts: (productIds: number[]) => Promise<void>;
  scrollLeft: (containerEl: HTMLElement, itemWidth?: number) => void;
  scrollRight: (containerEl: HTMLElement, itemWidth?: number) => void;
  onScroll: (containerEl: HTMLElement) => void;
}

export function useProductSlider(options: UseProductSliderOptions): UseProductSliderReturn {
  const { graphqlClient, configuration = {} } = options;
  const languageRef = options.language ?? ref('NL');

  const products = ref<Product[]>([]) as Ref<Product[]>;
  const loading = ref(false);
  const error = ref<string | null>(null);
  const canScrollLeft = ref(false);
  const canScrollRight = ref(false);

  async function fetchCrossupsells(productId: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const service = new CrossupsellService(graphqlClient);
      const result = await service.getCrossupsells({
        input: { productIdsFrom: [productId] },
        language: languageRef.value || 'NL',
      });
      products.value = ((result as any)?.items ?? []) as Product[];
    } catch (e: any) {
      error.value = e?.message || 'Failed to fetch crossupsells';
    } finally {
      loading.value = false;
    }
  }

  async function fetchProducts(productIds: number[]): Promise<void> {
    if (!productIds.length) return;
    loading.value = true;
    error.value = null;
    try {
      const service = new ProductService(graphqlClient);
      const language = languageRef.value || 'NL';
      const results = await Promise.all(
        productIds.map((id) =>
          service.getProduct({
            productId: id,
            language,
            imageSearchFilters: configuration.imageSearchFiltersGrid,
            imageVariantFilters: configuration.imageVariantFiltersSmall,
          })
        )
      );
      products.value = results.filter(Boolean) as Product[];
    } catch (e: any) {
      error.value = e?.message || 'Failed to fetch products';
    } finally {
      loading.value = false;
    }
  }

  function onScroll(containerEl: HTMLElement): void {
    canScrollLeft.value = containerEl.scrollLeft > 0;
    canScrollRight.value =
      containerEl.scrollLeft + containerEl.clientWidth < containerEl.scrollWidth - 1;
  }

  function scrollLeft(containerEl: HTMLElement, itemWidth = 280): void {
    containerEl.scrollBy({ left: -itemWidth, behavior: 'smooth' });
  }

  function scrollRight(containerEl: HTMLElement, itemWidth = 280): void {
    containerEl.scrollBy({ left: itemWidth, behavior: 'smooth' });
  }

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
