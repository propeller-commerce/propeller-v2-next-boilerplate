/**
 * @rsc-safe — Pure display component. No React hooks, no event handlers, no
 * browser APIs, no context reads. Renders directly from props and can be
 * imported into a React Server Component without a 'use client' boundary.
 * Verified C0.2 (2026-05-20).
 */
import * as React from 'react';
import type { OrderItem } from 'propeller-sdk-v2';
import { formatPrice } from '@/composables/shared/utils/formatting';
import { config } from '@/data/config';

export interface OrderItemCardProps {
  /** The order item to display */
  orderItem: OrderItem;

  /** Child order items (rendered as indented sub-rows beneath the parent) */
  childItems?: OrderItem[];

  /** Should the item title be a link to the PDP */
  titleLinkable?: boolean;

  /** Display a small thumbnail of the order item */
  showImage?: boolean;

  /** Should stock info be displayed */
  showStockComponent?: boolean;

  /** Display the SKU of the order item beneath the item name */
  showSku?: boolean;

  /** Display the quantity of the order item */
  showQuantity?: boolean;

  /** Display the price of the order item */
  showPrice?: boolean;

  /** Display the discount column */
  showDiscount?: boolean;

  /** Should the order item notes field be displayed */
  showItemNotes?: boolean;

  /** Render as a child/sub-item (indented, no image) */
  isChildItem?: boolean;

  /** Custom price formatting function */
  formatPrice?: (price: number) => string;
}

// ── Pure accessors (module scope — created once, not per render) ────────────────

function getProductName(orderItem: OrderItem): string {
  return orderItem?.product?.names?.[0]?.value || orderItem?.name || 'Unknown Product';
}

function getClusterUrl(orderItem: OrderItem): string {
  const cluster = orderItem?.product?.cluster;
  if (!cluster) return '';
  const id = cluster.clusterId;
  const slug = cluster.slugs?.[0]?.value || '';
  if (!id || !slug) return '';
  return `/cluster/${id}/${slug}`;
}

function getProductUrl(orderItem: OrderItem): string {
  const cu = getClusterUrl(orderItem);
  if (cu) return cu;
  const id = orderItem?.product?.productId;
  const slug = orderItem?.product?.slugs?.[0]?.value || '';
  if (id && slug) return `/product/${id}/${slug}`;
  return '';
}

