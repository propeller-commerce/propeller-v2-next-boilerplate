import { useStore, onMount, onUpdate, Show, For } from '@builder.io/mitosis';
import {
  Product,
  Cluster,
  FavoriteList,
  FavoriteListService,
  GraphQLClient,
  Contact,
  Customer,
  Cart,
  CartMainItem,
  CartChildItemInput,
  ProductsResponse,
} from 'propeller-sdk-v2';
import FavoriteListItem from './FavoriteListItem.lite';
import GridPagination from './GridPagination.lite';

export interface FavoriteListDetailsProps {
  /** GraphQL client for the Propeller SDK */
  graphqlClient: GraphQLClient;

  /** The logged in user for which the favorite list is going to be displayed */
  user: Contact | Customer;

  /** The favorite list ID to display */
  favoriteListId: string;

  /** Action method for deleting a favorite list item. If not provided, delete button is hidden */
  onItemDelete?: (itemId: string, itemType?: string) => void;

  /** Called after the favorite list is fetched, with the full list object */
  onListLoaded?: (list: FavoriteList) => void;

  /** Number of items to show per page (default: 12) */
  itemsPerPage?: number;

  /** Show pagination controls (default: true) */
  showPagination?: boolean;

  /** Pagination display variant: 'compact' or 'full' (default: 'compact') */
  paginationVariant?: string;

  /** Extra CSS class applied to the root element */
  className?: string;

  /** Configuration object for URL generation */
  configuration?: any;

  /** UI string overrides */
  labels?: Record<string, string>;

  // === FavoriteListItem display props ===

  /** Should item titles link to the PDP (default: true) */
  titleLinkable?: boolean;

  /** Show stock availability on items (default: false) */
  showStockComponent?: boolean;

  /** Show availability status (e.g. "In stock") inside ItemStock (default: true) */
  showAvailability?: boolean;

  /** Show numeric stock quantity inside ItemStock (default: true) */
  showStock?: boolean;

  /** Display the SKU beneath item names (default: true) */
  showSku?: boolean;

  /** Enable add to cart for products. Clusters show "View cluster" instead (default: true) */
  allowAddToCart?: boolean;

  /** Show delete button on each item (default: true) */
  showDelete?: boolean;

  /** Callback when an item title or image is clicked */
  onItemClick?: (item: Product | Cluster) => void;

  // === AddToCart pass-through props (products only) ===

  /** ID of an existing cart to add items to */
  cartId?: string;

  /** Auto-create cart if none exists */
  createCart?: boolean;

  /** Called after a new cart is created internally by AddToCart */
  onCartCreated?: (cart: Cart) => void;

  /** Fully replaces the internal CartService.addItemToCart call */
  onAddToCart?: (
    product: Product,
    clusterId?: number,
    quantity?: number,
    childItems?: CartChildItemInput[],
    notes?: string,
    price?: number,
    showModal?: boolean,
  ) => Cart;

  /** Called after every successful add-to-cart */
  afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;

  /** Show modal after successful add (default: false) */
  showModal?: boolean;

  /** Renders increment/decrement buttons beside quantity input (default: true) */
  allowIncrDecr?: boolean;

  /** Validate stock before adding to cart (default: false) */
  enableStockValidation?: boolean;

  /** Language code forwarded to CartService (default: 'NL') */
  language?: string;

  /** Called when "Proceed to checkout" is clicked in AddToCart modal */
  onProceedToCheckout?: () => void;

  /** Label overrides for AddToCart UI strings */
  addToCartLabels?: Record<string, string>;

  /** Label overrides for ItemStock UI strings */
  stockLabels?: Record<string, string>;

  /** Label overrides for FavoriteListItem UI strings */
  itemLabels?: Record<string, string>;

  /** Include tax in prices. Pass from PriceContext's usePrice() */
  includeTax?: boolean;
}

