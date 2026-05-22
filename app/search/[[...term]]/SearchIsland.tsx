'use client';

/**
 * SearchIsland — the interactive client half of the search page.
 *
 * The Server Component (`page.tsx`) fetches the first page of search results
 * and renders the static heading. This island receives that data as
 * `initialProducts` and owns the filter sidebar, toolbar, pagination, the
 * no-results empty state, and the URL-driven filter/sort/page state.
 *
 * SSR seeding works exactly as in `CategoryIsland`: `ProductGrid` is handed
 * the server-fetched `products` only on the first render; the first
 * interaction drops the prop so the grid resumes its own client fetching.
 */

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { graphqlClient } from '@/lib/api';
import {
  AttributeFilter,
  AttributeType,
  Cluster,
  Product,
  ProductSortField,
  ProductsResponse,
  SortOrder,
} from 'propeller-sdk-v2';
import {
  ProductGrid,
  GridToolbar,
  GridFilters,
  GridPagination,
} from 'propeller-v2-react-ui';
import { useAuth } from '@/context/AuthContext';
import { config, localizeHref } from '@/data/config';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { usePrice } from '@/context/PriceContext';
import { useCompany } from '@/context/CompanyContext';

interface SearchIslandProps {
  /** The search term (empty string for the "all products" listing). */
  term: string;
  /** True when no term is present — the base-category "all products" view. */
  isAllProducts: boolean;
  /** First page of results fetched server-side. Seeds the first paint. */
  initialProducts: ProductsResponse | null;
}

