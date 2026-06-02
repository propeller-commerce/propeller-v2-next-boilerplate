'use client';

/**
 * CategoryIsland — the interactive client half of the category page.
 *
 * The Server Component (`page.tsx`) fetches the category + its first page of
 * products and renders the static shell. This island receives that data as
 * `initialCategory` and owns everything interactive: the filter sidebar,
 * toolbar, pagination, and the URL-driven filter/sort/page state machine.
 *
 * SSR seeding: on the FIRST render the island hands `ProductGrid` the
 * server-fetched `products` so the first paint shows real cards without a
 * client fetch. `ProductGrid` treats a defined `products` prop as
 * "controlled" and never fetches while it is set — so as soon as the user
 * changes a filter/sort/page we drop the prop to `undefined`, which lets the
 * grid resume its own fetching for every subsequent change.
 */

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  AttributeFilter,
  AttributeType,
  Category,
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
  CategoryDescription,
  Breadcrumbs,
} from 'propeller-v2-react-ui';
import { config, localizeHref } from '@/data/config';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { parseListingParams, type ListingParams } from '@/lib/listingParams';

interface CategoryIslandProps {
  /** Numeric category ID from the route. */
  categoryId: number;
  /** Slug segment from the route — used when rewriting the URL. */
  initialSlug: string;
  /**
   * The category fetched server-side, including its first page of products
   * (`products.items`, `products.pages`). Seeds the first paint.
   */
  initialCategory: Category;
  /**
   * The URL query parsed by the Server Component. The island seeds ALL of
   * its filter/sort/page state from this — NOT from `window.location` — so
   * the server-rendered markup and the client's first render agree (and a
   * refreshed filtered URL restores correctly).
   */
  initialParams: ListingParams;
}

