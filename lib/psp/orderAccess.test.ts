import test from 'node:test';
import assert from 'node:assert/strict';
import { LAST_ORDER_COOKIE, signLastOrder } from '../graphql/orderEditorRouting.ts';
import type { VerifiedViewer } from '../auth/viewer.ts';
import {
  authorizedOrder,
  awaitsPayment,
  chargeAmount,
  paymentRequest,
  pspReturnUrl,
  toPspOrder,
  type OrderAccessDeps,
  type PspOrder,
} from './orderAccess.ts';

// Read lazily by signedCookie on first use.
process.env.COOKIE_SIGNING_SECRET = 'psp-test-secret';

const order = (over: Partial<PspOrder> = {}): PspOrder => ({
  orderId: 4711,
  userId: 42,
  status: 'UNFINISHED',
  currency: 'EUR',
  totalNet: 13.3947,
  ...over,
});
const contact = (userId: number): VerifiedViewer => ({
  type: 'Contact',
  userId,
  companyId: 1,
  companyIds: [1],
  managerCompanyIds: [],
});

function deps(o: PspOrder | null, viewer: VerifiedViewer | null) {
  const calls = { fetchOrder: 0 };
  const d: OrderAccessDeps = {
    fetchOrder: async () => {
      calls.fetchOrder++;
      return o;
    },
    verifiedViewer: async (token) => (token ? viewer : null),
  };
  return { d, calls };
}
const cookies = (jar: Record<string, string | null>) => (name: string) => jar[name] ?? undefined;

test('the browser that placed the order may pay for it (signed last-order cookie)', async () => {
  const { d } = deps(order({ userId: 9 }), null);
  const res = await authorizedOrder(4711, cookies({ [LAST_ORDER_COOKIE]: signLastOrder(4711) }), d);
  assert.ok('order' in res);
  assert.equal(res.order.orderId, 4711);
});

test('a verified viewer may pay for their own order, nobody else', async () => {
  const own = deps(order(), contact(42));
  assert.ok('order' in (await authorizedOrder('4711', cookies({ access_token: 't' }), own.d)));

  const foreign = deps(order(), contact(7));
  assert.deepEqual(await authorizedOrder(4711, cookies({ access_token: 't' }), foreign.d), { status: 403, error: 'forbidden' });

  // Another order's cookie does not help.
  const other = deps(order(), null);
  assert.equal((await authorizedOrder(4711, cookies({ [LAST_ORDER_COOKIE]: signLastOrder(4712) }), other.d)).status, 403);
});

test('an anonymous caller is refused before the order is even read', async () => {
  const { d, calls } = deps(order(), null);
  assert.equal((await authorizedOrder(4711, cookies({}), d)).status, 403);
  assert.equal((await authorizedOrder(4711, cookies({ access_token: 'forged' }), d)).status, 403);
  assert.equal(calls.fetchOrder, 0);
  assert.equal((await authorizedOrder('47x', cookies({}), d)).status, 400);
  assert.equal((await authorizedOrder(-1, cookies({}), d)).status, 400);
});

test('a missing order answers like a foreign one', async () => {
  const { d } = deps(null, contact(42));
  assert.deepEqual(await authorizedOrder(4711, cookies({ access_token: 't' }), d), { status: 403, error: 'forbidden' });
});

test('amount and currency are the order total, whatever the browser posted', () => {
  const opts = { siteOrigin: 'https://shop.test', provider: 'mollie', defaultCurrency: 'EUR' };
  const req = paymentRequest(
    { order: order({ currency: 'CHF' }), viewer: contact(42) },
    { method: 'ideal', redirectUrl: 'https://evil.test/x', amount: 0.01, currency: 'XXX' } as never,
    opts,
  );
  assert.deepEqual(req, {
    orderId: 4711,
    amount: '13.39',
    currency: 'CHF',
    method: 'ideal',
    description: 'Order 4711',
    redirectUrl: 'https://shop.test/checkout/thank-you/4711?psp=mollie',
    userId: 42,
  });
  // A guest (cookie path) pays without a userId.
  const guest = paymentRequest({ order: order({ currency: null }), viewer: null }, { method: 'ideal' }, opts);
  assert.ok(!('status' in guest));
  assert.equal(guest.currency, 'EUR');
  assert.equal('userId' in guest, false);
});

test('only an UNFINISHED order with something to pay goes to the PSP', () => {
  const opts = { siteOrigin: 'https://shop.test', provider: 'multisafepay', defaultCurrency: 'EUR' };
  for (const status of ['NEW', 'REQUEST', 'QUOTATION', 'CANCELLED']) {
    assert.equal((paymentRequest({ order: order({ status }), viewer: null }, { method: 'ideal' }, opts) as { status: number }).status, 409);
  }
  assert.equal((paymentRequest({ order: order({ totalNet: 0 }), viewer: null }, { method: 'ideal' }, opts) as { status: number }).status, 409);
  assert.equal((paymentRequest({ order: order(), viewer: null }, {}, opts) as { status: number }).status, 400);
});

test('chargeAmount rounds half-up to cents', () => {
  assert.equal(chargeAmount(13.3947), '13.39');
  assert.equal(chargeAmount(1.005), '1.01');
  assert.equal(chargeAmount(49.95), '49.95');
  assert.equal(chargeAmount(10), '10.00');
  assert.equal(chargeAmount(0.125), '0.13');
});

test('the return URL is always this site and this order; only a language prefix is kept', () => {
  assert.equal(pspReturnUrl('https://shop.test/', '/en/checkout/thank-you/5?psp=x', 5, 'mollie'), 'https://shop.test/en/checkout/thank-you/5?psp=mollie');
  assert.equal(pspReturnUrl('https://shop.test', 'https://evil.test/en/checkout/thank-you/5', 5, 'mollie'), 'https://shop.test/en/checkout/thank-you/5?psp=mollie');
  for (const bad of ['https://evil.test/', '//evil.test', '/en/checkout/thank-you/6', '/account', undefined, 42]) {
    assert.equal(pspReturnUrl('https://shop.test', bad, 5, 'multisafepay'), 'https://shop.test/checkout/thank-you/5?psp=multisafepay');
  }
});

test('toPspOrder reads the order-editor answer', () => {
  assert.deepEqual(
    toPspOrder({ data: { order: { orderId: 4711, userId: 42, status: 'UNFINISHED', currency: 'EUR', total: { net: 13.3947 } } } }),
    order(),
  );
  assert.equal(toPspOrder({ data: { order: null } }), null);
  assert.equal(toPspOrder({ errors: [{ message: 'Forbidden resource' }] }), null);
  assert.equal(toPspOrder({ data: { order: { orderId: 1, status: 'NEW', total: {} } } }), null);
});

test('awaitsPayment: only an UNFINISHED order, and a failed lookup is a no', async () => {
  assert.equal(await awaitsPayment('4711', async () => ({ status: 'UNFINISHED' })), true);
  assert.equal(await awaitsPayment(4711, async () => ({ status: 'NEW' })), false);
  assert.equal(await awaitsPayment(4711, async () => Promise.reject(new Error('down'))), false);
  let looked = false;
  assert.equal(await awaitsPayment('47 11', async () => ((looked = true), { status: 'UNFINISHED' })), false);
  assert.equal(looked, false);
});