export default function SearchIsland({
  term,
  isAllProducts,
  initialProducts,
}: SearchIslandProps) {
  const router = useRouter();

  // Hand control to ProductGrid the moment the user changes anything; until
  // then the grid renders the server-seeded first page with no client fetch.
  const [usingServerData, setUsingServerData] = useState(true);
  const releaseServerData = () => setUsingServerData(false);

  const readSearch = (): URLSearchParams =>
    typeof window === 'undefined'
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);

  // URL-derived state.
  const [currentPage, setCurrentPage] = useState(() =>
    parseInt(readSearch().get('page') || '1')
  );
  const [minPrice, setMinPrice] = useState<number | undefined>(() => {
    const v = readSearch().get('minPrice');
    return v ? parseFloat(v) : undefined;
  });
  const [maxPrice, setMaxPrice] = useState<number | undefined>(() => {
    const v = readSearch().get('maxPrice');
    return v ? parseFloat(v) : undefined;
  });
  const [offset, setOffset] = useState(() =>
    parseInt(readSearch().get('offset') || '12')
  );
  const [sortField, setSortField] = useState<ProductSortField>(
    () =>
      (readSearch().get('sortField') as ProductSortField) ||
      ProductSortField.RELEVANCE
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    () => (readSearch().get('sortOrder') as SortOrder) || SortOrder.DESC
  );
  const [filters, setFilters] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    readSearch().forEach((value, key) => {
      if (
        !['page', 'minPrice', 'maxPrice', 'offset', 'sortField', 'sortOrder'].includes(
          key
        )
      ) {
        try {
          initial[key] = JSON.parse(value);
        } catch {
          initial[key] = [value];
        }
      }
    });
    return initial;
  });

  // Component-local state. `gridFilters` is seeded from the server-fetched
  // filter facets so the filter sidebar shows on first paint — ProductGrid's
  // `onFiltersChange` only fires from its internal fetch, which is skipped
  // while the grid is server-controlled.
  const [gridFilters, setGridFilters] = useState<AttributeFilter[]>(
    () => (initialProducts?.filters ?? []) as AttributeFilter[]
  );
  // Price-slider bounds, seeded from the server response — `onPriceBoundsChange`
  // only fires from the grid's internal fetch, skipped while server-controlled.
  const [priceBoundsMin, setPriceBoundsMin] = useState<number | undefined>(
    () => initialProducts?.minPrice
  );
  const [priceBoundsMax, setPriceBoundsMax] = useState<number | undefined>(
    () => initialProducts?.maxPrice
  );
  const [clearSignal, setClearSignal] = useState(0);
  const [itemsFound, setItemsFound] = useState<number>(
    () => initialProducts?.itemsFound ?? 0
  );
  const [pageItemCount, setPageItemCount] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [productsResponse, setProductsResponse] = useState<ProductsResponse | null>(
    () => initialProducts
  );

  const { state } = useAuth();
  const { selectedCompany } = useCompany();
  const { cart, saveCart } = useCart();
  const { language } = useLanguage();
  const { includeTax } = usePrice();

  const initialItems = useMemo(
    () => ((initialProducts?.items ?? []) as (Product | Cluster)[]),
    [initialProducts]
  );

  const activeTextFilters = useMemo(
    () =>
      Object.entries(filters)
        .filter(([, values]) => values.length > 0)
        .map(([name, values]) => {
          const filterDef = gridFilters.find(
            (f) => f.attributeDescription?.name === name
          );
          return {
            name,
            values,
            exclude: false,
            type: filterDef?.type ?? AttributeType.TEXT,
          };
        }),
    [filters, gridFilters]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaultSort = useMemo(
    () => [{ field: sortField as string, order: sortOrder as string }],
    [sortField, sortOrder]
  );

  // True when a term is present, the grid finished loading, and zero matches
  // came back — drives the simplified empty-state UI.
  const hasNoResults =
    !!term && !filtersLoading && itemsFound === 0 && productsResponse !== null;

  // Keep URL-derived state in sync after browser back/forward.
  useEffect(() => {
    const onChange = () => {
      const sp = new URLSearchParams(window.location.search);
      const newFilters: Record<string, string[]> = {};
      sp.forEach((value, key) => {
        if (
          !['page', 'minPrice', 'maxPrice', 'offset', 'sortField', 'sortOrder'].includes(
            key
          )
        ) {
          try {
            newFilters[key] = JSON.parse(value);
          } catch {
            newFilters[key] = [value];
          }
        }
      });
      setCurrentPage(parseInt(sp.get('page') || '1'));
      setFilters((prev) =>
        JSON.stringify(prev) === JSON.stringify(newFilters) ? prev : newFilters
      );
      setMinPrice(sp.get('minPrice') ? parseFloat(sp.get('minPrice')!) : undefined);
      setMaxPrice(sp.get('maxPrice') ? parseFloat(sp.get('maxPrice')!) : undefined);
      setOffset(parseInt(sp.get('offset') || '12'));
      setSortField(
        (sp.get('sortField') as ProductSortField) || ProductSortField.RELEVANCE
      );
      setSortOrder((sp.get('sortOrder') as SortOrder) || SortOrder.DESC);
    };
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);

  const updateURL = (
    newFilters: Record<string, string[]>,
    newPage: number = 1,
    newMinPrice?: number,
    newMaxPrice?: number,
    newOffset?: number,
    newSortField?: string,
    newSortOrder?: 'ASC' | 'DESC'
  ) => {
    releaseServerData();
    const urlParams = new URLSearchParams();

    if (newPage > 1) urlParams.set('page', newPage.toString());

    Object.entries(newFilters).forEach(([key, values]) => {
      if (values.length > 0) {
        urlParams.set(key, JSON.stringify(values));
      }
    });

    if (newMinPrice !== undefined) urlParams.set('minPrice', newMinPrice.toString());
    if (newMaxPrice !== undefined) urlParams.set('maxPrice', newMaxPrice.toString());
    if (newOffset !== undefined && newOffset !== 12)
      urlParams.set('offset', newOffset.toString());
    if (newSortField !== undefined && newSortField !== 'RELEVANCE')
      urlParams.set('sortField', newSortField);
    if (newSortOrder !== undefined && newSortOrder !== 'DESC')
      urlParams.set('sortOrder', newSortOrder);

    // Mirror into local state immediately (router.push emits no popstate).
    setCurrentPage(newPage);
    setFilters(newFilters);
    setMinPrice(newMinPrice);
    setMaxPrice(newMaxPrice);
    if (newOffset !== undefined) setOffset(newOffset);
    if (newSortField !== undefined) setSortField(newSortField as ProductSortField);
    if (newSortOrder !== undefined) setSortOrder(newSortOrder as SortOrder);

    const newSearch = urlParams.toString();
    const basePath = localizeHref('/search/' + encodeURIComponent(term), language);
    router.push(`${basePath}${newSearch ? `?${newSearch}` : ''}`, { scroll: false });
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  const handleFilterChange = (filter: AttributeFilter, value: string | number) => {
    const name = filter.attributeDescription?.name || '';
    const current = filters[name] || [];
    const valueStr = String(value);
    const next = current.includes(valueStr)
      ? current.filter((v: string) => v !== valueStr)
      : [...current, valueStr];
    const newFilters = { ...filters, [name]: next };
    if (next.length === 0) delete newFilters[name];
    updateURL(
      newFilters,
      1,
      minPrice,
      maxPrice,
      offset,
      sortField as string,
      sortOrder as 'ASC' | 'DESC'
    );
  };

  const handlePriceRangeChange = (newMinPrice?: number, newMaxPrice?: number) => {
    updateURL(
      filters,
      1,
      newMinPrice,
      newMaxPrice,
      offset,
      sortField as string,
      sortOrder as 'ASC' | 'DESC'
    );
  };

  const handlePageChange = (page: number) => {
    updateURL(
      filters,
      page,
      minPrice,
      maxPrice,
      offset,
      sortField as string,
      sortOrder as 'ASC' | 'DESC'
    );
  };

  const handleOffsetChange = (newOffset: number) => {
    updateURL(
      filters,
      1,
      minPrice,
      maxPrice,
      newOffset,
      sortField as string,
      sortOrder as 'ASC' | 'DESC'
    );
  };

  const handleSortChange = (newSortField: string, newSortOrder?: 'ASC' | 'DESC') => {
    updateURL(
      filters,
      1,
      minPrice,
      maxPrice,
      offset,
      newSortField,
      newSortOrder || (sortOrder as 'ASC' | 'DESC')
    );
  };

  const clearAllFilters = () => {
    setClearSignal((s) => s + 1);
    updateURL(
      {},
      1,
      undefined,
      undefined,
      offset,
      sortField as string,
      sortOrder as 'ASC' | 'DESC'
    );
  };

  const handleFilterRemove = (filterName: string, value: string) => {
    const current = filters[filterName] || [];
    const newVals = current.filter((v) => v !== value);
    const newFilters = { ...filters, [filterName]: newVals };
    if (newVals.length === 0) delete newFilters[filterName];
    updateURL(
      newFilters,
      1,
      minPrice,
      maxPrice,
      offset,
      sortField as string,
      sortOrder as 'ASC' | 'DESC'
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Filters Sidebar — hidden when the search returned no results. */}
      {!hasNoResults ? (
        <aside className="w-full lg:w-64 flex-shrink-0">
          <GridFilters
            filters={gridFilters}
            priceMin={priceBoundsMin}
            priceMax={priceBoundsMax}
            language={language}
            onFilterChange={handleFilterChange}
            onPriceChange={handlePriceRangeChange}
            onClearFilters={clearAllFilters}
            isMobile={false}
            portalMode="open"
            user={state.user}
            collapsed={true}
            clearSignal={clearSignal}
            activeTextFilters={filters}
            activePriceMin={minPrice}
            activePriceMax={maxPrice}
            isLoading={filtersLoading}
            className=""
          />
        </aside>
      ) : null}

      {/* Products Grid */}
      <div className="flex-1 w-full">
        {!hasNoResults ? (
          <div className="sticky top-[80px] z-30 bg-background/95 backdrop-blur py-2 lg:static lg:bg-transparent lg:py-0 mb-2">
            <GridToolbar
              itemsFound={itemsFound}
              page={currentPage}
              pageSize={offset}
              pageItemCount={pageItemCount}
              activeTextFilters={filters}
              priceFilterMin={minPrice}
              priceFilterMax={maxPrice}
              user={state.user}
              defaultSort={defaultSort}
              onSortChange={(field, order) =>
                handleSortChange(field, order as 'ASC' | 'DESC')
              }
              onOffsetChange={handleOffsetChange}
              viewMode={viewMode}
              onViewChange={(mode) => setViewMode(mode as 'grid' | 'list')}
              onFilterRemove={handleFilterRemove}
              onPriceFilterRemove={() => handlePriceRangeChange(undefined, undefined)}
              onClearFilters={clearAllFilters}
            />
          </div>
        ) : null}

        {/* Custom empty state — offers a homepage link and references the term. */}
        {hasNoResults ? (
          <div className="propeller-search-empty flex flex-col items-center justify-center text-center py-16 px-4 bg-card rounded-container border border-border">
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              className="h-12 w-12 text-foreground-subtle mb-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              No products found for &quot;{term}&quot;
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              Try adjusting your search term, or browse our products from the homepage.
            </p>
            <button
              type="button"
              className="inline-flex items-center justify-center px-4 py-2 rounded-control bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium text-sm"
              onClick={() => router.push(localizeHref('/', language))}
            >
              Go to homepage
            </button>
          </div>
        ) : null}

        {/* Grid — kept mounted via display-toggle so it owns the fetch cycle. */}
        <div className={hasNoResults ? 'hidden' : ''}>
          <ProductGrid
            // Server-seeded first page — dropped on the first interaction.
            products={usingServerData ? initialItems : undefined}
            graphqlClient={graphqlClient}
            term={isAllProducts ? undefined : term}
            categoryId={isAllProducts ? config.baseCategoryId : undefined}
            configuration={config}
            user={state.user}
            companyId={selectedCompany?.companyId}
            language={language}
            showModal={true}
            createCart={true}
            cartId={cart?.cartId}
            includeTax={includeTax}
            showAvailability={false}
            showStock={true}
            onCartCreated={(newCart) => {
              saveCart(newCart);
            }}
            columns={viewMode === 'list' ? 1 : 3}
            textFilters={activeTextFilters}
            priceFilterMin={minPrice}
            priceFilterMax={maxPrice}
            pageSize={offset}
            sortField={sortField as string}
            sortOrder={sortOrder as string}
            onFiltersChange={setGridFilters}
            onPriceBoundsChange={(min, max) => {
              if (!priceBoundsMin && !priceBoundsMax) {
                setPriceBoundsMin(min);
                setPriceBoundsMax(max);
              }
            }}
            onItemsFoundChange={setItemsFound}
            onPageItemCountChange={setPageItemCount}
            onLoadingChange={setFiltersLoading}
            page={currentPage}
            afterAddToCart={(updatedCart) => {
              saveCart(updatedCart);
            }}
            onProceedToCheckout={() =>
              router.push(localizeHref('/checkout', language))
            }
            onRequestQuoteClick={() =>
              router.push(localizeHref('/checkout?mode=quote', language))
            }
            onProductsResponse={setProductsResponse}
            onProductClick={(product: Product) => {
              router.push(config.urls.getProductUrl(product, language));
            }}
            onClusterClick={(cluster: Cluster) => {
              router.push(config.urls.getClusterUrl(cluster, language));
            }}
          />
        </div>

        {/* Pagination */}
        {!hasNoResults ? (
          <div className="flex justify-center gap-2 mt-12">
            {productsResponse && (
              <GridPagination
                products={productsResponse}
                onPageChange={handlePageChange}
                variant="full"
              />
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
