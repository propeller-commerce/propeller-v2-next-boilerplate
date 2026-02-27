"use client";
import * as React from "react";
import { useState, useEffect, useRef } from "react";

export interface ProductGridProps {
  // ── Data source ──────────────────────────────────────────────────────────

  /**
   * Initialised Propeller SDK GraphQL client.
   * Required when `products` is not provided — used for internal data fetching.
   */
  graphqlClient?: GraphQLClient;

  /**
   * Pre-fetched products/clusters to display.
   * When provided the component skips internal API calls entirely.
   * Pass an empty array (not undefined) to show the empty state while the
   * parent controls loading.
   */
  products?: (Product | Cluster)[];

  // ── Locale / pricing ─────────────────────────────────────────────────────

  /** Language code for product data. Defaults to 'NL'. */
  language?: string;

  /** Tax zone used for price calculation. Defaults to 'NL'. */
  taxZone?: string;

  // ── Query mode (only used when graphqlClient is provided) ─────────────────

  /**
   * Category ID to list products for (category-page mode).
   * When omitted alongside `term` and `brand`, `config.baseCategoryId` is used.
   */
  categoryId?: number;

  /**
   * Search term — passes `term` into categoryProductSearchInput and uses
   * `config.baseCategoryId` so the whole catalog is searched.
   */
  term?: string;

  /**
   * Manufacturer/brand name — passes `manufacturers: [brand]` into
   * categoryProductSearchInput and uses `config.baseCategoryId`.
   */
  brand?: string;

  // ── Layout ────────────────────────────────────────────────────────────────

  /** Number of columns in the grid. Accepts 2, 3, or 4. Defaults to 3. */
  columns?: number;

  // ── Loading ───────────────────────────────────────────────────────────────

  /**
   * Show a skeleton loader.
   * Useful when the parent controls loading state and passes `products` down.
   * The grid automatically shows a skeleton during internal fetches regardless
   * of this prop. Defaults to false.
   */
  isLoading?: boolean;

  // ── Custom card renderers (render-prop / slot) ────────────────────────────

  /**
   * Provide a custom product card renderer.
   * Falls back to the built-in `<ProductCard>` when not set.
   */
  renderProductCard?: (product: Product) => any;

  /**
   * Provide a custom cluster card renderer.
   * Falls back to the built-in `<ClusterCard>` when not set.
   */
  renderClusterCard?: (cluster: Cluster) => any;

  // ── Portal / visibility ───────────────────────────────────────────────────

  /**
   * Controls portal visibility mode.
   * 'open'        — full e-commerce; AddToCart is visible in product cards.
   * 'semi-closed' — catalog-only; AddToCart is hidden.
   * Defaults to 'open'.
   */
  portalMode?: string;

  /** Authenticated user passed through to ProductCard / AddToCart. */
  user?: Contact | Customer | null;

  /**
   * When true, tax-inclusive (gross) price is the leading price.
   * Defaults to false.
   */
  includeTax?: boolean;

  /**
   * Enables stock validation inside AddToCart.
   * Blocks add when requested quantity exceeds available stock.
   * Defaults to false.
   */
  stockValidation?: boolean;

  /**
   * When false, hides the AddToCart control in product cards.
   * ClusterCards always show their "View cluster" navigation button.
   * Defaults to true.
   */
  allowAddToCart?: boolean;

  // ── External hooks ────────────────────────────────────────────────────────

  /**
   * Called after each internal data fetch with the filterable attributes
   * returned by the API (for driving a sibling FiltersSidebar).
   */
  onFiltersChange?: (filters: AttributeFilter[]) => void;

  /**
   * Active text filters to apply — built by the parent from FiltersSidebar
   * `onFilterChange` callbacks.  Each entry maps to a `textFilters` input
   * row in the CategoryService query.
   * When this prop changes the grid automatically re-fetches (page resets to 1).
   */
  textFilters?: ProductTextFilterInput[];

  /**
   * Active price range lower bound from the FiltersSidebar `onPriceChange`.
   * Triggers a re-fetch when changed.
   */
  priceFilterMin?: number;

  /**
   * Active price range upper bound from the FiltersSidebar `onPriceChange`.
   * Triggers a re-fetch when changed.
   */
  priceFilterMax?: number;

  /**
   * Called when sort state changes internally (for syncing a sibling toolbar).
   */
  onSortChange?: (sort: any) => void;

