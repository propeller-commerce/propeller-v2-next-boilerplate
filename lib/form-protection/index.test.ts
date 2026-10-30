import test from 'node:test';
import assert from 'node:assert/strict';
import { CONTACT_POLICY, PRICE_REQUEST_POLICY, captchaResponse, isHoneypot, rateLimitResponse } from './index.ts';
import { createRateLimiter } from './rateLimit.ts';

function req(ip: string): Request {
  return new Request('http://shop.test/api/contact', { method: 'POST', headers: { 'x-forwarded-for': `${ip}, 10.0.0.1` } });
}

test('policies match the documented limits', () => {
  assert.deepEqual(CONTACT_POLICY, { route: 'contact', limit: 5, windowMs: 600_000, action: 'contact' });
  assert.deepEqual(PRICE_REQUEST_POLICY, { route: 'price-request', limit: 10, windowMs: 600_000, action: 'price_request' });
});

test('over the limit answers 429 rate_limited with Retry-After', async () => {
  const protection = { limiter: createRateLimiter({ now: () => 0 }), recaptcha: null };
  for (let i = 0; i < 5; i++) assert.equal(rateLimitResponse(req('1.1.1.1'), CONTACT_POLICY, protection), null);
  const res = rateLimitResponse(req('1.1.1.1'), CONTACT_POLICY, protection);
  assert.ok(res);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get('Retry-After'), '600');
  assert.deepEqual(await res.json(), { error: 'rate_limited' });
  assert.equal(rateLimitResponse(req('2.2.2.2'), CONTACT_POLICY, protection), null);
  assert.equal(rateLimitResponse(req('1.1.1.1'), PRICE_REQUEST_POLICY, protection), null);
});

test('honeypot trips only on a non-empty string', () => {
  assert.equal(isHoneypot({ website: 'http://spam.example' }), true);
  assert.equal(isHoneypot({ website: '' }), false);
  assert.equal(isHoneypot({}), false);
  assert.equal(isHoneypot({ website: 42 }), false);
});

test('captcha disabled ignores the token entirely', async () => {
  const protection = { limiter: createRateLimiter(), recaptcha: null, fetch: (async () => { throw new Error('no'); }) as typeof fetch };
  assert.equal(await captchaResponse(req('1.1.1.1'), {}, CONTACT_POLICY, protection), null);
});

test('captcha enabled maps failures to 400 and outages to 503', async () => {
  const base = { limiter: createRateLimiter(), recaptcha: { secret: 's', minScore: 0.5 } };
  const failed = await captchaResponse(req('1.1.1.1'), {}, CONTACT_POLICY, base);
  assert.equal(failed?.status, 400);
  assert.deepEqual(await failed?.json(), { error: 'captcha_failed' });

  const down = { ...base, fetch: (async () => new Response('', { status: 502 })) as typeof fetch };
  const unavailable = await captchaResponse(req('1.1.1.1'), { recaptchaToken: 't' }, CONTACT_POLICY, down);
  assert.equal(unavailable?.status, 503);
  assert.deepEqual(await unavailable?.json(), { error: 'captcha_unavailable' });

  const good = { ...base, fetch: (async () => Response.json({ success: true, score: 0.9, action: 'contact' })) as typeof fetch };
  assert.equal(await captchaResponse(req('1.1.1.1'), { recaptchaToken: 't' }, CONTACT_POLICY, good), null);
});
