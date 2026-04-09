import * as React from 'react';

export interface OrderItemCardProps {
  /** The order item to display */
  orderItem: any;

  /** Child order items (rendered as indented sub-rows beneath the parent) */
  childItems?: any[];

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
interface OrderItemCardState {
  titleLinkable: () => boolean;
  showImage: () => boolean;
  showSku: () => boolean;
  showQuantity: () => boolean;
  showPrice: () => boolean;
  showDiscount: () => boolean;
  showStockComponent: () => boolean;
  showItemNotes: () => boolean;
  isChildItem: () => boolean;
  productName: () => string;
  productSku: () => string;
  productImage: () => string;
  productId: () => number | undefined;
  productSlug: () => string;
  productUrl: () => string;
  quantity: () => number;
  price: () => number;
  priceTotal: () => number;
  discount: () => number;
  originalPrice: () => number;
  discountPercentage: () => number;
  notes: () => string;
  hasChildren: () => boolean;
  formatItemPrice: (price: number) => string;
  formatDiscountDisplay: () => string;
}
function OrderItemCard(props: OrderItemCardProps) {
  function titleLinkable(): ReturnType<OrderItemCardState['titleLinkable']> {
    return props.titleLinkable !== undefined ? props.titleLinkable : true;
  }
  function showImage(): ReturnType<OrderItemCardState['showImage']> {
    if (props.isChildItem) return false;
    return props.showImage !== undefined ? props.showImage : true;
  }
  function showSku(): ReturnType<OrderItemCardState['showSku']> {
    if (props.isChildItem) return false;
    return props.showSku !== undefined ? props.showSku : true;
  }
  function showQuantity(): ReturnType<OrderItemCardState['showQuantity']> {
    return props.showQuantity !== undefined ? props.showQuantity : true;
  }
  function showPrice(): ReturnType<OrderItemCardState['showPrice']> {
    return props.showPrice !== undefined ? props.showPrice : true;
  }
  function showDiscount(): ReturnType<OrderItemCardState['showDiscount']> {
    return props.showDiscount !== undefined ? props.showDiscount : false;
  }
  function showStockComponent(): ReturnType<OrderItemCardState['showStockComponent']> {
    return props.showStockComponent !== undefined ? props.showStockComponent : false;
  }
  function showItemNotes(): ReturnType<OrderItemCardState['showItemNotes']> {
    return props.showItemNotes !== undefined ? props.showItemNotes : false;
  }
  function isChildItem(): ReturnType<OrderItemCardState['isChildItem']> {
    return props.isChildItem || false;
  }
  function productName(): ReturnType<OrderItemCardState['productName']> {
    const item = props.orderItem;
    return item?.product?.names?.[0]?.value || item?.name || 'Unknown Product';
  }
  function productSku(): ReturnType<OrderItemCardState['productSku']> {
    return props.orderItem?.product?.sku || props.orderItem?.sku || '';
  }
  function productImage(): ReturnType<OrderItemCardState['productImage']> {
    return props.orderItem?.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
  }
  function productId(): ReturnType<OrderItemCardState['productId']> {
    return props.orderItem?.product?.productId;
  }
  function productSlug(): ReturnType<OrderItemCardState['productSlug']> {
    return props.orderItem?.product?.slugs?.[0]?.value || '';
  }
  function productUrl(): ReturnType<OrderItemCardState['productUrl']> {
    if (productId() && productSlug()) {
      return '/product/' + productId() + '/' + productSlug();
    }
    return '';
  }
  function quantity(): ReturnType<OrderItemCardState['quantity']> {
    return props.orderItem?.quantity || 0;
  }
  function price(): ReturnType<OrderItemCardState['price']> {
    return props.orderItem?.price || 0;
  }
  function priceTotal(): ReturnType<OrderItemCardState['priceTotal']> {
    return props.orderItem?.priceTotal || 0;
  }
  function discount(): ReturnType<OrderItemCardState['discount']> {
    return props.orderItem?.discount || 0;
  }
  function originalPrice(): ReturnType<OrderItemCardState['originalPrice']> {
    return props.orderItem?.originalPrice || 0;
  }
  function discountPercentage(): ReturnType<OrderItemCardState['discountPercentage']> {
    if (originalPrice() > 0 && discount() > 0) {
      return (discount() / originalPrice()) * 100;
    }
    return 0;
  }
  function notes(): ReturnType<OrderItemCardState['notes']> {
    return props.orderItem?.notes || '';
  }
  function hasChildren(): ReturnType<OrderItemCardState['hasChildren']> {
    return (props.childItems || []).length > 0;
  }
  function formatItemPrice(price: number): ReturnType<OrderItemCardState['formatItemPrice']> {
    if (props.formatPrice) {
      return props.formatPrice(price);
    }
    if (!price && price !== 0) return '-';
    return '€' + Number(price).toFixed(2);
  }
  function formatDiscountDisplay(): ReturnType<OrderItemCardState['formatDiscountDisplay']> {
    const discountStr = formatItemPrice(discount());
    if (discountPercentage() > 0) {
      return discountStr + ' (' + discountPercentage().toFixed(2).replace('.', ',') + '%)';
    }
    return discountStr;
  }
  return (
    <tbody>
      <tr className={isChildItem() ? 'border-0' : 'hover:bg-gray-50 transition'}>
        <td className={isChildItem() ? 'px-6 py-2 pl-28' : 'px-6 py-4'}>
          <div className="flex items-center gap-4">
            {showImage() ? (
              <>
                {productImage() ? (
                  <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden">
                    <img
                      className="object-cover w-full h-full"
                      src={productImage()}
                      alt={productName()}
                    />
                  </div>
                ) : null}
                {!productImage() ? (
                  <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                    No Img
                  </div>
                ) : null}
              </>
            ) : null}
            <div>
              {titleLinkable() && productUrl() && !isChildItem() ? (
                <a
                  className="font-medium text-foreground hover:text-primary hover:underline"
                  href={productUrl()}
                >
                  {productName()}
                </a>
              ) : null}
              {!titleLinkable() || !productUrl() || isChildItem() ? (
                <span className={isChildItem() ? 'text-sm text-gray-700' : 'font-medium'}>
                  {productName()}
                </span>
              ) : null}
              {showSku() && productSku() ? (
                <p className="text-sm text-gray-500 mt-1">SKU: {productSku()}</p>
              ) : null}
              {showItemNotes() && notes() ? (
                <p className="text-sm text-gray-400 mt-1 italic">{notes()}</p>
              ) : null}
              {showStockComponent() ? (
                <p className="text-xs text-gray-400 mt-1">Stock info</p>
              ) : null}
            </div>
          </div>
        </td>
        {showQuantity() ? (
          <td
            className={
              isChildItem()
                ? 'px-6 py-2 text-center text-sm text-gray-600'
                : 'px-6 py-4 text-center'
            }
          >
            {quantity()}
          </td>
        ) : null}
        {showDiscount() ? (
          <td
            className={
              isChildItem()
                ? 'px-6 py-2 text-right text-sm text-gray-600'
                : 'px-6 py-4 text-right whitespace-nowrap text-orange-600'
            }
          >
            {discount() > 0 ? <>{formatDiscountDisplay()}</> : null}
          </td>
        ) : null}
        {showPrice() ? (
          <td
            className={
              isChildItem()
                ? 'px-6 py-2 text-right whitespace-nowrap text-sm text-gray-600'
                : 'px-6 py-4 text-right whitespace-nowrap'
            }
          >
            {formatItemPrice(priceTotal())}
          </td>
        ) : null}
      </tr>
      {hasChildren() ? (
        <>
          {(props.childItems || []).map((child) => (
            <tr className="border-0" key={child.id || child.uuid}>
              <td className="px-6 py-2 pl-28">
                <span className="text-sm text-gray-700">
                  {child.product?.names?.[0]?.value || child.name || 'Unknown'}
                </span>
              </td>
              {showQuantity() ? (
                <td className="px-6 py-2 text-center text-sm text-gray-600">
                  {child.quantity || 0}
                </td>
              ) : null}
              {showDiscount() ? (
                <td className="px-6 py-2 text-right text-sm text-gray-600" />
              ) : null}
              {showPrice() ? (
                <td className="px-6 py-2 text-right whitespace-nowrap text-sm text-gray-600">
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
