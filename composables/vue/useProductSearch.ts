/**
 * useProductSearch (Vue) — Product fetching, filtering, race condition prevention.
 *
 * Covers: ProductGrid, GridFilters, GridToolbar, SearchBar components.
 *
 * Responsibilities:
 * - CategoryService query building
 * - Race condition prevention (fetchId counter)
 * - Language-based product filtering (untranslated excluded)
 * - Dual-mode: controlled (external products prop) vs uncontrolled (internal fetch)
 * - Sort, page size, text filters, price range, pagination
 * - Debounced search bar (300ms)
 */

import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import {
  CategoryService,
  ProductService,
  Enums,
} from 'propeller-sdk-v2';
import type {
  GraphQLClient,
  Product,
  Cluster,
  Contact,
  Customer,
  ProductsResponse,
  AttributeFilter,
  ProductTextFilterInput,
  Category,
} from 'propeller-sdk-v2';
import { usePagination } from './shared/usePagination';

// ── Types ────────────────────────────────────────────────────────────────────

export interface UseProductSearchOptions {
  graphqlClient?: GraphQLClient;
  /** Controlled mode: pass products in, skip internal fetch */
  products?: Ref<(Product | Cluster)[] | undefined>;
  categoryId?: Ref<number | undefined>;
  term?: Ref<string | undefined>;
  brand?: Ref<string | undefined>;
  language?: Ref<string>;
  taxZone?: string;
  user?: Ref<Contact | Customer | null>;
  companyId?: Ref<number | undefined>;
  textFilters?: Ref<ProductTextFilterInput[] | undefined>;
  priceFilterMin?: Ref<number | undefined>;
  priceFilterMax?: Ref<number | undefined>;
  sortField?: Ref<string | undefined>;
  sortOrder?: Ref<string | undefined>;
  page?: Ref<number | undefined>;
  pageSize?: Ref<number>;
  configuration: {
    baseCategoryId?: number;
    imageSearchFiltersGrid?: any;
    imageVariantFiltersMedium?: any;
  };
  onFiltersChange?: (filters: AttributeFilter[]) => void;
  onPriceBoundsChange?: (min: number, max: number) => void;
  onItemsFoundChange?: (count: number) => void;
  onPageChange?: (page: number) => void;
  onProductsResponse?: (products: ProductsResponse) => void;
  onCategoryChange?: (category: Category) => void;
}

export interface UseProductSearchReturn {
  displayProducts: ComputedRef<(Product | Cluster)[]>;
  itemsFound: Ref<number>;
  isLoading: ComputedRef<boolean>;
  currentSortField: Ref<string>;
  currentSortOrder: Ref<string>;
  currentPage: Ref<number>;
  totalPages: Ref<number>;
  // Search bar
  searchTerm: Ref<string>;
  searchResults: Ref<(Product | Cluster)[]>;
  searchLoading: Ref<boolean>;
  // Actions
  fetchProducts: () => Promise<void>;
  search: (term: string) => void;
  goToPage: (page: number) => void;
}

