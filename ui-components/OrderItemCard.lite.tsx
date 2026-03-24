import { useStore, Show, For } from '@builder.io/mitosis';

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
  titleLinkable: boolean;
  showImage: boolean;
  showSku: boolean;
  showQuantity: boolean;
  showPrice: boolean;
  showDiscount: boolean;
  showStockComponent: boolean;
  showItemNotes: boolean;
  isChildItem: boolean;
  productName: string;
  productSku: string;
  productImage: string;
  productId: number | undefined;
  productSlug: string;
  productUrl: string;
  quantity: number;
  price: number;
  priceTotal: number;
  discount: number;
  originalPrice: number;
  discountPercentage: number;
  notes: string;
  hasChildren: boolean;
  formatItemPrice: (price: number) => string;
  formatDiscountDisplay: () => string;
}

export default function OrderItemCard(props: OrderItemCardProps) {
  const state = useStore<OrderItemCardState>({
    get titleLinkable(): boolean {
      return props.titleLinkable !== undefined ? props.titleLinkable : true;
    },
    get showImage(): boolean {
      if (props.isChildItem) return false;
      return props.showImage !== undefined ? props.showImage : true;
    },
    get showSku(): boolean {
      if (props.isChildItem) return false;
      return props.showSku !== undefined ? props.showSku : true;
    },
    get showQuantity(): boolean {
      return props.showQuantity !== undefined ? props.showQuantity : true;
    },
    get showPrice(): boolean {
      return props.showPrice !== undefined ? props.showPrice : true;
    },
    get showDiscount(): boolean {
      return props.showDiscount !== undefined ? props.showDiscount : false;
    },
    get showStockComponent(): boolean {
      return props.showStockComponent !== undefined ? props.showStockComponent : false;
    },
    get showItemNotes(): boolean {
      return props.showItemNotes !== undefined ? props.showItemNotes : false;
    },
    get isChildItem(): boolean {
      return props.isChildItem || false;
    },
    get productName(): string {
      const item = props.orderItem;
      return item?.product?.names?.[0]?.value || item?.name || 'Unknown Product';
    },
    get productSku(): string {
      return props.orderItem?.product?.sku || props.orderItem?.sku || '';
    },
    get productImage(): string {
      return props.orderItem?.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
    },
    get productId(): number | undefined {
      return props.orderItem?.product?.productId;
    },
    get productSlug(): string {
      return props.orderItem?.product?.slugs?.[0]?.value || '';
    },
    get productUrl(): string {
      if (state.productId && state.productSlug) {
        return '/product/' + state.productId + '/' + state.productSlug;
      }
      return '';
    },
    get quantity(): number {
      return props.orderItem?.quantity || 0;
    },
    get price(): number {
      return props.orderItem?.price || 0;
    },
    get priceTotal(): number {
      return props.orderItem?.priceTotal || 0;
    },
    get discount(): number {
      return props.orderItem?.discount || 0;
    },
    get originalPrice(): number {
      return props.orderItem?.originalPrice || 0;
    },
    get discountPercentage(): number {
      if (state.originalPrice > 0 && state.discount > 0) {
        return (state.discount / state.originalPrice) * 100;
      }
      return 0;
    },
    get notes(): string {
      return props.orderItem?.notes || '';
    },
    get hasChildren(): boolean {
      return (props.childItems || []).length > 0;
    },
    formatItemPrice(price: number): string {
      if (props.formatPrice) {
        return props.formatPrice(price);
      }
      if (!price && price !== 0) return '-';
      return '€' + Number(price).toFixed(2);
    },
    formatDiscountDisplay(): string {
      const discountStr = state.formatItemPrice(state.discount);
      if (state.discountPercentage > 0) {
        return discountStr + ' (' + state.discountPercentage.toFixed(2).replace('.', ',') + '%)';
      }
      return discountStr;
    },
  });

  return (
    <tbody>
      <tr className={state.isChildItem ? 'border-0' : 'hover:bg-gray-50 transition'}>
        <td className={state.isChildItem ? 'px-6 py-2 pl-28' : 'px-6 py-4'}>
          <div className="flex items-center gap-4">
            <Show when={state.showImage}>
              <Show when={state.productImage}>
                <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden">
                  <img
                    src={state.productImage}
                    alt={state.productName}
                    className="object-cover w-full h-full"
                  />
                </div>
              </Show>
              <Show when={!state.productImage}>
                <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                  No Img
                </div>
              </Show>
            </Show>
            <div>
              <Show when={state.titleLinkable && state.productUrl && !state.isChildItem}>
                <a
                  href={state.productUrl}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {state.productName}
                </a>
              </Show>
              <Show when={!state.titleLinkable || !state.productUrl || state.isChildItem}>
                <span className={state.isChildItem ? 'text-sm text-gray-700' : 'font-medium'}>{state.productName}</span>
              </Show>
              <Show when={state.showSku && state.productSku}>
                <p className="text-sm text-gray-500 mt-1">SKU: {state.productSku}</p>
              </Show>
              <Show when={state.showItemNotes && state.notes}>
                <p className="text-sm text-gray-400 mt-1 italic">{state.notes}</p>
              </Show>
              <Show when={state.showStockComponent}>
                <p className="text-xs text-gray-400 mt-1">Stock info</p>
              </Show>
            </div>
          </div>
        </td>
        <Show when={state.showQuantity}>
          <td className={state.isChildItem ? 'px-6 py-2 text-center text-sm text-gray-600' : 'px-6 py-4 text-center'}>{state.quantity}</td>
        </Show>
        <Show when={state.showDiscount}>
          <td className={state.isChildItem ? 'px-6 py-2 text-right text-sm text-gray-600' : 'px-6 py-4 text-right whitespace-nowrap text-orange-600'}>
            <Show when={state.discount > 0}>
              {state.formatDiscountDisplay()}
            </Show>
          </td>
        </Show>
        <Show when={state.showPrice}>
          <td className={state.isChildItem ? 'px-6 py-2 text-right whitespace-nowrap text-sm text-gray-600' : 'px-6 py-4 text-right whitespace-nowrap'}>
            {state.formatItemPrice(state.priceTotal)}
          </td>
        </Show>
      </tr>
      <Show when={state.hasChildren}>
        <For each={props.childItems || []}>
          {(child: any) => (
            <tr key={child.id || child.uuid} className="border-0">
              <td className="px-6 py-2 pl-28">
                <span className="text-sm text-gray-700">
                  {child.product?.names?.[0]?.value || child.name || 'Unknown'}
                </span>
              </td>
              <Show when={state.showQuantity}>
                <td className="px-6 py-2 text-center text-sm text-gray-600">{child.quantity || 0}</td>
              </Show>
              <Show when={state.showDiscount}>
                <td className="px-6 py-2 text-right text-sm text-gray-600"></td>
              </Show>
              <Show when={state.showPrice}>
                <td className="px-6 py-2 text-right whitespace-nowrap text-sm text-gray-600">
                  {state.formatItemPrice(child.priceTotal || 0)}
                </td>
              </Show>
            </tr>
          )}
        </For>
      </Show>
    </tbody>
  );
}
