/**
 * GET /api/mollie/payment-status?paymentId=tr_xxx
 *
 * Returns the LIVE Mollie payment status for a payment id. The thank-you page
 * calls this on a PSP return so its UI (and the local-cart decision) reflect the
 * real Mollie outcome — open / paid / failed / canceled / expired — instead of
 * racing the async webhook + order status.
 *
 * Only for the order's owner (signed last-order cookie, or the verified viewer
 * who placed it): the payment's order is checked before the status is returned.
 *
 * Read-only: does not touch Propeller. Returns:
 *   200 { ok: true, status, settled, paymentId, orderId? }
 *   400 { error: "missing paymentId" }
 *   503 { error: "mollie not configured" }
 *   200 { ok: false, error: "status lookup failed" } — unknown payment, someone
 *        else's, or a failed fetch (the caller treats it as "unknown" and can retry)
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getMollieProvider, isMollieEnabled } from '@/lib/mollie';
import { orderAccessRefusal } from '@/lib/psp/handlers';
import { errorSummary } from '@/lib/http/errorSummary';

export async function GET(req: NextRequest) {
  if (!isMollieEnabled()) {
    return NextResponse.json({ error: 'mollie not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const paymentId = (searchParams.get('paymentId') || '').trim();
  if (!/^tr_[A-Za-z0-9]{1,64}$/.test(paymentId)) {
    return NextResponse.json({ error: 'missing paymentId' }, { status: 400 });
  }

  try {
    const provider = getMollieProvider();
    const result = await provider.getPaymentStatus(paymentId);
    // result is { ok, paymentId, status?, settled?, orderId?, error? }; Mollie's error text stays in the log.
    if (!result.ok) console.warn('[mollie] payment-status not ok:', result.error);
    // Someone else's payment answers like an unknown one.
    if (!result.ok || (await orderAccessRefusal(req, result.orderId))) {
      return NextResponse.json({ ok: false, paymentId, error: 'status lookup failed' });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error('[mollie] payment-status failed:', errorSummary(e));
    return NextResponse.json({ ok: false, paymentId, error: 'status lookup failed' });
  }
}
