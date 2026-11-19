/**
 * POST/GET /api/msp/webhook — MultiSafepay notification.
 *
 * MultiSafepay calls this URL with `?transactionid=<orderId>` whenever an order
 * changes state (default method is POST; GET is also supported). We hand the id
 * to the provider, which re-fetches the order from MultiSafepay (the body is
 * never trusted — only the id matters), classifies it, and updates the Propeller
 * payment + order.
 *
 * ALWAYS returns 200 — even on internal failure — so MultiSafepay doesn't enter
 * a retry storm. The provider never throws and logs failures internally;
 * MultiSafepay re-delivers on its own schedule, which recovers transient errors.
 *
 * POST notifications are signed (`Auth` header, HMAC of the raw body with the
 * active mode's API key) and refused (401) without a valid, fresh signature, or
 * (403) when the signed body's `order_id` isn't the query's `transactionid`.
 * GET notifications carry no signature (orders created by this package version
 * ask for GET), so anyone can send one for any order id: they are limited per IP
 * (429 beyond that; MSP retries), and processed only while the order is still
 * UNFINISHED. A paid or otherwise processed order is acknowledged and left alone,
 * so a replayed or forged ping can't resend confirmation mails, clear the cart
 * or reset the back-office status. See lib/psp/mspNotifications.ts.
 *
 * This route must be publicly reachable (MultiSafepay can't reach localhost —
 * use a tunnel like cloudflared in dev). The URL is built by `mspWebhookUrl()`
 * from `NEXT_PUBLIC_SITE_URL` (or `MSP_WEBHOOK_URL`) and handed to MultiSafepay
 * at order-create time as `notification_url`.
 */

import { NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@propeller-commerce/propeller-v2-msp';
import { getMspProvider, isMspEnabled } from '@/lib/msp';
import { clientIp } from '@/lib/http/clientIp';
import { errorSummary } from '@/lib/http/errorSummary';
import { createRateLimiter } from '@/lib/form-protection/rateLimit';
import { fetchPspOrder } from '@/lib/psp/orderAccess';
import {
  createProcessedLog,
  handleMspNotification,
  mspSigningKey,
} from '@/lib/psp/mspNotifications';

// Last MultiSafepay status processed per order, and unsigned notifications per IP (per instance, bounded).
const processed = createProcessedLog();
const limiter = createRateLimiter();

async function handle(req: Request) {
  // Even when disabled we 200 — a stray delivery shouldn't look like an outage.
  if (!isMspEnabled()) {
    return new NextResponse('OK', { status: 200 });
  }

  // MultiSafepay puts the id in the query string (`?transactionid=<orderId>`).
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get('transactionid') || searchParams.get('orderId') || '').trim();

  try {
    // The signature covers the exact raw body: read it as text, never re-serialise.
    const raw = req.method === 'POST' ? await req.text() : '';
    const signed =
      req.method === 'POST' &&
      verifyWebhookSignature(raw, req.headers.get('auth') || '', mspSigningKey(process.env));
    const { status, body } = await handleMspNotification(
      { method: req.method, id, ip: clientIp(req.headers), signed, body: raw },
      { limiter, processed, fetchOrder: fetchPspOrder, provider: getMspProvider }
    );
    return new NextResponse(body, { status });
  } catch (e) {
    // The provider already swallows; this guards the wiring itself.
    console.error('[msp] webhook handler error:', errorSummary(e));
    return new NextResponse('OK', { status: 200 });
  }
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
