/**
 * POST /api/msp/create-payment — start a MultiSafepay payment for a placed order.
 *
 * Called by the checkout client right after `placeOrder` succeeds. Creates the
 * MultiSafepay order + the Propeller payment (status OPEN + AUTHORIZATION txn)
 * and returns the MultiSafepay hosted-checkout URL for the client to redirect to.
 *
 * Contract:
 *   POST /api/msp/create-payment
 *   Body: {
 *     orderId: number,
 *     method: string,            // Propeller method code (mapped to an MSP gateway)
 *     redirectUrl?: string,      // only its language prefix is used
 *   }
 *   Any amount / currency / userId in the body is ignored: the order is read
 *   server-side (order-editor key) and MultiSafepay charges its total.net in its
 *   currency. The caller must own the order (signed last-order cookie, or a
 *   verified session whose userId is the order's) and it must be UNFINISHED.
 *   The return URL is NEXT_PUBLIC_SITE_URL + this order's thank-you page.
 *
 *   200 { ok: true, checkoutUrl, paymentId, orderId }
 *   400 { error: "..." }
 *   403 { error: "forbidden" }       // not this caller's order, or cross-site
 *   409 { error: "..." }             // order not awaiting payment
 *   503 { error: "multisafepay not configured" }
 *   500 { error: "..." }
 *
 * Server-only; secrets never reach the client.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getMspProvider, isMspEnabled } from '@/lib/msp';
import { handleCreatePayment } from '@/lib/psp/handlers';

export async function POST(req: NextRequest) {
  if (!isMspEnabled()) {
    return NextResponse.json({ error: 'multisafepay not configured' }, { status: 503 });
  }
  return handleCreatePayment(req, 'multisafepay', (args) => getMspProvider().createPayment(args));
}
