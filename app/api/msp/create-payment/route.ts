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
 *     amount: number | string,   // major units, e.g. 49.95
 *     currency: string,          // ISO 4217, e.g. "EUR"
 *     method: string,            // Propeller method code (mapped to an MSP gateway)
 *     description: string,
 *     redirectUrl: string,       // where MultiSafepay returns the shopper
 *     userId?: number,
 *     anonymousId?: number
 *   }
 *
 *   200 { ok: true, checkoutUrl, paymentId, orderId }
 *   400 { error: "..." }
 *   503 { error: "multisafepay not configured" }
 *   500 { error: "..." }
 *
 * Server-only; secrets never reach the client.
 */

import { NextResponse } from 'next/server';
import { getMspProvider, isMspEnabled } from '@/lib/msp';
import { isOnAccountMethod } from '@/lib/payments';

interface CreatePaymentBody {
  orderId: number;
  amount: number | string;
  currency: string;
  method: string;
  description: string;
  redirectUrl: string;
  userId?: number;
  anonymousId?: number;
}

function isValid(body: unknown): body is CreatePaymentBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.orderId === 'number' &&
    (typeof b.amount === 'number' || typeof b.amount === 'string') &&
    typeof b.currency === 'string' &&
    typeof b.method === 'string' &&
    typeof b.description === 'string' &&
    typeof b.redirectUrl === 'string'
  );
}

export async function POST(req: Request) {
  if (!isMspEnabled()) {
    return NextResponse.json({ error: 'multisafepay not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  if (!isValid(body)) {
    return NextResponse.json({ error: 'missing or invalid fields' }, { status: 400 });
  }

  // Defense in depth: on-account methods must never reach the PSP. The client
  // already skips MSP for these, but guard server-side too in case the route is
  // called directly.
  if (isOnAccountMethod(body.method)) {
    return NextResponse.json(
      { error: 'on-account method does not use a PSP' },
      { status: 400 }
    );
  }

  try {
    const provider = getMspProvider();
    const result = await provider.createPayment({
      orderId: body.orderId,
      amount: body.amount,
      currency: body.currency,
      method: body.method,
      description: body.description,
      redirectUrl: body.redirectUrl,
      ...(body.userId !== undefined ? { userId: body.userId } : {}),
      ...(body.anonymousId !== undefined ? { anonymousId: body.anonymousId } : {}),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'payment creation failed';
    // Don't leak internals to the client; log server-side.
    console.error('[msp] create-payment failed:', message);
    return NextResponse.json({ error: 'payment creation failed' }, { status: 500 });
  }
}
