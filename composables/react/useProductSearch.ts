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
} from 'propeller-sdk-v2';
import { usePagination } from './shared/usePagination';

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

  const displayProducts = useMemo<(Product | Cluster)[]>(
    () => (isControlled ? options.products! : internalProducts),
    [isControlled, options.products, internalProducts]
  );

  const isLoading = !isControlled && internalLoading;

  // ── Language filter ───────────────────────────────────────────────────────

  function filterByLanguage(products: (Product | Cluster)[], lang: string): (Product | Cluster)[] {
    if (!lang) return products;
    return products.filter((p) => {
      const names = (p as Product).names;
      if (!names || names.length === 0) return true;
      return names.some((n: any) => n.language?.toUpperCase() === lang.toUpperCase() && n.value);
    });
  }

  // ── Fetch products ────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async (): Promise<void> => {
    if (!graphqlClient || isControlled) return;

    const thisId = ++fetchIdRef.current;
    setInternalLoading(true);

    try {
      const service = new CategoryService(graphqlClient);
      const catId = options.categoryId ?? configuration.baseCategoryId;
      if (!catId) return;

      const productSearchInput: any = {
        offset: pageSize,
        page: pagination.currentPage,
        ...(options.term && { term: options.term }),
        ...(options.brand && { manufacturers: [options.brand] }),
        ...(options.textFilters?.length && { textFilters: options.textFilters }),
        ...(options.priceFilterMin !== undefined && { priceMin: options.priceFilterMin }),
        ...(options.priceFilterMax !== undefined && { priceMax: options.priceFilterMax }),
        ...(options.sortField && { sortField: options.sortField, sortOrder: options.sortOrder || 'ASC' }),
        ...(options.companyId && { companyId: options.companyId }),
        ...(options.taxZone && { taxZone: options.taxZone }),
      };

      const response = await service.getCategory({
        categoryId: catId,
        language,
        categoryProductSearchInput: productSearchInput,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        imageVariantFilters: configuration.imageVariantFiltersMedium,
      } as any);

      if (thisId !== fetchIdRef.current) return;

      const productsResponse = (response as any)?.products;
      const rawProducts: (Product | Cluster)[] = productsResponse?.items || [];
      const filtered = filterByLanguage(rawProducts, language);

      setInternalProducts(filtered as (Product | Cluster)[]);
      const found = filtered.length < rawProducts.length
        ? Math.max(0, (productsResponse?.itemsFound ?? 0) - (rawProducts.length - filtered.length))
        : (productsResponse?.itemsFound ?? 0);

      setItemsFound(found);
      options.onItemsFoundChange?.(found);

      if (productsResponse) {
        pagination.setFromResponse({
          itemsFound: found,
          pages: productsResponse.pages,
          offset: productsResponse.offset,
        });
        options.onProductsResponse?.(productsResponse);
      }

      if (productsResponse?.filters) {
        options.onFiltersChange?.(productsResponse.filters);
      }

      if (productsResponse?.priceRange) {
        const pr = productsResponse.priceRange;
        options.onPriceBoundsChange?.(pr.min ?? 0, pr.max ?? 0);
      }

      if (response) {
        options.onCategoryChange?.(response as Category);
      }
    } catch (e) {
      console.error('[useProductSearch] fetchProducts error:', e);
      if (thisId === fetchIdRef.current) setInternalProducts([]);
    } finally {
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
    language,
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
          setSearchResults((result as any)?.items || []);
        } catch {
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      }, 300);
    },
    [graphqlClient, language]
  );

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isControlled) fetchProducts();
  }, [
    options.categoryId,
    options.term,
    options.brand,
    language,
    JSON.stringify(options.textFilters),
    options.priceFilterMin,
    options.priceFilterMax,
    options.sortField,
    options.sortOrder,
    pageSize,
    options.companyId,
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
