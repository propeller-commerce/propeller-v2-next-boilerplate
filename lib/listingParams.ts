/**
 * Listing-page URL-param parsing — shared by the category and search pages.
 *
 * Runtime-agnostic (no `server-only`, no `next/headers`): the Server
 * Component parses Next's `searchParams` with `parseListingParams` so it can
 * server-render the *filtered* first page, and the client island parses the
 * same shape from the live URL — both via this one module, so the server and
 * client always agree on what the URL means.
 *
 * URL encoding contract (matches the rest of the app — see project memory):
 *   - Attribute filters: `?BRAND=["acme","globex"]` — the value is a
 *     `JSON.stringify`'d string array. URLSearchParams encodes/decodes once.
 *   - Reserved keys: `page`, `minPrice`, `maxPrice`, `offset`, `sortField`,
 *     `sortOrder`. Every other key is treated as an attribute filter.
 */

import {
  AttributeType,
  ProductSortField,
  SortOrder,
  type ProductTextFilterInput,
} from '@propeller-commerce/propeller-sdk-v2';

/** Reserved query keys — handled explicitly, never treated as a filter. */
const RESERVED_KEYS = [
  'page',
  'minPrice',
  'maxPrice',
  'offset',
  'sortField',
  'sortOrder',
] as const;

/**
 * Marketing / tracking query params that ad, email and social platforms append
 * to landing URLs. They are NOT facet filters and must be ignored, or the
 * listing filters on a non-existent attribute and returns zero products (every
 * paid/email/social click would land on an empty page). Matched by exact key or
 * by the `utm_` prefix. This is a defensive belt on top of the structural check
 * below (a real facet value is always a JSON array); either alone fixes the bug.
 */
const TRACKING_KEYS = new Set([
  'gclid',    // Google Ads auto-tagging
  'fbclid',   // Facebook / Meta
  'msclkid',  // Microsoft Ads
  'mc_cid',   // Mailchimp campaign id
  'mc_eid',   // Mailchimp recipient id
]);

function isTrackingKey(key: string): boolean {
  return TRACKING_KEYS.has(key) || key.toLowerCase().startsWith('utm_');
}

/** The parsed, typed listing state derived from a URL query string. */
export interface ListingParams {
  /** 1-based page number. */
  page: number;
  /** Items per page. */
  offset: number;
  /** Active sort field. */
  sortField: ProductSortField;
  /** Active sort direction. */
  sortOrder: SortOrder;
  /** Price-range lower bound, or `undefined` when not filtered. */
  minPrice: number | undefined;
  /** Price-range upper bound, or `undefined` when not filtered. */
  maxPrice: number | undefined;
  /** Attribute filters: `{ [attributeName]: selectedValues }`. */
  filters: Record<string, string[]>;
}

/**
 * Accepts anything URL-query-shaped: a `URLSearchParams`, the plain object
 * Next.js hands a Server Component as `searchParams`, or `undefined`.
 */
export type RawSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | undefined;

/** Normalise the various `searchParams` shapes into a flat string map. */
function toEntries(raw: RawSearchParams): Array<[string, string]> {
  if (!raw) return [];
  if (raw instanceof URLSearchParams) return Array.from(raw.entries());
  const out: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue;
    // A repeated query key arrives as string[]; take the first occurrence,
    // matching URLSearchParams.get() semantics.
    out.push([key, Array.isArray(value) ? (value[0] ?? '') : value]);
  }
  return out;
}

/**
 * Parse a URL query into typed listing state.
 *
 * @param raw - `URLSearchParams`, Next's `searchParams` object, or undefined.
 * @param defaultSortField - Sort field when the URL has none (categories use
 *   `CATEGORY_ORDER`, search uses `RELEVANCE`).
 */