export function useProductSearch(options: UseProductSearchOptions): UseProductSearchReturn {
  const {
    graphqlClient,
    configuration,
    onFiltersChange,
    onPriceBoundsChange,
    onItemsFoundChange,
    onPageChange,
    onProductsResponse,
    onCategoryChange,
  } = options;

  const languageRef = options.language ?? ref('NL');
  const textFiltersRef = options.textFilters ?? ref<ProductTextFilterInput[] | undefined>(undefined);
  const priceMinRef = options.priceFilterMin ?? ref<number | undefined>(undefined);
  const priceMaxRef = options.priceFilterMax ?? ref<number | undefined>(undefined);
  const sortFieldRef = options.sortField ?? ref<string | undefined>(undefined);
  const sortOrderRef = options.sortOrder ?? ref<string | undefined>(undefined);
  const pageSizeRef = options.pageSize ?? ref(12);
  const userRef = options.user ?? ref(null);
  const companyIdRef = options.companyId ?? ref<number | undefined>(undefined);

  // ── Internal state ────────────────────────────────────────────────────────
  const internalProducts = ref<(Product | Cluster)[]>([]) as Ref<(Product | Cluster)[]>;
  const internalLoading = ref(false);
  let fetchId = 0;

  // Search bar state
  const searchTerm = ref('');
  const searchResults = ref<(Product | Cluster)[]>([]) as Ref<(Product | Cluster)[]>;
  const searchLoading = ref(false);
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

  const pagination = usePagination(pageSizeRef.value);

  // Controlled vs uncontrolled
  const isControlled = computed(() => options.products !== undefined);

  const displayProducts = computed<(Product | Cluster)[]>(() => {
    if (isControlled.value) return options.products!.value ?? [];
    return internalProducts.value;
  });

  const isLoading = computed(() => !isControlled.value && internalLoading.value);

  const itemsFound = ref(0);
  const currentSortField = ref(options.sortField?.value ?? Enums.ProductSortField.RELEVANCE);
  const currentSortOrder = ref(options.sortOrder?.value ?? 'DESC');

  // ── Language filter ───────────────────────────────────────────────────────

  function filterByLanguage(products: (Product | Cluster)[], language: string): (Product | Cluster)[] {
    if (!language) return products;
    return products.filter((p) => {
      const names = (p as Product).names;
      if (!names || names.length === 0) return true;
      return names.some((n: any) => n.language?.toUpperCase() === language.toUpperCase() && n.value);
    });
  }

  // ── Fetch products ────────────────────────────────────────────────────────

  async function fetchProducts(): Promise<void> {
    if (!graphqlClient || isControlled.value) return;

    const thisId = ++fetchId;
    internalLoading.value = true;

    try {
      const service = new CategoryService(graphqlClient);
      const language = languageRef.value || 'NL';
      const catId = options.categoryId?.value ?? configuration.baseCategoryId;

      if (!catId) return;

      const productSearchInput: any = {
        offset: pageSizeRef.value,
        page: pagination.currentPage.value,
        ...(options.term?.value && { term: options.term.value }),
        ...(options.brand?.value && { manufacturers: [options.brand.value] }),
        ...(textFiltersRef.value?.length && { textFilters: textFiltersRef.value }),
        ...(priceMinRef.value !== undefined && { priceMin: priceMinRef.value }),
        ...(priceMaxRef.value !== undefined && { priceMax: priceMaxRef.value }),
        ...(sortFieldRef.value && {
          sortField: sortFieldRef.value,
          sortOrder: sortOrderRef.value || 'ASC',
        }),
        ...(companyIdRef.value && { companyId: companyIdRef.value }),
        ...(userRef.value && { taxZone: options.taxZone }),
      };

      const response = await service.getCategory({
        categoryId: catId,
        language,
        categoryProductSearchInput: productSearchInput,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        imageVariantFilters: configuration.imageVariantFiltersMedium,
      } as any);

      // Ignore stale responses
      if (thisId !== fetchId) return;

      const productsResponse = (response as any)?.products;
      const rawProducts: (Product | Cluster)[] = productsResponse?.items || [];
      const filtered = filterByLanguage(rawProducts, language);

      internalProducts.value = filtered;
      const found = filtered.length < rawProducts.length
        ? Math.max(0, (productsResponse?.itemsFound ?? 0) - (rawProducts.length - filtered.length))
        : (productsResponse?.itemsFound ?? 0);

      itemsFound.value = found;
      onItemsFoundChange?.(found);

      if (productsResponse) {
        pagination.setFromResponse({
          itemsFound: found,
          pages: productsResponse.pages,
          offset: productsResponse.offset,
        });
        onProductsResponse?.(productsResponse);
      }

      if (productsResponse?.filters) {
        onFiltersChange?.(productsResponse.filters);
      }

      if (productsResponse?.priceRange) {
        const pr = productsResponse.priceRange;
        onPriceBoundsChange?.(pr.min ?? 0, pr.max ?? 0);
      }

      if (response) {
        onCategoryChange?.(response as Category);
      }
    } catch (e) {
      console.error('[useProductSearch] fetchProducts error:', e);
      if (thisId === fetchId) internalProducts.value = [];
    } finally {
      if (thisId === fetchId) internalLoading.value = false;
    }
  }

  // ── Search bar (debounced, 300ms) ─────────────────────────────────────────

  function search(term: string): void {
    searchTerm.value = term;
    if (searchTimer) clearTimeout(searchTimer);
    if (!term.trim()) {
      searchResults.value = [];
      return;
    }
    searchTimer = setTimeout(async () => {
      if (!graphqlClient) return;
      searchLoading.value = true;
      try {
        const service = new ProductService(graphqlClient);
        const language = languageRef.value || 'NL';
        const result = await service.getProducts({
          language,
          imageVariantFilters: {} as any,
          input: {
            term,
            statuses: ['A', 'P', 'T', 'S'],
            offset: 10,
            sortField: Enums.ProductSortField.RELEVANCE,
            sortOrder: Enums.SortOrder.DESC,
            isSearchable: true,
          } as any,
        });
        searchResults.value = (result as any)?.items || [];
      } catch {
        searchResults.value = [];
      } finally {
        searchLoading.value = false;
      }
    }, 300);
  }

  // ── Watchers ──────────────────────────────────────────────────────────────

  watch(
    [
      () => options.categoryId?.value,
      () => options.term?.value,
      () => options.brand?.value,
      languageRef,
      textFiltersRef,
      priceMinRef,
      priceMaxRef,
      sortFieldRef,
      sortOrderRef,
      pageSizeRef,
      companyIdRef,
      userRef,
      pagination.currentPage,
    ],
    () => {
      if (!isControlled.value) fetchProducts();
    },
    { immediate: true }
  );

  return {
    displayProducts,
    itemsFound,
    isLoading,
    currentSortField,
    currentSortOrder,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    searchTerm,
    searchResults,
    searchLoading,
    fetchProducts,
    search,
    goToPage: pagination.goToPage,
  };
}
