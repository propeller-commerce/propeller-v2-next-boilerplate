'use client';

/**
 * ──────────────────────────────────────────────────────────────────────────
 * LEGACY CSR variant of the Category page.
 *
 * The original fully client-side implementation, kept verbatim for
 * comparison and as a fallback. Reachable at `/csr/category/[id]/[slug]`.
 *
 * The CANONICAL page is the hybrid-SSR version at
 * `app/category/[id]/[slug]/page.tsx` (server-rendered shell + CategoryIsland).
 *
 * Do not add features here — change the SSR page. This copy exists only so
 * the pre-SSR behaviour stays observable side-by-side.
 * ──────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { AttributeFilter, AttributeType, Category, Cluster, Product, ProductSortField, ProductsResponse, SortOrder } from 'propeller-sdk-v2';
import { ProductGrid } from 'propeller-v2-react-ui';
import { GridToolbar } from 'propeller-v2-react-ui';
import { GridFilters } from 'propeller-v2-react-ui';
import { GridPagination } from 'propeller-v2-react-ui';
import { GridTitle } from 'propeller-v2-react-ui';
import { CategoryDescription } from 'propeller-v2-react-ui';
import { useAuth } from '@/context/AuthContext';
import { config, localizeHref } from '@/data/config';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import type { CmsCategoryBanner } from '@/lib/cms/types';
import { getCategoryBanner } from '@/lib/cms';
import CategoryBanner from '@/components/cms/blocks/CategoryBanner';
import { Breadcrumbs } from 'propeller-v2-react-ui';

export default function CategoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryId = parseInt(params.id as string);
  const [category, setCategory] = useState<Category>();
  // Initialise URL-derived state directly from searchParams so the useEffect
  // below produces no state changes (and therefore no extra fetches) on first load.
  const [currentPage, setCurrentPage] = useState(() => parseInt(searchParams.get('page') || '1'));
  const [filters, setFilters] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    searchParams.forEach((value, key) => {
      if (!['page', 'minPrice', 'maxPrice', 'offset', 'sortField', 'sortOrder'].includes(key)) {
        try { initial[key] = JSON.parse(value); }
        catch { initial[key] = [value]; }
      }
    });
    return initial;
  });
  const [minPrice, setMinPrice] = useState<number | undefined>(() =>
    searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined
  );
  const [maxPrice, setMaxPrice] = useState<number | undefined>(() =>
    searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined
  );
  const [gridFilters, setGridFilters] = useState<AttributeFilter[]>([]);
  const [priceBoundsMin, setPriceBoundsMin] = useState<number | undefined>();
  const [priceBoundsMax, setPriceBoundsMax] = useState<number | undefined>();
  const [clearSignal, setClearSignal] = useState(0);
  const [itemsFound, setItemsFound] = useState<number>(0);
  const [pageItemCount, setPageItemCount] = useState<number>(0);
  const [offset, setOffset] = useState(() => parseInt(searchParams.get('offset') || '12'));
  const [sortField, setSortField] = useState<ProductSortField>(() =>
    (searchParams.get('sortField') as ProductSortField) || ProductSortField.CATEGORY_ORDER
  );
  const [sortOrder, setSortOrder] = useState<SortOrder>(() =>
    (searchParams.get('sortOrder') as SortOrder) || SortOrder.DESC
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [filtersLoading, setFiltersLoading] = useState(false);
  const { state } = useAuth();
  const { cart, saveCart } = useCart();
  const [productsResponse, setProductsResponse] = useState<ProductsResponse | null>(null);
  const { language } = useLanguage();

  // CMS banner
  const [banner, setBanner] = useState<CmsCategoryBanner | null>(null);

  // Parse URL parameters
  useEffect(() => {
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

    setCurrentPage(parseInt(searchParams.get('page') || '1'));
    // Use functional update so React can bail out when content is unchanged,
    // avoiding a spurious re-render (and downstream ProductGrid re-fetch) when
    // the searchParams object reference changes but the URL content is the same.
    setFilters(prev =>
      JSON.stringify(prev) === JSON.stringify(newFilters) ? prev : newFilters
    );
    setMinPrice(searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined);
    setMaxPrice(searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined);
    setOffset(parseInt(searchParams.get('offset') || '12'));
    setSortField(searchParams.get('sortField') as ProductSortField || ProductSortField.CATEGORY_ORDER);
    setSortOrder((searchParams.get('sortOrder') as SortOrder) || SortOrder.DESC);
  }, [searchParams]);

  // Fetch CMS banner
  useEffect(() => {
    getCategoryBanner(String(categoryId)).then(setBanner);
  }, [categoryId]);

  // Update URL slug when language or category changes — use history.replaceState
  // to avoid a Next.js re-render cascade that would trigger a second API fetch.
  useEffect(() => {
    if (!category) return;
    const match = category.slug?.find((s: { language?: string; value?: string }) => s.language === language);
    const newSlug = match?.value || category.slug?.[0]?.value || '';
    const currentSlug = window.location.pathname.split('/').pop();
    if (newSlug && newSlug !== currentSlug) {
      const search = window.location.search;
      window.history.replaceState(null, '', localizeHref(`/category/${categoryId}/${newSlug}`, language) + search);
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
    const searchParams = new URLSearchParams();

    if (newPage > 1) searchParams.set('page', newPage.toString());

    Object.entries(newFilters).forEach(([key, values]) => {
      if (values.length > 0) {
        searchParams.set(key, JSON.stringify(values));
      }
    });

    if (newMinPrice !== undefined) searchParams.set('minPrice', newMinPrice.toString());
    if (newMaxPrice !== undefined) searchParams.set('maxPrice', newMaxPrice.toString());
    if (newOffset !== undefined && newOffset !== 12) searchParams.set('offset', newOffset.toString());
    if (newSortField !== undefined && newSortField !== 'CATEGORY_ORDER') searchParams.set('sortField', newSortField);
    if (newSortOrder !== undefined && newSortOrder !== 'DESC') searchParams.set('sortOrder', newSortOrder);

    const newSearch = searchParams.toString();
    router.push(`${localizeHref(`/category/${categoryId}/${params.slug}`, language)}${newSearch ? `?${newSearch}` : ''}`, { scroll: false });
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

  const productClick = (product: Product) => {
    router.push(config.urls.getProductUrl(product, language));
  };

  // Stable defaultSort reference for GridToolbar — only changes when URL sort params change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const defaultSort = useMemo(
    () => [{ field: sortField as string, order: sortOrder as string }],
    [sortField, sortOrder]
  );

  const categoryName = (
    category?.name?.find((n: { language?: string; value?: string }) => n.language === language)?.value
    || category?.name?.[0]?.value
    || 'Category'
  ) as string;
  const products = (category?.products?.items || []) as (Product | Cluster)[];
  const totalPages = category?.products?.pages || 1;
  const hasActiveFilters = Object.keys(filters).length > 0 || minPrice !== undefined || maxPrice !== undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    }), [JSON.stringify(filters), gridFilters]);


  // Render Logic
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container-width">
          <div className="propeller-breadcrumbs mb-6">
            <Breadcrumbs
              categoryPath={category?.categoryPath || []}
              currentCategory={category || undefined}
              showCurrent={true}
            />
          </div>
          {/* CMS Category Banner */}
          {banner && <CategoryBanner banner={banner} />}

          {/* Category Header */}
          <GridTitle
            title={categoryName}
          />

          <CategoryDescription
            category={category}
          />

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
              {/* Toolbar — sticky on mobile, static on lg+ */}
              <div className="sticky top-[80px] z-30 bg-background/95 backdrop-blur py-2 lg:static lg:bg-transparent lg:py-0 mb-2">
                <GridToolbar
                  itemsFound={itemsFound}
                  page={currentPage}
                  pageSize={offset}
                  pageItemCount={pageItemCount}
                  activeTextFilters={filters}
                  priceFilterMin={minPrice}
                  priceFilterMax={maxPrice}
                  onSortChange={(field, order) => handleSortChange(field, order as 'ASC' | 'DESC')}
                  onOffsetChange={handleOffsetChange}
                  viewMode={viewMode}
                  onViewChange={(mode) => setViewMode(mode as 'grid' | 'list')}
                  onFilterRemove={handleFilterRemove}
                  onPriceFilterRemove={() => handlePriceRangeChange(undefined, undefined)}
                  onClearFilters={clearAllFilters}
                />
              </div>

              {/* Grid */}
              <ProductGrid
                categoryId={categoryId}
                onProductClick={productClick}
                allowAddToCart={true}
                showPrice={true}
                showModal={true}
                createCart={true}
                cartId={cart?.cartId}
                onCartCreated={(cart) => {
                  saveCart(cart);
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
                afterAddToCart={(cart, item) => {
                  saveCart(cart);
                  console.log('Cart updated:', cart);
                  console.log('Added item:', item);
                }}
                onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
                onRequestQuoteClick={() => router.push(localizeHref('/checkout?mode=quote', language))}
                onProductsResponse={setProductsResponse}
                onCategoryChange={setCategory}
                onClusterClick={(cluster: Cluster) => {
                  router.push(config.urls.getClusterUrl(cluster, language));
                }}
              />

              {/* Pagination */}
              <div className="flex justify-center gap-2 mt-12">
                {productsResponse && (
                  <GridPagination
                    products={productsResponse}
                    onPageChange={handlePageChange}
                    variant='full'
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
