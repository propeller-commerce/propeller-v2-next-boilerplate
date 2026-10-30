import test from 'node:test';
import assert from 'node:assert/strict';
import { handlePriceRequest, type PriceRequestDeps } from './handler.ts';
import type { MailMessage } from '../mail/core.ts';
import { createRateLimiter } from '../form-protection/rateLimit.ts';
import type { FormProtection } from '../form-protection/index.ts';

function post(body: unknown, ip = '203.0.113.7'): Request {
  return new Request('http://shop.test/api/price-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function deps(extra: Partial<FormProtection> = {}) {
  const sent: MailMessage[] = [];
  const d: PriceRequestDeps = {
    send: async (m) => { sent.push(m); },
    recipients: 'shop@example.com',
    shopLanguage: 'EN',
    translate: () => ({}),
    protection: { limiter: createRateLimiter(), recaptcha: null, ...extra },
  };
  return { sent, deps: d };
}

const valid = { items: [{ code: 'SKU-1', name: 'Widget', quantity: 2 }], email: 'ada@example.com', comment: 'Hi' };

test('a valid request mails the shop and the shopper', async () => {
  const { sent, deps: d } = deps();
  const res = await handlePriceRequest(post(valid), d);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(sent.length, 2);
  assert.deepEqual(sent[0].to, ['shop@example.com']);
  assert.deepEqual(sent[1].to, ['ada@example.com']);
});

test('invalid input answers 400 and sends nothing', async () => {
  for (const body of ['nope', { ...valid, items: [] }, { ...valid, email: 'x' }]) {
    const { sent, deps: d } = deps();
    assert.equal((await handlePriceRequest(post(body), d)).status, 400);
    assert.equal(sent.length, 0);
  }
});

test('the eleventh request from one IP in ten minutes answers 429', async () => {
  const { sent, deps: d } = deps();
  for (let i = 0; i < 10; i++) await handlePriceRequest(post('nope'), d);
  const res = await handlePriceRequest(post(valid), d);
  assert.equal(res.status, 429);
  assert.ok(Number(res.headers.get('Retry-After')) > 0);
  assert.deepEqual(await res.json(), { error: 'rate_limited' });
  assert.equal(sent.length, 0);
});

test('a filled honeypot looks like success but sends nothing', async () => {
  const { sent, deps: d } = deps();
  const res = await handlePriceRequest(post({ ...valid, website: 'spam' }), d);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(sent.length, 0);
});

test('with reCAPTCHA on, the price_request action is required', async () => {
  const recaptcha = { secret: 's', minScore: 0.5 };
  const wrongAction = (async () => Response.json({ success: true, score: 0.9, action: 'contact' })) as typeof fetch;
  const a = deps({ recaptcha, fetch: wrongAction });
  const res = await handlePriceRequest(post({ ...valid, recaptchaToken: 't' }), a.deps);
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'captcha_failed' });
  assert.equal(a.sent.length, 0);

  const right = (async () => Response.json({ success: true, score: 0.9, action: 'price_request' })) as typeof fetch;
  const b = deps({ recaptcha, fetch: right });
  assert.equal((await handlePriceRequest(post({ ...valid, recaptchaToken: 't' }), b.deps)).status, 200);
  assert.equal(b.sent.length, 2);
});
