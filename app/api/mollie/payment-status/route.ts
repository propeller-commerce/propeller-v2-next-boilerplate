/**
 * GET /api/mollie/payment-status?paymentId=tr_xxx
 *
 * Returns the LIVE Mollie payment status for a payment id. The thank-you page
 * calls this on a PSP return so its UI (and the local-cart decision) reflect the
 * real Mollie outcome — open / paid / failed / canceled / expired — instead of
 * racing the async webhook + order status.
 *
 * Read-only: does not touch Propeller. Returns:
 *   200 { ok: true, status, settled, paymentId, orderId? }
 *   400 { error: "missing paymentId" }
 *   503 { error: "mollie not configured" }
 *   200 { ok: false, error } — when the payment can't be fetched (the caller
 *        treats a non-ok body as "unknown" and can retry)
 */

import { NextResponse } from 'next/server';
import { getMollieProvider, isMollieEnabled } from '@/lib/mollie';

export async function GET(req: Request) {
  if (!isMollieEnabled()) {
    return NextResponse.json({ error: 'mollie not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const paymentId = (searchParams.get('paymentId') || '').trim();
  if (!paymentId) {
    return NextResponse.json({ error: 'missing paymentId' }, { status: 400 });
  }

  try {
    const provider = getMollieProvider();
    const result = await provider.getPaymentStatus(paymentId);
    // result is { ok, paymentId, status?, settled?, orderId?, error? }
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'status lookup failed';
    console.error('[mollie] payment-status failed:', message);
    return NextResponse.json({ ok: false, paymentId, error: 'status lookup failed' });
  }
}
