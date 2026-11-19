/**
 * GET /api/msp/payment-status?paymentId=<orderId>
 *
 * Returns the LIVE MultiSafepay status for an order id. The thank-you page calls
 * this on a PSP return so its UI (and the local-cart decision) reflect the real
 * MultiSafepay outcome — initialized / completed / declined / expired / … —
 * instead of racing the async notification + order status.
 *
 * MultiSafepay keys transactions by `order_id`, so the `paymentId` the client
 * stashed at create time IS the order id we look up here. (`orderId` is accepted
 * as an alias.)
 *
 * Only for the order's owner (signed last-order cookie, or the verified viewer
 * who placed it): any other caller gets 403, so order ids can't be probed for
 * their paid status.
 *
 * Read-only: does not touch Propeller. Returns:
 *   200 { ok: true, status, settled, paymentId, orderId? }
 *   400 { error: "missing paymentId" }
 *   403 { ok: false, error: "forbidden" }
 *   503 { error: "multisafepay not configured" }
 *   200 { ok: false, error } — when the order can't be fetched (the caller
 *        treats a non-ok body as "unknown" and can retry)
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getMspProvider, isMspEnabled } from '@/lib/msp';
import { orderAccessRefusal } from '@/lib/psp/handlers';
import { errorSummary } from '@/lib/http/errorSummary';

export async function GET(req: NextRequest) {
  if (!isMspEnabled()) {
    return NextResponse.json({ error: 'multisafepay not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const paymentId = (searchParams.get('paymentId') || searchParams.get('orderId') || '').trim();
  if (!paymentId) {
    return NextResponse.json({ error: 'missing paymentId' }, { status: 400 });
  }

  const refused = await orderAccessRefusal(req, paymentId);
  if (refused) return refused;

  try {
    const provider = getMspProvider();
    const result = await provider.getPaymentStatus(paymentId);
    // result is { ok, paymentId, status?, settled?, orderId?, error? }
    return NextResponse.json(result);
  } catch (e) {
    console.error('[msp] payment-status failed:', errorSummary(e));
    return NextResponse.json({ ok: false, paymentId, error: 'status lookup failed' });
  }
}
