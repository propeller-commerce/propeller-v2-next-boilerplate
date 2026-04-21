'use client';
import * as React from 'react';
import {
  Product,
  Cluster,
  GraphQLClient,
  Contact,
  Customer,
  Cart,
  CartMainItem,
  CartChildItemInput,
} from 'propeller-sdk-v2';
import AddToCart from './AddToCart';
import ItemStock from './ItemStock';
import { getLabel } from '@/lib/helpers/labelHelpers';

export interface FavoriteListItemProps {
  /** Product or Cluster to be listed as a favorite list item */
  item: Product | Cluster;

  /** Should the item title be a link to the PDP (default: true) */
  titleLinkable?: boolean;

  /** Should the stock be displayed in the favorite list item (default: false) */
  showStockComponent?: boolean;

  /** Show availability status (e.g. "In stock") inside ItemStock (default: true) */
  showAvailability?: boolean;

  /** Show numeric stock quantity inside ItemStock (default: true) */
  showStock?: boolean;

  /** Display the SKU of the item beneath the item name (default: true) */
  showSku?: boolean;

  /** Enables the add to cart functionality for products. Clusters show a "View cluster" button instead (default: true) */
  allowAddToCart?: boolean;

  /** Display a delete button that removes the favorite list item from the list (default: true) */
  showDelete?: boolean;

  /** Action callback fired when a favorite list item is deleted from the list */
  onDelete?: (itemId: string) => void;

  /** Callback when the item title or image is clicked. Prevents default <a> navigation when provided */
  onItemClick?: (item: Product | Cluster) => void;

  /** Extra CSS class applied to the root element */
  className?: string;

  /** Configuration object for URL generation */
  configuration?: any;

  /** UI string overrides */
  labels?: Record<string, string>;

  /** Include tax in the price display. When provided, overrides the internal PriceToggle state */
  includeTax?: boolean;

  // === AddToCart pass-through props (only used for products) ===

  /** Initialised Propeller SDK GraphQL client (required by embedded AddToCart) */
  graphqlClient?: GraphQLClient;

  /** Authenticated user — used for cart creation / lookup */
  user?: Contact | Customer | null;

  /** ID of an existing cart to add items to */
  cartId?: string;

  /** When true and no cartId is available, AddToCart automatically creates a cart */
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

  /** Called when "Request a Quote" is clicked in AddToCart modal */
  onRequestQuoteClick?: (cart: Cart) => void;

  /** Label overrides for AddToCart UI strings */
  addToCartLabels?: Record<string, string>;

