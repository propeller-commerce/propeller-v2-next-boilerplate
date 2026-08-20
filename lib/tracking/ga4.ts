import type { TrackedEvent, TrackingContext } from './types';

/**
 * GA4 / GTM subscriber (PWP-910).
 *
 * The bus emits our own vocabulary; this projects it onto Google's. Nothing
 * upstream knows GA4 exists — internal event names, the `storefront_events`
 * schema and `/tracker` are untouched, and a tenant who wants Segment or
 * Snowplow instead writes a different mapper against the same stream.
 *
 * `toGa4()` is pure and exported so the mapping is unit-testable without a
 * browser; only `ga4Subscriber()` touches `window`.
 *
 * ── The two transports are NOT interchangeable ──────────────────────────────
 *
 * With a GTM container we push `{event, ecommerce}` objects, which is the
 * convention a container understands. With gtag.js alone that push does
 * NOTHING — gtag needs `gtag('event', name, params)`. Sending the wrong one
 * fails silently, which is the worst possible failure for analytics, so the
 * branch is explicit and covered by tests.
 */

const GA4_KEY = process.env.NEXT_PUBLIC_GA4_KEY?.trim() || '';
const GTM_KEY = process.env.NEXT_PUBLIC_GTM_KEY?.trim() || '';

/** Build-time flag; `next.config.ts` derives it from the server-side `USE_GA4`. */
export const GA4_ENABLED =
  (process.env.NEXT_PUBLIC_USE_GA4 || '').toLowerCase() === 'true' && GA4_KEY !== '';

/** A container is configured — push `{event, ecommerce}` rather than calling gtag. */
export const GTM_MODE = GA4_ENABLED && GTM_KEY !== '';

export const GA4_MEASUREMENT_ID = GA4_KEY;
export const GTM_CONTAINER_ID = GTM_KEY;

/**
 * Our name → GA4 name.
 *
 * Anything absent here falls through to a sanitised custom event, EXCEPT the
 * names in `DROPPED`. Dots are illegal in GA4 event names — an event called
 * `propeller.quote_viewed` is rejected outright, not merely ignored — so the
 * `propeller.` prefix becomes `propeller_`.
 */
const NAME_MAP: Record<string, string> = {
  page_viewed: 'page_view',
  'propeller.favorite_added': 'add_to_wishlist',
};

/**
 * Events GA4 must never receive.
 *
 * `session_started` — GA4 derives sessions itself; ours would double-count.
 * `identify` — not an event at all in Google's model. It sets `user_id`, which
 * `ga4Subscriber` does via `gtag('set', …)` instead.
 */
const DROPPED = new Set(['session_started', 'identify']);

/** GA4 event names: letters, digits and underscores, starting with a letter. */
function sanitiseName(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 40);
}

/** Events carrying an `ecommerce` payload — these need the `ecommerce: null` clear in GTM. */
const ECOMMERCE_EVENTS = new Set([
  'view_item_list',
  'view_item',
  'select_item',
  'add_to_cart',
  'remove_from_cart',
  'view_cart',
  'begin_checkout',
  'add_shipping_info',
  'add_payment_info',
  'purchase',
  'add_to_wishlist',
]);

export interface Ga4Payload {
  name: string;
  params: Record<string, unknown>;
  /** Whether the params belong under `ecommerce` in a GTM push. */
  ecommerce: boolean;
}

/** Drop null/undefined so GA4 does not receive empty keys. */
function compact(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined || value === '') continue;
    out[key] = value;
  }
  return out;
}

/**
 * Map one internal event to its GA4 form, or `null` when GA4 must not see it.
 *
 * Pure: no `window`, no side effects. Everything below is a rename or a reshape
 * — the data itself is captured at the emit sites.
 */
export function toGa4(event: TrackedEvent): Ga4Payload | null {
  if (DROPPED.has(event.name)) return null;

  const name = NAME_MAP[event.name] ?? sanitiseName(event.name);
  const p = event.props;
  const currency = (p.currency as string) ?? event.context.currency ?? undefined;

  // Common ecommerce body: items + monetary context. Individual cases add to it.
  const commerce = (extra: Record<string, unknown> = {}) =>
    compact({ currency, value: p.value, items: p.items, ...extra });

  switch (name) {
    case 'page_view':
      return {
        name,
        // `page_location` is read from the browser at push time rather than from
        // the router: `useSearchParams()` would opt the route into dynamic
        // rendering and deopt the static Server Component shells.
        params: compact({
          page_title: p.entity_name ?? undefined,
          page_type: p.page_type,
        }),
        ecommerce: false,
      };

    case 'purchase':
      return {
        name,
        params: commerce({
          transaction_id: p.order_id != null ? String(p.order_id) : undefined,
          tax: p.tax,
          shipping: p.shipping,
          coupon: p.coupon,
        }),
        ecommerce: true,
      };

    case 'view_item_list':
    case 'select_item':
      return {
        name,
        params: commerce({
          item_list_id: p.item_list_id ?? p.entity_id,
          item_list_name: p.item_list_name ?? p.entity_name,
        }),
        ecommerce: true,
      };

    case 'begin_checkout':
      return { name, params: commerce({ coupon: p.coupon }), ecommerce: true };

    case 'add_shipping_info':
      return { name, params: commerce({ shipping_tier: p.shipping_tier }), ecommerce: true };

    case 'add_payment_info':
      return { name, params: commerce({ payment_type: p.payment_type }), ecommerce: true };

    case 'search':
      return { name, params: compact({ search_term: p.search_term }), ecommerce: false };

    case 'login':
    case 'sign_up':
      return { name, params: compact({ method: p.method }), ecommerce: false };

    default:
      if (ECOMMERCE_EVENTS.has(name)) return { name, params: commerce(), ecommerce: true };
      // Custom events keep their (sanitised) name and their scalar props. Nested
      // objects are dropped — GA4 takes flat parameters only, and a silently
      // stringified object is worse than an absent one.
      return {
        name,
        params: compact(
          Object.fromEntries(Object.entries(p).filter(([, v]) => v === null || typeof v !== 'object'))
        ),
        ecommerce: false,
      };
  }
}

