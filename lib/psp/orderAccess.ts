import { getVerifiedViewer, type VerifiedViewer } from '../auth/viewer.ts';
import { LAST_ORDER_COOKIE, toId, verifyLastOrderState } from '../graphql/orderEditorRouting.ts';

/**
 * Who may start or look up a PSP payment for an order, and what it charges
 * (#19). The browser only names the order and the method: the order is read
 * server-side with the order-editor key, the caller must own it (the signed
 * last-order cookie this browser got when it placed it, or a verified viewer
 * whose userId is the order's), and the amount, currency and return URL come
 * from the server.
 */

export interface PspOrder {
  orderId: number;
  userId: number | null;
  status: string;
  currency: string | null;
  /** `total.net`: the VAT-inclusive total (Propeller's naming is inverted). */
  totalNet: number;
}

export type CookieGetter = (name: string) => string | undefined;

export interface OrderAccessDeps {
  fetchOrder: (orderId: number) => Promise<PspOrder | null>;
  verifiedViewer: (token: string | undefined) => Promise<VerifiedViewer | null>;
}

export type Refusal = { status: 400 | 403 | 409; error: string };

export const PSP_ORDER_QUERY =
  'query pspOrder($orderId: Int) { order(orderId: $orderId) { orderId userId status currency total { net } } }';

/** The order from a PSP_ORDER_QUERY response, else null. */
export function toPspOrder(response: unknown): PspOrder | null {
  const order = (response as { data?: { order?: Record<string, unknown> | null } | null } | null)?.data?.order;
  const orderId = toId(order?.orderId);
  const totalNet = (order?.total as { net?: unknown } | null | undefined)?.net;
  if (!order || !orderId || typeof order.status !== 'string' || typeof totalNet !== 'number') return null;
  return {
    orderId,
    userId: toId(order.userId),
    status: order.status,
    currency: typeof order.currency === 'string' && order.currency ? order.currency : null,
    totalNet,
  };
}

/** The order read with the order-editor key (the storefront key may not read orders). */
export async function fetchPspOrder(orderId: number): Promise<PspOrder | null> {
  const key = process.env.BOILERPLATE_ORDER_EDITOR_API_KEY;
  if (!key) return null;
  const res = await fetch(process.env.BOILERPLATE_GRAPHQL_ENDPOINT || '', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify({ query: PSP_ORDER_QUERY, variables: { orderId } }),
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  return res.ok ? toPspOrder(await res.json()) : null;
}

/**
 * Whether a payment notification for `orderId` may run the provider's order processing: only
 * while the order is still UNFINISHED (placed, payment pending). The providers re-apply NEW/PAID,
 * the confirmation mail with PDF and the cart delete for every paid state, so running them again
 * for an order already processed re-mails the customer and resets its back-office status. Unknown
 * order or failed lookup: no.
 */
export async function awaitsPayment(
  orderId: unknown,
  fetchOrder: (orderId: number) => Promise<Pick<PspOrder, 'status'> | null>,
): Promise<boolean> {
  const id = toId(orderId);
  if (!id) return false;
  const order = await fetchOrder(id).catch(() => null);
  return order?.status === 'UNFINISHED';
}

const defaultDeps: OrderAccessDeps = { fetchOrder: fetchPspOrder, verifiedViewer: getVerifiedViewer };

/**
 * The order when the caller may act on it, else a refusal. A missing order and
 * someone else's order both answer 403, so the answer says nothing about which
 * order ids exist.
 */
export async function authorizedOrder(
  rawOrderId: unknown,
  cookie: CookieGetter,
  deps: OrderAccessDeps = defaultDeps,
): Promise<{ order: PspOrder; viewer: VerifiedViewer | null } | Refusal> {
  const orderId = toId(rawOrderId);
  if (!orderId) return { status: 400, error: 'invalid order id' };
  const forbidden: Refusal = { status: 403, error: 'forbidden' };

  if (verifyLastOrderState(cookie(LAST_ORDER_COOKIE))?.orderId === orderId) {
    const order = await deps.fetchOrder(orderId).catch(() => null);
    if (!order || order.orderId !== orderId) return forbidden;
    const viewer = await deps.verifiedViewer(cookie('access_token'));
    return { order, viewer };
  }
  // No viewer, no lookup: an anonymous caller learns nothing about the order.
  const viewer = await deps.verifiedViewer(cookie('access_token'));
  if (!viewer) return forbidden;
  const order = await deps.fetchOrder(orderId).catch(() => null);
  if (!order || order.orderId !== orderId || order.userId !== viewer.userId) return forbidden;
  return { order, viewer };
}

/** Half-up to whole cents, as the 2-decimal string the PSP charges ("13.39"). */
export function chargeAmount(totalNet: number): string {
  // toFixed(6) first absorbs binary drift (1.005 * 100 = 100.49999…), then round half-up.
  return (Math.round(Number((totalNet * 100).toFixed(6))) / 100).toFixed(2);
}

/**
 * Where the PSP sends the shopper back: always this site (`siteOrigin`, i.e.
 * NEXT_PUBLIC_SITE_URL), always this order's thank-you page. Only the language
 * prefix of the requested URL is kept.
 */
export function pspReturnUrl(siteOrigin: string, requested: unknown, orderId: number, provider: string): string {
  let path = `/checkout/thank-you/${orderId}`;
  try {
    const asked = new URL(String(requested), 'http://placeholder.invalid').pathname;
    if (new RegExp(`^/[a-z]{2}/checkout/thank-you/${orderId}$`).test(asked)) path = asked;
  } catch {
    // Keep the default path.
  }
  return `${siteOrigin.replace(/\/$/, '')}${path}?psp=${encodeURIComponent(provider)}`;
}

export interface PaymentRequest {
  orderId: number;
  amount: string;
  currency: string;
  method: string;
  description: string;
  redirectUrl: string;
  userId?: number;
}

/**
 * The createPayment arguments for an authorized order, else a refusal: only an
 * UNFINISHED order with a positive total is paid through a PSP. `method` is the
 * only value taken from the browser; amount and currency are the order's.
 */
export function paymentRequest(
  access: { order: PspOrder; viewer: VerifiedViewer | null },
  body: { method?: unknown; redirectUrl?: unknown },
  opts: { siteOrigin: string; provider: string; defaultCurrency: string },
): PaymentRequest | Refusal {
  const { order, viewer } = access;
  if (typeof body.method !== 'string' || !body.method) return { status: 400, error: 'missing method' };
  if (order.status !== 'UNFINISHED') return { status: 409, error: 'order is not awaiting payment' };
  if (!(order.totalNet > 0)) return { status: 409, error: 'nothing to pay' };
  return {
    orderId: order.orderId,
    amount: chargeAmount(order.totalNet),
    currency: order.currency || opts.defaultCurrency,
    method: body.method,
    description: `Order ${order.orderId}`,
    redirectUrl: pspReturnUrl(opts.siteOrigin, body.redirectUrl, order.orderId, opts.provider),
    ...(viewer && viewer.userId === order.userId ? { userId: order.userId } : {}),
  };
}