  /**
   * Called after each internal data fetch with the min/max price of the
   * current product set — use to populate a price range slider in the parent.
   */
  onPriceBoundsChange?: (min: number, max: number) => void;

  /**
   * Called after each fetch with the total number of products found —
   * use to display a result count in the parent toolbar.
   */
  onItemsFoundChange?: (count: number) => void;

  /**
   * Called when the user clicks Previous / Next in the built-in pagination —
   * use to keep the parent URL / page state in sync.
   */
  onPageChange?: (page: number) => void;

  /**
   * Number of products per page. Defaults to 12.
   * When changed the grid automatically re-fetches (page resets to 1).
   */
  pageSize?: number;

  /**
   * Sort field to use (e.g. 'NAME', 'PRICE').
   * When provided overrides internal sort state.
   * When changed the grid automatically re-fetches (page resets to 1).
   */
  sortField?: string;

  /**
   * Sort direction: 'ASC' or 'DESC'.
   * Only used when sortField is also provided.
   * When changed the grid automatically re-fetches (page resets to 1).
   */
  sortOrder?: string;

  // ── Configuration ─────────────────────────────────────────────────────────

  /**
   * Configuration object providing:
   *   imageSearchFiltersGrid, imageVariantFiltersMedium — passed to CategoryService
   *   baseCategoryId — used when querying by term or brand
   *   urls.getProductUrl / urls.getClusterUrl — for card URL generation
   */
  configuration?: any;

  // ── ProductCard / AddToCart pass-through props ────────────────────────────

  /** ID of an existing cart to add items into. */
  cartId?: string;

  /**
   * Auto-create a cart when none is available.
   * Always pair with `onCartCreated` to persist the new cart ID.
   */
  createCart?: boolean;

  /** Called after AddToCart creates a new cart internally. */
  onCartCreated?: (cart: Cart) => void;

  /** Called after every successful add-to-cart operation. */
  afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;

  /**
   * When true, AddToCart shows a success modal instead of a toast.
   * Defaults to false.
   */
  showModal?: boolean;

  /**
   * Render − / + stepper buttons in AddToCart.
   * Defaults to true.
   */
  allowIncrDecr?: boolean;

  /** Called when "Proceed to checkout" is clicked in the AddToCart modal. */
  onProceedToCheckout?: () => void;

  /**
   * Label overrides forwarded directly to the embedded AddToCart component.
   * Keys: add, adding, addedToCart, outOfStock, noCartId, errorAdding,
   *       modalTitle, quantity, continueShopping, proceedToCheckout
   */
  addToCartLabels?: Record<string, string>;

  // ── Card interaction ──────────────────────────────────────────────────────

  /** Show a heart-icon favourite toggle on each card. */
  enableAddFavorite?: boolean;

  /**
   * Called when a favourite is toggled on any card.
   * Receives the full Product or Cluster object and the new favourite state.
   */
  onToggleFavorite?: (item: Product | Cluster, isFavorite: boolean) => void;

  /**
   * Called when a cluster card name, image, or "View cluster" button is
   * clicked — use for SPA-style routing instead of full-page navigation.
   */
  onClusterClick?: (cluster: Cluster) => void;

  /**
   * Called when a product card name or image is clicked — use for SPA
   * routing instead of full-page navigation.
   */
  onProductClick?: (product: Product) => void;

  /** Extra CSS class applied to the root element. */
  className?: string;
}
interface ProductGridState {
  internalProducts: (Product | Cluster)[];
  isInternalLoading: boolean;
  currentPage: number;
  totalPages: number;
  itemsFound: number;
  currentSortField: string;
  currentSortOrder: string;
  fetchProducts: () => Promise<void>;
  isClusterItem: (item: Product | Cluster) => boolean;
  getGridColsClass: () => string;
  handlePageChange: (page: number) => void;
  getDisplayProducts: () => (Product | Cluster)[];
  getIsLoading: () => boolean;
  showAddToCart: () => boolean;
  getSkeletonItems: () => number[];
  showPagination: () => boolean;
}

