/**
 * Removes price data from responses, for visitors a semi-closed or closed shop
 * must not show prices to (lib/catalog/priceVisibility.ts). Applied server-side,
 * in SSR (lib/server.ts) and in the GraphQL proxy, so prices never reach the browser.
 */

const NULLED = new Set([
  'price',
  'minPrice',
  'maxPrice',
  // Cart and order amounts (SDK cart*/order* documents), for /api/graphql responses.
  'priceNet',
  'priceTotal',
  'priceTotalNet',
  'totalPrice',
  'totalPriceNet',
  'customerPrice',
  'originalPrice',
  'originalGross',
  'originalNet',
  'costPrice',
  'sum',
  'sumNet',
  'totalSum',
  'totalSumNet',
  'subTotal',
  'subTotalNet',
  'totalNet',
  'totalGross',
  'gross',
  'net',
  'tax',
  'discount',
  'discountNet',
  'discountValue',
  // Search results, discounts, margins and costs (checked against the SDK types in hidePrices.test.ts).
  'effectivePrice',
  'discountGross',
  'discountPercentage',
  'discountPercentageSum',
  'customerDiscountPercentage',
  'totalDiscountPercentage',
  'totalDiscountPercentageSum',
  'subTotalGross',
  'totalTax',
  'shippingCost',
  'marginAmount',
  'marginPercentage',
  'saleMarginAmount',
  'saleMarginAmountSum',
  'saleMarginPercentage',
  'saleMarginPercentageSum',
  'attributedSaleDiscount',
  'attributedSaleDiscountSum',
  'attributedSaleMargin',
  'attributedSaleMarginSum',
]);
// Amounts when numeric (tax levels, payments); `total` is also the cart totals object, which is recursed into.
const NULLED_IF_NUMBER = new Set(['total', 'amount', 'cost']);
const EMPTIED = new Set(['bulkPrices', 'surcharges', 'costPrices']);
/** Every response key hidePrices clears; an alias on one of these fields would get around it. */
export const PRICE_FIELDS: ReadonlySet<string> = new Set([...NULLED, ...NULLED_IF_NUMBER, ...EMPTIED, 'priceData']);
// priceData keys that only configure display, not amounts: enum strings, and `per` a scalar. Kept
// only as such, so nothing (an alias in a document the proxy didn't refuse) hides under them.
const PRICE_DATA_KEPT = new Set(['per', 'display', 'bulkPriceDiscountType', 'defaultTaxCode']);

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (NULLED.has(key) || (NULLED_IF_NUMBER.has(key) && typeof child === 'number')) out[key] = null;
    else if (EMPTIED.has(key)) out[key] = [];
    else if (key === 'priceData' && child && typeof child === 'object') {
      out[key] = Object.fromEntries(
        Object.entries(child).filter(([k, v]) => PRICE_DATA_KEPT.has(k) && (v === null || typeof v === 'string' || (k === 'per' && typeof v === 'number'))),
      );
    } else out[key] = strip(child);
  }
  return out;
}

/** A copy of `data` with every price field cleared. */
export function hidePrices<T>(data: T): T {
  return strip(data) as T;
}

// The merchant's purchase prices: Price.costPrices, costPrice on inventory balances and order items,
// and ProductPrice.cost (`price.cost`, `bulkPrices[].cost`, the same number; the only field named `cost`
// in the schema, 2026-11-19). The storefront and order-editor keys both answer them; no visitor or buyer
// ever gets them.
export const COST_PRICE_KEYS: ReadonlySet<string> = new Set(['costPrice', 'costPrices', 'cost']);

/** A copy of `data` without any `costPrice` / `costPrices` / `cost` key, at any depth. */
export function withoutCostPrices<T>(data: T): T {
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk);
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !COST_PRICE_KEYS.has(key))
        .map(([key, child]) => [key, walk(child)]),
    );
  };
  return walk(data) as T;
}

/**
 * What a visitor gets, in the proxy and in SSR: never the merchant's cost prices, and no prices at
 * all when they may not see them.
 */
export function forVisitor<T>(data: T, canSeePrices: boolean): T {
  const clean = withoutCostPrices(data);
  return canSeePrices ? clean : hidePrices(clean);
}
