/**
 * The event taxonomy (PWP-910).
 *
 * Names are fixed string literals — never computed — so that variable data
 * always lands in properties and the set stays enumerable. The list stays this
 * size as the storefront grows, because new page and list types are *values* of
 * `page_type` / `source.type`, not new events.
 *
 * B2C names follow GA4 verbatim so a tenant's existing GTM container works with
 * no mapping; everything GA4 has no concept of is prefixed `propeller.`.
 */

/** Navigation. One generic event, not one per page type — "most visited X" is a GROUP BY. */
export const NAVIGATION_EVENTS = ['page_viewed'] as const;

/** Identity, anonymous visitors, registration and login. */
export const IDENTITY_EVENTS = [
  'session_started',
  'identify',
  'login',
  'logout',
  'registration_submitted',
  'sign_up',
] as const;

/** GA4 canon — these exact names populate GA4's built-in funnels. */
export const COMMERCE_EVENTS = [
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
] as const;

/** Search quality — the ticket's headline signal. */
export const SEARCH_EVENTS = [
  'search',
  'search_no_results',
  'search_result_clicked',
] as const;

/** B2B layer, one per feature the storefront already ships. */
export const B2B_EVENTS = [
  'propeller.quote_requested',
  'propeller.quote_viewed',
  'propeller.quote_accepted',
  'propeller.quote_rejected',
  'propeller.reorder_started',
  'propeller.quick_order_submitted',
  'propeller.quick_order_file_uploaded',
  'propeller.quick_order_template_downloaded',
  'propeller.purchase_authorization_requested',
  'propeller.purchase_authorization_config_changed',
  'propeller.authorization_request_approved',
  'propeller.authorization_request_rejected',
  'propeller.company_switched',
  'propeller.punchout_session_started',
  'propeller.machine_viewed',
  'propeller.spare_part_viewed',
] as const;

/** My-account layer. Every one maps to an existing composable method. */
export const ACCOUNT_EVENTS = [
  'propeller.order_viewed',
  'propeller.order_pdf_downloaded',
  'propeller.favorite_added',
  'propeller.favorite_removed',
  'propeller.favorite_list_created',
  'propeller.favorite_list_updated',
  'propeller.favorite_list_deleted',
  'propeller.address_created',
  'propeller.address_updated',
  'propeller.address_deleted',
  'propeller.address_set_default',
] as const;

export const EVENT_NAMES = [
  ...NAVIGATION_EVENTS,
  ...IDENTITY_EVENTS,
  ...COMMERCE_EVENTS,
  ...SEARCH_EVENTS,
  ...B2B_EVENTS,
  ...ACCOUNT_EVENTS,
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

/** Allowlist for the ingest route — an unknown name is rejected, not stored. */
export const EVENT_NAME_SET: ReadonlySet<string> = new Set(EVENT_NAMES);

export function isKnownEvent(name: string): name is EventName {
  return EVENT_NAME_SET.has(name);
}

/**
 * Page types for `page_viewed`. New route types are added here rather than as
 * new events.
 */
export const PAGE_TYPES = [
  'home',
  'category',
  'product',
  'cluster',
  'search',
  'cart',
  'checkout',
  'thank_you',
  'account',
  'quote',
  'cms',
  'blog',
  'machines',
  'login',
  'register',
  'quick_order',
  'favorites',
] as const;

export type PageType = (typeof PAGE_TYPES)[number];
