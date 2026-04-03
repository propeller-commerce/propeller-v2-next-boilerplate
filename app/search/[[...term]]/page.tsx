'use client';

import { useState, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { graphqlClient } from '@/lib/api';
import { AttributeFilter, Cluster, Enums, Product, ProductsResponse } from 'propeller-sdk-v2';
import ProductGrid from '@/components/propeller/ProductGrid';
import GridToolbar from '@/components/propeller/GridToolbar';
import GridFilters from '@/components/propeller/GridFilters';
import GridPagination from '@/components/propeller/GridPagination';
import GridTitle from '@/components/propeller/GridTitle';
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
  const sortField = (searchParams.get('sortField') as Enums.ProductSortField) || Enums.ProductSortField.RELEVANCE;
  const sortOrder = (searchParams.get('sortOrder') as Enums.SortOrder) || Enums.SortOrder.ASC;

  const filters = useMemo(() => {
    const newFilters: Record<string, string[]> = {};
    searchParams.forEach((value, key) => {
      if (!['page', 'minPrice', 'maxPrice', 'offset', 'sortField', 'sortOrder'].includes(key)) {
        try {
          newFilters[key] = JSON.parse(decodeURIComponent(value));
        } catch {
          newFilters[key] = [decodeURIComponent(value)];
        }
      }
    });
    return newFilters;
  }, [searchParams]);

  const activeTextFilters = useMemo(() => Object.entries(filters)
    .filter(([, values]) => values.length > 0)
    .map(([name, values]) => ({
      name,
      values,
      exclude: false,
      type: Enums.AttributeType.TEXT,
    })), [filters]);

  // Component-local state (not URL-driven)
  const [gridFilters, setGridFilters] = useState<AttributeFilter[]>([]);
  const [priceBoundsMin, setPriceBoundsMin] = useState<number | undefined>();
  const [priceBoundsMax, setPriceBoundsMax] = useState<number | undefined>();
  const [clearSignal, setClearSignal] = useState(0);
  const [itemsFound, setItemsFound] = useState<number>(0);
  const [pageItemCount, setPageItemCount] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [productsResponse, setProductsResponse] = useState<ProductsResponse | null>(null);

  const { state } = useAuth();
  const { selectedCompany } = useCompany();
  const { cart, saveCart } = useCart();
  const { language } = useLanguage();
  const { includeTax } = usePrice();

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
        urlParams.set(key, encodeURIComponent(JSON.stringify(values)));
      }
    });

    if (newMinPrice !== undefined) urlParams.set('minPrice', newMinPrice.toString());
    if (newMaxPrice !== undefined) urlParams.set('maxPrice', newMaxPrice.toString());
    if (newOffset !== undefined && newOffset !== 12) urlParams.set('offset', newOffset.toString());
    if (newSortField !== undefined && newSortField !== 'RELEVANCE') urlParams.set('sortField', newSortField);
    if (newSortOrder !== undefined && newSortOrder !== 'ASC') urlParams.set('sortOrder', newSortOrder);

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
          <GridTitle
            title={`Search results for "${term}"`}
            language={language}
          />

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
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
                  user={state.user}
                  onSortChange={(field, order) => handleSortChange(field, order as 'ASC' | 'DESC')}
                  onOffsetChange={handleOffsetChange}
                  onViewChange={(mode) => setViewMode(mode as 'grid' | 'list')}
                  onFilterRemove={handleFilterRemove}
                  onPriceFilterRemove={() => handlePriceRangeChange(undefined, undefined)}
                  onClearFilters={clearAllFilters}
                />
              </div>

              {/* Grid */}
              <ProductGrid
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
                page={currentPage}
                afterAddToCart={(updatedCart) => {
                  console.log('updatedCart', updatedCart);
                  saveCart(updatedCart);
                }}
                onProceedToCheckout={() => router.push(localizeHref('/checkout', language))}
                onProductsResponse={setProductsResponse}
                onProductClick={(product: Product) => {
                  router.push(config.urls.getProductUrl(product, language));
                }}
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
