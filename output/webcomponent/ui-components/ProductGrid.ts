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
} from "propeller-sdk-v2";
import ProductCard from "./ProductCard";
import ClusterCard from "./ClusterCard";
import {
  ProductSearchableField,
  ProductSortField,
} from "propeller-sdk-v2/dist/enum";

/**
 * Usage:
 *
 *  <product-grid></product-grid>
 *
 */
class ProductGrid extends HTMLElement {
  get _root() {
    return this.shadowRoot || this;
  }

  constructor() {
    super();
    const self = this;

    this.state = {
      internalProducts: [],
      isInternalLoading: false,
      currentPage: 1,
      totalPages: 1,
      itemsFound: 0,
      currentSortField: "",
      currentSortOrder: "ASC",
      fetchProducts: async function fetchProducts() {
        if (!self.props.graphqlClient) return;
        self.state.isInternalLoading = true;
        self.update();
        try {
          const service = new CategoryService(
            self.props.graphqlClient as GraphQLClient
          );

          // Category mode: use the category prop.
          // Search / brand mode: use baseCategoryId to search the full catalog.
          const isWideSearch =
            !!(self.props.term as string) || !!(self.props.brand as string);
          const catId = isWideSearch
            ? (self.props.configuration?.baseCategoryId as number) || 0
            : self.props.categoryId
            ? self.props.categoryId
            : (self.props.configuration?.baseCategoryId as number) || 0;
          if (self.props.term && !self.state.currentSortField) {
            self.state.currentSortField = ProductSortField.RELEVANCE;
            self.update();
            self.update();
          }
          const result = await service.getCategory({
            categoryId: catId,
            language: (self.props.language as string) || "NL",
            imageSearchFilters:
              self.props.configuration?.imageSearchFiltersGrid,
            imageVariantFilters:
              self.props.configuration?.imageVariantFiltersMedium,
            filterAvailableAttributeInput: {
              isSearchable: true,
            },
            categoryProductSearchInput: {
              language: (self.props.language as string) || "NL",
              page: (self.props.page as number) || self.state.currentPage,
              offset: (self.props.pageSize as number) || 12,
              hidden: false,
              statuses: [
                Enums.ProductStatus.A,
                Enums.ProductStatus.P,
                Enums.ProductStatus.T,
                Enums.ProductStatus.S,
              ],
              ...((self.props.term as string) && {
                term: self.props.term as string,
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
              ...((self.props.brand as string) && {
                manufacturers: [self.props.brand as string],
              }),
              ...((self.props.textFilters as any[])?.length > 0 && {
                textFilters: self.props.textFilters as any[],
              }),
              ...(self.props.priceFilterMin !== undefined ||
              self.props.priceFilterMax !== undefined
                ? {
                    price: {
                      from: (self.props.priceFilterMin as number) || 0,
                      to: (self.props.priceFilterMax as number) || 999999,
                    },
                  }
                : {}),
              ...((self.props.sortField || self.state.currentSortField) && {
                sortInputs: [
                  {
                    field: ((self.props.sortField as string) ||
                      self.state.currentSortField) as Enums.ProductSortField,
                    order: ((self.props.sortOrder as string) ||
                      self.state.currentSortOrder) as Enums.SortOrder,
                  },
                ],
              }),
            } as CategoryProductSearchInput,
          } as CategoryQueryVariables);
          self.state.internalProducts = (result?.products?.items || []) as (
            | Product
            | Cluster
          )[];
          self.update();
          self.state.totalPages = result?.products?.pages || 1;
          self.update();
          self.state.itemsFound = result?.products?.itemsFound || 0;
          self.update();
          if (self.props.onProductsResponse && result?.products) {
            self.props.onProductsResponse(result.products as ProductsResponse);
          }
          if (self.props.onFiltersChange) {
            self.props.onFiltersChange(
              (result?.products?.filters || []) as AttributeFilter[]
            );
          }
          if (self.props.onPriceBoundsChange) {
            const pMin = result?.products?.minPrice;
            const pMax = result?.products?.maxPrice;
            if (pMin !== undefined && pMax !== undefined) {
              self.props.onPriceBoundsChange(pMin, pMax);
            }
          }
          if (self.props.onItemsFoundChange) {
            self.props.onItemsFoundChange(result?.products?.itemsFound || 0);
          }
        } catch {
          self.state.internalProducts = [];
          self.update();
        } finally {
          self.state.isInternalLoading = false;
          self.update();
        }
      },
      isClusterItem(item: Product | Cluster) {
        return !!(item as any)?.clusterId;
      },
      getGridColsClass() {
        const cols = (self.props.columns as number) || 3;
        if (cols === 1) return "flex flex-col gap-4";
        if (cols === 2)
          return "grid grid-cols-1 sm:grid-cols-2 gap-6 auto-rows-fr";
        if (cols === 4)
          return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-fr";
        return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr";
      },
      handlePageChange(page: number) {
        self.state.currentPage = page;
        self.update();
        self.state.fetchProducts();
        if (self.props.onPageChange) self.props.onPageChange(page);
      },
      getDisplayProducts() {
        // Use props.products when explicitly provided (even if empty array).
        // Fall through to internally fetched products only when prop is absent.
        if (self.props.products !== undefined) {
          return (self.props.products as (Product | Cluster)[]) || [];
        }
        return self.state.internalProducts;
      },
      getIsLoading() {
        return (
          !!(self.props.isLoading as boolean) || self.state.isInternalLoading
        );
      },
      showAddToCart() {
        const mode = (self.props.portalMode as string) || "open";
        const allow = (self.props.allowAddToCart as boolean) !== false;
        return mode === "open" && allow;
      },
      getSkeletonItems() {
        const cols = (self.props.columns as number) || 3;
        const count = cols === 2 ? 4 : cols === 4 ? 8 : 6;
        const items: number[] = [];
        for (let i = 0; i < count; i++) items.push(i);
        return items;
      },
    };
    if (!this.props) {
      this.props = {};
    }

    this.componentProps = [
      "products",
      "textFilters",
      "priceFilterMin",
      "priceFilterMax",
      "categoryId",
      "term",
      "brand",
      "sortField",
      "sortOrder",
      "pageSize",
      "page",
      "graphqlClient",
      "configuration",
      "language",
      "onProductsResponse",
      "onFiltersChange",
      "onPriceBoundsChange",
      "onItemsFoundChange",
      "columns",
      "onPageChange",
      "isLoading",
      "portalMode",
      "allowAddToCart",
      "className",
      "renderClusterCard",
      "enableAddFavorite",
      "onToggleFavorite",
      "onClusterClick",
      "renderProductCard",
      "user",
      "cartId",
      "createCart",
      "onCartCreated",
      "afterAddToCart",
      "showModal",
      "allowIncrDecr",
      "stockValidation",
      "onProceedToCheckout",
      "addToCartLabels",
      "onProductClick",
    ];

    this.updateDeps = [
      [
        this.props.textFilters,
        this.props.priceFilterMin,
        this.props.priceFilterMax,
        this.props.categoryId,
        this.props.term,
        this.props.brand,
        this.props.sortField,
        this.props.sortOrder,
        this.props.pageSize,
      ],
      [this.props.page],
    ];

    // used to keep track of all nodes created by show/for
    this.nodesToDestroy = [];
    // batch updates
    this.pendingUpdate = false;

    // Event handler for 'togglefavorite' event on cluster-card-product-grid
    this.onClusterCardProductGridTogglefavorite = (cluster, isFav) => {
      if (this.props.onToggleFavorite) {
        this.props.onToggleFavorite(cluster, isFav);
      }
    };

    // Event handler for 'clusterclick' event on cluster-card-product-grid
    this.onClusterCardProductGridClusterclick = (cluster) => {
      if (this.props.onClusterClick) {
        this.props.onClusterClick(cluster);
      }
    };

    // Event handler for 'cartcreated' event on product-card-product-grid
    this.onProductCardProductGridCartcreated = (event) => {
      this.props.onCartCreated();
    };

    // Event handler for 'proceedtocheckout' event on product-card-product-grid
    this.onProductCardProductGridProceedtocheckout = (event) => {
      this.props.onProceedToCheckout();
    };

    // Event handler for 'togglefavorite' event on product-card-product-grid
    this.onProductCardProductGridTogglefavorite = (product, isFav) => {
      if (this.props.onToggleFavorite) {
        this.props.onToggleFavorite(product, isFav);
      }
    };

    // Event handler for 'productclick' event on product-card-product-grid
    this.onProductCardProductGridProductclick = (product) => {
      if (this.props.onProductClick) {
        this.props.onProductClick(product);
      }
    };

    // Event handler for 'togglefavorite' event on product-card-product-grid-2
    this.onProductCardProductGrid2Togglefavorite = (product, isFav) => {
      if (this.props.onToggleFavorite) {
        this.props.onToggleFavorite(product, isFav);
      }
    };

    // Event handler for 'productclick' event on product-card-product-grid-2
    this.onProductCardProductGrid2Productclick = (product) => {
      if (this.props.onProductClick) {
        this.props.onProductClick(product);
      }
    };

    if (undefined) {
      this.attachShadow({ mode: "open" });
    }
  }

  destroyAnyNodes() {
    // destroy current view template refs before rendering again
    this.nodesToDestroy.forEach((el) => el.remove());
    this.nodesToDestroy = [];
  }

  connectedCallback() {
    this.getAttributeNames().forEach((attr) => {
      const jsVar = attr.replace(/-/g, "");
      const regexp = new RegExp(jsVar, "i");
      this.componentProps.forEach((prop) => {
        if (regexp.test(prop)) {
          const attrValue = this.getAttribute(attr);
          if (this.props[prop] !== attrValue) {
            this.props[prop] = attrValue;
          }
        }
      });
    });

    this._root.innerHTML = `
      <div data-el="div-product-grid-1">
        <template data-el="show-product-grid">
          <div data-el="div-product-grid-2">
            <template data-el="for-product-grid">
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
                <template data-el="show-product-grid-2">
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
        <template data-el="show-product-grid-3">
          <template data-el="show-product-grid-4">
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
                  data-el="path-product-grid-1"
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
          <template data-el="show-product-grid-5">
            <div data-el="div-product-grid-3">
              <template data-el="for-product-grid-2">
                <div>
                  <template data-el="show-product-grid-6">
                    <template data-el="show-product-grid-7">
                      <cluster-card
                        data-el="cluster-card-product-grid"
                      ></cluster-card>
                    </template>
                  </template>
                  <template data-el="show-product-grid-8">
                    <template data-el="show-product-grid-9">
                      <template data-el="show-product-grid-10">
                        <product-card
                          data-el="product-card-product-grid"
                        ></product-card>
                      </template>
                      <template data-el="show-product-grid-11">
                        <product-card
                          data-el="product-card-product-grid-2"
                        ></product-card>
                      </template>
                    </template>
                  </template>
                </div>
              </template>
            </div>
          </template>
        </template>
      </div>`;
    this.pendingUpdate = true;

    this.render();
    this.onMount();
    this.pendingUpdate = false;
    this.update();
  }

  showContent(el) {
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLTemplateElement/content
    // grabs the content of a node that is between <template> tags
    // iterates through child nodes to register all content including text elements
    // attaches the content after the template

    const elementFragment = el.content.cloneNode(true);
    const children = Array.from(elementFragment.childNodes);
    children.forEach((child) => {
      if (el?.scope) {
        child.scope = el.scope;
      }
      if (el?.context) {
        child.context = el.context;
      }
      this.nodesToDestroy.push(child);
    });
    el.after(elementFragment);
  }

  onMount() {}

  onUpdate() {
    const self = this;

    (function (__prev, __next) {
      const __hasChange = __prev.find((val, index) => val !== __next[index]);
      if (__hasChange !== undefined) {
        if (self.props.products === undefined) {
          self.state.currentPage = 1;
          self.state.fetchProducts();
        }
        self.updateDeps[0] = __next;
      }
    })(self.updateDeps[0], [
      self.props.textFilters,
      self.props.priceFilterMin,
      self.props.priceFilterMax,
      self.props.categoryId,
      self.props.term,
      self.props.brand,
      self.props.sortField,
      self.props.sortOrder,
      self.props.pageSize,
    ]);

    (function (__prev, __next) {
      const __hasChange = __prev.find((val, index) => val !== __next[index]);
      if (__hasChange !== undefined) {
        if (
          self.props.products === undefined &&
          self.props.page !== undefined
        ) {
          self.state.currentPage = self.props.page as number;
          self.state.fetchProducts();
        }
        self.updateDeps[1] = __next;
      }
    })(self.updateDeps[1], [self.props.page]);
  }

  update() {
    if (this.pendingUpdate === true) {
      return;
    }
    this.pendingUpdate = true;
    this.render();
    this.onUpdate();
    this.pendingUpdate = false;
  }

  render() {
    // re-rendering needs to ensure that all nodes generated by for/show are refreshed
    this.destroyAnyNodes();
    this.updateBindings();
  }

  updateBindings() {
    this._root
      .querySelectorAll("[data-el='div-product-grid-1']")
      .forEach((el) => {
        el.className = `w-full ${(this.props.className as string) || ""}`;
      });

    this._root
      .querySelectorAll("[data-el='show-product-grid']")
      .forEach((el) => {
        const whenCondition = this.state.getIsLoading();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-product-grid-2']")
      .forEach((el) => {
        el.className = this.state.getGridColsClass();
      });

    this._root
      .querySelectorAll("[data-el='for-product-grid']")
      .forEach((el) => {
        let array = this.state.getSkeletonItems();
        this.renderLoop(el, array, "_");
      });

    this._root
      .querySelectorAll("[data-el='show-product-grid-2']")
      .forEach((el) => {
        const whenCondition = this.state.showAddToCart();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='show-product-grid-3']")
      .forEach((el) => {
        const whenCondition = !this.state.getIsLoading();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='show-product-grid-4']")
      .forEach((el) => {
        const whenCondition = this.state.getDisplayProducts().length === 0;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='path-product-grid-1']")
      .forEach((el) => {
        el.setAttribute("strokeWidth", 1);
      });

    this._root
      .querySelectorAll("[data-el='show-product-grid-5']")
      .forEach((el) => {
        const whenCondition = this.state.getDisplayProducts().length > 0;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-product-grid-3']")
      .forEach((el) => {
        el.className = this.state.getGridColsClass();
      });

    this._root
      .querySelectorAll("[data-el='for-product-grid-2']")
      .forEach((el) => {
        let array = this.state.getDisplayProducts();
        this.renderLoop(el, array, "item");
      });

    this._root
      .querySelectorAll("[data-el='show-product-grid-6']")
      .forEach((el) => {
        const item = this.getScope(el, "item");
        const whenCondition = this.state.isClusterItem(item);
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='show-product-grid-7']")
      .forEach((el) => {
        const whenCondition = !this.props.renderClusterCard;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='cluster-card-product-grid']")
      .forEach((el) => {
        const item = this.getScope(el, "item");
        el.setAttribute("cluster", item as Cluster);
        el.cluster = item as Cluster;
        if (el.props) {
          el.props.cluster = item as Cluster;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.cluster = item as Cluster;
        }
        el.setAttribute("configuration", this.props.configuration);
        el.configuration = this.props.configuration;
        if (el.props) {
          el.props.configuration = this.props.configuration;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.configuration = this.props.configuration;
        }
        el.setAttribute(
          "enableAddFavorite",
          this.props.enableAddFavorite as boolean
        );
        el.enableAddFavorite = this.props.enableAddFavorite as boolean;
        if (el.props) {
          el.props.enableAddFavorite = this.props.enableAddFavorite as boolean;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.enableAddFavorite = this.props.enableAddFavorite as boolean;
        }
        el.removeEventListener(
          "togglefavorite",
          this.onClusterCardProductGridTogglefavorite
        );
        el.addEventListener(
          "togglefavorite",
          this.onClusterCardProductGridTogglefavorite
        );
        el.removeEventListener(
          "clusterclick",
          this.onClusterCardProductGridClusterclick
        );
        el.addEventListener(
          "clusterclick",
          this.onClusterCardProductGridClusterclick
        );
      });

    this._root
      .querySelectorAll("[data-el='show-product-grid-8']")
      .forEach((el) => {
        const item = this.getScope(el, "item");
        const whenCondition = !this.state.isClusterItem(item);
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='show-product-grid-9']")
      .forEach((el) => {
        const whenCondition = !this.props.renderProductCard;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='show-product-grid-10']")
      .forEach((el) => {
        const whenCondition = this.state.showAddToCart();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='product-card-product-grid']")
      .forEach((el) => {
        const item = this.getScope(el, "item");
        el.setAttribute("product", item as Product);
        el.product = item as Product;
        if (el.props) {
          el.props.product = item as Product;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.product = item as Product;
        }
        el.setAttribute(
          "graphqlClient",
          this.props.graphqlClient as GraphQLClient
        );
        el.graphqlClient = this.props.graphqlClient as GraphQLClient;
        if (el.props) {
          el.props.graphqlClient = this.props.graphqlClient as GraphQLClient;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.graphqlClient = this.props.graphqlClient as GraphQLClient;
        }
        el.setAttribute(
          "user",
          (this.props.user as Contact | Customer | null) || null
        );
        el.user = (this.props.user as Contact | Customer | null) || null;
        if (el.props) {
          el.props.user =
            (this.props.user as Contact | Customer | null) || null;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.user =
            (this.props.user as Contact | Customer | null) || null;
        }
        el.setAttribute("configuration", this.props.configuration);
        el.configuration = this.props.configuration;
        if (el.props) {
          el.props.configuration = this.props.configuration;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.configuration = this.props.configuration;
        }
        el.setAttribute("cartId", this.props.cartId as string);
        el.cartId = this.props.cartId as string;
        if (el.props) {
          el.props.cartId = this.props.cartId as string;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.cartId = this.props.cartId as string;
        }
        el.setAttribute("createCart", this.props.createCart as boolean);
        el.createCart = this.props.createCart as boolean;
        if (el.props) {
          el.props.createCart = this.props.createCart as boolean;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.createCart = this.props.createCart as boolean;
        }
        el.removeEventListener(
          "cartcreated",
          this.onProductCardProductGridCartcreated
        );
        el.addEventListener(
          "cartcreated",
          this.onProductCardProductGridCartcreated
        );
        el.setAttribute("afterAddToCart", this.props.afterAddToCart);
        el.afterAddToCart = this.props.afterAddToCart;
        if (el.props) {
          el.props.afterAddToCart = this.props.afterAddToCart;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.afterAddToCart = this.props.afterAddToCart;
        }
        el.setAttribute("showModal", this.props.showModal as boolean);
        el.showModal = this.props.showModal as boolean;
        if (el.props) {
          el.props.showModal = this.props.showModal as boolean;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.showModal = this.props.showModal as boolean;
        }
        el.setAttribute("allowIncrDecr", this.props.allowIncrDecr);
        el.allowIncrDecr = this.props.allowIncrDecr;
        if (el.props) {
          el.props.allowIncrDecr = this.props.allowIncrDecr;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.allowIncrDecr = this.props.allowIncrDecr;
        }
        el.setAttribute(
          "enableStockValidation",
          this.props.stockValidation as boolean
        );
        el.enableStockValidation = this.props.stockValidation as boolean;
        if (el.props) {
          el.props.enableStockValidation = this.props
            .stockValidation as boolean;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.enableStockValidation = this.props
            .stockValidation as boolean;
        }
        el.setAttribute("language", (this.props.language as string) || "NL");
        el.language = (this.props.language as string) || "NL";
        if (el.props) {
          el.props.language = (this.props.language as string) || "NL";
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.language = (this.props.language as string) || "NL";
        }
        el.removeEventListener(
          "proceedtocheckout",
          this.onProductCardProductGridProceedtocheckout
        );
        el.addEventListener(
          "proceedtocheckout",
          this.onProductCardProductGridProceedtocheckout
        );
        el.setAttribute("addToCartLabels", this.props.addToCartLabels);
        el.addToCartLabels = this.props.addToCartLabels;
        if (el.props) {
          el.props.addToCartLabels = this.props.addToCartLabels;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.addToCartLabels = this.props.addToCartLabels;
        }
        el.setAttribute(
          "enableAddFavorite",
          this.props.enableAddFavorite as boolean
        );
        el.enableAddFavorite = this.props.enableAddFavorite as boolean;
        if (el.props) {
          el.props.enableAddFavorite = this.props.enableAddFavorite as boolean;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.enableAddFavorite = this.props.enableAddFavorite as boolean;
        }
        el.removeEventListener(
          "togglefavorite",
          this.onProductCardProductGridTogglefavorite
        );
        el.addEventListener(
          "togglefavorite",
          this.onProductCardProductGridTogglefavorite
        );
        el.removeEventListener(
          "productclick",
          this.onProductCardProductGridProductclick
        );
        el.addEventListener(
          "productclick",
          this.onProductCardProductGridProductclick
        );
      });

    this._root
      .querySelectorAll("[data-el='show-product-grid-11']")
      .forEach((el) => {
        const whenCondition = !this.state.showAddToCart();
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='product-card-product-grid-2']")
      .forEach((el) => {
        const item = this.getScope(el, "item");
        el.setAttribute("product", item as Product);
        el.product = item as Product;
        if (el.props) {
          el.props.product = item as Product;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.product = item as Product;
        }
        el.setAttribute(
          "graphqlClient",
          this.props.graphqlClient as GraphQLClient
        );
        el.graphqlClient = this.props.graphqlClient as GraphQLClient;
        if (el.props) {
          el.props.graphqlClient = this.props.graphqlClient as GraphQLClient;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.graphqlClient = this.props.graphqlClient as GraphQLClient;
        }
        el.setAttribute(
          "user",
          (this.props.user as Contact | Customer | null) || null
        );
        el.user = (this.props.user as Contact | Customer | null) || null;
        if (el.props) {
          el.props.user =
            (this.props.user as Contact | Customer | null) || null;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.user =
            (this.props.user as Contact | Customer | null) || null;
        }
        el.setAttribute("configuration", this.props.configuration);
        el.configuration = this.props.configuration;
        if (el.props) {
          el.props.configuration = this.props.configuration;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.configuration = this.props.configuration;
        }
        el.setAttribute("cartId", this.props.cartId as string);
        el.cartId = this.props.cartId as string;
        if (el.props) {
          el.props.cartId = this.props.cartId as string;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.cartId = this.props.cartId as string;
        }
        el.setAttribute(
          "enableAddFavorite",
          this.props.enableAddFavorite as boolean
        );
        el.enableAddFavorite = this.props.enableAddFavorite as boolean;
        if (el.props) {
          el.props.enableAddFavorite = this.props.enableAddFavorite as boolean;
          if (el.update) {
            el.update();
          }
        } else {
          el.props = {};
          el.props.enableAddFavorite = this.props.enableAddFavorite as boolean;
        }
        el.removeEventListener(
          "togglefavorite",
          this.onProductCardProductGrid2Togglefavorite
        );
        el.addEventListener(
          "togglefavorite",
          this.onProductCardProductGrid2Togglefavorite
        );
        el.removeEventListener(
          "productclick",
          this.onProductCardProductGrid2Productclick
        );
        el.addEventListener(
          "productclick",
          this.onProductCardProductGrid2Productclick
        );
      });
  }

  // Helper to render content
  renderTextNode(el, text) {
    const textNode = document.createTextNode(text);
    if (el?.scope) {
      textNode.scope = el.scope;
    }
    if (el?.context) {
      textNode.context = el.context;
    }
    el.after(textNode);
    this.nodesToDestroy.push(el.nextSibling);
  }

  // scope helper
  getScope(el, name) {
    do {
      let value = el?.scope?.[name];
      if (value !== undefined) {
        return value;
      }
    } while ((el = el.parentNode));
  }

  // Helper to render loops
  renderLoop(template, array, itemName, itemIndex, collectionName) {
    const collection = [];
    for (let [index, value] of array.entries()) {
      const elementFragment = template.content.cloneNode(true);
      const children = Array.from(elementFragment.childNodes);
      const localScope = {};
      let scope = localScope;
      if (template?.scope) {
        const getParent = {
          get(target, prop, receiver) {
            if (prop in target) {
              return target[prop];
            }
            if (prop in template.scope) {
              return template.scope[prop];
            }
            return target[prop];
          },
        };
        scope = new Proxy(localScope, getParent);
      }
      children.forEach((child) => {
        if (itemName !== undefined) {
          scope[itemName] = value;
        }
        if (itemIndex !== undefined) {
          scope[itemIndex] = index;
        }
        if (collectionName !== undefined) {
          scope[collectionName] = array;
        }
        child.scope = scope;
        if (template.context) {
          child.context = context;
        }
        this.nodesToDestroy.push(child);
        collection.unshift(child);
      });
    }
    collection.forEach((child) => template.after(child));
  }
}

customElements.define("product-grid", ProductGrid);
