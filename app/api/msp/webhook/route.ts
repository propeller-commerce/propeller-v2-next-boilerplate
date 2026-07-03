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
 * This route must be publicly reachable (MultiSafepay can't reach localhost —
 * use a tunnel like cloudflared in dev). The URL is built by `mspWebhookUrl()`
 * from `NEXT_PUBLIC_SITE_URL` (or `MSP_WEBHOOK_URL`) and handed to MultiSafepay
 * at order-create time as `notification_url`.
 */

import { NextResponse } from 'next/server';
import { getMspProvider, isMspEnabled } from '@/lib/msp';

async function handle(req: Request) {
  // Even when disabled we 200 — a stray delivery shouldn't look like an outage.
  if (!isMspEnabled()) {
    return new NextResponse('OK', { status: 200 });
  }

  // MultiSafepay puts the id in the query string (`?transactionid=<orderId>`).
  const { searchParams } = new URL(req.url);
  const id = (searchParams.get('transactionid') || searchParams.get('orderId') || '').trim();

  try {
    const provider = getMspProvider();
    const result = await provider.handleWebhook(id);
    if (!result.ok) {
      console.warn('[msp] webhook not processed:', result.error, 'order:', id);
    }
  } catch (e) {
    // The provider already swallows; this guards the wiring itself.
    console.error('[msp] webhook handler error:', e instanceof Error ? e.message : e);
  }

  // Unconditionally acknowledge.
  return new NextResponse('OK', { status: 200 });
}

export async function POST(req: Request) {
  return handle(req);
}

export async function GET(req: Request) {
  return handle(req);
}
