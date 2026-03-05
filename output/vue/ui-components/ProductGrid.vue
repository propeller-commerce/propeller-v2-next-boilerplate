<template>
  <div :class="`w-full ${className || ''}`">
    <template v-if="getIsLoading()">
      <div :class="getGridColsClass()">
        <template :key="idx" v-for="(_, idx) in getSkeletonItems()">
          <div
            class="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm"
          >
            <div class="aspect-square bg-slate-100 animate-pulse"></div>
            <div class="p-4 flex flex-col gap-2 flex-1">
              <div class="h-3 bg-slate-100 animate-pulse rounded w-1/4"></div>
              <div class="h-4 bg-slate-100 animate-pulse rounded w-3/4"></div>
              <div class="h-4 bg-slate-100 animate-pulse rounded w-1/2"></div>
              <div class="mt-auto pt-2">
                <div class="h-5 bg-slate-100 animate-pulse rounded w-1/3"></div>
              </div>
            </div>
            <template v-if="showAddToCart()">
              <div class="p-4 pt-0">
                <div class="flex items-center gap-2">
                  <div
                    class="h-9 flex-1 bg-slate-100 animate-pulse rounded"
                  ></div>
                  <div
                    class="h-9 flex-1 bg-slate-100 animate-pulse rounded"
                  ></div>
                </div>
              </div>
            </template>
          </div>
        </template>
      </div>
    </template>

    <template v-if="!getIsLoading()">
      <template v-if="getDisplayProducts().length === 0">
        <div
          class="text-center py-24 bg-gray-50 rounded-xl border border-dashed border-gray-200"
        >
          <svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            class="mx-auto h-12 w-12 text-gray-300"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              :strokeWidth="1"
            ></path>
          </svg>
          <h3 class="mt-4 text-lg font-semibold text-gray-900">
            No products found
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            Try adjusting your filters or search term.
          </p>
        </div>
      </template>

      <template v-if="getDisplayProducts().length > 0">
        <div :class="getGridColsClass()">
          <template
            :key="item.productId || item.clusterId || idx"
            v-for="(item, idx) in getDisplayProducts()"
          >
            <div>
              <template v-if="isClusterItem(item)">
                <template v-if="!renderClusterCard">
                  <ClusterCard
                    :columns="columns || 3"
                    :cluster="item"
                    :configuration="configuration"
                    :includeTax="includeTax"
                    :enableAddFavorite="enableAddFavorite"
                    :onToggleFavorite="
                      (cluster, isFav) => {
                        if (onToggleFavorite) {
                          onToggleFavorite(cluster, isFav);
                        }
                      }
                    "
                    :onClusterClick="
                      (cluster) => {
                        if (onClusterClick) {
                          onClusterClick(cluster);
                        }
                      }
                    "
                  ></ClusterCard>
                </template>
              </template>

              <template v-if="!isClusterItem(item)">
                <template v-if="!renderProductCard">
                  <template v-if="showAddToCart()">
                    <ProductCard
                      :columns="columns || 3"
                      :product="item"
                      :graphqlClient="graphqlClient"
                      :user="user || null"
                      :configuration="configuration"
                      :includeTax="includeTax"
                      :cartId="cartId"
                      :createCart="createCart"
                      :onCartCreated="onCartCreated"
                      :afterAddToCart="afterAddToCart"
                      :showModal="showModal"
                      :allowIncrDecr="allowIncrDecr"
                      :enableStockValidation="stockValidation"
                      :language="language || 'NL'"
                      :onProceedToCheckout="onProceedToCheckout"
                      :addToCartLabels="addToCartLabels"
                      :enableAddFavorite="enableAddFavorite"
                      :onToggleFavorite="
                        (product, isFav) => {
                          if (onToggleFavorite) {
                            onToggleFavorite(product, isFav);
                          }
                        }
                      "
                      :onProductClick="
                        (product) => {
                          if (onProductClick) {
                            onProductClick(product);
                          }
                        }
                      "
                    ></ProductCard>
                  </template>

                  <template v-if="!showAddToCart()">
                    <ProductCard
                      :columns="columns || 3"
                      :product="item"
                      :graphqlClient="graphqlClient"
                      :user="user || null"
                      :configuration="configuration"
                      :cartId="cartId"
                      :enableAddFavorite="enableAddFavorite"
                      :onToggleFavorite="
                        (product, isFav) => {
                          if (onToggleFavorite) {
                            onToggleFavorite(product, isFav);
                          }
                        }
                      "
                      :onProductClick="
                        (product) => {
                          if (onProductClick) {
                            onProductClick(product);
                          }
                        }
                      "
                    ></ProductCard>
                  </template>
                </template>
              </template>
            </div>
          </template>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

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
  CategoryQueryVariables,
  AttributeFilter,
  ProductTextFilterInput,
  ProductsResponse,
  Category,
} from "propeller-sdk-v2";
import ProductCard from "./ProductCard.vue";
import ClusterCard from "./ClusterCard.vue";
import {
  ProductSearchableField,
  ProductSortField,
} from "propeller-sdk-v2/dist/enum";

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
   * Called after each successful internal data fetch with the full
   * ProductsResponse object — use to drive an external GridPagination
   * component by passing the result as its `products` prop.
   */
  onProductsResponse?: (products: ProductsResponse) => void;

  /**
   * Called after each successful internal data fetch with the full
   * Category object — use to populate sibling components like GridTitle,
   * CategoryDescription, and CategoryShortDescription.
   */
  onCategoryChange?: (category: Category) => void;

  /**
   * Externally controlled current page.
   * When provided, the grid uses this value instead of its internal page
   * counter. Wire this to the `onPageChange` callback from a sibling
   * GridPagination so the two components stay in sync.
   * When changed the grid automatically re-fetches.
   */
  page?: number;

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
}