function OrderItemCard(props: OrderItemCardProps) {
  const item = props.orderItem;
  const isChildItem = props.isChildItem || false;

  // Display toggles — resolved once (child items never show image/sku).
  const titleLinkable = props.titleLinkable !== undefined ? props.titleLinkable : true;
  const showImage = isChildItem ? false : props.showImage !== undefined ? props.showImage : true;
  const showSku = isChildItem ? false : props.showSku !== undefined ? props.showSku : true;
  const showQuantity = props.showQuantity !== undefined ? props.showQuantity : true;
  const showPrice = props.showPrice !== undefined ? props.showPrice : true;
  const showDiscount = props.showDiscount !== undefined ? props.showDiscount : false;
  const showStockComponent =
    props.showStockComponent !== undefined ? props.showStockComponent : false;
  const showItemNotes = props.showItemNotes !== undefined ? props.showItemNotes : false;

  // Derived item values — computed once per render (previously each was a
  // function redefined every render and called multiple times across the JSX).
  const productName = getProductName(item);
  const productSku = item?.product?.sku || item?.sku || '';
  const productImage = item?.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
  const productUrl = getProductUrl(item);
  const quantity = item?.quantity || 0;
  const priceTotal = item?.priceTotal || 0;
  const discount = item?.discount || 0;
  const originalPrice = item?.originalPrice || 0;
  const discountPercentage =
    originalPrice > 0 && discount > 0 ? (discount / originalPrice) * 100 : 0;
  const notes = item?.notes || '';
  const hasChildren = (props.childItems || []).length > 0;

  function formatItemPrice(price: number): string {
    if (props.formatPrice) {
      return props.formatPrice(price);
    }
    if (!price && price !== 0) return '-';
    return formatPrice(price, { symbol: config.currency });
  }

  const discountDisplay =
    discountPercentage > 0
      ? `${formatItemPrice(discount)} (${discountPercentage.toFixed(2).replace('.', ',')}%)`
      : formatItemPrice(discount);

  return (
    <tbody className="propeller-order-item-card">
      <tr
        className={`propeller-order-item-card__row ${isChildItem ? 'border-0' : 'hover:bg-surface-hover transition'}`}
        data-child={isChildItem ? 'true' : 'false'}
      >
        <td
          className={`propeller-order-item-card__cell propeller-order-item-card__cell--product ${isChildItem ? 'px-6 py-2 pl-28' : 'px-6 py-4'}`}
        >
          <div className="flex items-center gap-4">
            {showImage ? (
              productImage ? (
                <div className="propeller-order-item-card__media relative w-16 h-16 flex-shrink-0 rounded overflow-hidden">
                  <img
                    className="propeller-order-item-card__image object-cover w-full h-full"
                    src={productImage}
                    alt={productName}
                  />
                </div>
              ) : (
                <div className="propeller-order-item-card__image-placeholder w-16 h-16 bg-surface-hover rounded flex items-center justify-center text-foreground-subtle text-xs">
                  No Img
                </div>
              )
            ) : null}
            <div>
              {titleLinkable && productUrl && !isChildItem ? (
                <a
                  className="propeller-order-item-card__title font-medium text-foreground hover:text-primary hover:underline"
                  href={productUrl}
                >
                  {productName}
                </a>
              ) : (
                <span
                  className={`propeller-order-item-card__title ${isChildItem ? 'text-sm text-muted-foreground' : 'font-medium'}`}
                >
                  {productName}
                </span>
              )}
              {showSku && productSku ? (
                <p className="propeller-order-item-card__sku text-sm text-muted-foreground mt-1">
                  SKU: {productSku}
                </p>
              ) : null}
              {showItemNotes && notes ? (
                <p className="propeller-order-item-card__notes text-sm text-foreground-subtle mt-1 italic">
                  {notes}
                </p>
              ) : null}
              {showStockComponent ? (
                <p className="propeller-order-item-card__stock text-xs text-foreground-subtle mt-1">
                  Stock info
                </p>
              ) : null}
            </div>
          </div>
        </td>
        {showQuantity ? (
          <td
            className={
              isChildItem
                ? 'propeller-order-item-card__cell propeller-order-item-card__cell--quantity px-6 py-2 text-center text-sm text-muted-foreground'
                : 'propeller-order-item-card__cell propeller-order-item-card__cell--quantity px-6 py-4 text-center'
            }
          >
            {quantity}
          </td>
        ) : null}
        {showDiscount ? (
          <td
            className={
              isChildItem
                ? 'propeller-order-item-card__cell propeller-order-item-card__cell--discount px-6 py-2 text-right text-sm text-muted-foreground'
                : 'propeller-order-item-card__cell propeller-order-item-card__cell--discount px-6 py-4 text-right whitespace-nowrap text-warning'
            }
          >
            {discount > 0 ? <>{discountDisplay}</> : null}
          </td>
        ) : null}
        {showPrice ? (
          <td
            className={
              isChildItem
                ? 'propeller-order-item-card__cell propeller-order-item-card__cell--price px-6 py-2 text-right whitespace-nowrap text-sm text-muted-foreground'
                : 'propeller-order-item-card__cell propeller-order-item-card__cell--price px-6 py-4 text-right whitespace-nowrap'
            }
          >
            {formatItemPrice(priceTotal)}
          </td>
        ) : null}
      </tr>
      {hasChildren ? (
        <>
          {(props.childItems || []).map((child) => (
            <tr
              className="propeller-order-item-card__child-row border-0"
              key={child.id || child.uuid}
              data-child="true"
            >
              <td className="propeller-order-item-card__cell propeller-order-item-card__cell--product px-6 py-2 pl-28">
                <span className="propeller-order-item-card__child-title text-sm text-muted-foreground">
                  {child.product?.names?.[0]?.value || child.name || 'Unknown'}
                </span>
              </td>
              {showQuantity ? (
                <td className="propeller-order-item-card__cell propeller-order-item-card__cell--quantity px-6 py-2 text-center text-sm text-muted-foreground">
                  {child.quantity || 0}
                </td>
              ) : null}
              {showDiscount ? (
                <td className="propeller-order-item-card__cell propeller-order-item-card__cell--discount px-6 py-2 text-right text-sm text-muted-foreground" />
              ) : null}
              {showPrice ? (
                <td className="propeller-order-item-card__cell propeller-order-item-card__cell--price px-6 py-2 text-right whitespace-nowrap text-sm text-muted-foreground">
                  {formatItemPrice(child.priceTotal || 0)}
                </td>
              ) : null}
            </tr>
          ))}
        </>
      ) : null}
    </tbody>
  );
}

export default OrderItemCard;
