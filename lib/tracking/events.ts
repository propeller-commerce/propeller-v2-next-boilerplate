import type { Cart, CartMainItem, Product, Cluster } from '@propeller-commerce/propeller-sdk-v2';
import { track } from './tracker';
import type { TrackingSource } from './types';

/**
 * Typed emit helpers (PWP-910).
 *
 * Each island knows which surface it is, so it passes its own `source` in the
 * closure of the callback it already hands to `<ProductGrid>` / `<AddToCart>`.
 * That is why there is no "current source" React context: nothing has to infer
 * provenance from the tree, so a PDP rendering a cross-sell slider and a
 * spare-parts panel at once cannot mis-attribute either of them.
 */

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
  position?: number | null
): void {
  const productId = (item as { productId?: number } | null | undefined)?.productId ?? null;
  const sku = (item as { sku?: string } | null | undefined)?.sku ?? null;
  const quantity = (item as { quantity?: number } | null | undefined)?.quantity ?? null;
  const value = (item as { totalNet?: number } | null | undefined)?.totalNet ?? null;

  track(
    'add_to_cart',
    { product_id: productId, sku, quantity, value, source: shape(source, position) },
    // Time-bucketed so a genuine second add of the same product still counts,
    // while a StrictMode double-invoke of the same click does not.
    `add_to_cart:${productId ?? sku ?? '?'}:${source.type}:${Math.floor(Date.now() / 2000)}`
  );
}

/** A click through from a list — pairs with `queryId` to measure search relevance. */
export function trackSelectItem(
  source: TrackingSource,
  product: Product | Cluster,
  position?: number | null
): void {
  const productId = idOf(product);
  track(
    'select_item',
    { product_id: productId, sku: skuOf(product), source: shape(source, position) },
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

/** `view_item_list` — one per rendered result set. */
export function trackViewItemList(
  source: TrackingSource,
  resultsCount: number,
  itemCount: number
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
      source: shape(source),
    },
    `view_item_list:${source.type}:${source.id ?? ''}:${source.page ?? 1}`
  );
}
