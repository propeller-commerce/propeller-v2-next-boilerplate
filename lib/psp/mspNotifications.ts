import type { RateLimiter, RateLimitRule } from '../form-protection/rateLimit.ts';
import { awaitsPayment, type PspOrder } from './orderAccess.ts';

/**
 * MultiSafepay notification guards (#19). MSP signs POST notifications with the
 * API key of the active mode (`Auth` header). GET notifications carry no
 * signature (orders created by propeller-v2-msp <= 0.1.3 use them), so anyone can
 * send one for any order id: they are limited per IP and processed only while the
 * order still awaits payment, and a status already processed for that order is
 * not processed again (no repeat confirmation mails or cart deletes). The
 * signature covers the body, not the query string, so a POST is processed only
 * for the order its signed body names.
 */

/** The key MSP signs notifications with: the active mode's API key (not MSP_SECURITY_CODE). */
export function mspSigningKey(env: Record<string, string | undefined>): string {
  const testMode = (env.MSP_TEST_MODE || 'true').trim().toLowerCase() === 'true';
  return (testMode ? env.MSP_TEST_KEY : env.MSP_LIVE_KEY) || '';
}

/**
 * The last MSP status processed per transaction id.
 * ponytail: per instance and bounded; behind N instances a status may be processed once per instance.
 */
export function createProcessedLog(maxEntries = 1000) {
  const seen = new Map<string, string>();
  return {
    isDuplicate: (id: string, status: string | undefined): boolean => !!status && seen.get(id) === status,
    record(id: string, status: string | undefined): void {
      if (!id || !status) return;
      seen.delete(id);
      seen.set(id, status);
      while (seen.size > maxEntries) seen.delete(seen.keys().next().value as string);
    },
  };
}

/** Unsigned (GET) notifications per client IP: MSP's own servers send a few per order. */
export const UNSIGNED_PER_IP: RateLimitRule = { limit: 30, windowMs: 60_000 };

export interface MspNotification {
  method: string;
  /** `transactionid`: the Propeller order id. */
  id: string;
  ip: string;
  /** POST only: the `Auth` signature verified over the raw body. */
  signed: boolean;
  /** POST only: the raw body the signature covers. */
  body?: string;
}

/** The order id a signed POST body names (`order_id`), '' when there is none. */
export function signedOrderId(body: string | undefined): string {
  try {
    const orderId = (JSON.parse(body || '') as { order_id?: unknown } | null)?.order_id;
    return typeof orderId === 'string' || typeof orderId === 'number' ? String(orderId).trim() : '';
  } catch {
    return '';
  }
}

export interface MspNotificationDeps {
  limiter: RateLimiter;
  processed: ReturnType<typeof createProcessedLog>;
  fetchOrder: (orderId: number) => Promise<Pick<PspOrder, 'status'> | null>;
  provider: () => {
    getPaymentStatus(id: string): Promise<{ ok: boolean; status?: string }>;
    handleWebhook(id: string): Promise<{ ok: boolean; mspStatus?: string; error?: string }>;
  };
}

/**
 * One MultiSafepay notification, as the HTTP answer. A POST without a valid
 * signature is refused (401), and so is a signed one whose body names another
 * order than the query's id (403: a captured notification replayed against
 * another order within the signature window). A GET past UNSIGNED_PER_IP
 * answers 429 (MSP retries later); one for an order that no longer awaits
 * payment is acknowledged and dropped. Everything else answers 200 'OK', so MSP
 * doesn't retry-storm.
 */
export async function handleMspNotification(
  n: MspNotification,
  deps: MspNotificationDeps,
): Promise<{ status: number; body: string }> {
  const ok = { status: 200, body: 'OK' };
  if (n.method === 'POST') {
    if (!n.signed) {
      console.warn('[msp] webhook POST without a valid signature refused, order:', n.id);
      return { status: 401, body: 'Invalid signature' };
    }
    if (!n.id || signedOrderId(n.body) !== n.id) {
      console.warn('[msp] webhook POST for another order than its signed body refused, order:', n.id);
      return { status: 403, body: 'Order mismatch' };
    }
  } else {
    if (!deps.limiter.hit(`msp-webhook:${n.ip}`, UNSIGNED_PER_IP).ok) return { status: 429, body: 'Too many notifications' };
    if (!(await awaitsPayment(n.id, deps.fetchOrder))) return ok;
  }
  const provider = deps.provider();
  // Re-fetched from MultiSafepay either way; a status already processed is not run again.
  const live = n.id ? await provider.getPaymentStatus(n.id) : null;
  if (live?.ok && deps.processed.isDuplicate(n.id, live.status)) return ok;
  const result = await provider.handleWebhook(n.id);
  if (result.ok) deps.processed.record(n.id, result.mspStatus);
  else console.warn('[msp] webhook not processed:', result.error, 'order:', n.id);
  return ok;
}
