'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductOrClusterCard from '@/components/common/ProductOrClusterCard';
import FiltersSidebar from '@/components/common/FiltersSidebar';
import { productService } from '@/lib/api';
import { Enums, Product, Cluster, ProductsResponse } from 'propeller-sdk-v2';
import { ProductsQueryVariables } from 'propeller-sdk-v2/dist/service/ProductService';
import { imageSearchFiltersGrid, imageVariantFiltersMedium } from '@/data/defaults';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';

export default function SearchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const term = decodeURIComponent(params.term as string);
  const [results, setResults] = useState<ProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [maxPrice, setMaxPrice] = useState<number | undefined>();
  const [offset, setOffset] = useState(12);
  const [sortField, setSortField] = useState<Enums.ProductSortField>(Enums.ProductSortField.NAME);
  const [sortOrder, setSortOrder] = useState<Enums.SortOrder>(Enums.SortOrder.ASC);

  // Parse URL parameters
  useEffect(() => {
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

    setCurrentPage(parseInt(searchParams.get('page') || '1'));
    setFilters(newFilters);
    setMinPrice(searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined);
    setMaxPrice(searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined);
    setOffset(parseInt(searchParams.get('offset') || '12'));
    setSortField(searchParams.get('sortField') as Enums.ProductSortField || Enums.ProductSortField.NAME);
    setSortOrder((searchParams.get('sortOrder') as Enums.SortOrder) || Enums.SortOrder.ASC);
  }, [searchParams]);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const productSearchVariables: ProductsQueryVariables = {
          input: {
            term,
            offset: offset,
            page: currentPage,
            language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
            statuses: [
              Enums.ProductStatus.A,
              Enums.ProductStatus.P,
              Enums.ProductStatus.T,
              Enums.ProductStatus.S
            ],
            sortInputs: [{
              field: sortField,
              order: sortOrder
            }],
            ...(minPrice !== undefined && maxPrice !== undefined ? {
              price: {
                from: minPrice,
                to: maxPrice
              }
            } : minPrice !== undefined ? {
              price: {
                from: minPrice,
                to: 999999
              }
            } : maxPrice !== undefined ? {
              price: {
                from: 0,
                to: maxPrice
              }
            } : {}),
            ...(Object.keys(filters).length > 0 ? {
              textFilters: Object.entries(filters).map(([name, values]) => ({
                name,
                values,
                exclude: false,
                type: Enums.AttributeType.TEXT
              }))
            } : {})
          },
          priceCalculateProductInput: {
            taxZone: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
          },
          imageSearchFilters: imageSearchFiltersGrid,
          imageVariantFilters: imageVariantFiltersMedium,
          language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
          filterAvailableAttributeInput: {
            isSearchable: true
          }
        };

        const data = await productService.getProducts(productSearchVariables);
        setResults(data);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [term, currentPage, filters, minPrice, maxPrice, offset, sortField, sortOrder]);

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
        searchParams.set(key, encodeURIComponent(JSON.stringify(values)));
      }
    });

    if (newMinPrice !== undefined) searchParams.set('minPrice', newMinPrice.toString());
    if (newMaxPrice !== undefined) searchParams.set('maxPrice', newMaxPrice.toString());
    if (newOffset !== undefined && newOffset !== 12) searchParams.set('offset', newOffset.toString());
    if (newSortField !== undefined && newSortField !== 'NAME') searchParams.set('sortField', newSortField);
    if (newSortOrder !== undefined && newSortOrder !== 'ASC') searchParams.set('sortOrder', newSortOrder);

    const newSearch = searchParams.toString();
    router.push(`/search/${encodeURIComponent(term)}${newSearch ? `?${newSearch}` : ''}`, { scroll: false });
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  const handleFilterChange = (filterName: string, values: string[]) => {
    const newFilters = { ...filters, [filterName]: values };
    if (values.length === 0) delete newFilters[filterName];
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
    updateURL({}, 1, undefined, undefined, offset, sortField as string, sortOrder as 'ASC' | 'DESC');
  };



  const products = (results?.items || []) as (Product | Cluster)[];
  const totalPages = results?.pages || 1;
  const hasActiveFilters = Object.keys(filters).length > 0 || minPrice !== undefined || maxPrice !== undefined;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container-width">
          {/* Search Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Search results for &quot;{term}&quot;
            </h1>
            {results?.itemsFound !== undefined && (
              <p className="text-muted-foreground">
                {results.itemsFound} {results.itemsFound === 1 ? 'result' : 'results'} found
              </p>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <aside className="w-full lg:w-64 flex-shrink-0">
              {loading && !results ? (
                <div className="bg-card rounded-lg border p-6 h-96 animate-pulse" />
              ) : results ? (
                <FiltersSidebar
                  productsResponse={results}
                  currentFilters={filters}
                  currentMinPrice={minPrice}
                  currentMaxPrice={maxPrice}
                  onFilterChange={handleFilterChange}
                  onPriceRangeChange={handlePriceRangeChange}
                />
              ) : null}
            </aside>

            {/* Products Grid */}
            <div className="flex-1 w-full">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sticky top-[80px] z-30 bg-background/95 backdrop-blur py-2 lg:static lg:bg-transparent lg:py-0">
                <div className="text-sm text-muted-foreground font-medium">
                  {loading ? 'Searching...' : `${results?.itemsFound || 0} Results`}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={offset}
                    onChange={(e) => handleOffsetChange(parseInt(e.target.value))}
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value={12}>12 per page</option>
                    <option value={24}>24 per page</option>
                    <option value={48}>48 per page</option>
                  </select>

                  <div className="h-4 w-px bg-border hidden sm:block" />

                  <select
                    value={sortField}
                    onChange={(e) => handleSortChange(e.target.value)}
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="CATEGORY_ORDER">Default Sorting</option>
                    <option value="NAME">Name</option>
                    <option value="PRICE">Price</option>
                    <option value="SKU">SKU</option>
                    <option value="SUPPLIER_CODE">Supplier code</option>
                    <option value="CREATED_AT">Created date</option>
                    <option value="LAST_MODIFIED_AT">Last modified date</option>
                    <option value="RELEVANCE">Relevance</option>
                    <option value="PRIORITY">Priority</option>
                  </select>

                  <select
                    value={sortOrder}
                    onChange={(e) => handleSortChange(sortField, e.target.value as 'ASC' | 'DESC')}
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="ASC">Low to High</option>
                    <option value="DESC">High to Low</option>
                  </select>
                </div>
              </div>

              {/* Active Filters Bar */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 mb-6">
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 px-2 text-xs">
                    Clear All
                  </Button>
                  {(minPrice !== undefined || maxPrice !== undefined) && (
                    <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => handlePriceRangeChange(undefined, undefined)}>
                      Price: €{minPrice ?? 0} - €{maxPrice ?? '∞'} <span>×</span>
                    </Badge>
                  )}
                  {Object.entries(filters).map(([key, values]) =>
                    values.map(val => (
                      <Badge key={`${key}-${val}`} variant="outline" className="gap-1 cursor-pointer hover:bg-destructive hover:text-destructive-foreground hover:border-destructive" onClick={() => handleFilterChange(key, values.filter(v => v !== val))}>
                        {val} <span>×</span>
                      </Badge>
                    ))
                  )}
                </div>
              )}

              {/* Grid */}
              {loading && !results ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Card key={i} className="w-full h-full flex flex-col overflow-hidden border-border/60">
                      <div className="relative aspect-square bg-slate-100 animate-pulse" />
                      <CardContent className="p-4 flex-1 flex flex-col gap-2">
                        <div className="h-3 bg-slate-100 animate-pulse rounded w-1/4" />
                        <div className="h-4 bg-slate-100 animate-pulse rounded w-3/4" />
                        <div className="h-4 bg-slate-100 animate-pulse rounded w-1/2" />
                        <div className="mt-auto pt-2">
                          <div className="h-5 bg-slate-100 animate-pulse rounded w-1/3" />
                        </div>
                      </CardContent>
                      <div className="p-4 pt-0">
                        <div className="flex items-center gap-2">
                          <div className="h-9 flex-1 bg-slate-100 animate-pulse rounded" />
                          <div className="h-9 flex-1 bg-slate-100 animate-pulse rounded" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
                  {products.map((product: Product | Cluster) => (
                    <div key={(product as Product).productId || (product as Cluster).clusterId} className="w-full">
                      <ProductOrClusterCard
                        item={product}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && products.length === 0 && (
                <div className="text-center py-24 bg-muted/20 rounded-xl border border-dashed">
                  <h3 className="text-lg font-semibold">No results found</h3>
                  <p className="text-muted-foreground">Try adjusting your search term or filters.</p>
                  <Button variant="link" onClick={clearAllFilters}>Clear Filters</Button>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-12">
                  <Button
                    variant="outline"
                    disabled={currentPage === 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    Previous
                  </Button>
                  {/* Simplified Pagination for now - just numbers */}
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    disabled={currentPage === totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
