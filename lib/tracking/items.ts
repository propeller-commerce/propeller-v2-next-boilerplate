import type { Cart, CartBaseItem, CartMainItem, Cluster, OrderItem, Product } from '@propeller-commerce/propeller-sdk-v2';

/**
 * GA4 `items[]` mappers.
 *
 * Ported from the WordPress plugin's `mapProducts` / `mapCartItems` /
 * `mapOrderItems` (`PropellerGa4.php`), so both storefronts send GA4 the same
 * shape and a merchant's reports are comparable across them.
 *
 * These are pure functions over SDK objects — no React, no browser, and no
 * import of app config, which is what keeps `lib/tracking` framework-agnostic
 * and testable with bare `node --test` (Node's resolver cannot see the `@/`
 * alias, so a single config import here would break the whole suite).
 * `events.ts` supplies the config-derived options — see `itemOptions()`.
 *
 * ── Two things that are counter-intuitive and load-bearing ──────────────────
 *
 * 1. `item_id` is the **SKU**, not `productId`. Both exist on our objects; the
 *    SKU is what a merchant recognises in GA4's item reports and what the
 *    WordPress side already sends. Using the numeric id would produce reports
 *    that join against nothing.
 *
 * 2. **This SDK inverts `gross` and `net`**: `gross` is EXCLUDING VAT and `net`
 *    is INCLUDING it (see `CartTotal`'s own doc comments, and the package's
 *    price rendering — `includeTax ? tier.net : tier.gross`). GA4 gets the
 *    ex-VAT figure with `tax` reported separately, matching the plugin. Read
 *    `gross` here and it is correct; "fix" it to `net` and every revenue number
 *    silently inflates by the VAT rate.
 */

export interface Ga4Item {
  item_id?: string;
  item_name?: string;
  item_brand?: string;
  currency?: string;
  quantity?: number;
  price?: number;
  /** 1-based position in the list, global across pagination. */
  index?: number;
  item_variant?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_category4?: string;
  item_category5?: string;
}

/**
 * A `view_item_list` on a 96-per-page grid would otherwise ship ~40KB of JSON
 * per event — past what `sendBeacon` accepts and past what GA4 will take.
 * ponytail: flat cap; if a shop needs full-page lists, sample the list instead
 * of raising this.
 */
export const MAX_ITEMS = 24;

/** GA4 accepts at most 5 category levels per item. */
const MAX_CATEGORY_DEPTH = 5;

export interface ItemOptions {
  /** ISO 4217 code. Supplied by `events.ts` from `config.currencyCode`. */
  currency?: string | null;
  /**
   * The shop's root category, skipped when building `item_category`. The
   * WordPress plugin hardcodes id 17 — that is one tenant's root, so we take it
   * from config instead of baking another shop's id in.
   */
  rootCategoryId?: number | null;
  /** 1-based page, so `index` stays global across pagination like the plugin's. */
  page?: number | null;
  /** Items per page — needed to turn a page-local index into a global one. */
  offset?: number | null;
  /** Language for name lookup; falls back to the first localized value. */
  language?: string | null;
  /**
   * Closed / semi-closed portals and price-on-request products must not leak a
   * price. The plugin omits the field entirely rather than sending 0, and so do
   * we — a zero would be averaged into GA4's revenue as a real price.
   */
  hidePrices?: boolean;
}

/** Pick the value for `language`, else the first non-empty one. */
function localized(values: readonly { language?: string; value?: string }[] | undefined, language?: string | null): string | undefined {
  if (!values?.length) return undefined;
  if (language) {
    const wanted = language.slice(0, 2).toUpperCase();
    const hit = values.find((v) => v.language?.toUpperCase() === wanted && v.value);
    if (hit?.value) return hit.value;
  }
  return values.find((v) => v.value)?.value;
}

/** `item_category` … `item_category5` from the product's category path. */
function categories(
  product: { categoryPath?: Category[] } | null | undefined,
  options: ItemOptions
): Partial<Ga4Item> {
  const path = product?.categoryPath;
  if (!Array.isArray(path) || path.length === 0) return {};

  const out: Record<string, string> = {};
  let depth = 0;
  for (const category of path) {
    if (depth >= MAX_CATEGORY_DEPTH) break;
    if (options.rootCategoryId != null && category?.categoryId === options.rootCategoryId) continue;
    const name = localized(category?.names, options.language);
    if (!name) continue;
    depth += 1;
    out[depth === 1 ? 'item_category' : `item_category${depth}`] = name;
  }
  return out as Partial<Ga4Item>;
}

type Category = NonNullable<Product['categoryPath']>[number];

/** Global 1-based position: page 2 of a 12-per-page grid starts at 13. */
function indexOf(position: number, page?: number | null, offset?: number | null): number {
  const p = Math.max(1, Number(page) || 1);
  const size = Number(offset) || 0;
  return (p - 1) * size + position;
}

/** A `Cluster` carries its sellable data on `defaultProduct`. */
function resolve(entry: Product | Cluster): Product | undefined {
  const asCluster = entry as Cluster;
  if (asCluster?.defaultProduct) return asCluster.defaultProduct;
  return entry as Product;
}

