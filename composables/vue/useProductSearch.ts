/**
 * useProductSearch (Vue) — Product fetching, filtering, race condition prevention.
 *
 * Covers: ProductGrid, GridFilters, GridToolbar, SearchBar components.
 *
 * Responsibilities:
 * - CategoryService query building (mirrors ProductGrid.lite.tsx fetch logic exactly)
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
  CategoryQueryVariables,
  CategoryProductSearchInput,
  ProductSortInput,
  SearchFieldsInput,
  ProductPriceFilterInput,
  PriceCalculateProductInput,
  FilterAvailableAttributeInput,
  MediaImageProductSearchInput,
  TransformationsInput,
  ProductsQueryVariables,
  ProductSearchInput,
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
    imageSearchFiltersGrid?: MediaImageProductSearchInput;
    imageVariantFiltersMedium?: TransformationsInput;
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
    onProductsResponse,
    onCategoryChange,
  } = options;

  const languageRef = options.language ?? ref('NL');
  const taxZone = options.taxZone || 'NL';
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

  function filterByLanguage(products: (Product | Cluster)[], lang: string): (Product | Cluster)[] {
    if (!lang) return products;
    return products.filter((p) => {
      const names = (p as Product).names || (p as Cluster).names || [];
      if (!names || names.length === 0) return true;
      return names.some((n: { language?: string }) => n.language === lang);
    });
  }

  // ── Fetch products ────────────────────────────────────────────────────────

  async function fetchProducts(): Promise<void> {
    if (!graphqlClient || isControlled.value) return;

    const thisId = ++fetchId;
    internalLoading.value = true;

    try {
      const service = new CategoryService(graphqlClient);
      const lang = languageRef.value || 'NL';
      const isWideSearch = !!(options.term?.value) || !!(options.brand?.value);
      const catId = isWideSearch
        ? (configuration?.baseCategoryId ?? 0)
        : (options.categoryId?.value ?? configuration?.baseCategoryId ?? 0);

      if (!catId) return;

      const activeSortField = (sortFieldRef.value ?? currentSortField.value) as Enums.ProductSortField;
      const activeSortOrder = (sortOrderRef.value ?? currentSortOrder.value) as Enums.SortOrder;

      // Build sort inputs
      const sortInputs: ProductSortInput[] = activeSortField
        ? [{ field: activeSortField, order: activeSortOrder }]
        : [];

      // Build search fields with boost when searching by term
      const searchFields: SearchFieldsInput[] = options.term?.value
        ? [
            {
              fieldNames: [
                Enums.ProductSearchableField.NAME,
                Enums.ProductSearchableField.KEYWORDS,
                Enums.ProductSearchableField.SKU,
                Enums.ProductSearchableField.CUSTOM_KEYWORDS,
              ],
              boost: 5,
            },
            {
              fieldNames: [
                Enums.ProductSearchableField.DESCRIPTION,
                Enums.ProductSearchableField.MANUFACTURER,
                Enums.ProductSearchableField.MANUFACTURER_CODE,
                Enums.ProductSearchableField.EAN_CODE,
                Enums.ProductSearchableField.BAR_CODE,
                Enums.ProductSearchableField.CLUSTER_ID,
                Enums.ProductSearchableField.CUSTOM_KEYWORDS,
                Enums.ProductSearchableField.PRODUCT_ID,
                Enums.ProductSearchableField.SHORT_DESCRIPTION,
                Enums.ProductSearchableField.SUPPLIER,
                Enums.ProductSearchableField.SUPPLIER_CODE,
              ],
              boost: 1,
            },
          ]
        : [];

      // Build price filter
      const priceFilter: ProductPriceFilterInput | undefined =
        priceMinRef.value !== undefined || priceMaxRef.value !== undefined
          ? { from: priceMinRef.value ?? 0, to: priceMaxRef.value ?? 999999 }
          : undefined;

      // Resolve user IDs
      const user = userRef.value;
      const userId: number | undefined =
        user && 'contactId' in user
          ? (user as Contact).contactId
          : user && 'customerId' in user
          ? (user as Customer).customerId
          : undefined;

      const contactId: number | undefined =
        user && 'contactId' in user ? (user as Contact).contactId : undefined;

      const customerId: number | undefined =
        user && 'customerId' in user ? (user as Customer).customerId : undefined;

      const categoryProductSearchInput: CategoryProductSearchInput = {
        language: lang,
        page: pagination.currentPage.value,
        offset: pageSizeRef.value,
        statuses: [
          Enums.ProductStatus.A,
          Enums.ProductStatus.P,
          Enums.ProductStatus.T,
          Enums.ProductStatus.S,
        ],
        hidden: false,
        ...(options.term?.value && { term: options.term.value, searchFields }),
        ...(options.brand?.value && { manufacturers: [options.brand.value] }),
        ...(textFiltersRef.value?.length && { textFilters: textFiltersRef.value }),
        ...(priceFilter && { price: priceFilter }),
        ...(sortInputs.length && { sortInputs }),
        ...(companyIdRef.value && { companyId: companyIdRef.value }),
        ...(userId !== undefined && { userId }),
      };

      const priceCalculateProductInput: PriceCalculateProductInput = {
        taxZone,
        ...(companyIdRef.value && { companyId: companyIdRef.value }),
        ...(contactId !== undefined && { contactId }),
        ...(customerId !== undefined && { customerId }),
      };

      const filterAvailableAttributeInput: FilterAvailableAttributeInput = {
        isSearchable: true,
      };

      const variables: CategoryQueryVariables = {
        categoryId: catId,
        language: lang,
        categoryProductSearchInput,
        priceCalculateProductInput,
        filterAvailableAttributeInput,
        imageSearchFilters: configuration?.imageSearchFiltersGrid,
        imageVariantFilters: configuration?.imageVariantFiltersMedium,
      };

      const response = await service.getCategory(variables);

      // Ignore stale responses
      if (thisId !== fetchId) return;

      const productsResponse = response?.products as ProductsResponse | undefined;
      const rawProducts = (productsResponse?.items ?? []) as (Product | Cluster)[];
      const filtered = filterByLanguage(rawProducts, lang);

      internalProducts.value = filtered;

      const untranslatedCount = rawProducts.length - filtered.length;
      const apiTotal = productsResponse?.itemsFound ?? rawProducts.length;
      const found = Math.max(0, apiTotal - untranslatedCount);

      itemsFound.value = found;
      onItemsFoundChange?.(found);

      if (productsResponse) {
        pagination.setFromResponse({
          itemsFound: found,
          pages: productsResponse.pages ?? 1,
          offset: productsResponse.offset ?? pageSizeRef.value,
        });
        onProductsResponse?.(productsResponse);
      }

      if (productsResponse?.filters) {
        onFiltersChange?.(productsResponse.filters);
      }

      const minPrice = productsResponse?.minPrice;
      const maxPrice = productsResponse?.maxPrice;
      if (minPrice !== undefined && maxPrice !== undefined) {
        onPriceBoundsChange?.(minPrice, maxPrice);
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
        const lang = languageRef.value || 'NL';
        const input: ProductSearchInput = {
          term,
          language: lang,
          page: 1,
          offset: 10,
          statuses: [
            Enums.ProductStatus.A,
            Enums.ProductStatus.P,
            Enums.ProductStatus.T,
            Enums.ProductStatus.S,
          ],
          sortInputs: [{ field: Enums.ProductSortField.RELEVANCE, order: Enums.SortOrder.DESC }],
        };
        const variables: ProductsQueryVariables = {
          input,
          language: lang,
          imageVariantFilters: configuration?.imageVariantFiltersMedium as TransformationsInput,
        };
        const result = await service.getProducts(variables);
        searchResults.value = (result?.items ?? []) as (Product | Cluster)[];
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
