/**
 * Serialize/deserialize the OrderList filter form to and from URL query params,
 * so a filtered order/quote view can be bookmarked, shared, and restored on
 * reload (and the back button works) — mirroring how the PLP persists its
 * filters. Kept app-side: the package component is router-agnostic and only
 * exposes `initialSearchForm` (seed) + `onSearchApply` (change) seams.
 *
 * URL shape (all optional): ?term=foo&dateFrom=2026-01-01&dateTo=2026-03-31&priceMin=500&priceMax=1000
 */

/** The subset of OrderList's search form these pages expose as filters. */
export interface OrderFilterForm {
  term?: string;
  createdAt?: { greaterThan?: string; lessThan?: string };
  price?: { greaterThan?: number; lessThan?: number };
}

/** Read the filter form from a URLSearchParams (or query string). */
export function orderFilterFromParams(
  params: URLSearchParams,
): OrderFilterForm {
  const form: OrderFilterForm = {};

  const term = params.get('term');
  if (term) form.term = term;

  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');
  if (dateFrom || dateTo) {
    form.createdAt = {
      ...(dateFrom && { greaterThan: `${dateFrom}T00:00:00Z` }),
      ...(dateTo && { lessThan: `${dateTo}T23:59:59Z` }),
    };
  }

  const priceMin = params.get('priceMin');
  const priceMax = params.get('priceMax');
  if (priceMin || priceMax) {
    const min = priceMin !== null ? Number.parseFloat(priceMin) : NaN;
    const max = priceMax !== null ? Number.parseFloat(priceMax) : NaN;
    form.price = {
      ...(Number.isFinite(min) && { greaterThan: min }),
      ...(Number.isFinite(max) && { lessThan: max }),
    };
  }

  return form;
}

/** Serialize the filter form back to a query string (no leading '?'). */
export function orderFilterToQueryString(form: OrderFilterForm): string {
  const params = new URLSearchParams();

  if (form.term) params.set('term', form.term);

  // Dates are stored as full ISO instants internally; expose the date part.
  const from = form.createdAt?.greaterThan;
  const to = form.createdAt?.lessThan;
  if (from) params.set('dateFrom', String(from).split('T')[0]);
  if (to) params.set('dateTo', String(to).split('T')[0]);

  const min = form.price?.greaterThan;
  const max = form.price?.lessThan;
  if (min !== undefined && Number.isFinite(min)) params.set('priceMin', String(min));
  if (max !== undefined && Number.isFinite(max)) params.set('priceMax', String(max));

  return params.toString();
}
