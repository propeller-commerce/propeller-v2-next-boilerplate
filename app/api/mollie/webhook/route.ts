/**
 * POST /api/mollie/webhook — Mollie payment webhook.
 *
 * Mollie POSTs `id=<paymentId>` (application/x-www-form-urlencoded) whenever a
 * payment changes state. We hand the id to the provider, which re-fetches the
 * payment from Mollie (the body is never trusted beyond the id), classifies it,
 * and updates the Propeller payment + order.
 *
 * ALWAYS returns 200 — even on internal failure — so Mollie doesn't enter a
 * retry storm. The provider never throws and logs failures internally; Mollie
 * re-delivers on its own schedule, which recovers transient errors.
 *
 * This route must be publicly reachable (Mollie can't reach localhost — use a
 * tunnel like ngrok in dev). The URL is built by `mollieWebhookUrl()` from
 * `NEXT_PUBLIC_SITE_URL` and handed to Mollie at payment-create time.
 */

import { NextResponse } from 'next/server';
import { getMollieProvider, isMollieEnabled } from '@/lib/mollie';

export async function POST(req: Request) {
  // Even when disabled we 200 — a stray delivery shouldn't look like an outage.
  if (!isMollieEnabled()) {
    return new NextResponse(null, { status: 200 });
  }

  let id = '';
  try {
    // Mollie posts form-encoded `id=tr_xxx`.
    const text = await req.text();
    id = new URLSearchParams(text).get('id') ?? '';
  } catch {
    // Couldn't read the body — still 200 so Mollie retries cleanly.
    return new NextResponse(null, { status: 200 });
  }

  try {
    const provider = getMollieProvider();
    const result = await provider.handleWebhook(id);
    if (!result.ok) {
      console.warn('[mollie] webhook not processed:', result.error, 'payment:', id);
    }
  } catch (e) {
    // The provider already swallows; this guards the wiring itself.
    console.error('[mollie] webhook handler error:', e instanceof Error ? e.message : e);
  }

  // Unconditionally acknowledge.
  return new NextResponse(null, { status: 200 });
}