export function parseListingParams(
  raw: RawSearchParams,
  defaultSortField: ProductSortField
): ListingParams {
  const entries = toEntries(raw);
  const get = (key: string): string | undefined =>
    entries.find(([k]) => k === key)?.[1];

  const filters: Record<string, string[]> = {};
  for (const [key, value] of entries) {
    if ((RESERVED_KEYS as readonly string[]).includes(key)) continue;
    // Ignore marketing/tracking params (gclid, utm_*, fbclid, …). Without this
    // an ad/email/social click filtered on a bogus attribute → zero products.
    if (isTrackingKey(key)) continue;
    // A real facet param's value is ALWAYS a JSON-stringified string array —
    // that is how the app encodes filters (see CategoryIsland/SearchIsland:
    // `searchParams.set(key, JSON.stringify(values))`). Anything that doesn't
    // parse to an array wasn't produced by this app (a stray/unknown param), so
    // drop it rather than manufacture a filter that matches nothing. This is the
    // core fix: the old `catch { filters[key] = [value] }` turned every unknown
    // scalar param into an empty-listing filter.
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;
    const values = parsed.map(String).filter((v) => v.length > 0);
    if (values.length > 0) filters[key] = values;
  }

  const minPriceRaw = get('minPrice');
  const maxPriceRaw = get('maxPrice');

  return {
    page: Math.max(1, parseInt(get('page') || '1', 10) || 1),
    offset: parseInt(get('offset') || '12', 10) || 12,
    sortField: (get('sortField') as ProductSortField) || defaultSortField,
    sortOrder: (get('sortOrder') as SortOrder) || SortOrder.DESC,
    minPrice: minPriceRaw ? parseFloat(minPriceRaw) : undefined,
    maxPrice: maxPriceRaw ? parseFloat(maxPriceRaw) : undefined,
    filters,
  };
}

/**
 * Encode listing state back into a URL query string — the inverse of
 * `parseListingParams`, omitting anything at its default so URLs stay clean
 * (`page` only when > 1, `sortField`/`sortOrder`/`offset` only when non-default).
 * Accepts the widened `sortField`/`sortOrder` string unions so both
 * `ListingParams` (category) and `MachineListingState` (machines) can be encoded.
 *
 * `term` is optional — machine parts have an in-node search; category/search
 * carry it in their own routes.
 */
export function buildListingSearchParams(
  listing: {
    page: number;
    offset: number;
    sortField: ProductSortField | string;
    sortOrder: SortOrder | string;
    filters: Record<string, string[]>;
    minPrice?: number;
    maxPrice?: number;
    term?: string;
  },
  opts: {
    defaultSortField: ProductSortField | string;
    defaultSortOrder?: SortOrder | string;
    defaultOffset?: number;
  }
): string {
  const { defaultSortField, defaultSortOrder = SortOrder.DESC, defaultOffset = 12 } = opts;
  const sp = new URLSearchParams();

  if (listing.page > 1) sp.set('page', String(listing.page));
  for (const [key, values] of Object.entries(listing.filters)) {
    if (values.length > 0) sp.set(key, JSON.stringify(values));
  }
  if (listing.minPrice !== undefined) sp.set('minPrice', String(listing.minPrice));
  if (listing.maxPrice !== undefined) sp.set('maxPrice', String(listing.maxPrice));
  if (listing.offset !== defaultOffset) sp.set('offset', String(listing.offset));
  if (listing.sortField !== defaultSortField) sp.set('sortField', String(listing.sortField));
  if (listing.sortOrder !== defaultSortOrder) sp.set('sortOrder', String(listing.sortOrder));
  if (listing.term) sp.set('term', listing.term);

  return sp.toString();
}

/**
 * Convert the parsed `filters` map into the SDK's `ProductTextFilterInput[]`
 * — the shape `fetchCategory` / `fetchSearch` need for the server-side
 * filtered fetch. Empty selections are dropped.
 *
 * `type` defaults to `AttributeType.TEXT`: server-side we don't yet have the
 * facet list to look up each attribute's real type, and checkbox filters
 * (the only kind encoded this way) are TEXT. Range attributes go through the
 * separate price/`minPrice`/`maxPrice` path.
 */
export function buildTextFilters(
  filters: Record<string, string[]>
): ProductTextFilterInput[] {
  return Object.entries(filters)
    .filter(([, values]) => values.length > 0)
    .map(([name, values]) => ({
      name,
      values,
      exclude: false,
      type: AttributeType.TEXT,
    }));
}
