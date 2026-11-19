import { ProductSortField, SortOrder } from '@propeller-commerce/propeller-sdk-v2';

const SORT_FIELDS: ReadonlySet<string> = new Set(Object.values(ProductSortField));
const SORT_ORDERS: ReadonlySet<string> = new Set(Object.values(SortOrder));

export interface ListingSortAndPrice {
  sortField?: ProductSortField;
  sortOrder?: SortOrder;
  priceFilterMin?: number;
  priceFilterMax?: number;
}

/**
 * The sort and price range a server-side listing may send upstream (#4, M2), applied before the
 * input (and so the data-cache key) is built. A sortField / sortOrder that is not an enum value
 * falls back to the fetcher's default, as does a non-finite price bound. For a viewer who may not
 * see prices the price range and a PRICE sort are dropped: hidePrices keeps `itemsFound`, so
 * counting results per price range would give the exact price away.
 */
export function gateListingOptions<T extends ListingSortAndPrice>(opts: T, pricesHidden: boolean): T {
  const out: T = { ...opts };
  if (out.sortField !== undefined && (!SORT_FIELDS.has(out.sortField) || (pricesHidden && out.sortField === ProductSortField.PRICE))) {
    delete out.sortField;
  }
  if (out.sortOrder !== undefined && !SORT_ORDERS.has(out.sortOrder)) delete out.sortOrder;
  for (const key of ['priceFilterMin', 'priceFilterMax'] as const) {
    if (out[key] !== undefined && (pricesHidden || !Number.isFinite(out[key]))) delete out[key];
  }
  return out;
}