/** Products and clusters as rendered in a grid, slider or on a PDP. */
export function itemsFromProducts(
  entries: readonly (Product | Cluster)[] | null | undefined,
  options: ItemOptions = {}
): Ga4Item[] {
  if (!Array.isArray(entries) || entries.length === 0) return [];

  const items: Ga4Item[] = [];
  for (const entry of entries.slice(0, MAX_ITEMS)) {
    const product = resolve(entry);
    if (!product) continue;

    // Cluster names live on the cluster, not on its default product.
    const name = localized((entry as Cluster).names ?? product.names, options.language);

    const item: Ga4Item = {
      item_id: product.sku ?? undefined,
      item_name: name,
      item_brand: product.manufacturer || undefined,
      currency: options.currency ?? undefined,
      quantity: product.minimumQuantity ?? 1,
      index: indexOf(items.length + 1, options.page, options.offset),
      ...categories(product, options),
    };

    if (!options.hidePrices && typeof product.price?.gross === 'number') {
      item.price = product.price.gross;
    }
    items.push(item);
  }
  return items;
}

/**
 * Cart lines. Bundle children are emitted as their own items carrying
 * `item_variant`, matching the plugin — GA4 has no nesting, so a bundle that
 * only reported its parent would under-report every component sold.
 */
export function itemsFromCart(
  entries: readonly CartMainItem[] | null | undefined,
  options: ItemOptions = {}
): Ga4Item[] {
  if (!Array.isArray(entries) || entries.length === 0) return [];

  const items: Ga4Item[] = [];
  const push = (item: Ga4Item) => {
    if (items.length < MAX_ITEMS) items.push({ ...item, index: items.length + 1 });
  };

  for (const line of entries) {
    const product = line?.product;
    push({
      item_id: product?.sku ?? undefined,
      item_name: localized(product?.names, options.language),
      item_brand: product?.manufacturer || undefined,
      currency: options.currency ?? undefined,
      quantity: line?.quantity ?? 1,
      ...(options.hidePrices ? {} : { price: line?.sum ?? line?.price ?? 0 }),
      ...categories(product, options),
    });

    for (const child of (line?.childItems ?? []) as CartBaseItem[]) {
      const childProduct = (child as { product?: Product })?.product;
      if (!childProduct) continue;
      const childName = localized(childProduct.names, options.language);
      push({
        item_id: childProduct.sku ?? undefined,
        item_name: childName,
        item_brand: childProduct.manufacturer || undefined,
        currency: options.currency ?? undefined,
        quantity: (child as { quantity?: number }).quantity ?? 1,
        ...(options.hidePrices ? {} : { price: (child as { price?: number }).price ?? 0 }),
        item_variant: childName,
        ...categories(childProduct, options),
      });
    }
  }
  return items;
}

/** Order lines are already flat — no `product` sub-object to resolve. */
export function itemsFromOrder(
  entries: readonly OrderItem[] | null | undefined,
  options: ItemOptions = {}
): Ga4Item[] {
  if (!Array.isArray(entries) || entries.length === 0) return [];

  return entries.slice(0, MAX_ITEMS).map((line, i) => ({
    item_id: line?.sku ?? undefined,
    item_name: line?.name ?? undefined,
    item_brand: line?.manufacturer || undefined,
    currency: options.currency ?? undefined,
    quantity: line?.quantity ?? 1,
    ...(options.hidePrices ? {} : { price: line?.price ?? 0 }),
    index: i + 1,
  }));
}

export interface CartLineDelta {
  line: CartMainItem;
  /** Always positive; `direction` carries the sign. */
  delta: number;
  direction: 'added' | 'removed';
}

/**
 * Diff two cart snapshots into per-line deltas.
 *
 * **Deltas, not resulting quantities** — raising a line 2 → 5 is an *add of 3*,
 * which is what GA4 expects and what the WordPress plugin sends (it compares
 * `prev_quantity` with `quantity`). Emitting the new line total instead
 * silently multiplies cart-add volume in every report built on it.
 */
export function diffCartLines(
  previous: readonly CartMainItem[] | null | undefined,
  next: readonly CartMainItem[] | null | undefined
): CartLineDelta[] {
  const before = new Map<string, CartMainItem>();
  for (const line of previous ?? []) if (line?.itemId) before.set(line.itemId, line);

  const out: CartLineDelta[] = [];
  for (const line of next ?? []) {
    const previousLine = before.get(line?.itemId ?? '');
    const delta = (line?.quantity ?? 0) - (previousLine?.quantity ?? 0);
    if (delta > 0) out.push({ line, delta, direction: 'added' });
    else if (delta < 0) out.push({ line, delta: -delta, direction: 'removed' });
    before.delete(line?.itemId ?? '');
  }
  // Whatever is left was removed outright.
  for (const line of before.values()) {
    if ((line.quantity ?? 0) > 0) out.push({ line, delta: line.quantity ?? 0, direction: 'removed' });
  }
  return out;
}

/** Ex-VAT cart total — `totalGross` despite the name. See the header. */
export function cartValue(cart: Cart | null | undefined): number | null {
  return cart?.total?.totalGross ?? null;
}
