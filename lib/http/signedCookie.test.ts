import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCookieSigningKey,
  signCookieJson,
  signCookieValue,
  verifyCookieJson,
  verifyCookieValue,
} from './signedCookie.ts';

const opts = { key: 'test-signing-secret', now: 1_000_000_000_000 };

test('a signed value round-trips for its own purpose only', () => {
  const signed = signCookieValue('last-order', '4711.s', 3600, opts)!;
  assert.match(signed, /^4711\.s\.\d+\.[A-Za-z0-9_-]{43}$/);
  assert.equal(verifyCookieValue('last-order', signed, opts), '4711.s');
  // Same key, other purpose: never interchangeable.
  assert.equal(verifyCookieValue('registration', signed, opts), null);
});

test('tampering, another key, expiry and garbage are rejected', () => {
  const signed = signCookieValue('last-order', '4711', 3600, opts)!;
  assert.equal(verifyCookieValue('last-order', signed.replace('4711', '4712'), opts), null);
  assert.equal(verifyCookieValue('last-order', signed, { ...opts, key: 'other' }), null);
  // Extending the expiry breaks the mac.
  const [value, exp, mac] = signed.split('.');
  assert.equal(verifyCookieValue('last-order', `${value}.${Number(exp) + 10}.${mac}`, opts), null);
  assert.equal(verifyCookieValue('last-order', signed, { ...opts, now: opts.now + 3601_000 }), null);
  assert.equal(verifyCookieValue('last-order', signed, { ...opts, now: opts.now + 3599_000 }), '4711');
  for (const bad of ['', '4711', `${signed}x`, 'a.b.c', undefined, null]) {
    assert.equal(verifyCookieValue('last-order', bad, opts), null, String(bad));
  }
});

test('values must be cookie-safe; JSON goes through base64url', () => {
  assert.throws(() => signCookieValue('p', 'a;b', 60, opts));
  const data = { returnUrl: 'https://erp.example/hook?x=1;y', n: 2 };
  const signed = signCookieJson('punchout', data, 60, opts)!;
  assert.deepEqual(verifyCookieJson('punchout', signed, opts), data);
  assert.equal(verifyCookieJson('punchout-pending', signed, opts), null);
});

test('the key is COOKIE_SIGNING_SECRET, else derived from the order-editor key, never the key itself', () => {
  assert.equal(resolveCookieSigningKey({}), null);
  const own = resolveCookieSigningKey({ COOKIE_SIGNING_SECRET: 's', BOILERPLATE_ORDER_EDITOR_API_KEY: 'k' })!;
  assert.deepEqual(own, { key: Buffer.from('s'), derived: false });
  const derived = resolveCookieSigningKey({ BOILERPLATE_ORDER_EDITOR_API_KEY: 'k' })!;
  assert.equal(derived.derived, true);
  assert.equal(derived.key.length, 32);
  assert.notDeepEqual(derived.key, Buffer.from('k'));
  // Stable, so cookies survive a restart.
  assert.deepEqual(resolveCookieSigningKey({ BOILERPLATE_ORDER_EDITOR_API_KEY: 'k' })!.key, derived.key);
});
