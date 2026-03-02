'use client';

import { useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ProductGrid from '@/components/propeller/ProductGrid';
import GridFilters from '@/components/propeller/GridFilters';
import GridTitle from '@/components/propeller/GridTitle';
import CategoryDescription from '@/components/propeller/CategoryDescription';
import CategoryBanner from '@/components/cms/blocks/CategoryBanner';
import { getCategoryBanner } from '@/lib/cms/strapi';
import { graphqlClient } from '@/lib/api';
import { config } from '@/data/config';
import { categoryService } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Enums, AttributeFilter, ProductTextFilterInput, Category } from 'propeller-sdk-v2';
import type { CmsCategoryBanner } from '@/lib/cms/types';

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const categoryId = parseInt(params.id as string);

  // Prevent hydration mismatch — render grid only after client mount
  const mounted = useSyncExternalStore(
    () => () => { },
    () => true,
    () => false,
  );

  // Cart & auth integration
  const { cart, saveCart } = useCart();
  const { state: authState } = useAuth();

  // CMS banner
  const [banner, setBanner] = useState<CmsCategoryBanner | null>(null);

  // Category data (fetched once)
  const [categoryName, setCategoryName] = useState('Category');
  const [category, setCategory] = useState<Category>();

  // Filter state bridging GridFilters ↔ ProductGrid
  const [filters, setFilters] = useState<AttributeFilter[]>([]);
  const [textFilters, setTextFilters] = useState<ProductTextFilterInput[]>([]);
  const [priceMin, setPriceMin] = useState<number | 0>();
  const [priceMax, setPriceMax] = useState<number | 0>();
  const [itemsFound, setItemsFound] = useState(0);

  // Toolbar state
  const [pageSize, setPageSize] = useState(12);
  const [sortField, setSortField] = useState('CATEGORY_ORDER');
  const [sortOrder, setSortOrder] = useState('ASC');

  // Fetch CMS banner
  useEffect(() => {
    getCategoryBanner(String(categoryId)).then(setBanner);
  }, [categoryId]);

  // Fetch category name/description once
  useEffect(() => {
    categoryService.getCategory({
      categoryId,
      language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
      imageSearchFilters: config.imageSearchFiltersGrid,
      imageVariantFilters: config.imageVariantFiltersMedium,
      categoryProductSearchInput: {
        language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
        page: 1,
        offset: 1,
        statuses: [
          Enums.ProductStatus.A,
          Enums.ProductStatus.P,
          Enums.ProductStatus.T,
          Enums.ProductStatus.S,
        ],
      },
    }).then((cat) => {
      if (cat) setCategory(cat);
      if (cat?.name?.[0]?.value) setCategoryName(cat.name[0].value as string);
    }).catch(() => { });
  }, [categoryId]);

  // GridFilters → ProductGrid: convert filter checkbox toggle to textFilters array
  const handleFilterChange = useCallback((filter: AttributeFilter, value: string | number) => {
    setTextFilters((prev) => {
      const filterName = filter.attributeDescription?.name || '';
      const existing = prev.find((f) => f.name === filterName);
      if (existing) {
        const values = existing.values as string[];
        const hasValue = values.includes(String(value));
        const newValues = hasValue
          ? values.filter((v) => v !== String(value))
          : [...values, String(value)];

        if (newValues.length === 0) {
          return prev.filter((f) => f.name !== filterName);
        }
        return prev.map((f) =>
          f.name === filterName ? { ...f, values: newValues } : f
        );
      }
      return [
        ...prev,
        {
          name: filterName,
          values: [String(value)],
          exclude: false,
          type: Enums.AttributeType.TEXT,
        } as ProductTextFilterInput,
      ];
    });
  }, []);

  const handlePriceChange = useCallback((min: number, max: number) => {
    setPriceMin(min);
    setPriceMax(max);
  }, []);

  const handleClearFilters = useCallback(() => {
    setTextFilters([]);
    setPriceMin(undefined);
    setPriceMax(undefined);
  }, []);

  const handleFiltersFromGrid = useCallback((newFilters: AttributeFilter[]) => {
    setFilters(newFilters);
  }, []);

  const handlePriceBoundsChange = useCallback((min: number, max: number) => {
    // Only set initial bounds if not already filtering by price
    if (priceMin === undefined && priceMax === undefined) {
      setPriceMin(min);
      setPriceMax(max);
    }
  }, [priceMin, priceMax]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 py-8">
        <div className="container-width">
          {/* CMS Category Banner */}
          {banner && <CategoryBanner banner={banner} />}

          {/* Category Header */}
          <GridTitle
            title={categoryName}
            language={process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'}
          />

          <CategoryDescription
            category={category}
            language={process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'}
          />

          {mounted ? <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <aside className="w-full lg:w-64 flex-shrink-0">
              <GridFilters
                filters={filters}
                priceMin={priceMin}
                priceMax={priceMax}
                onFilterChange={handleFilterChange}
                onPriceChange={handlePriceChange}
                onClearFilters={handleClearFilters}
                collapsed={true}
              />
            </aside>

            {/* Products Grid */}
            <div className="flex-1 w-full">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sticky top-[80px] z-30 bg-background/95 backdrop-blur py-2 lg:static lg:bg-transparent lg:py-0">
                <div className="text-sm text-muted-foreground font-medium">
                  {itemsFound} Products
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(parseInt(e.target.value))}
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value={12}>12 per page</option>
                    <option value={24}>24 per page</option>
                    <option value={48}>48 per page</option>
                  </select>

                  <div className="h-4 w-px bg-border hidden sm:block" />

                  <select
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value)}
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
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="ASC">Low to High</option>
                    <option value="DESC">High to Low</option>
                  </select>
                </div>
              </div>

              {/* Product Grid */}
              <ProductGrid
                graphqlClient={graphqlClient}
                categoryId={categoryId}
                configuration={config}
                pageSize={pageSize}
                sortField={sortField}
                sortOrder={sortOrder}
                textFilters={textFilters}
                priceFilterMin={priceMin}
                priceFilterMax={priceMax}
                onFiltersChange={handleFiltersFromGrid}
                onPriceBoundsChange={handlePriceBoundsChange}
                onItemsFoundChange={setItemsFound}
                cartId={cart?.cartId}
                createCart={true}
                user={authState.user}
                onCartCreated={(newCart) => saveCart(newCart)}
                afterAddToCart={(updatedCart) => saveCart(updatedCart)}
                onProductClick={(product) => {
                  const slug = product.slugs?.[0]?.value || '';
                  router.push(`/product/${product.productId}/${slug}`);
                }}
                onClusterClick={(cluster) => {
                  const slug = cluster.slugs?.[0]?.value || cluster.defaultProduct?.slugs?.[0]?.value || '';
                  router.push(`/cluster/${cluster.clusterId}/${slug}`);
                }}
              />
            </div>
          </div> : <div className="flex justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}
        </div>
      </main>
      <Footer />
    </div>
  );
}
