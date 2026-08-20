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
import { track, trackAddToCart, trackSelectItem, trackViewItemList } from '@/lib/tracking';
import TrackView from '@/components/tracking/TrackView';
import { useRouter } from 'next/navigation';
import {
  AttributeFilter,
  AttributeType,
  Cluster,
  Product,
  ProductSortField,
  ProductsResponse,
  SortOrder,
} from '@propeller-commerce/propeller-sdk-v2';
import {
  ProductGrid,
  GridToolbar,
  GridFiltersPanel,
  GridPagination,
} from '@propeller-commerce/propeller-v2-react-ui';
import { type Availability, MIN_STOCK_THRESHOLD } from '@propeller-commerce/propeller-v2-core-ui';
import { config, localizeHref } from '@/data/config';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { useBaseCategoryId } from '@/context/BaseCategoryContext';
import { usePrice } from '@/context/PriceContext';
import { parseListingParams, serializeAvailability, type ListingParams } from '@/lib/listingParams';
import { useTranslations } from '@/lib/i18n/client';
import { useHoverPrefetch } from '@/lib/useHoverPrefetch';

interface SearchIslandProps {
  /** The search term (empty string for the "all products" listing). */
  term: string;
  /** True when no term is present — the base-category "all products" view. */
  isAllProducts: boolean;
  /** First page of results fetched server-side. Seeds the first paint. */
  initialProducts: ProductsResponse | null;
  /**
   * The URL query parsed by the Server Component. The island seeds all of
   * its filter/sort/page state from this — NOT from `window.location` — so
   * the server HTML and the client's first render agree, and a refreshed
   * filtered URL restores correctly.
   */
  initialParams: ListingParams;
}

/**
 * Whether product cards show a stock indicator. Gates the availability filter
 * too: filtering by stock is meaningless when no stock is displayed, so both
 * read this one value rather than being set independently.
 */
const SHOW_STOCK = true;

