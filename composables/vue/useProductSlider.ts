/**
 * useProductSlider (Vue) — Crossupsell/product fetch + DOM scroll tracking.
 *
 * Covers: ProductSlider component.
 * Vue mirror of react/useProductSlider.ts.
 * Mirrors the fetch logic of ui-components/ProductSlider.lite.tsx exactly.
 *
 * Responsibilities:
 * - fetchCrossupsells: CrossupsellService with priceCalculateProductInput + extract productTo/clusterTo
 * - fetchProducts: ProductService.getProducts() batch call (NOT per-item getProduct())
 *   with statuses filter and filterAvailableAttributeInput
 * - Scroll position tracking for responsive sliding
 */

import { ref, type Ref } from 'vue';
import {
  CrossupsellService,
  ProductService,
  Enums,
} from 'propeller-sdk-v2';
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
  types?: Enums.CrossupsellType[];
}

export interface UseProductSliderOptions {
  graphqlClient: GraphQLClient;
  language?: Ref<string>;
  taxZone?: string;
  user?: Ref<Contact | Customer | null>;
  companyId?: Ref<number | undefined>;
  configuration?: {
    imageSearchFiltersGrid?: MediaImageProductSearchInput;
    imageVariantFiltersMedium?: TransformationsInput;
  };
}

export interface UseProductSliderReturn {
  products: Ref<(Product | Cluster)[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  canScrollLeft: Ref<boolean>;
  canScrollRight: Ref<boolean>;
  fetchCrossupsells: (input: FetchCrossupsellsInput) => Promise<void>;
  fetchProducts: (productIds: number[], clusterIds?: number[]) => Promise<void>;
  scrollLeft: (containerEl: HTMLElement, itemWidth?: number) => void;
  scrollRight: (containerEl: HTMLElement, itemWidth?: number) => void;
  onScroll: (containerEl: HTMLElement) => void;
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useProductSlider(options: UseProductSliderOptions): UseProductSliderReturn {
  const { graphqlClient, configuration = {} } = options;
  const languageRef = options.language ?? ref('NL');
  const taxZone = options.taxZone ?? 'NL';

  const products = ref<(Product | Cluster)[]>([]) as Ref<(Product | Cluster)[]>;
  const loading = ref(false);
  const error = ref<string | null>(null);
  const canScrollLeft = ref(false);
  const canScrollRight = ref(false);

  // ── Price input builder ───────────────────────────────────────────────────

  function buildPriceInput(): PriceCalculateProductInput {
    const user = options.user?.value ?? null;
    const companyId = options.companyId?.value;
    const input: PriceCalculateProductInput = { taxZone };
    if (companyId) input.companyId = companyId;
    if (user && 'contactId' in user) input.contactId = (user as Contact).contactId;
    if (user && 'customerId' in user) input.customerId = (user as Customer).customerId;
    return input;
  }

  // ── Fetch crossupsells ────────────────────────────────────────────────────
  // Mirrors ProductSlider.lite.tsx fetchCrossUpsells():
  // - includes priceCalculateProductInput
  // - extracts productTo / clusterTo from each Crossupsell

  async function fetchCrossupsells(input: FetchCrossupsellsInput): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const service = new CrossupsellService(graphqlClient);
      const lang = languageRef.value || 'NL';
      const variables: CrossupsellsQueryVariables = {
        input: {
          page: 1,
          offset: 50,
          ...(input.types && input.types.length > 0 && { types: input.types }),
          ...(input.productId && { productIdsFrom: [input.productId] }),
          ...(input.clusterId && { clusterIdsFrom: [input.clusterId] }),
        },
        language: lang,
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
      products.value = items;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch crossupsells';
      products.value = [];
    } finally {
      loading.value = false;
    }
  }

  // ── Fetch products (batch) ────────────────────────────────────────────────
  // Mirrors ProductSlider.lite.tsx fetchItems():
  // - uses ProductService.getProducts() (batch), NOT per-item getProduct()
  // - includes statuses filter and filterAvailableAttributeInput

  async function fetchProducts(productIds: number[], clusterIds: number[] = []): Promise<void> {
    if (!productIds.length && !clusterIds.length) return;
    loading.value = true;
    error.value = null;
    try {
      const service = new ProductService(graphqlClient);
      const lang = languageRef.value || 'NL';

      const searchInput: ProductSearchInput = {
        productIds,
        clusterIds,
        language: lang,
        page: 1,
        offset: 50,
        statuses: [
          Enums.ProductStatus.A,
          Enums.ProductStatus.P,
          Enums.ProductStatus.T,
          Enums.ProductStatus.S,
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
      products.value = (response?.items ?? []) as (Product | Cluster)[];
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch products';
      products.value = [];
    } finally {
      loading.value = false;
    }
  }

  // ── Scroll helpers ────────────────────────────────────────────────────────

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