  /** Label overrides for ItemStock UI strings */
  stockLabels?: Record<string, string>;
}
interface FavoriteListItemState {
  isProduct: () => boolean;
  getProduct: () => Product;
  getCluster: () => Cluster;
  getName: () => string;
  getSku: () => string;
  getImageUrl: () => string;
  getItemUrl: () => string;
  getItemId: () => string;
  getItemPrice: () => string;
  getLabel: (key: string, fallback: string) => string;
  handleItemClick: (e: any) => void;
  handleDelete: () => void;
}
function FavoriteListItem(props: FavoriteListItemProps) {
  function isProduct(): ReturnType<FavoriteListItemState['isProduct']> {
    return 'productId' in props.item;
  }
  function getProduct(): ReturnType<FavoriteListItemState['getProduct']> {
    return props.item as Product;
  }
  function getCluster(): ReturnType<FavoriteListItemState['getCluster']> {
    return props.item as Cluster;
  }
  function getName(): ReturnType<FavoriteListItemState['getName']> {
    if (isProduct()) {
      return getProduct()?.names?.[0]?.value || 'Product';
    }
    return (
      getCluster()?.names?.[0]?.value ||
      getCluster()?.defaultProduct?.names?.[0]?.value ||
      'Cluster'
    );
  }
  function getSku(): ReturnType<FavoriteListItemState['getSku']> {
    if (isProduct()) {
      return getProduct()?.sku || '';
    }
    return getCluster()?.sku || getCluster()?.defaultProduct?.sku || '';
  }
  function getImageUrl(): ReturnType<FavoriteListItemState['getImageUrl']> {
    if (isProduct()) {
      return getProduct()?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
    }
    return getCluster()?.defaultProduct?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
  }
  function getItemUrl(): ReturnType<FavoriteListItemState['getItemUrl']> {
    if (isProduct()) {
      return props.configuration?.urls?.getProductUrl?.(props.item) || '';
    }
    return props.configuration?.urls?.getClusterUrl?.(props.item) || '';
  }
  function getItemId(): ReturnType<FavoriteListItemState['getItemId']> {
    if (isProduct()) {
      return String(getProduct()?.productId || '');
    }
    return String(getCluster()?.clusterId || '');
  }
  function getItemPrice(): ReturnType<FavoriteListItemState['getItemPrice']> {
    const useTax: boolean = props.includeTax !== undefined ? !!props.includeTax : false;
    let priceObj: any = null;
    if (isProduct()) {
      priceObj = getProduct()?.price;
    } else {
      priceObj = getCluster()?.defaultProduct?.price;
    }
    if (!priceObj) return '';
    const value: number | undefined = useTax ? priceObj?.net : priceObj?.gross;
    if (!value && value !== 0) return '';
    return `\u20AC${Number(value).toFixed(2)}`;
  }
  function handleItemClick(e: any): ReturnType<FavoriteListItemState['handleItemClick']> {
    if (props.onItemClick) {
      e.preventDefault();
      props.onItemClick(props.item);
    } else if (getItemUrl()) {
      e.preventDefault();
      window.location.href = getItemUrl();
    }
  }
  function handleDelete(): ReturnType<FavoriteListItemState['handleDelete']> {
    if (props.onDelete) {
      props.onDelete(getItemId());
    }
  }
  return (
    <div
      onClick={(e) => handleItemClick(e)}
      data-type={isProduct() ? 'product' : 'cluster'}
      className={`propeller-favorite-list-item flex flex-row items-center gap-4 rounded-container border border-border bg-card p-4 transition-colors hover:border-secondary/20 hover:shadow-sm cursor-pointer ${props.className || ''}`}
    >
      <div className="propeller-favorite-list-item__media relative w-16 h-16 flex-shrink-0 overflow-hidden rounded-control bg-surface-hover p-1">
        {props.titleLinkable !== false ? (
          <a
            className="block h-full w-full"
            href={getItemUrl()}
            onClick={(e) => handleItemClick(e)}
          >
            {!!getImageUrl() ? (
              <img className="propeller-favorite-list-item__image h-full w-full object-contain" src={getImageUrl()} alt={getName()} />
            ) : null}
            {!getImageUrl() ? (
              <div className="propeller-favorite-list-item__image-placeholder flex h-full w-full items-center justify-center text-foreground-subtle">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-8 w-8">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    strokeWidth={1}
                  />
                </svg>
              </div>
            ) : null}
          </a>
        ) : null}
        {props.titleLinkable === false ? (
          <div className="block h-full w-full">
            {!!getImageUrl() ? (
              <img className="propeller-favorite-list-item__image h-full w-full object-contain" src={getImageUrl()} alt={getName()} />
            ) : null}
            {!getImageUrl() ? (
              <div className="propeller-favorite-list-item__image-placeholder flex h-full w-full items-center justify-center text-foreground-subtle">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-8 w-8">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    strokeWidth={1}
                  />
                </svg>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="propeller-favorite-list-item__body flex flex-col gap-0.5 min-w-0 flex-1">
        {props.showSku !== false && !!getSku() ? (
          <span className="propeller-favorite-list-item__sku font-mono text-xs text-foreground-subtle">{getSku()}</span>
        ) : null}
        {props.titleLinkable !== false ? (
          <a
            className="propeller-favorite-list-item__title text-sm font-medium leading-tight text-foreground transition-colors hover:text-secondary line-clamp-1"
            href={getItemUrl()}
            onClick={(e) => handleItemClick(e)}
          >
            {getName()}
          </a>
        ) : null}
        {props.titleLinkable === false ? (
          <span className="propeller-favorite-list-item__title text-sm font-medium leading-tight text-foreground line-clamp-1">
            {getName()}
          </span>
        ) : null}
      </div>
      {props.showStockComponent && isProduct() && !!getProduct().inventory ? (
        <div className="flex-shrink-0">
          <ItemStock
            inventory={getProduct().inventory!}
            showAvailability={props.showAvailability !== false}
            showStock={props.showStock !== false}
            labels={props.stockLabels}
          />
        </div>
      ) : null}
      {props.showStockComponent && !isProduct() ? (
        <>
          {getCluster()?.defaultProduct?.inventory?.totalQuantity !== undefined ? (
            <div className="propeller-favorite-list-item__stock flex-shrink-0">
              {(getCluster()?.defaultProduct?.inventory?.totalQuantity || 0) > 5 ? (
                <span className="propeller-favorite-list-item__stock-badge inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-success bg-success/10" data-stock="in">
                  {getLabel(props.labels, 'inStock', 'In stock')}
                </span>
              ) : null}
              {(getCluster()?.defaultProduct?.inventory?.totalQuantity || 0) > 0 &&
              (getCluster()?.defaultProduct?.inventory?.totalQuantity || 0) <= 5 ? (
                <span className="propeller-favorite-list-item__stock-badge inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-warning bg-warning/10" data-stock="low">
                  {getLabel(props.labels, 'lowStock', 'Low stock')}
                </span>
              ) : null}
              {(getCluster()?.defaultProduct?.inventory?.totalQuantity || 0) === 0 ? (
                <span className="propeller-favorite-list-item__stock-badge inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-destructive bg-destructive/10" data-stock="out">
                  {getLabel(props.labels, 'outOfStock', 'Out of stock')}
                </span>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
      {!!getItemPrice() ? (
        <span className="propeller-favorite-list-item__price text-base font-bold text-foreground whitespace-nowrap flex-shrink-0">
          {getItemPrice()}
        </span>
      ) : null}
      <div className="propeller-favorite-list-item__actions flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {props.allowAddToCart !== false && isProduct() && !!props.graphqlClient ? (
          <AddToCart
            className="flex items-center gap-2"
            graphqlClient={props.graphqlClient!}
            user={props.user || null}
            product={getProduct()}
            cartId={props.cartId}
            configuration={props.configuration}
            createCart={props.createCart}
            onCartCreated={props.onCartCreated}
            onAddToCart={props.onAddToCart}
            afterAddToCart={props.afterAddToCart}
            showModal={props.showModal}
            allowIncrDecr={props.allowIncrDecr}
            enableStockValidation={props.enableStockValidation}
            language={props.language}
            onProceedToCheckout={props.onProceedToCheckout}
            onRequestQuoteClick={props.onRequestQuoteClick}
            labels={props.addToCartLabels}
          />
        ) : null}
        {!isProduct() ? (
          <a
            className="propeller-favorite-list-item__view-cluster inline-flex items-center justify-center rounded-control bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/90 whitespace-nowrap"
            href={getItemUrl()}
            onClick={(e) => handleItemClick(e)}
          >
            {getLabel(props.labels, 'viewCluster', 'View cluster')}
          </a>
        ) : null}
        {props.showDelete !== false ? (
          <button
            type="button"
            className="propeller-favorite-list-item__delete-btn h-8 w-8 p-0 inline-flex items-center justify-center rounded-control text-foreground-subtle hover:text-destructive hover:bg-destructive/10 transition-colors"
            onClick={(event) => handleDelete()}
            title={getLabel(props.labels, 'delete', 'Remove from list')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default FavoriteListItem;
