'use client';

import {
  Cart,
  CartChildItemInput,
  CartMainItem,
  Cluster,
  Contact,
  Customer,
  FavoriteList,
  FavoriteListService,
  GraphQLClient,
  Product,
  ProductsResponse,
} from 'propeller-sdk-v2';
import { useEffect, useState } from 'react';

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
    showModal?: boolean
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

function FavoriteListDetails(props: FavoriteListDetailsProps) {
  const [loading, setLoading] = useState<FavoriteListDetailsState['loading']>(() => true);

  const [favoriteList, setFavoriteList] = useState<FavoriteListDetailsState['favoriteList']>(
    () => null
  );

  const [allItems, setAllItems] = useState<FavoriteListDetailsState['allItems']>(() => []);

  const [currentPage, setCurrentPage] = useState<FavoriteListDetailsState['currentPage']>(() => 1);

  const [isMounted, setIsMounted] = useState<FavoriteListDetailsState['isMounted']>(() => false);

  const [prevListId, setPrevListId] = useState<FavoriteListDetailsState['prevListId']>(() => '');

  function getLabel(
    key: string,
    fallback: string
  ): ReturnType<FavoriteListDetailsState['getLabel']> {
    return (props.labels as Record<string, string>)?.[key] || fallback;
  }

  function getItemsPerPage(): ReturnType<FavoriteListDetailsState['getItemsPerPage']> {
    return props.itemsPerPage || 12;
  }

  function getTotalPages(): ReturnType<FavoriteListDetailsState['getTotalPages']> {
    return Math.max(1, Math.ceil(allItems.length / getItemsPerPage()));
  }

  function getPagedItems(): ReturnType<FavoriteListDetailsState['getPagedItems']> {
    const perPage = getItemsPerPage();
    const start = (currentPage - 1) * perPage;
    return allItems.slice(start, start + perPage);
  }

  function getPaginationData(): ReturnType<FavoriteListDetailsState['getPaginationData']> {
    return {
      page: currentPage,
      pages: getTotalPages(),
      itemsFound: allItems.length,
      offset: getItemsPerPage(),
    };
  }

  function handlePageChange(
    page: number
  ): ReturnType<FavoriteListDetailsState['handlePageChange']> {
    setCurrentPage(page);
  }

  function buildFetchVariables(): ReturnType<FavoriteListDetailsState['buildFetchVariables']> {
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
      imageSearchFilters: {
        page: 1,
        offset: 1,
      },
      imageVariantFilters: {
        transformations: [
          {
            name: 'cart_thumb',
            transformation: {
              format: 'WEBP',
              height: 200,
              width: 200,
              fit: 'BOUNDS',
            },
          },
        ],
      },
    };
  }

  async function fetchList(): ReturnType<FavoriteListDetailsState['fetchList']> {
    if (!props.graphqlClient || !props.favoriteListId) return;
    setLoading(true);
    try {
      const service = new FavoriteListService(props.graphqlClient);
      const list = await service.getFavoriteList(buildFetchVariables());
      setFavoriteList(list);
      const items: (Product | Cluster)[] = [];
      const productsRef = list?.products as ProductsResponse;
      if (productsRef?.items && Array.isArray(productsRef.items)) {
        (productsRef.items as Product[]).forEach((item: Product) => items.push(item));
      }
      const clustersRef = list?.clusters as ProductsResponse;
      if (clustersRef?.items && Array.isArray(clustersRef.items)) {
        (clustersRef.items as Cluster[]).forEach((item: Cluster) => items.push(item));
      }
      setAllItems(items);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching favorite list:', error);
      setFavoriteList(null);
      setAllItems([]);
    } finally {
      setLoading(false);
    }
  }

  function handleItemDelete(
    itemId: string
  ): ReturnType<FavoriteListDetailsState['handleItemDelete']> {
    // Optimistic: remove from local state
    setAllItems(
      allItems.filter((item: Product | Cluster) => {
        if ('productId' in item) return String(item.productId) !== itemId;
        return String((item as Cluster).clusterId) !== itemId;
      })
    );
    // Adjust current page if needed
    if (currentPage > getTotalPages()) {
      setCurrentPage(Math.max(1, getTotalPages()));
    }
    // Notify parent
    if (props.onItemDelete) {
      props.onItemDelete(itemId);
    }
  }

  useEffect(() => {
    setIsMounted(true);
    setPrevListId(props.favoriteListId || '');
    fetchList();
  }, []);
  useEffect(() => {
    if (props.favoriteListId && props.favoriteListId !== prevListId) {
      setPrevListId(props.favoriteListId);
      fetchList();
    }
  }, [props.favoriteListId]);

  return (
    <div className={props.className || ''}>
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3]?.map((i) => (
            <div
              className="flex items-center gap-4 p-4 border-b border-gray-200 animate-pulse"
              key={i}
            >
              <div className="w-20 h-20 bg-gray-100 rounded-md flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/4 bg-gray-100 rounded" />
                <div className="h-5 w-1/2 bg-gray-100 rounded" />
                <div className="h-4 w-1/6 bg-gray-100 rounded" />
              </div>
              <div className="h-10 w-28 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      ) : null}
      {!loading && isMounted ? (
        <>
          {allItems.length > 0 ? (
            <div>
              {getPagedItems()?.map((item, idx) => (
                <div
                  key={
                    'productId' in item
                      ? 'p-' + (item as Product).productId
                      : 'c-' + (item as Cluster).clusterId
                  }
                >
                  <div className="p-4 border-b">{item.names?.[0]?.value || 'Item'}</div>
                </div>
              ))}
              {props.showPagination !== false && getTotalPages() > 1 ? (
                <div className="mt-6" />
              ) : null}
            </div>
          ) : null}
          {allItems.length === 0 ? (
            <div className="border border-gray-200 rounded-lg p-12 text-center space-y-4">
              <div className="bg-gray-100 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-gray-400"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-medium">{getLabel('emptyTitle', 'List is empty')}</p>
                <p className="text-gray-500">
                  {getLabel(
                    'emptyDescription',
                    "You haven't added any products or clusters to this list yet."
                  )}
                </p>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default FavoriteListDetails;
