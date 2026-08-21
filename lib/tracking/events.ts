import type { Cart, CartMainItem, Order, OrderItem, Product, Cluster } from '@propeller-commerce/propeller-sdk-v2';
import { config } from '@/data/config';
import { track } from './tracker';
import { diffCartLines, itemsFromCart, itemsFromOrder, itemsFromProducts, type Ga4Item, type ItemOptions } from './items';
import type { TrackingSource } from './types';

/**
 * Typed emit helpers.
 *
 * Each island knows which surface it is, so it passes its own `source` in the
 * closure of the callback it already hands to `<ProductGrid>` / `<AddToCart>`.
 * That is why there is no "current source" React context: nothing has to infer
 * provenance from the tree, so a PDP rendering a cross-sell slider and a
 * spare-parts panel at once cannot mis-attribute either of them.
 *
 * Commerce events carry a GA4-shaped `items[]`. That array is the one thing a
 * mapper cannot invent — every GA4 ecommerce report is built on it — so it is
 * captured here, where the product objects are already in hand. It rides along
 * into the `props` JSON column too, at no schema cost.
 */

/**
 * Config-derived item options, in one place.
 *
 * `items.ts` deliberately imports no app config so it stays framework-agnostic
 * and unit-testable under bare `node --test`; this is where the two meet.
 */
export function itemOptions(extra: Omit<ItemOptions, 'currency' | 'rootCategoryId'> = {}): ItemOptions {
  return {
    currency: config.currencyCode,
    rootCategoryId: config.baseCategoryId ?? null,
    ...extra,
  };
}

/** Cart lines as GA4 items. */
export function cartItems(cart: Cart | null | undefined, language?: string | null): Ga4Item[] {
  return itemsFromCart(cart?.items as CartMainItem[] | undefined, itemOptions({ language }));
}

/** Order lines as GA4 items. */
export function orderItems(order: Order | null | undefined, language?: string | null): Ga4Item[] {
  return itemsFromOrder(order?.items as OrderItem[] | undefined, itemOptions({ language }));
}

/** Ex-VAT cart total — `totalGross` despite the name; see `items.ts`. */
export function cartValue(cart: Cart | null | undefined): number | null {
  return cart?.total?.totalGross ?? null;
}

function shape(source: TrackingSource, position?: number | null) {
  return {
    type: source.type,
    id: source.id ?? null,
    name: source.name ?? null,
    position: position ?? source.position ?? null,
    page: source.page ?? null,
    searchTerm: source.searchTerm ?? null,
    queryId: source.queryId ?? null,
  };
}

const idOf = (p: Product | Cluster): number | null =>
  (p as Product)?.productId ?? (p as Cluster)?.clusterId ?? null;

const skuOf = (p: Product | Cluster): string | null => (p as Product)?.sku ?? null;

/** `add_to_cart` with provenance — the highest-value dimension in the taxonomy. */
export function trackAddToCart(
  source: TrackingSource,
  item?: CartMainItem | null,
  _cart?: Cart | null,
  position?: number | null,
  language?: string | null
): void {
  const productId = item?.productId ?? null;
  const sku = item?.product?.sku ?? null;
  const quantity = item?.quantity ?? null;
  const items = itemsFromCart(item ? [item] : [], itemOptions({ language }));
  // Ex-VAT line value: `sum` is the per-UOM price EXCLUDING VAT in this SDK
  // (see items.ts). `totalNet` — which this used to send — is the tax-INCLUSIVE
  // figure, so GA4 would have booked every add-to-cart inflated by the VAT rate.
  const value = item ? (item.sum ?? item.price ?? 0) * (item.quantity ?? 1) : null;

  track(
    'add_to_cart',
    { product_id: productId, sku, quantity, value, items, source: shape(source, position) },
    // Time-bucketed so a genuine second add of the same product still counts,
    // while a StrictMode double-invoke of the same click does not.
    `add_to_cart:${productId ?? sku ?? '?'}:${source.type}:${Math.floor(Date.now() / 2000)}`
  );
}

