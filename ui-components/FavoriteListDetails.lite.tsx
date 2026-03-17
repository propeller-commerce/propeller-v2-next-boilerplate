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

export interface FavoriteListDetailsProps {
  /** GraphQL client for the Propeller SDK */
  graphqlClient: GraphQLClient;

  /** The logged in user for which the favorite list is going to be displayed */
  user: Contact | Customer;

  /** The favorite list ID to display */
  favoriteListId: string;

  /** Action method for deleting a favorite list item. If not provided, delete button is hidden */
  onItemDelete?: (itemId: string) => void;

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
}

export default function FavoriteListDetails(props: FavoriteListDetailsProps) {
  const state = useStore({
    _loading: true,
    _favoriteList: null as FavoriteList | null,
    _allItems: [] as (Product | Cluster)[],
    _currentPage: 1,
    _isMounted: false,
    _prevListId: '' as string,

    getLabel(key: string, fallback: string): string {
      return (props.labels as Record<string, string>)?.[key] || fallback;
    },

    getItemsPerPage(): number {
      return props.itemsPerPage || 12;
    },

    getTotalPages(): number {
      return Math.max(1, Math.ceil(state._allItems.length / state.getItemsPerPage()));
    },

    getPagedItems(): (Product | Cluster)[] {
      const perPage = state.getItemsPerPage();
      const start = (state._currentPage - 1) * perPage;
      return state._allItems.slice(start, start + perPage);
    },

    getPaginationData(): Record<string, number> {
      return {
        page: state._currentPage,
        pages: state.getTotalPages(),
        itemsFound: state._allItems.length,
        offset: state.getItemsPerPage(),
      };
    },

    handlePageChange(page: number): void {
      state._currentPage = page;
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
      state._loading = true;
      try {
        const service = new FavoriteListService(props.graphqlClient);
        const list = await service.getFavoriteList(state.buildFetchVariables());
        state._favoriteList = list;

        const items: (Product | Cluster)[] = [];
        const productsRef = list?.products as ProductsResponse;
        if (productsRef?.items && Array.isArray(productsRef.items)) {
          (productsRef.items as Product[]).forEach((item: Product) => items.push(item));
        }
        const clustersRef = list?.clusters as ProductsResponse;
        if (clustersRef?.items && Array.isArray(clustersRef.items)) {
          (clustersRef.items as Cluster[]).forEach((item: Cluster) => items.push(item));
        }
        state._allItems = items;
        state._currentPage = 1;
      } catch (error) {
        console.error('Error fetching favorite list:', error);
        state._favoriteList = null;
        state._allItems = [];
      } finally {
        state._loading = false;
      }
    },

    handleItemDelete(itemId: string): void {
      // Optimistic: remove from local state
      state._allItems = state._allItems.filter((item: Product | Cluster) => {
        if ('productId' in item) return String(item.productId) !== itemId;
        return String((item as Cluster).clusterId) !== itemId;
      });
      // Adjust current page if needed
      if (state._currentPage > state.getTotalPages()) {
        state._currentPage = Math.max(1, state.getTotalPages());
      }
      // Notify parent
      if (props.onItemDelete) {
        props.onItemDelete(itemId);
      }
    },
  });

  onMount(() => {
    state._isMounted = true;
    state._prevListId = props.favoriteListId || '';
    state.fetchList();
  });

  onUpdate(() => {
    if (props.favoriteListId && props.favoriteListId !== state._prevListId) {
      state._prevListId = props.favoriteListId;
      state.fetchList();
    }
  }, [props.favoriteListId]);

  return (
    <div className={props.className || ''}>
      <Show when={state._loading}>
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

      <Show when={!state._loading && state._isMounted}>
        <Show when={state._allItems.length > 0}>
          <div>
            <For each={state.getPagedItems()}>
              {(item: Product | Cluster, idx: number) => (
                <div key={('productId' in item ? 'p-' + (item as Product).productId : 'c-' + (item as Cluster).clusterId)}>
                  {/* FavoriteListItem rendered here — replaced with actual component in React copy */}
                  <div className="p-4 border-b">{item.names?.[0]?.value || 'Item'}</div>
                </div>
              )}
            </For>

            <Show when={props.showPagination !== false && state.getTotalPages() > 1}>
              <div className="mt-6">
                {/* GridPagination rendered here — replaced with actual component in React copy */}
              </div>
            </Show>
          </div>
        </Show>

        <Show when={state._allItems.length === 0}>
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
