/**
 * useProductSearch (React) — Product fetching, filtering, race condition prevention.
 *
 * React mirror of vue/useProductSearch.ts.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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

// Module-level dedup set — prevents two concurrent identical fetches from both
// hitting the API (React Strict Mode runs every effect twice in development).
const inflightFetches = new Set<string>();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseProductSearchOptions {
  graphqlClient?: GraphQLClient;
  products?: (Product | Cluster)[];
  categoryId?: number;
  term?: string;
  brand?: string;
  language?: string;
  taxZone?: string;
  user?: Contact | Customer | null;
  companyId?: number;
  textFilters?: ProductTextFilterInput[];
  priceFilterMin?: number;
  priceFilterMax?: number;
  sortField?: string;
  sortOrder?: string;
  pageSize?: number;
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
  displayProducts: (Product | Cluster)[];
  itemsFound: number;
  isLoading: boolean;
  currentSortField: string;
  currentSortOrder: string;
  currentPage: number;
  totalPages: number;
  searchTerm: string;
  searchResults: (Product | Cluster)[];
  searchLoading: boolean;
  fetchProducts: () => Promise<void>;
  search: (term: string) => void;
  goToPage: (page: number) => void;
}

export function useProductSearch(options: UseProductSearchOptions): UseProductSearchReturn {
  const { graphqlClient, configuration } = options;

  const isControlled = options.products !== undefined;
  const language = options.language || 'NL';
  const taxZone = options.taxZone || 'NL';
  const pageSize = options.pageSize ?? 12;

  const [internalProducts, setInternalProducts] = useState<(Product | Cluster)[]>([]);
  const [itemsFound, setItemsFound] = useState(0);
  const [internalLoading, setInternalLoading] = useState(false);
  const [currentSortField, setCurrentSortField] = useState(
    options.sortField ?? Enums.ProductSortField.RELEVANCE
  );
  const [currentSortOrder, setCurrentSortOrder] = useState(options.sortOrder ?? 'DESC');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<(Product | Cluster)[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const fetchIdRef = useRef(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pagination = usePagination(pageSize);

  // Stable string key from the user's ID — prevents re-fetches when the user
  // object reference changes but the underlying identity hasn't (common with
  // useReducer-based auth contexts that return a new state object on every
  // dispatch, even if the user data is unchanged).
  const userKey = options.user
    ? ('contactId' in options.user
      ? String((options.user as Contact).contactId)
      : String((options.user as Customer).customerId))
    : '';

  const displayProducts = useMemo<(Product | Cluster)[]>(
    () => (isControlled ? options.products! : internalProducts),
    [isControlled, options.products, internalProducts]
  );

  const isLoading = !isControlled && internalLoading;

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

  const fetchProducts = useCallback(async (): Promise<void> => {
    if (!graphqlClient || isControlled) return;

    const thisId = ++fetchIdRef.current;

    // ── Inflight dedup (guards against React Strict Mode double-effect) ───────
    // Bail out when nothing to fetch: no categoryId, term, or brand.
    // This prevents components like SearchBar (which only use `search()`) from
    // triggering a spurious category fetch on mount via the baseCategoryId fallback.
    if (!options.categoryId && !options.term && !options.brand) return;

    const isWideSearch = !!options.term || !!options.brand;
    const catId = isWideSearch
      ? (configuration?.baseCategoryId ?? 0)
      : (options.categoryId ?? configuration?.baseCategoryId ?? 0);

    if (!catId) return;

    const inflightKey = [
      catId, language, pagination.currentPage, pageSize,
      options.term ?? '', options.brand ?? '',
      options.sortField ?? '', options.sortOrder ?? '',
      options.companyId ?? '', userKey,
      JSON.stringify(options.textFilters ?? []),
      options.priceFilterMin ?? '', options.priceFilterMax ?? '',
    ].join('|');

    if (inflightFetches.has(inflightKey)) {
      // Identical fetch already in flight — undo the ID increment so the
      // in-flight request can still commit its result via the thisId check.
      fetchIdRef.current--;
      return;
    }
    inflightFetches.add(inflightKey);

    setInternalLoading(true);

    try {
      const service = new CategoryService(graphqlClient);

      const lang = language;
      const activeSortField = (options.sortField ?? currentSortField) as Enums.ProductSortField;
      const activeSortOrder = (options.sortOrder ?? currentSortOrder) as Enums.SortOrder;

      // Build sort inputs
      const sortInputs: ProductSortInput[] = (activeSortField)
        ? [{ field: activeSortField, order: activeSortOrder }]
        : [];

      // Build search fields with boost when searching by term
      const searchFields: SearchFieldsInput[] = options.term
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
        options.priceFilterMin !== undefined || options.priceFilterMax !== undefined
          ? { from: options.priceFilterMin ?? 0, to: options.priceFilterMax ?? 999999 }
          : undefined;

      // Resolve user IDs
      const userId: number | undefined =
        options.user && 'contactId' in options.user
          ? (options.user as Contact).contactId
          : options.user && 'customerId' in options.user
            ? (options.user as Customer).customerId
            : undefined;

      const contactId: number | undefined =
        options.user && 'contactId' in options.user
          ? (options.user as Contact).contactId
          : undefined;

      const customerId: number | undefined =
        options.user && 'customerId' in options.user
          ? (options.user as Customer).customerId
          : undefined;

      const categoryProductSearchInput: CategoryProductSearchInput = {
        language: lang,
        page: pagination.currentPage,
        offset: pageSize,
        statuses: [
          Enums.ProductStatus.A,
          Enums.ProductStatus.P,
          Enums.ProductStatus.T,
          Enums.ProductStatus.S,
        ],
        hidden: false,
        ...(options.term && { term: options.term, searchFields }),
        ...(options.brand && { manufacturers: [options.brand] }),
        ...(options.textFilters?.length && { textFilters: options.textFilters }),
        ...(priceFilter && { price: priceFilter }),
        ...(sortInputs.length && { sortInputs }),
        ...(options.companyId && { companyId: options.companyId }),
        ...(userId !== undefined && { userId }),
      };

      const priceCalculateProductInput: PriceCalculateProductInput = {
        taxZone,
        ...(options.companyId && { companyId: options.companyId }),
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

      if (thisId !== fetchIdRef.current) return;

      const productsResponse = response?.products as ProductsResponse | undefined;
      const rawProducts = (productsResponse?.items ?? []) as (Product | Cluster)[];
      const filtered = filterByLanguage(rawProducts, lang);

      setInternalProducts(filtered);

      const untranslatedCount = rawProducts.length - filtered.length;
      const apiTotal = productsResponse?.itemsFound ?? rawProducts.length;
      const found = Math.max(0, apiTotal - untranslatedCount);

      setItemsFound(found);
      options.onItemsFoundChange?.(found);

      if (productsResponse) {
        pagination.setFromResponse({
          itemsFound: found,
          pages: productsResponse.pages ?? 1,
          offset: productsResponse.offset ?? pageSize,
        });
        options.onProductsResponse?.(productsResponse);
      }

      if (productsResponse?.filters) {
        options.onFiltersChange?.(productsResponse.filters);
      }

      const minPrice = productsResponse?.minPrice;
      const maxPrice = productsResponse?.maxPrice;
      if (minPrice !== undefined && maxPrice !== undefined) {
        options.onPriceBoundsChange?.(minPrice, maxPrice);
      }

      if (response) {
        options.onCategoryChange?.(response as Category);
      }
    } catch (e) {
      console.error('[useProductSearch] fetchProducts error:', e);
      if (thisId === fetchIdRef.current) setInternalProducts([]);
    } finally {
      inflightFetches.delete(inflightKey);
      if (thisId === fetchIdRef.current) setInternalLoading(false);
    }
  }, [
    graphqlClient,
    isControlled,
    options.categoryId,
    options.term,
    options.brand,
    options.textFilters,
    options.priceFilterMin,
    options.priceFilterMax,
    options.sortField,
    options.sortOrder,
    options.companyId,
    userKey,
    language,
    taxZone,
    pageSize,
    pagination.currentPage,
    configuration,
  ]);

  // ── Search bar (debounced) ────────────────────────────────────────────────

  const search = useCallback(
    (term: string): void => {
      setSearchTerm(term);
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (!term.trim()) {
        setSearchResults([]);
        return;
      }
      searchTimerRef.current = setTimeout(async () => {
        if (!graphqlClient) return;
        setSearchLoading(true);
        try {
          const service = new ProductService(graphqlClient);
          const input: ProductSearchInput = {
            term,
            language,
            page: 1,
            offset: 10,
            statuses: [
              Enums.ProductStatus.A,
              Enums.ProductStatus.P,
              Enums.ProductStatus.T,
              Enums.ProductStatus.S,
            ],
            sortInputs: [{ field: Enums.ProductSortField.RELEVANCE, order: Enums.SortOrder.DESC }],
            searchFields: [
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
            ],
          };
          const variables: ProductsQueryVariables = {
            input,
            language,
            imageVariantFilters: configuration?.imageVariantFiltersMedium as TransformationsInput,
          };
          const result = await service.getProducts(variables);
          setSearchResults((result?.items ?? []) as (Product | Cluster)[]);
        } catch {
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, 300);
    },
    [graphqlClient, language, configuration, userKey]
  );

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isControlled) fetchProducts();
  }, [
    options.categoryId,
    options.term,
    options.brand,
    language,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(options.textFilters),
    options.priceFilterMin,
    options.priceFilterMax,
    options.sortField,
    options.sortOrder,
    pageSize,
    options.companyId,
    userKey,
    pagination.currentPage,
  ]);

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