/** A click through from a list — pairs with `queryId` to measure search relevance. */
export function trackSelectItem(
  source: TrackingSource,
  product: Product | Cluster,
  position?: number | null,
  language?: string | null
): void {
  const productId = idOf(product);
  track(
    'select_item',
    {
      product_id: productId,
      sku: skuOf(product),
      items: itemsFromProducts([product], itemOptions({ language })),
      item_list_id: source.id ?? source.type,
      item_list_name: source.name ?? source.type,
      source: shape(source, position),
    },
    `select_item:${productId ?? '?'}:${source.type}`
  );

  // From a search list this is also the relevance signal: it turns "how many
  // searches" into "how many searches WORKED".
  if (source.type === 'search' && source.searchTerm) {
    track(
      'search_result_clicked',
      {
        search_term: source.searchTerm,
        query_id: source.queryId ?? null,
        product_id: productId,
        position: position ?? null,
        page: source.page ?? null,
      },
      `search_result_clicked:${source.searchTerm}:${productId ?? '?'}`
    );
  }
}

/**
 * Diff two cart snapshots and emit the GA4 add/remove events they imply.
 *
 * The package's `<CartItem>` exposes one `afterCartUpdate(cart)` callback for
 * every mutation — add, remove and quantity edit alike — so provenance has to
 * come from comparing snapshots. One diff at the one callback also beats three
 * separate handlers: every path that replaces the cart is covered by
 * construction.
 *
 * **Quantities are deltas, not line totals** — raising a line 2 → 5 is
 * `add_to_cart` with quantity 3, matching what the WordPress plugin sends
 * (`prev_quantity` vs `quantity`). Sending the new total instead silently
 * multiplies cart-add volume in every GA4 report.
 */
export function trackCartDiff(
  previous: Cart | null | undefined,
  next: Cart | null | undefined,
  language?: string | null
): void {
  const options = itemOptions({ language });
  const emit = (name: 'add_to_cart' | 'remove_from_cart', line: CartMainItem, delta: number) => {
    if (delta <= 0) return;
    const [item] = itemsFromCart([line], options);
    const unit = line.sum ?? line.price ?? 0;
    track(
      name,
      {
        product_id: line.productId ?? null,
        sku: line.product?.sku ?? null,
        quantity: delta,
        value: unit * delta,
        // The item carries the delta too, not the resulting line quantity.
        items: item ? [{ ...item, quantity: delta }] : [],
        source: shape({ type: 'cart' }),
      },
      // Time-bucketed: a genuine second edit still counts, a double-invoke of
      // the same one does not.
      `${name}:${line.itemId}:${delta}:${Math.floor(Date.now() / 2000)}`
    );
  };

  for (const { line, delta, direction } of diffCartLines(
    previous?.items as CartMainItem[] | undefined,
    next?.items as CartMainItem[] | undefined
  )) {
    emit(direction === 'added' ? 'add_to_cart' : 'remove_from_cart', line, delta);
  }
}

/** `view_item_list` — one per rendered result set. */
export function trackViewItemList(
  source: TrackingSource,
  resultsCount: number,
  itemCount: number,
  products?: readonly (Product | Cluster)[] | null,
  options: { language?: string | null; offset?: number | null; hidePrices?: boolean } = {}
): void {
  track(
    'view_item_list',
    {
      entity_type: source.type,
      entity_id: source.id ?? null,
      entity_name: source.name ?? null,
      results_count: resultsCount,
      item_count: itemCount,
      page: source.page ?? null,
      items: itemsFromProducts(products, itemOptions({ ...options, page: source.page })),
      item_list_id: source.id ?? source.type,
      item_list_name: source.name ?? source.type,
      source: shape(source),
    },
    `view_item_list:${source.type}:${source.id ?? ''}:${source.page ?? 1}`
  );
}
