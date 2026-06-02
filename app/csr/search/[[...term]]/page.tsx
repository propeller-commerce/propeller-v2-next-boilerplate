'use client';

/**
 * ──────────────────────────────────────────────────────────────────────────
 * LEGACY CSR variant of the Search page.
 *
 * The original fully client-side implementation, kept verbatim for
 * comparison and as a fallback. Reachable at `/csr/search/[[...term]]`.
 *
 * The CANONICAL page is the hybrid-SSR version at
 * `app/search/[[...term]]/page.tsx` (server-rendered shell + SearchIsland).
 *
 * Do not add features here — change the SSR page. This copy exists only so
 * the pre-SSR behaviour stays observable side-by-side.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { useState, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { graphqlClient } from '@/lib/api';
import { AttributeFilter, AttributeType, Cluster, Product, ProductSortField, ProductsResponse, SortOrder } from 'propeller-sdk-v2';
import { ProductGrid } from 'propeller-v2-react-ui';
import { GridToolbar } from 'propeller-v2-react-ui';
import { GridFilters } from 'propeller-v2-react-ui';
import { GridPagination } from 'propeller-v2-react-ui';
import { GridTitle } from 'propeller-v2-react-ui';
import { useAuth } from '@/context/AuthContext';
import { config, localizeHref } from '@/data/config';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { usePrice } from '@/context/PriceContext';
import { useCompany } from '@/context/CompanyContext';

export default function SearchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const termSegments = params.term as string[] | undefined;
  const term = termSegments?.[0] ? decodeURIComponent(termSegments[0]) : '';
  const isAllProducts = !term;

  // Derive URL-driven state from searchParams (no useEffect needed)
  const currentPage = parseInt(searchParams.get('page') || '1');
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
  const offset = parseInt(searchParams.get('offset') || '12');
  const sortField = (searchParams.get('sortField') as ProductSortField) || ProductSortField.RELEVANCE;
  const sortOrder = (searchParams.get('sortOrder') as SortOrder) || SortOrder.DESC;

  const filters = useMemo(() => {
    const newFilters: Record<string, string[]> = {};
    searchParams.forEach((value, key) => {
      if (!['page', 'minPrice', 'maxPrice', 'offset', 'sortField', 'sortOrder'].includes(key)) {
        try {
          newFilters[key] = JSON.parse(value);
        } catch {
          newFilters[key] = [value];
        }
      }
    });
    return newFilters;
  }, [searchParams]);

  // Component-local state (not URL-driven)
  const [gridFilters, setGridFilters] = useState<AttributeFilter[]>([]);

  const activeTextFilters = useMemo(() => Object.entries(filters)
    .filter(([, values]) => values.length > 0)
    .map(([name, values]) => {
      const filterDef = gridFilters.find(f => f.attributeDescription?.name === name);
      return {
        name,
        values,
        exclude: false,
        type: filterDef?.type ?? AttributeType.TEXT,
      };
    }), [filters, gridFilters]);
  const [priceBoundsMin, setPriceBoundsMin] = useState<number | undefined>();
  const [priceBoundsMax, setPriceBoundsMax] = useState<number | undefined>();
  const [clearSignal, setClearSignal] = useState(0);
  const [itemsFound, setItemsFound] = useState<number>(0);
  const [pageItemCount, setPageItemCount] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [productsResponse, setProductsResponse] = useState<ProductsResponse | null>(null);

  const { state } = useAuth();
  const { selectedCompany } = useCompany();
  const { cart, saveCart } = useCart();
  const { language } = useLanguage();
  const { includeTax } = usePrice();

  // True when a search term is present, the grid has finished loading, and
  // the server returned zero matches. Drives the simplified empty-state UI
  // that hides the filter sidebar / toolbar / pagination and offers a
  // homepage link.
  const hasNoResults =
    !!term && !filtersLoading && itemsFound === 0 && productsResponse !== null;

  const updateURL = (
    newFilters: Record<string, string[]>,
    newPage: number = 1,
    newMinPrice?: number,
    newMaxPrice?: number,
    newOffset?: number,
    newSortField?: string,
    newSortOrder?: 'ASC' | 'DESC'
  ) => {
    const urlParams = new URLSearchParams();

    if (newPage > 1) urlParams.set('page', newPage.toString());

    Object.entries(newFilters).forEach(([key, values]) => {
      if (values.length > 0) {
        urlParams.set(key, JSON.stringify(values));
      }
    });

    if (newMinPrice !== undefined) urlParams.set('minPrice', newMinPrice.toString());
    if (newMaxPrice !== undefined) urlParams.set('maxPrice', newMaxPrice.toString());
    if (newOffset !== undefined && newOffset !== 12) urlParams.set('offset', newOffset.toString());
    if (newSortField !== undefined && newSortField !== 'RELEVANCE') urlParams.set('sortField', newSortField);
    if (newSortOrder !== undefined && newSortOrder !== 'DESC') urlParams.set('sortOrder', newSortOrder);

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
    updateURL(newFilters, 1, minPrice, maxPrice, offset, sortField as string, sortOrder as 'ASC' | 'DESC');
  };

  const handlePriceRangeChange = (newMinPrice?: number, newMaxPrice?: number) => {
    updateURL(filters, 1, newMinPrice, newMaxPrice, offset, sortField as string, sortOrder as 'ASC' | 'DESC');
  };

  const handlePageChange = (page: number) => {
    updateURL(filters, page, minPrice, maxPrice, offset, sortField as string, sortOrder as 'ASC' | 'DESC');
  };

  const handleOffsetChange = (newOffset: number) => {
    updateURL(filters, 1, minPrice, maxPrice, newOffset, sortField as string, sortOrder as 'ASC' | 'DESC');
  };

  const handleSortChange = (newSortField: string, newSortOrder?: 'ASC' | 'DESC') => {
    updateURL(filters, 1, minPrice, maxPrice, offset, newSortField, newSortOrder || (sortOrder as 'ASC' | 'DESC'));
  };

  const clearAllFilters = () => {
    setClearSignal(s => s + 1);
    updateURL({}, 1, undefined, undefined, offset, sortField as string, sortOrder as 'ASC' | 'DESC');
  };

  const handleFilterRemove = (filterName: string, value: string) => {
    const current = filters[filterName] || [];
    const newVals = current.filter(v => v !== value);
    const newFilters = { ...filters, [filterName]: newVals };
    if (newVals.length === 0) delete newFilters[filterName];
    updateURL(newFilters, 1, minPrice, maxPrice, offset, sortField as string, sortOrder as 'ASC' | 'DESC');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container-width">
          {/* Search Header */}
          <GridTitle title={`Search results for "${term}"`} />

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar — hidden when search returned no results so
                the user isn't presented with a price-range slider that has
                nothing to filter (and the price bounds default to 0–9999,
                which is misleading when the result set is empty). */}
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
              {/* Toolbar — sticky on mobile, static on lg+ */}
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
                    onSortChange={(field, order) => handleSortChange(field, order as 'ASC' | 'DESC')}
                    onOffsetChange={handleOffsetChange}
                    viewMode={viewMode}
                    onViewChange={(mode) => setViewMode(mode as 'grid' | 'list')}
                    onFilterRemove={handleFilterRemove}
                    onPriceFilterRemove={() => handlePriceRangeChange(undefined, undefined)}
                    onClearFilters={clearAllFilters}
                  />
                </div>
              ) : null}

              {/* Custom empty state (replaces the ProductGrid fallback) so
                  we can offer a "Go to homepage" action and reference the
                  search term. */}
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

              {/* Grid — kept mounted via display-toggle so it owns the fetch
                  cycle and reports itemsFound back; React has no v-show, so
                  use a wrapper div with `hidden`. */}
              <div className={hasNoResults ? 'hidden' : ''}>
              <ProductGrid
                term={isAllProducts ? undefined : term}
                categoryId={isAllProducts ? config.baseCategoryId : undefined}
                showModal={true}
                createCart={true}
                cartId={cart?.cartId}
                showAvailability={false}
                showStock={true}
                onCartCreated={(newCart) => {
                  console.log('newCart', newCart);
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
                  console.log('updatedCart', updatedCart);
                  saveCart(updatedCart);
                }}
                onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
                onRequestQuoteClick={() => router.push(localizeHref('/checkout?mode=quote', language))}
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
                      variant='full'
                    />
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
