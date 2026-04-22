'use client';
import * as React from 'react';
import { Cart, CartMainItem, CartBaseItem, BundleItem, Enums } from 'propeller-sdk-v2';
import { getLabel } from '@/composables/shared/utils/labelHelpers';

export interface ItemsOverviewProps {
  /** Shopping cart object from which the cart items overview will be displayed */
  cart: Cart;

  /** The CSS class for the cart items overview container */
  itemsOverviewContainerClass?: string;

  /** Title of the cart items overview */
  title?: string;

  /** The cart items names are clickable links */
  itemNameClickable?: boolean;

  /** Action when a cart item's name is clicked */ onCartItemNameClick?: (
    item: CartMainItem
  ) => void;
  /** Show the quantity of the cart item */ showQuantity?: boolean;
  /** Show the availability of the cart item */ showAvailability?: boolean;
  /** Show the SKU of the cart item */ showSku?: boolean;
  /** Show a small image of the cart item */ showImage?: boolean;
  /** Show the price of the cart item */ showPrice?: boolean;
  /** Custom price formatting function */ formatPrice?: (price: number) => string;
  /** Labels for the component */ labels?: Record<string, string>;
}
interface ItemsOverviewState {
  containerClass: () => string;
  itemNameClickable: () => boolean;
  showQuantity: () => boolean;
  showAvailability: () => boolean;
  showSku: () => boolean;
  showImage: () => boolean;
  showPrice: () => boolean;
  getLabel: (key: string, fallback: string) => string;
  formatItemPrice: (price: number) => string;
  items: () => any[];
  getItemName: (item: any) => string;
  getItemSku: (item: any) => string;
  getItemImageUrl: (item: any) => string;
  getItemTotalPrice: (item: any) => number;
  getItemAvailability: (item: any) => string;
  isInStock: (item: any) => boolean;
  handleItemNameClick: (item: any) => void;
  getItemChildItems: (item: any) => any[];
  isBundleItem: (item: any) => boolean;
  getBundleName: (item: any) => string;
  getBundlePrice: (item: any) => string;
  getBundleLeaderName: (item: any) => string;
  getBundleLeaderPrice: (item: any) => string;
  getBundleNonLeaders: (item: any) => any[];
  getBundleItemName: (bundleItem: any) => string;
  getBundleItemPrice: (bundleItem: any) => string;
}
function ItemsOverview(props: ItemsOverviewProps) {
  function containerClass(): ReturnType<ItemsOverviewState['containerClass']> {
    return props.itemsOverviewContainerClass || 'cart-items-overview';
  }
  function itemNameClickable(): ReturnType<ItemsOverviewState['itemNameClickable']> {
    return props.itemNameClickable !== undefined ? props.itemNameClickable : true;
  }
  function showQuantity(): ReturnType<ItemsOverviewState['showQuantity']> {
    return props.showQuantity !== undefined ? props.showQuantity : true;
  }
  function showAvailability(): ReturnType<ItemsOverviewState['showAvailability']> {
    return props.showAvailability !== undefined ? props.showAvailability : true;
  }
  function showSku(): ReturnType<ItemsOverviewState['showSku']> {
    return props.showSku !== undefined ? props.showSku : true;
  }
  function showImage(): ReturnType<ItemsOverviewState['showImage']> {
    return props.showImage !== undefined ? props.showImage : true;
  }
  function showPrice(): ReturnType<ItemsOverviewState['showPrice']> {
    return props.showPrice !== undefined ? props.showPrice : true;
  }
  function formatItemPrice(price: number): ReturnType<ItemsOverviewState['formatItemPrice']> {
    if (props.formatPrice) {
      return props.formatPrice(price);
    }
    return '\u20AC' + Number(price || 0).toFixed(2);
  }
  function items(): ReturnType<ItemsOverviewState['items']> {
    return (props.cart as any)?.items || [];
  }
  function getItemName(item: any): ReturnType<ItemsOverviewState['getItemName']> {
    return item.product?.names?.[0]?.value || 'Product';
  }
  function getItemSku(item: any): ReturnType<ItemsOverviewState['getItemSku']> {
    return item.product?.sku || '';
  }
  function getItemImageUrl(item: any): ReturnType<ItemsOverviewState['getItemImageUrl']> {
    const url = item.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
    if (url && typeof url === 'string' && url.startsWith('http')) {
      return url;
    }
    return '';
  }
  function getItemTotalPrice(item: any): ReturnType<ItemsOverviewState['getItemTotalPrice']> {
    return (item.price || 0) * (item.quantity || 1);
  }
  function getItemAvailability(item: any): ReturnType<ItemsOverviewState['getItemAvailability']> {
    const stock = item.product?.inventory?.totalQuantity;
    if (stock === undefined || stock === null) return '';
    if (stock > 0) return props.labels?.['inStock'] || 'In stock';
    return props.labels?.['outOfStock'] || 'Out of stock';
  }
  function isInStock(item: any): ReturnType<ItemsOverviewState['isInStock']> {
    const stock = item.product?.inventory?.totalQuantity;
    return stock !== undefined && stock !== null && stock > 0;
  }
  function handleItemNameClick(item: any): ReturnType<ItemsOverviewState['handleItemNameClick']> {
    if (
      (props.itemNameClickable !== undefined ? props.itemNameClickable : true) &&
      props.onCartItemNameClick
    ) {
      props.onCartItemNameClick(item as CartMainItem);
    }
  }
  function getItemChildItems(item: any): ReturnType<ItemsOverviewState['getItemChildItems']> {
    const children = item.childItems;
    if (!children || !Array.isArray(children)) return [];
    return children;
  }
  function isBundleItem(item: any): ReturnType<ItemsOverviewState['isBundleItem']> {
    return !!item.bundle;
  }
  function getBundleName(item: any): ReturnType<ItemsOverviewState['getBundleName']> {
    return item.bundle?.name || 'Bundle';
  }
  function getBundlePrice(item: any): ReturnType<ItemsOverviewState['getBundlePrice']> {
    const price = item.bundle?.price?.net;
    if (price === undefined || price === null) return '';
    return `\u20AC${Number(price).toFixed(2)}`;
  }
  function getBundleLeaderName(item: any): ReturnType<ItemsOverviewState['getBundleLeaderName']> {
    const items = item.bundle?.items;
    if (!items) return '';
    const leader = items.find((bi: BundleItem) => bi.isLeader === Enums.YesNo.Y);
    if (!leader) return '';
    return leader.product.names?.[0]?.value || 'Product';
  }
  function getBundleLeaderPrice(item: any): ReturnType<ItemsOverviewState['getBundleLeaderPrice']> {
    const items = item.bundle?.items;
    if (!items) return '';
    const leader = items.find((bi: BundleItem) => bi.isLeader === Enums.YesNo.Y);
    if (!leader) return '';
    const price = leader.price?.net;
    if (price === undefined || price === null) return '';
    return `\u20AC${Number(price).toFixed(2)}`;
  }
  function getBundleNonLeaders(item: any): ReturnType<ItemsOverviewState['getBundleNonLeaders']> {
    const items = item.bundle?.items;
    if (!items) return [];
    return items.filter((bi: BundleItem) => bi.isLeader !== Enums.YesNo.Y);
  }
  function getBundleItemName(bundleItem: any): ReturnType<ItemsOverviewState['getBundleItemName']> {
    return bundleItem.product?.names?.[0]?.value || 'Product';
  }
  function getBundleItemPrice(
    bundleItem: any
  ): ReturnType<ItemsOverviewState['getBundleItemPrice']> {
    const price = bundleItem.price?.net;
    if (price === undefined || price === null) return '';
    return `\u20AC${Number(price).toFixed(2)}`;
  }
  return (
    <div className={`propeller-items-overview ${containerClass()}`}>
      {props.title ? <h2 className="propeller-items-overview__title text-lg font-bold mb-4">{props.title}</h2> : null}
      <div className="propeller-items-overview__list space-y-4">
        {items()?.map((item, index) => (
          <div
            className="propeller-items-overview__item flex gap-3 pb-3 border-b border-border last:border-b-0 last:pb-0"
            key={item.itemId || index}
            data-bundle={isBundleItem(item) ? 'true' : 'false'}
          >
            {showImage() ? (
              <div className="propeller-items-overview__item-media w-16 h-16 flex-shrink-0 bg-surface-hover rounded-control overflow-hidden border border-border-subtle flex items-center justify-center">
                {getItemImageUrl(item) ? (
                  <img
                    className="propeller-items-overview__item-image w-full h-full object-contain p-1.5"
                    src={getItemImageUrl(item)}
                    alt={getItemName(item)}
                  />
                ) : null}
                {!getItemImageUrl(item) ? (
                  <svg
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="propeller-items-overview__item-image-placeholder w-6 h-6 text-foreground-subtle"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
                    />
                  </svg>
                ) : null}
              </div>
            ) : null}
            <div className="propeller-items-overview__item-body flex-1 min-w-0">
              {isBundleItem(item) ? (
                <>
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="propeller-items-overview__item-title text-sm font-medium leading-tight text-foreground line-clamp-2">
                        {getBundleName(item)}
                      </span>
                      {showPrice() && !!getBundlePrice(item) ? (
                        <span className="propeller-items-overview__item-price font-semibold text-sm text-foreground whitespace-nowrap">
                          {getBundlePrice(item)}
                        </span>
                      ) : null}
                    </div>
                    <div className="propeller-items-overview__item-bundle mt-1.5 space-y-1 border-l-2 border-secondary/10 pl-2">
                      {!!getBundleLeaderName(item) ? (
                        <div className="propeller-items-overview__item-bundle-leader flex justify-between items-center text-xs">
                          <span className="font-medium text-foreground">
                            {getBundleLeaderName(item)}
                          </span>
                          {!!getBundleLeaderPrice(item) ? (
                            <span className="text-muted-foreground whitespace-nowrap ml-2">
                              {getBundleLeaderPrice(item)}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {getBundleNonLeaders(item)?.map((bundleItem, idx) => (
                        <div
                          className="propeller-items-overview__item-bundle-item flex justify-between items-center text-xs text-muted-foreground"
                          key={idx}
                        >
                          <span className="line-clamp-1">{getBundleItemName(bundleItem)}</span>
                          {!!getBundleItemPrice(bundleItem) ? (
                            <span className="text-foreground-subtle whitespace-nowrap ml-2">
                              {getBundleItemPrice(bundleItem)}
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>{' '}
                  <div className="propeller-items-overview__item-qty flex items-center text-xs text-foreground-subtle mt-1">
                    <span>
                      {getLabel(props.labels, 'quantity', 'Qty:')}
                      {item.quantity}
                    </span>
                  </div>
                </>
              ) : null}
              {!isBundleItem(item) ? (
                <>
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      {itemNameClickable() ? (
                        <p
                          className="propeller-items-overview__item-title font-medium text-sm leading-tight cursor-pointer hover:text-secondary transition-colors line-clamp-2"
                          onClick={(event) => handleItemNameClick(item)}
                        >
                          {getItemName(item)}
                        </p>
                      ) : null}
                      {!itemNameClickable() ? (
                        <p className="propeller-items-overview__item-title font-medium text-sm leading-tight line-clamp-2">
                          {getItemName(item)}
                        </p>
                      ) : null}
                      {showPrice() ? (
                        <span className="propeller-items-overview__item-price font-semibold text-sm text-foreground whitespace-nowrap">
                          {formatItemPrice(getItemTotalPrice(item))}
                        </span>
                      ) : null}
                    </div>
                    {showSku() && getItemSku(item) ? (
                      <p className="propeller-items-overview__item-sku text-xs text-muted-foreground mt-0.5">SKU: {getItemSku(item)}</p>
                    ) : null}
                    {getItemChildItems(item).length > 0 ? (
                      <div className="propeller-items-overview__item-options mt-1.5 space-y-1 border-l-2 border-border-subtle pl-2">
                        {getItemChildItems(item)?.map((child, idx) => (
                          <div
                            className="propeller-items-overview__item-option flex justify-between items-center text-xs text-muted-foreground"
                            key={idx}
                          >
                            <span className="line-clamp-1">
                              {child.product?.names?.[0]?.value || 'Option'}
                            </span>
                            <span className="text-foreground-subtle whitespace-nowrap ml-2">
                              {formatItemPrice(child.totalSum || 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>{' '}
                  <div className="propeller-items-overview__item-qty flex items-center text-xs text-foreground-subtle mt-1">
                    <span>
                      {getLabel(props.labels, 'quantity', 'Qty:')}
                      {item.quantity}
                    </span>
                    {showAvailability() && getItemAvailability(item) ? (
                      <span
                        className={`propeller-items-overview__item-availability ml-2 ${isInStock(item) ? 'text-success' : 'text-destructive'}`}
                        data-in-stock={isInStock(item) ? 'true' : 'false'}
                      >
                        {getItemAvailability(item)}
                      </span>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {items().length === 0 ? (
        <p className="propeller-items-overview__empty text-muted-foreground italic text-sm">{getLabel(props.labels, 'noItems', 'No items in cart.')}</p>
      ) : null}
    </div>
  );
}
export default ItemsOverview;
