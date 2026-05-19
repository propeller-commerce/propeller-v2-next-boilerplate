'use client';
import * as React from 'react';
import { BundleItem, Cart, CartMainItem, YesNo } from 'propeller-sdk-v2';
import { getLabel } from '@/composables/shared/utils/labelHelpers';
import { formatPrice } from '@/composables/shared/utils/formatting';
import { config } from '@/data/config';

export interface ItemsOverviewProps {
  /** Shopping cart object from which the cart items overview will be displayed */
  cart: Cart;

  /** The CSS class for the cart items overview container */
  itemsOverviewContainerClass?: string;

  /** Title of the cart items overview */
  title?: string;

  /** The cart items names are clickable links */
  itemNameClickable?: boolean;

  /** Action when a cart item's name is clicked */
  onCartItemNameClick?: (item: CartMainItem) => void;
  /** Show the quantity of the cart item */ showQuantity?: boolean;
  /** Show the availability of the cart item */ showAvailability?: boolean;
  /** Show the SKU of the cart item */ showSku?: boolean;
  /** Show a small image of the cart item */ showImage?: boolean;
  /** Show the price of the cart item */ showPrice?: boolean;
  /** Custom price formatting function */ formatPrice?: (price: number) => string;
  /** Labels for the component */ labels?: Record<string, string>;
}

// ── Pure helpers (module scope — created once, not per render) ──────────────────

const money = (value: number | null | undefined): string =>
  value === undefined || value === null ? '' : formatPrice(value, { symbol: config.currency });

function getItemName(item: any): string {
  return item.product?.names?.[0]?.value || 'Product';
}

function getItemImageUrl(item: any): string {
  const url = item.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
  return url && typeof url === 'string' && url.startsWith('http') ? url : '';
}

function getItemChildItems(item: any): any[] {
  const children = item.childItems;
  if (!children || !Array.isArray(children)) return [];
  return children;
}

function getBundleLeader(item: any): BundleItem | undefined {
  return item.bundle?.items?.find((bi: BundleItem) => bi.isLeader === YesNo.Y);
}

function getBundleNonLeaders(item: any): BundleItem[] {
  const items = item.bundle?.items;
  if (!items) return [];
  return items.filter((bi: BundleItem) => bi.isLeader !== YesNo.Y);
}

