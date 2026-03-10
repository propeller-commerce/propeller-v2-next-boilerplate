'use client';
import * as React from 'react';
import { useState, useEffect } from 'react';
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
import FavoriteListItem from '@/components/propeller/FavoriteListItem';
import GridPagination from '@/components/propeller/GridPagination';
import { Heart } from 'lucide-react';

export interface FavoriteListDetailsProps {
  /** GraphQL client for the Propeller SDK */
  graphqlClient: GraphQLClient;

  /** The logged in user for which the favorite list is going to be displayed */
  user: Contact | Customer;

  /** The favorite list ID to display */
  favoriteListId: string;

  /** Action method for deleting a favorite list item */
  onItemDelete?: (itemId: string) => void;

  /** Called after the favorite list has been fetched, receives the list data */
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

function FavoriteListDetails(props: FavoriteListDetailsProps) {
  const [loading, setLoading] = useState(true);
  const [favoriteList, setFavoriteList] = useState<FavoriteList | null>(null);
  const [allItems, setAllItems] = useState<(Product | Cluster)[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [_isMounted, set_isMounted] = useState(false);

  const itemsPerPage = props.itemsPerPage || 12;
  const totalPages = Math.max(1, Math.ceil(allItems.length / itemsPerPage));

  function getPagedItems(): (Product | Cluster)[] {
    const start = (currentPage - 1) * itemsPerPage;
    return allItems.slice(start, start + itemsPerPage);
  }

  function getPaginationData(): ProductsResponse {
    return {
      page: currentPage,
      pages: totalPages,
      itemsFound: allItems.length,
      items: [],
      offset: itemsPerPage,
      start: 0,
      end: 0,
      minPrice: 0,
      maxPrice: 0,
    } as ProductsResponse;
  }

  function getLabel(key: string, fallback: string): string {
    return (props.labels as Record<string, string>)?.[key] || fallback;
  }

  function getItemKey(item: Product | Cluster): string {
    if ('productId' in item) return `p-${(item as Product).productId}`;
    return `c-${(item as Cluster).clusterId}`;
  }

  function buildFetchVariables() {
    const variables: Record<string, unknown> = {
      id: props.favoriteListId,
      language: props.language || 'NL',
      priceCalculateProductInput: {
        taxZone: 'NL',
      } as Record<string, unknown>,
      imageSearchFilters: {
        page: 1,
        offset: 1,
      },
      imageVariantFilters: {
        transformations: [{
          name: 'cart_thumb',
          transformation: {
            format: 'WEBP',
            height: 200,
            width: 200,
            fit: 'BOUNDS',
          },
        }],
      },
    };

    if (props.user) {
      const priceInput = variables.priceCalculateProductInput as Record<string, unknown>;
      if ('customerId' in props.user && props.user.customerId) {
        priceInput.customerId = props.user.customerId;
      } else if ('contactId' in props.user && props.user.contactId) {
        priceInput.contactId = props.user.contactId;
        if ('company' in props.user && (props.user as Contact).company?.companyId) {
          priceInput.companyId = (props.user as Contact).company.companyId;
        }
      }
    }

    return variables;
  }

  async function fetchList() {
    if (!props.graphqlClient || !props.favoriteListId) return;
    setLoading(true);
    try {
      const service = new FavoriteListService(props.graphqlClient);
      const list = await service.getFavoriteList(buildFetchVariables());
      setFavoriteList(list);
      if (props.onListLoaded) {
        props.onListLoaded(list);
      }

      const items: (Product | Cluster)[] = [];
      const productsRef = list?.products as ProductsResponse;
      if (productsRef?.items && Array.isArray(productsRef.items)) {
        productsRef.items.forEach((item) => items.push(item as Product));
      }
      const clustersRef = list?.clusters as ProductsResponse;
      if (clustersRef?.items && Array.isArray(clustersRef.items)) {
        clustersRef.items.forEach((item) => items.push(item as Cluster));
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

  function handleItemDelete(itemId: string) {
    // Optimistic: remove from local state
    setAllItems(prev => {
      const filtered = prev.filter((item) => {
        if ('productId' in item) return String((item as Product).productId) !== itemId;
        return String((item as Cluster).clusterId) !== itemId;
      });
      return filtered;
    });
    // Notify parent
    if (props.onItemDelete) {
      props.onItemDelete(itemId);
    }
  }

  function handlePageChange(page: number) {
    setCurrentPage(page);
  }

  // Adjust current page if it exceeds total pages after item removal
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [allItems.length, currentPage, totalPages]);

  useEffect(() => {
    set_isMounted(true);
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (props.favoriteListId) {
      fetchList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.favoriteListId]);

  const pagedItems = getPagedItems();

  return (
    <div className={props.className || ''}>
      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-border/60 animate-pulse">
              <div className="w-20 h-20 bg-muted rounded-md flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/4 bg-muted rounded"></div>
                <div className="h-4 w-1/2 bg-muted rounded"></div>
                <div className="h-4 w-1/6 bg-muted rounded"></div>
              </div>
              <div className="h-10 w-28 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {!loading && _isMounted && (
        <>
          {allItems.length > 0 ? (
            <div>
              {/* Items list */}
              <div>
                {pagedItems.map((item) => (
                  <FavoriteListItem
                    key={getItemKey(item)}
                    item={item}
                    titleLinkable={props.titleLinkable}
                    showStockComponent={props.showStockComponent}
                    showSku={props.showSku}
                    allowAddToCart={props.allowAddToCart}
                    showDelete={props.showDelete}
                    onDelete={handleItemDelete}
                    onItemClick={props.onItemClick}
                    configuration={props.configuration}
                    labels={props.itemLabels}
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
                  />
                ))}
              </div>

              {/* Pagination */}
              {props.showPagination !== false && totalPages > 1 && (
                <GridPagination
                  products={getPaginationData()}
                  onPageChange={handlePageChange}
                  variant={props.paginationVariant || 'compact'}
                  className="mt-6"
                />
              )}
            </div>
          ) : (
            <div className="border border-border/60 rounded-lg p-12 text-center space-y-4">
              <div className="bg-muted p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <Heart className="w-8 h-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-medium">
                  {getLabel('emptyTitle', 'List is empty')}
                </p>
                <p className="text-muted-foreground">
                  {getLabel('emptyDescription', "You haven't added any products or clusters to this list yet.")}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default FavoriteListDetails;