export default function SearchIsland({
  term,
  isAllProducts,
  initialProducts,
  initialParams,
}: SearchIslandProps) {
  const router = useRouter();
  // Prefetch a cluster/product route the moment the user hovers its card, so
  // the click paints the loading skeleton from cache instead of after a full
  // server round-trip. See useHoverPrefetch for why the cards can't self-prefetch.
  const prefetchOnHover = useHoverPrefetch();

  // Hand control to ProductGrid the moment the user changes anything; until
  // then the grid renders the server-seeded first page with no client fetch.
  const [usingServerData, setUsingServerData] = useState(true);
  const releaseServerData = () => setUsingServerData(false);

  // URL-derived state — seeded from `initialParams` (parsed by the Server
  // Component), not `window.location`, for SSR/client consistency.
  const [currentPage, setCurrentPage] = useState(initialParams.page);
  const [minPrice, setMinPrice] = useState<number | undefined>(
    initialParams.minPrice
  );
  const [maxPrice, setMaxPrice] = useState<number | undefined>(
    initialParams.maxPrice
  );
  const [availability, setAvailability] = useState<Availability>(
    initialParams.availability ?? 'all'
  );
  const [minStock, setMinStock] = useState<number>(
    initialParams.minStock ?? MIN_STOCK_THRESHOLD
  );
  const [offset, setOffset] = useState(initialParams.offset);
  const [sortField, setSortField] = useState<ProductSortField>(
    initialParams.sortField
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    initialParams.sortOrder
  );
  const [filters, setFilters] = useState<Record<string, string[]>>(
    initialParams.filters
  );

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

  const { cart, saveCart } = useCart();
  const { language } = useLanguage();
  const baseCategoryId = useBaseCategoryId();
  const searchLabels = useTranslations('Search');
  const gridPaginationLabels = useTranslations('GridPagination');
  const gridFiltersLabels = useTranslations('GridFilters');
  const gridToolbarLabels = useTranslations('GridToolbar');
  const productGridLabels = useTranslations('ProductGrid');
  const productCardLabels = useTranslations('ProductCard');
  const clusterCardLabels = useTranslations('ClusterCard');
  const addToCartLabels = useTranslations('AddToCart');
  const itemStockLabels = useTranslations('ItemStock');
  const productPriceLabels = useTranslations('ProductPrice');

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

   
  const defaultSort = useMemo(
    () => [{ field: sortField as string, order: sortOrder as string }],
    [sortField, sortOrder]
  );

  // True when a term is present, the grid finished loading, and zero matches
  // came back — drives the simplified empty-state UI.
  const hasNoResults =
    !!term && !filtersLoading && itemsFound === 0 && productsResponse !== null;

  // ── Search tracking (PWP-910) ───────────────────────────────────────────
  // `itemsFound` updates on EVERY refetch — filter toggle, page change,
  // language switch — not once per search. So the dedupe key carries the
  // filters and the page: without that, one fruitless search emits
  // `search_no_results` five times while the user narrows filters, and the
  // "searched three times and found nothing" signal the sales rep reads is
  // inflated by exactly the behaviour that proves they were trying.
  // The surface this island represents. Passed explicitly into the grid's
  // callbacks so an add-to-cart from search is distinguishable from the same
  // product added on its PDP.
  const searchSource = { type: 'search' as const, name: term, searchTerm: term, page: currentPage };

  const filtersKey = JSON.stringify(filters);
  useEffect(() => {
    if (!term || filtersLoading || productsResponse === null) return;
    const key = `${term}|${filtersKey}|${currentPage}`;
    track(
      'search',
      {
        search_term: term,
        results_count: itemsFound,
        filters_active: Object.values(filters).filter((v) => v.length > 0).length,
        page: currentPage,
      },
      `search:${key}`
    );
    trackViewItemList(searchSource, itemsFound, pageItemCount);
    if (itemsFound === 0) {
      // `filters_active` separates the two causes: over-filtering is a UX
      // problem, a bare term with no hits is an assortment gap. Different
      // owner, different fix — and only the second matters to a rep.
      track(
        'search_no_results',
        {
          search_term: term,
          filters_active: Object.values(filters).filter((v) => v.length > 0).length,
        },
        `search_no_results:${key}`
      );
    }
  }, [term, filtersLoading, productsResponse, itemsFound, filtersKey, currentPage, filters]);

  // Keep URL-derived state in sync after browser back/forward — parsed via
  // the same `parseListingParams` the Server Component uses.
  useEffect(() => {
    const onChange = () => {
      const next = parseListingParams(
        new URLSearchParams(window.location.search),
        ProductSortField.RELEVANCE
      );
      setCurrentPage(next.page);
      setFilters((prev) =>
        JSON.stringify(prev) === JSON.stringify(next.filters)
          ? prev
          : next.filters
      );
      setMinPrice(next.minPrice);
      setMaxPrice(next.maxPrice);
      setAvailability(next.availability ?? 'all');
      setMinStock(next.minStock ?? MIN_STOCK_THRESHOLD);
      setOffset(next.offset);
      setSortField(next.sortField);
      setSortOrder(next.sortOrder);
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
    newSortOrder?: 'ASC' | 'DESC',
    newAvailability?: Availability,
    newMinStock?: number
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
    if (newAvailability !== undefined) {
      const serialized = serializeAvailability(newAvailability, newMinStock ?? MIN_STOCK_THRESHOLD);
      if (serialized) urlParams.set('availability', serialized);
    }
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
    if (newAvailability !== undefined) setAvailability(newAvailability);
    if (newMinStock !== undefined) setMinStock(newMinStock);
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
      sortOrder as 'ASC' | 'DESC',
      availability,
      minStock
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
      sortOrder as 'ASC' | 'DESC',
      availability,
      minStock
    );
  };

  const handleAvailabilityChange = (newAvailability: Availability, newMinStock: number) => {
    updateURL(
      filters,
      1,
      minPrice,
      maxPrice,
      offset,
      sortField as string,
      sortOrder as 'ASC' | 'DESC',
      newAvailability,
      newMinStock
    );
  };

  const handleAvailabilityFilterRemove = () => {
    handleAvailabilityChange('all', MIN_STOCK_THRESHOLD);
  };

  const handlePageChange = (page: number) => {
    updateURL(
      filters,
      page,
      minPrice,
      maxPrice,
      offset,
      sortField as string,
      sortOrder as 'ASC' | 'DESC',
      availability,
      minStock
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
      sortOrder as 'ASC' | 'DESC',
      availability,
      minStock
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
      newSortOrder || (sortOrder as 'ASC' | 'DESC'),
      availability,
      minStock
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
      sortOrder as 'ASC' | 'DESC',
      'all',
      MIN_STOCK_THRESHOLD
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
      sortOrder as 'ASC' | 'DESC',
      availability,
      minStock
    );
  };

  return (
    <>
      <TrackView pageType="search" entityName={term} />
      <div className="flex flex-col lg:flex-row gap-8">
      {/* Filters: inline sidebar at lg+, slide-in drawer below lg. Hidden when
          the search returned no results. */}
      {!hasNoResults ? (
        <GridFiltersPanel
          filters={gridFilters}
          priceMin={priceBoundsMin}
          priceMax={priceBoundsMax}
          onFilterChange={handleFilterChange}
          onPriceChange={handlePriceRangeChange}
          onClearFilters={clearAllFilters}
          collapsed={true}
          clearSignal={clearSignal}
          activeTextFilters={filters}
          activePriceMin={minPrice}
          activePriceMax={maxPrice}
          showAvailabilityFilter={SHOW_STOCK}
          activeAvailability={availability}
          activeMinStock={minStock}
          onAvailabilityChange={handleAvailabilityChange}
          isLoading={filtersLoading}
          language={language}
          labels={gridFiltersLabels}
        />
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
              availability={availability}
              minStock={minStock}
              defaultSort={defaultSort}
              onSortChange={(field, order) =>
                handleSortChange(field, order as 'ASC' | 'DESC')
              }
              onOffsetChange={handleOffsetChange}
              viewMode={viewMode}
              onViewChange={(mode) => setViewMode(mode as 'grid' | 'list')}
              onFilterRemove={handleFilterRemove}
              onPriceFilterRemove={() => handlePriceRangeChange(undefined, undefined)}
              onAvailabilityFilterRemove={handleAvailabilityFilterRemove}
              onClearFilters={clearAllFilters}
              labels={gridToolbarLabels}
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
              {searchLabels.emptyTitle || 'No products found for'} &quot;{term}&quot;
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md">
              {searchLabels.emptyBrowse || 'Try adjusting your search term, or browse our products from the homepage.'}
            </p>
            <button
              type="button"
              className="inline-flex items-center justify-center px-4 py-2 rounded-control bg-primary text-primary-foreground hover:bg-primary/90 transition font-medium text-sm"
              onClick={() => router.push(localizeHref('/', language))}
            >
              {searchLabels.emptyGoHome || 'Go to homepage'}
            </button>
          </div>
        ) : null}

        {/* Grid — kept mounted via display-toggle so it owns the fetch cycle. */}
        <div className={hasNoResults ? 'hidden' : ''}>
          <div onMouseOver={prefetchOnHover}>
          <ProductGrid
            // Server-seeded first page — dropped on the first interaction.
            products={usingServerData ? initialItems : undefined}
            term={isAllProducts ? undefined : term}
            categoryId={isAllProducts ? baseCategoryId : undefined}
            showModal={true}
            createCart={true}
            cartId={cart?.cartId}
            showAvailability={false}
            showStock={SHOW_STOCK}
            onCartCreated={(newCart) => {
              saveCart(newCart);
            }}
            columns={viewMode === 'list' ? 1 : 3}
            textFilters={activeTextFilters}
            priceFilterMin={minPrice}
            priceFilterMax={maxPrice}
            availability={availability}
            minStock={minStock}
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
            afterAddToCart={(updatedCart, item) => {
              saveCart(updatedCart);
              trackAddToCart(searchSource, item);
            }}
            onProceedToCheckout={() =>
              router.push(localizeHref('/checkout', language))
            }
            onRequestQuoteClick={() =>
              router.push(localizeHref('/checkout?mode=quote', language))
            }
            onProductsResponse={setProductsResponse}
            onProductClick={(product: Product) => {
              trackSelectItem(searchSource, product);
              router.push(config.urls.getProductUrl(product, language));
            }}
            onClusterClick={(cluster: Cluster) => {
              trackSelectItem(searchSource, cluster);
              router.push(config.urls.getClusterUrl(cluster, language));
            }}
            labels={productGridLabels}
            productCardLabels={productCardLabels}
            clusterCardLabels={clusterCardLabels}
            addToCartLabels={addToCartLabels}
            stockLabels={itemStockLabels}
            priceLabels={productPriceLabels}
            onLoginClick={() => router.push(localizeHref('/login', language))}
          />
          </div>
        </div>

        {/* Pagination */}
        {!hasNoResults ? (
          <div className="flex justify-center gap-2 mt-12">
            {productsResponse && (
              <GridPagination
                products={productsResponse}
                onPageChange={handlePageChange}
                variant="full"
                labels={gridPaginationLabels}
              />
            )}
          </div>
        ) : null}
        </div>
      </div>
    </>
  );
}