const props = defineProps<ProductGridProps>();
const internalProducts = ref<ProductGridState["internalProducts"]>([]);
const isInternalLoading = ref<ProductGridState["isInternalLoading"]>(false);
const currentPage = ref<ProductGridState["currentPage"]>(1);
const totalPages = ref<ProductGridState["totalPages"]>(1);
const itemsFound = ref<ProductGridState["itemsFound"]>(0);
const currentSortField = ref<ProductGridState["currentSortField"]>("");
const currentSortOrder = ref<ProductGridState["currentSortOrder"]>("ASC");

watch(
  () => [
    props.textFilters,
    props.priceFilterMin,
    props.priceFilterMax,
    props.categoryId,
    props.term,
    props.brand,
    props.sortField,
    props.sortOrder,
    props.pageSize,
  ],
  () => {
    if (props.products === undefined) {
      currentPage.value = 1;
      fetchProducts();
    }
  },
  { immediate: true }
);
watch(
  () => [props.page],
  () => {
    if (props.products === undefined && props.page !== undefined) {
      currentPage.value = props.page as number;
      fetchProducts();
    }
  },
  { immediate: true }
);
async function fetchProducts(): ReturnType<ProductGridState["fetchProducts"]> {
  if (!props.graphqlClient) return;
  isInternalLoading.value = true;
  try {
    const service = new CategoryService(props.graphqlClient as GraphQLClient);

    // Category mode: use the category prop.
    // Search / brand mode: use baseCategoryId to search the full catalog.
    const isWideSearch = !!(props.term as string) || !!(props.brand as string);
    const catId = isWideSearch
      ? (props.configuration?.baseCategoryId as number) || 0
      : props.categoryId
      ? props.categoryId
      : (props.configuration?.baseCategoryId as number) || 0;
    if (props.term && !currentSortField.value)
      currentSortField.value = ProductSortField.RELEVANCE;
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
        page: (props.page as number) || currentPage.value,
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
        ...((props.sortField || currentSortField.value) && {
          sortInputs: [
            {
              field: ((props.sortField as string) ||
                currentSortField.value) as Enums.ProductSortField,
              order: ((props.sortOrder as string) ||
                currentSortOrder.value) as Enums.SortOrder,
            },
          ],
        }),
      } as CategoryProductSearchInput,
    } as CategoryQueryVariables);
    internalProducts.value = (result?.products?.items || []) as (
      | Product
      | Cluster
    )[];
    totalPages.value = result?.products?.pages || 1;
    itemsFound.value = result?.products?.itemsFound.value || 0;
    if (props.onProductsResponse && result?.products) {
      props.onProductsResponse(result.products as ProductsResponse);
    }
    if (props.onCategoryChange && result) {
      props.onCategoryChange(result as Category);
    }
    if (props.onFiltersChange) {
      props.onFiltersChange(
        (result?.products?.filters || []) as AttributeFilter[]
      );
    }
    if (props.onPriceBoundsChange) {
      const pMin = result?.products?.minPrice;
      const pMax = result?.products?.maxPrice;
      if (pMin !== undefined && pMax !== undefined) {
        props.onPriceBoundsChange(pMin, pMax);
      }
    }
    if (props.onItemsFoundChange) {
      props.onItemsFoundChange(result?.products?.itemsFound.value || 0);
    }
  } catch {
    internalProducts.value = [];
  } finally {
    isInternalLoading.value = false;
  }
}
function isClusterItem(
  item: Product | Cluster
): ReturnType<ProductGridState["isClusterItem"]> {
  return !!(item as any)?.clusterId;
}
function getGridColsClass(): ReturnType<ProductGridState["getGridColsClass"]> {
  const cols = (props.columns as number) || 3;
  if (cols === 1) return "flex flex-col gap-4";
  if (cols === 2) return "grid grid-cols-1 sm:grid-cols-2 gap-6 auto-rows-fr";
  if (cols === 4)
    return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr";
  return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr";
}
function handlePageChange(
  page: number
): ReturnType<ProductGridState["handlePageChange"]> {
  currentPage.value = page;
  fetchProducts();
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
  return internalProducts.value;
}
function getIsLoading(): ReturnType<ProductGridState["getIsLoading"]> {
  return !!(props.isLoading as boolean) || isInternalLoading.value;
}
function showAddToCart(): ReturnType<ProductGridState["showAddToCart"]> {
  const mode = (props.portalMode as string) || "open";
  const allow = (props.allowAddToCart as boolean) !== false;
  return mode === "open" && allow;
}
function getSkeletonItems(): ReturnType<ProductGridState["getSkeletonItems"]> {
  const cols = (props.columns as number) || 3;
  const count = cols === 2 ? 4 : cols === 4 ? 8 : 6;
  const items: number[] = [];
  for (let i = 0; i < count; i++) items.push(i);
  return items;
}
</script>