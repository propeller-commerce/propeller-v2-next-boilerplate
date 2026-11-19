import 'server-only';

import { NextResponse, type NextRequest } from 'next/server';
import { isOnAccountMethod } from '@/lib/payments';
import { isSameOriginJson } from '@/lib/http/sameOrigin';
import { errorSummary } from '@/lib/http/errorSummary';
import { authorizedOrder, paymentRequest, type PaymentRequest } from './orderAccess';

/**
 * Shared bodies of the Mollie and MultiSafepay create-payment / payment-status
 * routes (#19): same-origin JSON, an order the caller owns, read server-side,
 * and the amount, currency and return URL taken from the server.
 */

type Provider = 'mollie' | 'multisafepay';

const cookieGetter = (req: NextRequest) => (name: string) => req.cookies.get(name)?.value;

/** The public site origin the PSP returns the shopper to. */
function siteOrigin(req: NextRequest): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/$/, '');
}

export async function handleCreatePayment(
  req: NextRequest,
  provider: Provider,
  create: (args: PaymentRequest) => Promise<object>,
): Promise<NextResponse> {
  if (!isSameOriginJson(req, process.env.NEXT_PUBLIC_SITE_URL)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    body = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }

  // Defense in depth: on-account methods must never reach the PSP. The client
  // already skips the PSP for these.
  if (typeof body.method === 'string' && isOnAccountMethod(body.method)) {
    return NextResponse.json({ error: 'on-account method does not use a PSP' }, { status: 400 });
  }

  const access = await authorizedOrder(body.orderId, cookieGetter(req));
  if ('status' in access) return NextResponse.json({ error: access.error }, { status: access.status });

  const args = paymentRequest(access, body, {
    siteOrigin: siteOrigin(req),
    provider,
    defaultCurrency: process.env.NEXT_PUBLIC_CURRENCY_CODE || 'EUR',
  });
  if ('status' in args) return NextResponse.json({ error: args.error }, { status: args.status });

  try {
    const result = await create(args);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    // Don't leak internals to the client; log server-side.
    console.error(`[${provider}] create-payment failed:`, errorSummary(e));
    return NextResponse.json({ error: 'payment creation failed' }, { status: 500 });
  }
}

/** 403 unless the caller owns `orderId`; null when they do. */
export async function orderAccessRefusal(req: NextRequest, orderId: unknown): Promise<NextResponse | null> {
  const access = await authorizedOrder(orderId, cookieGetter(req));
  return 'status' in access
    ? NextResponse.json({ ok: false, error: access.error }, { status: access.status === 400 ? 400 : 403 })
    : null;
}