export default function CategoryIsland({
  categoryId,
  initialSlug,
  initialCategory,
  initialParams,
}: CategoryIslandProps) {
  const router = useRouter();

  // Once any filter/sort/page change happens, `ProductGrid` must own its own
  // fetching — so we stop passing the server-seeded `products` prop. While
  // this is true the grid renders the SSR first page with no client fetch.
  const [usingServerData, setUsingServerData] = useState(true);

  const [category, setCategory] = useState<Category>(initialCategory);

  // URL-derived state — seeded from `initialParams` (parsed by the Server
  // Component). Using the prop, not `window.location`, keeps the server HTML
  // and the client's first render identical and restores a refreshed
  // filtered URL correctly.
  const [currentPage, setCurrentPage] = useState(initialParams.page);
  const [filters, setFilters] = useState<Record<string, string[]>>(
    initialParams.filters
  );
  const [minPrice, setMinPrice] = useState<number | undefined>(
    initialParams.minPrice
  );
  const [maxPrice, setMaxPrice] = useState<number | undefined>(
    initialParams.maxPrice
  );
  const [offset, setOffset] = useState(initialParams.offset);
  const [sortField, setSortField] = useState<ProductSortField>(
    initialParams.sortField
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(
    initialParams.sortOrder
  );

  // Seed the filter sidebar from the server-fetched filter facets so it
  // shows on first paint. `ProductGrid.onFiltersChange` only fires from its
  // internal fetch — which is skipped while the grid is server-controlled —
  // so without this seed the sidebar would render "No filters available"
  // until the first interaction.
  const [gridFilters, setGridFilters] = useState<AttributeFilter[]>(
    () =>
      ((initialCategory.products as ProductsResponse | undefined)?.filters ??
        []) as AttributeFilter[]
  );
  // Price-slider bounds, seeded from the server response for the same reason
  // as `gridFilters` — `onPriceBoundsChange` only fires from the grid's
  // internal fetch.
  const [priceBoundsMin, setPriceBoundsMin] = useState<number | undefined>(
    () => (initialCategory.products as ProductsResponse | undefined)?.minPrice
  );
  const [priceBoundsMax, setPriceBoundsMax] = useState<number | undefined>(
    () => (initialCategory.products as ProductsResponse | undefined)?.maxPrice
  );
  const [clearSignal, setClearSignal] = useState(0);
  const [itemsFound, setItemsFound] = useState<number>(
    () => (initialCategory.products as ProductsResponse | undefined)?.itemsFound ?? 0
  );
  const [pageItemCount, setPageItemCount] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [productsResponse, setProductsResponse] = useState<ProductsResponse | null>(
    () => (initialCategory.products as ProductsResponse | undefined) ?? null
  );

  const { cart, saveCart } = useCart();
  const { language } = useLanguage();

  // The server-seeded first page of products. Passed to ProductGrid only
  // while `usingServerData` is true.
  const initialProducts = useMemo(
    () =>
      ((initialCategory.products?.items ?? []) as (Product | Cluster)[]),
    [initialCategory]
  );

  /**
   * Hand control to the client grid. Called by every interaction handler the
   * moment the user changes something — from then on ProductGrid fetches.
   */
  const releaseServerData = () => setUsingServerData(false);

  // Keep URL-derived state in sync with the address bar after browser
  // back/forward. Parsed via the same `parseListingParams` the Server
  // Component uses, so the interpretation is identical.
  useEffect(() => {
    const onChange = () => {
      const next = parseListingParams(
        new URLSearchParams(window.location.search),
        ProductSortField.CATEGORY_ORDER
      );
      setCurrentPage(next.page);
      setFilters((prev) =>
        JSON.stringify(prev) === JSON.stringify(next.filters)
          ? prev
          : next.filters
      );
      setMinPrice(next.minPrice);
      setMaxPrice(next.maxPrice);
      setOffset(next.offset);
      setSortField(next.sortField);
      setSortOrder(next.sortOrder);
    };
    window.addEventListener('popstate', onChange);
    return () => window.removeEventListener('popstate', onChange);
  }, []);

  // Update URL slug when language or category changes — history.replaceState
  // to avoid a Next.js re-render cascade.
  //
  // IMPORTANT: pass the CURRENT `window.history.state`, not `null`. The App
  // Router keeps its navigation tree key in `history.state`; replacing it with
  // `null` desyncs the router from the real URL, which silently breaks
  // `<title>` / metadata updates on every subsequent soft navigation.
  useEffect(() => {
    if (!category) return;
    const match = category.slug?.find(
      (s: { language?: string; value?: string }) => s.language === language
    );
    const newSlug = match?.value || category.slug?.[0]?.value || '';
    const currentSlug = window.location.pathname.split('/').pop();
    if (newSlug && newSlug !== currentSlug) {
      const search = window.location.search;
      window.history.replaceState(
        window.history.state,
        '',
        localizeHref(`/category/${categoryId}/${newSlug}`, language) + search
      );
    }
  }, [category, language, categoryId]);

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
    const searchParams = new URLSearchParams();

    if (newPage > 1) searchParams.set('page', newPage.toString());

    Object.entries(newFilters).forEach(([key, values]) => {
      if (values.length > 0) {
        searchParams.set(key, JSON.stringify(values));
      }
    });

    if (newMinPrice !== undefined) searchParams.set('minPrice', newMinPrice.toString());
    if (newMaxPrice !== undefined) searchParams.set('maxPrice', newMaxPrice.toString());
    if (newOffset !== undefined && newOffset !== 12)
      searchParams.set('offset', newOffset.toString());
    if (newSortField !== undefined && newSortField !== 'CATEGORY_ORDER')
      searchParams.set('sortField', newSortField);
    if (newSortOrder !== undefined && newSortOrder !== 'DESC')
      searchParams.set('sortOrder', newSortOrder);

    // Mirror the new URL into local state immediately (router.push does not
    // emit popstate, so the listener above won't fire for our own pushes).
    setCurrentPage(newPage);
    setFilters(newFilters);
    setMinPrice(newMinPrice);
    setMaxPrice(newMaxPrice);
    if (newOffset !== undefined) setOffset(newOffset);
    if (newSortField !== undefined) setSortField(newSortField as ProductSortField);
    if (newSortOrder !== undefined) setSortOrder(newSortOrder as SortOrder);

    const newSearch = searchParams.toString();
    router.push(
      `${localizeHref(`/category/${categoryId}/${initialSlug}`, language)}${
        newSearch ? `?${newSearch}` : ''
      }`,
      { scroll: false }
    );
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

  const productClick = (product: Product) => {
    router.push(config.urls.getProductUrl(product, language));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaultSort = useMemo(
    () => [{ field: sortField as string, order: sortOrder as string }],
    [sortField, sortOrder]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    [JSON.stringify(filters), gridFilters]
  );

  return (
    <>
      <CategoryDescription category={category} />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          <GridFilters
            filters={gridFilters}
            priceMin={priceBoundsMin}
            priceMax={priceBoundsMax}
            onFilterChange={handleFilterChange}
            onPriceChange={handlePriceRangeChange}
            onClearFilters={clearAllFilters}
            isMobile={false}
            collapsed={true}
            clearSignal={clearSignal}
            activeTextFilters={filters}
            activePriceMin={minPrice}
            activePriceMax={maxPrice}
            isLoading={filtersLoading}
            className=""
          />
        </aside>

        {/* Products Grid */}
        <div className="flex-1 w-full">
          <div className="sticky top-[80px] z-30 bg-background/95 backdrop-blur py-2 lg:static lg:bg-transparent lg:py-0 mb-2">
            <GridToolbar
              itemsFound={itemsFound}
              page={currentPage}
              pageSize={offset}
              pageItemCount={pageItemCount}
              activeTextFilters={filters}
              priceFilterMin={minPrice}
              priceFilterMax={maxPrice}
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

          <ProductGrid
            // Server-seeded first page — only while no interaction has
            // happened. Dropping it to `undefined` lets the grid fetch.
            products={usingServerData ? initialProducts : undefined}
            categoryId={categoryId}
            onProductClick={productClick}
            allowAddToCart={true}
            showPrice={true}
            showModal={true}
            createCart={true}
            cartId={cart?.cartId}
            onCartCreated={(c) => {
              saveCart(c);
            }}
            columns={viewMode === 'list' ? 1 : 3}
            textFilters={activeTextFilters}
            priceFilterMin={minPrice}
            priceFilterMax={maxPrice}
            pageSize={offset}
            sortField={sortField as string}
            sortOrder={sortOrder as string}
            showAvailability={false}
            showStock={true}
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
            onPageChange={setCurrentPage}
            afterAddToCart={(c) => {
              saveCart(c);
            }}
            onProceedToCheckout={() =>
              router.push(localizeHref('/checkout', language))
            }
            onRequestQuoteClick={() =>
              router.push(localizeHref('/checkout?mode=quote', language))
            }
            onProductsResponse={setProductsResponse}
            onCategoryChange={setCategory}
            onClusterClick={(cluster: Cluster) => {
              router.push(config.urls.getClusterUrl(cluster, language));
            }}
          />

          <div className="flex justify-center gap-2 mt-12">
            {productsResponse && (
              <GridPagination
                products={productsResponse}
                onPageChange={handlePageChange}
                variant="full"
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Above-the-fold breadcrumbs island. Lives in its own client component so the
 * non-serializable `configuration.urls.getCategoryUrl` function can be wired
 * up on the client — passing it directly from the Server Component would
 * throw at the RSC serialization step. Mirrors `ProductBreadcrumbsIsland`.
 */
export function CategoryBreadcrumbsIsland({
  category,
}: {
  category: Category;
}) {
  return (
    <Breadcrumbs
      categoryPath={category.categoryPath || []}
      currentCategory={category || undefined}
      showCurrent={true}
    />
  );
}