import {
  GraphQLClient,
  Product,
  Cluster,
  Contact,
  Customer,
  Cart,
  CartMainItem,
  CartChildItemInput,
  Enums,
  CategoryService,
  Attribute,
  CategoryProductSearchInput,
  AttributeFilter,
  ProductTextFilterInput,
} from "propeller-sdk-v2";
import { CategoryQueryVariables } from "propeller-sdk-v2/dist/service/CategoryService";
import ProductCard from "./ProductCard";
import ClusterCard from "./ClusterCard";
import {
  ProductSearchableField,
  ProductSortField,
} from "propeller-sdk-v2/dist/enum";

function ProductGrid(props: ProductGridProps) {
  const [internalProducts, setInternalProducts] = useState<
    ProductGridState["internalProducts"]
  >(() => []);

  const [isInternalLoading, setIsInternalLoading] = useState<
    ProductGridState["isInternalLoading"]
  >(() => false);

  const [currentPage, _setCurrentPage] = useState<
    ProductGridState["currentPage"]
  >(() => 1);
  const currentPageRef = useRef(currentPage);
  const setCurrentPage = (page: number) => {
    currentPageRef.current = page;
    _setCurrentPage(page);
  };

  const [totalPages, setTotalPages] = useState<ProductGridState["totalPages"]>(
    () => 1
  );

  const [itemsFound, setItemsFound] = useState<ProductGridState["itemsFound"]>(
    () => 0
  );

  const [currentSortField, setCurrentSortField] = useState<
    ProductGridState["currentSortField"]
  >(() => "");

  const [currentSortOrder, setCurrentSortOrder] = useState<
    ProductGridState["currentSortOrder"]
  >(() => "ASC");

  async function fetchProducts(): ReturnType<
    ProductGridState["fetchProducts"]
  > {
    if (!props.graphqlClient) return;
    setIsInternalLoading(true);
    try {
      const service = new CategoryService(props.graphqlClient as GraphQLClient);

      // Category mode: use the category prop.
      // Search / brand mode: use baseCategoryId to search the full catalog.
      const isWideSearch =
        !!(props.term as string) || !!(props.brand as string);
      const catId = isWideSearch
        ? (props.configuration?.baseCategoryId as number) || 0
        : props.categoryId
        ? props.categoryId
        : (props.configuration?.baseCategoryId as number) || 0;
      if (props.term && !currentSortField)
        setCurrentSortField(ProductSortField.RELEVANCE);
      const result = await service.getCategory({
        categoryId: catId,
        language: (props.language as string) || "NL",
        imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
        imageVariantFilters: props.configuration?.imageVariantFiltersMedium,
        filterAvailableAttributeInput: {
          isSearchable: true,
        },
        categoryProductSearchInput: {
          language: (props.language as string) || "NL",
          page: currentPageRef.current,
          offset: (props.pageSize as number) || 12,
          hidden: false,
          statuses: [
            Enums.ProductStatus.A,
            Enums.ProductStatus.P,
            Enums.ProductStatus.T,
            Enums.ProductStatus.S,
          ],
          ...((props.term as string) && {
            term: props.term as string,
            searchFields: [
              {
                fieldNames: [
                  ProductSearchableField.NAME,
                  ProductSearchableField.KEYWORDS,
                  ProductSearchableField.SKU,
                  ProductSearchableField.CUSTOM_KEYWORDS,
                ],
                boost: 5,
              },
              {
                fieldNames: [
                  ProductSearchableField.DESCRIPTION,
                  ProductSearchableField.MANUFACTURER,
                  ProductSearchableField.MANUFACTURER_CODE,
                  ProductSearchableField.EAN_CODE,
                  ProductSearchableField.BAR_CODE,
                  ProductSearchableField.CLUSTER_ID,
                  ProductSearchableField.CUSTOM_KEYWORDS,
                  ProductSearchableField.PRODUCT_ID,
                  ProductSearchableField.SHORT_DESCRIPTION,
                  ProductSearchableField.SUPPLIER,
                  ProductSearchableField.SUPPLIER_CODE,
                ],
                boost: 1,
              },
            ],
          }),
          ...((props.brand as string) && {
            manufacturers: [props.brand as string],
          }),
          ...((props.textFilters as any[])?.length > 0 && {
            textFilters: props.textFilters as any[],
          }),
          ...(props.priceFilterMin !== undefined ||
          props.priceFilterMax !== undefined
            ? {
                price: {
                  from: (props.priceFilterMin as number) || 0,
                  to: (props.priceFilterMax as number) || 999999,
                },
              }
            : {}),
          ...((props.sortField || currentSortField) && {
            sortInputs: [
              {
                field: ((props.sortField as string) ||
                  currentSortField) as Enums.ProductSortField,
                order: ((props.sortOrder as string) ||
                  currentSortOrder) as Enums.SortOrder,
              },
            ],
          }),
        } as CategoryProductSearchInput,
      } as CategoryQueryVariables);
      setInternalProducts(
        ((result as any)?.products?.items || []) as (Product | Cluster)[]
      );
      setTotalPages((result as any)?.products?.pages || 1);
      setItemsFound((result as any)?.products?.itemsFound || 0);
      if (props.onFiltersChange) {
        props.onFiltersChange(
          ((result as any)?.products?.filters || []) as AttributeFilter[]
        );
      }
      if (props.onPriceBoundsChange) {
        const pMin = (result as any)?.products?.minPrice;
        const pMax = (result as any)?.products?.maxPrice;
        if (pMin !== undefined && pMax !== undefined) {
          props.onPriceBoundsChange(pMin, pMax);
        }
      }
      if (props.onItemsFoundChange) {
        props.onItemsFoundChange((result as any)?.products?.itemsFound || 0);
      }
    } catch {
      setInternalProducts([]);
    } finally {
      setIsInternalLoading(false);
    }
  }

  function isClusterItem(
    item: Product | Cluster
  ): ReturnType<ProductGridState["isClusterItem"]> {
    return !!(item as any)?.clusterId;
  }

  function getGridColsClass(): ReturnType<
    ProductGridState["getGridColsClass"]
  > {
    const cols = (props.columns as number) || 3;
    if (cols === 2) return "grid grid-cols-1 sm:grid-cols-2 gap-6 auto-rows-fr";
    if (cols === 4)
      return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr";
    return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr";
  }

  function handlePageChange(
    page: number
  ): ReturnType<ProductGridState["handlePageChange"]> {
    setCurrentPage(page);
    if (props.onPageChange) props.onPageChange(page);
  }

  function getDisplayProducts(): ReturnType<
    ProductGridState["getDisplayProducts"]
  > {
    // Use props.products when explicitly provided (even if empty array).
    // Fall through to internally fetched products only when prop is absent.
    if (props.products !== undefined) {
      return (props.products as (Product | Cluster)[]) || [];
    }
    return internalProducts;
  }

  function getIsLoading(): ReturnType<ProductGridState["getIsLoading"]> {
    return !!(props.isLoading as boolean) || isInternalLoading;
  }

  function showAddToCart(): ReturnType<ProductGridState["showAddToCart"]> {
    const mode = (props.portalMode as string) || "open";
    const allow = (props.allowAddToCart as boolean) !== false;
    return mode === "open" && allow;
  }

  function getSkeletonItems(): ReturnType<
    ProductGridState["getSkeletonItems"]
  > {
    const cols = (props.columns as number) || 3;
    const count = cols === 2 ? 4 : cols === 4 ? 8 : 6;
    const items: number[] = [];
    for (let i = 0; i < count; i++) items.push(i);
    return items;
  }

  function showPagination(): ReturnType<ProductGridState["showPagination"]> {
    // Pagination is only relevant when the grid is managing its own data.
    return props.products === undefined && totalPages > 1;
  }

  // Reset to page 1 when filters/sort/pageSize change
  const [fetchTrigger, setFetchTrigger] = useState(0);
  useEffect(() => {
    if (props.products === undefined) {
      setCurrentPage(1);
      setFetchTrigger((t) => t + 1);
    }
  }, [
    props.textFilters,
    props.priceFilterMin,
    props.priceFilterMax,
    props.categoryId,
    props.term,
    props.brand,
    props.sortField,
    props.sortOrder,
    props.pageSize,
  ]);

  // Fetch products whenever currentPage or fetchTrigger changes
  useEffect(() => {
    if (props.products === undefined) {
      fetchProducts();
    }
  }, [currentPage, fetchTrigger]);

  return (
    <div className={`w-full ${(props.className as string) || ""}`}>
      {getIsLoading() ? (
        <div className={getGridColsClass()}>
          {getSkeletonItems()?.map((i) => (
            <div key={i} className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="aspect-square bg-slate-100 animate-pulse" />
              <div className="p-4 flex flex-col gap-2 flex-1">
                <div className="h-3 bg-slate-100 animate-pulse rounded w-1/4" />
                <div className="h-4 bg-slate-100 animate-pulse rounded w-3/4" />
                <div className="h-4 bg-slate-100 animate-pulse rounded w-1/2" />
                <div className="mt-auto pt-2">
                  <div className="h-5 bg-slate-100 animate-pulse rounded w-1/3" />
                </div>
              </div>
              {showAddToCart() ? (
                <div className="p-4 pt-0">
                  <div className="flex items-center gap-2">
                    <div className="h-9 flex-1 bg-slate-100 animate-pulse rounded" />
                    <div className="h-9 flex-1 bg-slate-100 animate-pulse rounded" />
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {!getIsLoading() ? (
        <>
          {getDisplayProducts().length === 0 ? (
            <div className="text-center py-24 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <svg
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                className="mx-auto h-12 w-12 text-gray-300"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  strokeWidth={1}
                />
              </svg>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                No products found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your filters or search term.
              </p>
            </div>
          ) : null}
          {getDisplayProducts().length > 0 ? (
            <>
              <div className={getGridColsClass()}>
                {getDisplayProducts()?.map((item) => (
                  <div key={(item as any).productId || (item as any).clusterId}>
                    {isClusterItem(item) ? (
                      <>
                        {!props.renderClusterCard ? (
                          <ClusterCard
                            cluster={item as Cluster}
                            configuration={props.configuration}
                            enableAddFavorite={
                              props.enableAddFavorite as boolean
                            }
                            onToggleFavorite={(cluster, isFav) => {
                              if (props.onToggleFavorite) {
                                props.onToggleFavorite(cluster, isFav);
                              }
                            }}
                            onClusterClick={(cluster) => {
                              if (props.onClusterClick) {
                                props.onClusterClick(cluster);
                              }
                            }}
                          />
                        ) : null}
                      </>
                    ) : null}
                    {!isClusterItem(item) ? (
                      <>
                        {!props.renderProductCard ? (
                          <>
                            {showAddToCart() ? (
                              <ProductCard
                                product={item as Product}
                                graphqlClient={
                                  props.graphqlClient as GraphQLClient
                                }
                                user={
                                  (props.user as Contact | Customer | null) ||
                                  null
                                }
                                configuration={props.configuration}
                                cartId={props.cartId as string}
                                createCart={props.createCart as boolean}
                                onCartCreated={props.onCartCreated}
                                afterAddToCart={props.afterAddToCart}
                                showModal={props.showModal as boolean}
                                allowIncrDecr={props.allowIncrDecr}
                                enableStockValidation={
                                  props.stockValidation as boolean
                                }
                                language={(props.language as string) || "NL"}
                                onProceedToCheckout={props.onProceedToCheckout}
                                addToCartLabels={props.addToCartLabels}
                                enableAddFavorite={
                                  props.enableAddFavorite as boolean
                                }
                                onToggleFavorite={(product, isFav) => {
                                  if (props.onToggleFavorite) {
                                    props.onToggleFavorite(product, isFav);
                                  }
                                }}
                                onProductClick={(product) => {
                                  if (props.onProductClick) {
                                    props.onProductClick(product);
                                  }
                                }}
                              />
                            ) : null}
                            {!showAddToCart() ? (
                              <ProductCard
                                product={item as Product}
                                graphqlClient={
                                  props.graphqlClient as GraphQLClient
                                }
                                user={
                                  (props.user as Contact | Customer | null) ||
                                  null
                                }
                                configuration={props.configuration}
                                cartId={props.cartId as string}
                                enableAddFavorite={
                                  props.enableAddFavorite as boolean
                                }
                                onToggleFavorite={(product, isFav) => {
                                  if (props.onToggleFavorite) {
                                    props.onToggleFavorite(product, isFav);
                                  }
                                }}
                                onProductClick={(product) => {
                                  if (props.onProductClick) {
                                    props.onProductClick(product);
                                  }
                                }}
                              />
                            ) : null}
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
              {showPagination() ? (
                <div className="flex justify-center items-center gap-2 mt-12">
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={currentPage === 1}
                    onClick={(event) => handlePageChange(currentPage - 1)}
                  >
                    Previous
                  </button>
                  <span className="px-2 text-sm font-medium text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={currentPage === totalPages}
                    onClick={(event) => handlePageChange(currentPage + 1)}
                  >
                    Next
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default ProductGrid;