function ItemsOverview(props: ItemsOverviewProps) {
  const containerClass = props.itemsOverviewContainerClass || 'cart-items-overview';
  const itemNameClickable =
    props.itemNameClickable !== undefined ? props.itemNameClickable : true;
  // Note: `showQuantity` prop exists in the public API but quantity is always
  // rendered (it was never gated in the original component either).
  const showAvailability =
    props.showAvailability !== undefined ? props.showAvailability : true;
  const showSku = props.showSku !== undefined ? props.showSku : true;
  const showImage = props.showImage !== undefined ? props.showImage : true;
  const showPrice = props.showPrice !== undefined ? props.showPrice : true;

  // Computed once per render (previously items() was redefined every render and
  // called 3× — once for the map, twice for length checks).
  const items: any[] = (props.cart as any)?.items || [];

  function formatItemPrice(price: number): string {
    if (props.formatPrice) {
      return props.formatPrice(price);
    }
    return formatPrice(price || 0, { symbol: config.currency });
  }

  function handleItemNameClick(item: any): void {
    if (itemNameClickable && props.onCartItemNameClick) {
      props.onCartItemNameClick(item as CartMainItem);
    }
  }

  return (
    <div className={`propeller-items-overview ${containerClass}`}>
      {props.title ? (
        <h2 className="propeller-items-overview__title text-lg font-bold mb-4">{props.title}</h2>
      ) : null}
      <div className="propeller-items-overview__list space-y-4">
        {items.map((item, index) => {
          const isBundle = !!item.bundle;
          const stock = item.product?.inventory?.totalQuantity;
          const inStock = stock !== undefined && stock !== null && stock > 0;
          const availability =
            stock === undefined || stock === null
              ? ''
              : inStock
                ? props.labels?.['inStock'] || 'In stock'
                : props.labels?.['outOfStock'] || 'Out of stock';
          const itemSku = item.product?.sku || '';
          const childItems = getItemChildItems(item);
          const leader = getBundleLeader(item);
          return (
            <div
              className="propeller-items-overview__item flex gap-3 pb-3 border-b border-border last:border-b-0 last:pb-0"
              key={item.itemId || index}
              data-bundle={isBundle ? 'true' : 'false'}
            >
              {showImage ? (
                <div className="propeller-items-overview__item-media w-16 h-16 flex-shrink-0 bg-surface-hover rounded-control overflow-hidden border border-border-subtle flex items-center justify-center">
                  {getItemImageUrl(item) ? (
                    <img
                      className="propeller-items-overview__item-image w-full h-full object-contain p-1.5"
                      src={getItemImageUrl(item)}
                      alt={getItemName(item)}
                    />
                  ) : (
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
                  )}
                </div>
              ) : null}
              <div className="propeller-items-overview__item-body flex-1 min-w-0">
                {isBundle ? (
                  <>
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className="propeller-items-overview__item-title text-sm font-medium leading-tight text-foreground line-clamp-2">
                          {item.bundle?.name || 'Bundle'}
                        </span>
                        {showPrice && money(item.bundle?.price?.net) ? (
                          <span className="propeller-items-overview__item-price font-semibold text-sm text-foreground whitespace-nowrap">
                            {money(item.bundle?.price?.net)}
                          </span>
                        ) : null}
                      </div>
                      <div className="propeller-items-overview__item-bundle mt-1.5 space-y-1 border-l-2 border-secondary/10 pl-2">
                        {leader ? (
                          <div className="propeller-items-overview__item-bundle-leader flex justify-between items-center text-xs">
                            <span className="font-medium text-foreground">
                              {leader.product.names?.[0]?.value || 'Product'}
                            </span>
                            {money(leader.price?.net) ? (
                              <span className="text-muted-foreground whitespace-nowrap ml-2">
                                {money(leader.price?.net)}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                        {getBundleNonLeaders(item).map((bundleItem, idx) => (
                          <div
                            className="propeller-items-overview__item-bundle-item flex justify-between items-center text-xs text-muted-foreground"
                            key={idx}
                          >
                            <span className="line-clamp-1">
                              {bundleItem.product?.names?.[0]?.value || 'Product'}
                            </span>
                            {money(bundleItem.price?.net) ? (
                              <span className="text-foreground-subtle whitespace-nowrap ml-2">
                                {money(bundleItem.price?.net)}
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
                ) : (
                  <>
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        {itemNameClickable ? (
                          <p
                            className="propeller-items-overview__item-title font-medium text-sm leading-tight cursor-pointer hover:text-secondary transition-colors line-clamp-2"
                            onClick={() => handleItemNameClick(item)}
                          >
                            {getItemName(item)}
                          </p>
                        ) : (
                          <p className="propeller-items-overview__item-title font-medium text-sm leading-tight line-clamp-2">
                            {getItemName(item)}
                          </p>
                        )}
                        {showPrice ? (
                          <span className="propeller-items-overview__item-price font-semibold text-sm text-foreground whitespace-nowrap">
                            {formatItemPrice((item.price || 0) * (item.quantity || 1))}
                          </span>
                        ) : null}
                      </div>
                      {showSku && itemSku ? (
                        <p className="propeller-items-overview__item-sku text-xs text-muted-foreground mt-0.5">
                          SKU: {itemSku}
                        </p>
                      ) : null}
                      {childItems.length > 0 ? (
                        <div className="propeller-items-overview__item-options mt-1.5 space-y-1 border-l-2 border-border-subtle pl-2">
                          {childItems.map((child, idx) => (
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
                      {showAvailability && availability ? (
                        <span
                          className={`propeller-items-overview__item-availability ml-2 ${inStock ? 'text-success' : 'text-destructive'}`}
                          data-in-stock={inStock ? 'true' : 'false'}
                        >
                          {availability}
                        </span>
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {items.length === 0 ? (
        <p className="propeller-items-overview__empty text-muted-foreground italic text-sm">
          {getLabel(props.labels, 'noItems', 'No items in cart.')}
        </p>
      ) : null}
    </div>
  );
}
export default ItemsOverview;