interface FavoriteListDetailsState {
  loading: boolean;
  favoriteList: FavoriteList | null;
  allItems: (Product | Cluster)[];
  currentPage: number;
  isMounted: boolean;
  prevListId: string;
  getLabel: (key: string, fallback: string) => string;
  getItemsPerPage: () => number;
  getTotalPages: () => number;
  getPagedItems: () => (Product | Cluster)[];
  getPaginationData: () => Record<string, number>;
  handlePageChange: (page: number) => void;
  buildFetchVariables: () => Record<string, unknown>;
  fetchList: () => Promise<void>;
  handleItemDelete: (itemId: string) => void;
}

export default function FavoriteListDetails(props: FavoriteListDetailsProps) {
  const state = useStore<FavoriteListDetailsState>({
    loading: true,
    favoriteList: null as FavoriteList | null,
    allItems: [] as (Product | Cluster)[],
    currentPage: 1,
    isMounted: false,
    prevListId: '' as string,

    getLabel(key: string, fallback: string): string {
      return (props.labels as Record<string, string>)?.[key] || fallback;
    },

    getItemsPerPage(): number {
      return props.itemsPerPage || 12;
    },

    getTotalPages(): number {
      return Math.max(1, Math.ceil(state.allItems.length / state.getItemsPerPage()));
    },

    getPagedItems(): (Product | Cluster)[] {
      const perPage = state.getItemsPerPage();
      const start = (state.currentPage - 1) * perPage;
      return state.allItems.slice(start, start + perPage);
    },

    getPaginationData(): Record<string, number> {
      return {
        page: state.currentPage,
        pages: state.getTotalPages(),
        itemsFound: state.allItems.length,
        offset: state.getItemsPerPage(),
      };
    },

    handlePageChange(page: number): void {
      state.currentPage = page;
    },

    buildFetchVariables(): Record<string, unknown> {
      const priceInput: Record<string, unknown> = {
        taxZone: 'NL',
      };
      if (props.user) {
        if ('customerId' in props.user) {
          const customer = props.user as Customer;
          if (customer.customerId) {
            priceInput.customerId = customer.customerId;
          }
        } else if ('contactId' in props.user) {
          const contact = props.user as Contact;
          if (contact.contactId) {
            priceInput.contactId = contact.contactId;
          }
          if (contact.company?.companyId) {
            priceInput.companyId = contact.company.companyId;
          }
        }
      }
      return {
        id: props.favoriteListId,
        language: props.language || 'NL',
        priceCalculateProductInput: priceInput,
        imageSearchFilters: { page: 1, offset: 1 },
        imageVariantFilters: {
          transformations: [{
            name: 'cart_thumb',
            transformation: { format: 'WEBP', height: 200, width: 200, fit: 'BOUNDS' },
          }],
        },
      };
    },

    async fetchList(): Promise<void> {
      if (!props.graphqlClient || !props.favoriteListId) return;
      state.loading = true;
      try {
        const service = new FavoriteListService(props.graphqlClient);
        const list = await service.getFavoriteList(state.buildFetchVariables());
        state.favoriteList = list;
        if (props.onListLoaded) {
          props.onListLoaded(list);
        }

        const items: (Product | Cluster)[] = [];
        const productsRef = list?.products as ProductsResponse;
        if (productsRef?.items && Array.isArray(productsRef.items)) {
          (productsRef.items as Product[]).forEach((item: Product) => items.push(item));
        }
        const clustersRef = list?.clusters as ProductsResponse;
        if (clustersRef?.items && Array.isArray(clustersRef.items)) {
          (clustersRef.items as Cluster[]).forEach((item: Cluster) => items.push(item));
        }
        state.allItems = items;
        state.currentPage = 1;
      } catch (error) {
        console.error('Error fetching favorite list:', error);
        state.favoriteList = null;
        state.allItems = [];
      } finally {
        state.loading = false;
      }
    },

    handleItemDelete(itemId: string): void {
      /* Determine item type before removing from local state */
      const deletedItem = state.allItems.find((item: Product | Cluster) => {
        if ('productId' in item) return String(item.productId) === itemId;
        return String((item as Cluster).clusterId) === itemId;
      });
      const itemType: string = deletedItem && 'clusterId' in deletedItem ? 'cluster' : 'product';
      /* Optimistic: remove from local state */
      state.allItems = state.allItems.filter((item: Product | Cluster) => {
        if ('productId' in item) return String(item.productId) !== itemId;
        return String((item as Cluster).clusterId) !== itemId;
      });
      /* Adjust current page if needed */
      if (state.currentPage > state.getTotalPages()) {
        state.currentPage = Math.max(1, state.getTotalPages());
      }
      /* Notify parent with type info */
      if (props.onItemDelete) {
        props.onItemDelete(itemId, itemType);
      }
    },
  });

  onMount(() => {
    state.isMounted = true;
    state.prevListId = props.favoriteListId || '';
    state.fetchList();
  });

  onUpdate(() => {
    if (props.favoriteListId && props.favoriteListId !== state.prevListId) {
      state.prevListId = props.favoriteListId;
      state.fetchList();
    }
  }, [props.favoriteListId]);

  return (
    <div className={props.className || ''}>
      <Show when={state.loading}>
        <div className="space-y-4">
          <For each={[1, 2, 3]}>
            {(i: number) => (
              <div key={i} className="flex items-center gap-4 p-4 border-b border-gray-200 animate-pulse">
                <div className="w-20 h-20 bg-gray-100 rounded-md flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/4 bg-gray-100 rounded"></div>
                  <div className="h-5 w-1/2 bg-gray-100 rounded"></div>
                  <div className="h-4 w-1/6 bg-gray-100 rounded"></div>
                </div>
                <div className="h-10 w-28 bg-gray-100 rounded"></div>
              </div>
            )}
          </For>
        </div>
      </Show>

      <Show when={!state.loading && state.isMounted}>
        <Show when={state.allItems.length > 0}>
          <div className="space-y-3">
            <For each={state.getPagedItems()}>
              {(item: Product | Cluster, idx: number) => (
                <div key={('productId' in item ? 'p-' + (item as Product).productId : 'c-' + (item as Cluster).clusterId)}>
                  <FavoriteListItem
                    item={item}
                    graphqlClient={props.graphqlClient}
                    user={props.user}
                    cartId={props.cartId}
                    createCart={props.createCart}
                    onCartCreated={props.onCartCreated}
                    onAddToCart={props.onAddToCart}
                    afterAddToCart={props.afterAddToCart}
                    showModal={props.showModal}
                    allowIncrDecr={props.allowIncrDecr}
                    enableStockValidation={props.enableStockValidation}
                    language={props.language}
                    onProceedToCheckout={props.onProceedToCheckout}
                    addToCartLabels={props.addToCartLabels}
                    stockLabels={props.stockLabels}
                    labels={props.itemLabels}
                    configuration={props.configuration}
                    titleLinkable={props.titleLinkable}
                    showStockComponent={props.showStockComponent}
                    showAvailability={props.showAvailability}
                    showStock={props.showStock}
                    showSku={props.showSku}
                    allowAddToCart={props.allowAddToCart}
                    showDelete={props.showDelete}
                    onDelete={(itemId: string) => state.handleItemDelete(itemId)}
                    onItemClick={props.onItemClick}
                    includeTax={props.includeTax}
                  />
                </div>
              )}
            </For>

            <Show when={props.showPagination !== false && state.getTotalPages() > 1}>
              <div className="mt-6">
                <GridPagination
                  products={state.getPaginationData() as unknown as ProductsResponse}
                  onPageChange={(page: number) => state.handlePageChange(page)}
                  variant={props.paginationVariant || 'compact'}
                />
              </div>
            </Show>
          </div>
        </Show>

        <Show when={state.allItems.length === 0}>
          <div className="border border-gray-200 rounded-lg p-12 text-center space-y-4">
            <div className="bg-gray-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium">{state.getLabel('emptyTitle', 'List is empty')}</p>
              <p className="text-gray-500">{state.getLabel('emptyDescription', "You haven't added any products or clusters to this list yet.")}</p>
            </div>
          </div>
        </Show>
      </Show>
    </div>
  );
}
