/**
 * Removes price data from catalog responses, for visitors a semi-closed shop
 * must not show prices to. Applied server-side so prices never reach the page.
 */

const NULLED = new Set(['price', 'minPrice', 'maxPrice']);
const EMPTIED = new Set(['bulkPrices', 'surcharges']);
// priceData keys that only configure display, not amounts.
const PRICE_DATA_KEPT = new Set(['per', 'display', 'bulkPriceDiscountType', 'defaultTaxCode']);

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (NULLED.has(key)) out[key] = null;
    else if (EMPTIED.has(key)) out[key] = [];
    else if (key === 'priceData' && child && typeof child === 'object') {
      out[key] = Object.fromEntries(Object.entries(child).filter(([k]) => PRICE_DATA_KEPT.has(k)));
    } else out[key] = strip(child);
  }
  return out;
}

/** A copy of `data` with every price field cleared. */
export function hidePrices<T>(data: T): T {
  return strip(data) as T;
}