/* ── Browser side ───────────────────────────────────────────────────────── */

type DataLayer = Record<string, unknown>[];

interface GtagWindow extends Window {
  dataLayer?: DataLayer;
  gtag?: (...args: unknown[]) => void;
}

/**
 * The snippet loads with `afterInteractive`, so an event fired during hydration
 * can arrive before it. Creating the array ourselves makes ordering irrelevant:
 * early pushes queue and Google's script drains them on load. (This is exactly
 * what the WordPress plugin's `var dataLayer = window.dataLayer || []` is for.)
 */
function dataLayer(w: GtagWindow): DataLayer {
  w.dataLayer = w.dataLayer || [];
  return w.dataLayer;
}

function gtag(w: GtagWindow): (...args: unknown[]) => void {
  if (!w.gtag) {
    const queue = dataLayer(w);
    // The standard shim: gtag pushes its raw `arguments` object, NOT an array.
    // eslint-disable-next-line prefer-rest-params
    w.gtag = function () { queue.push(arguments as unknown as Record<string, unknown>); };
  }
  return w.gtag;
}

/**
 * Identity currently applied to Google's side.
 *
 * Module scope rather than React state on purpose: this is written from inside
 * an event callback, and `set-state-in-effect` is an error under this repo's
 * React Compiler lint. It also has to survive re-renders, which a ref in a
 * null-rendering component would not do any better.
 */
let appliedIdentity = '';

function identityKey(c: TrackingContext): string {
  return `${c.userMode}:${c.contactId ?? c.customerId ?? ''}:${c.companyId ?? ''}:${c.language ?? ''}`;
}

/**
 * Push identity as user properties + `user_id` when it changes.
 *
 * `user_mode` and `company_id` are the dimensions that make GA4 usable for B2B,
 * and they must be registered as custom dimensions in the GA4 UI to appear in
 * reports — unregistered ones are collected and then invisible, which reads as
 * "tracking is broken".
 */
function applyIdentity(w: GtagWindow, context: TrackingContext): void {
  const key = identityKey(context);
  if (key === appliedIdentity) return;
  appliedIdentity = key;

  const userId = context.contactId ?? context.customerId ?? null;
  const properties = compact({
    user_mode: context.userMode,
    company_id: context.companyId,
    language: context.language,
  });

  if (GTM_MODE) {
    dataLayer(w).push(compact({ event: 'propeller_identity', user_id: userId, ...properties }));
    return;
  }
  const g = gtag(w);
  if (userId != null) g('set', { user_id: String(userId) });
  g('set', 'user_properties', properties);
}

/**
 * The subscriber. Reads identity off `event.context` rather than closing over
 * React state — a captured `useAuth()` value would go stale on login or a
 * company switch, silently and only for GA4.
 */
export function ga4Subscriber(): (event: TrackedEvent) => void {
  return (event) => {
    if (typeof window === 'undefined') return;
    const w = window as GtagWindow;

    const payload = toGa4(event);
    applyIdentity(w, event.context);
    if (!payload) return;

    if (GTM_MODE) {
      const layer = dataLayer(w);
      // GTM merges consecutive pushes, so without the clear the previous
      // event's `items` leak into this one.
      if (payload.ecommerce) layer.push({ ecommerce: null });
      layer.push(
        payload.ecommerce
          ? { event: payload.name, ecommerce: payload.params }
          : { event: payload.name, ...payload.params }
      );
      return;
    }

    const params = { ...payload.params };
    if (payload.name === 'page_view') params.page_location = window.location.href;
    gtag(w)('event', payload.name, params);
  };
}

/** Test seam — `toGa4` is pure, but `applyIdentity` deliberately is not. */
export function resetIdentityForTests(): void {
  appliedIdentity = '';
}
