import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTACT_POLICY,
  EMAIL_DAILY_CAP,
  PRICE_REQUEST_POLICY,
  SPL_CONTACT_POLICY,
  TRACK_POLICY,
  capResponse,
  captchaResponse,
  emailCapKey,
  isHoneypot,
  rateLimitResponse,
} from './index.ts';
import { createRateLimiter } from './rateLimit.ts';

function req(ip: string): Request {
  return new Request('http://shop.test/api/contact', { method: 'POST', headers: { 'x-forwarded-for': `10.9.9.9, ${ip}` } }); // nginx appends the address it saw; the left part is client-written
}

test('policies match the documented limits', () => {
  assert.deepEqual(CONTACT_POLICY, { route: 'contact', limit: 5, windowMs: 600_000, action: 'contact' });
  assert.deepEqual(PRICE_REQUEST_POLICY, { route: 'price-request', limit: 10, windowMs: 600_000, action: 'price_request' });
  assert.deepEqual(SPL_CONTACT_POLICY, { route: 'spl-contact', limit: 5, windowMs: 600_000, action: 'spl_contact' });
  assert.deepEqual(TRACK_POLICY, { route: 'track', limit: 120, windowMs: 60_000, action: 'track' });
});

test('a forged first x-forwarded-for hop does not buy a fresh bucket', () => {
  const protection = { limiter: createRateLimiter({ now: () => 0 }), recaptcha: null };
  const forged = (n: number) =>
    new Request('http://shop.test/api/contact', { method: 'POST', headers: { 'x-forwarded-for': `10.0.0.${n}, 1.1.1.1` } });
  for (let i = 0; i < 5; i++) assert.equal(rateLimitResponse(forged(i), CONTACT_POLICY, protection), null);
  assert.equal(rateLimitResponse(forged(99), CONTACT_POLICY, protection)?.status, 429);
});

test('the per-address cap ignores the IP, case and spaces', () => {
  const protection = { limiter: createRateLimiter({ now: () => 0 }), recaptcha: null };
  assert.deepEqual(EMAIL_DAILY_CAP, { limit: 3, windowMs: 86_400_000 });
  assert.equal(emailCapKey('price-request', '  A@B.Test '), 'price-request:email:a@b.test');
  for (let i = 0; i < 3; i++) assert.equal(capResponse(emailCapKey('price-request', 'a@b.test'), EMAIL_DAILY_CAP, protection), null);
  const res = capResponse(emailCapKey('price-request', 'A@B.test'), EMAIL_DAILY_CAP, protection);
  assert.equal(res?.status, 429);
  assert.equal(res?.headers.get('Retry-After'), '86400');
  assert.equal(capResponse(emailCapKey('price-request', 'c@d.test'), EMAIL_DAILY_CAP, protection), null);
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
