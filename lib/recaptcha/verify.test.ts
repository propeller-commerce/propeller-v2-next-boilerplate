import test from 'node:test';
import assert from 'node:assert/strict';
import { RECAPTCHA_VERIFY_URL, recaptchaConfig, verifyRecaptcha } from './verify.ts';

const config = { secret: 's3cret', minScore: 0.5 };

function googleSays(body: unknown, status = 200) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetch = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(body), { status });
  };
  return { calls, fetch: fetch as typeof globalThis.fetch };
}

test('config is enabled only when both keys are set; min score defaults to 0.5', () => {
  assert.equal(recaptchaConfig({}), null);
  assert.equal(recaptchaConfig({ RECAPTCHA_SECRET_KEY: 'x' }), null);
  assert.equal(recaptchaConfig({ NEXT_PUBLIC_RECAPTCHA_SITE_KEY: 'y' }), null);
  assert.deepEqual(recaptchaConfig({ RECAPTCHA_SECRET_KEY: 'x', NEXT_PUBLIC_RECAPTCHA_SITE_KEY: 'y' }), { secret: 'x', minScore: 0.5 });
  assert.deepEqual(
    recaptchaConfig({ RECAPTCHA_SECRET_KEY: 'x', NEXT_PUBLIC_RECAPTCHA_SITE_KEY: 'y', RECAPTCHA_MIN_SCORE: '0.7' }),
    { secret: 'x', minScore: 0.7 },
  );
  assert.equal(
    recaptchaConfig({ RECAPTCHA_SECRET_KEY: 'x', NEXT_PUBLIC_RECAPTCHA_SITE_KEY: 'y', RECAPTCHA_MIN_SCORE: 'abc' })?.minScore,
    0.5,
  );
});

test('a good token posts form-encoded secret, response and remoteip', async () => {
  const g = googleSays({ success: true, score: 0.9, action: 'contact' });
  assert.equal(await verifyRecaptcha({ token: 'tok', action: 'contact', remoteIp: '1.1.1.1', config, fetch: g.fetch }), 'ok');
  assert.equal(g.calls[0].url, RECAPTCHA_VERIFY_URL);
  assert.equal(g.calls[0].init?.method, 'POST');
  const params = new URLSearchParams(String(g.calls[0].init?.body));
  assert.equal(params.get('secret'), 's3cret');
  assert.equal(params.get('response'), 'tok');
  assert.equal(params.get('remoteip'), '1.1.1.1');
});

test('missing token fails without calling Google', async () => {
  const g = googleSays({ success: true, score: 1, action: 'contact' });
  for (const token of [undefined, '', 42]) {
    assert.equal(await verifyRecaptcha({ token, action: 'contact', remoteIp: 'unknown', config, fetch: g.fetch }), 'failed');
  }
  assert.equal(g.calls.length, 0);
});

test('unsuccessful, low-score or wrong-action answers fail', async () => {
  const bodies = [
    { success: false, 'error-codes': ['invalid-input-response'] },
    { success: true, score: 0.3, action: 'contact' },
    { success: true, score: 0.9, action: 'price_request' },
    { success: true, action: 'contact' },
  ];
  for (const body of bodies) {
    const g = googleSays(body);
    const result = await verifyRecaptcha({ token: 't', action: 'contact', remoteIp: 'unknown', config, fetch: g.fetch });
    assert.equal(result, 'failed', JSON.stringify(body));
  }
});

test('score exactly at the minimum passes', async () => {
  const g = googleSays({ success: true, score: 0.5, action: 'price_request' });
  assert.equal(await verifyRecaptcha({ token: 't', action: 'price_request', remoteIp: 'unknown', config, fetch: g.fetch }), 'ok');
});

test('non-2xx, network error, bad JSON and timeout are unavailable', async () => {
  const opts = { token: 't', action: 'contact', remoteIp: 'x', config };
  assert.equal(await verifyRecaptcha({ ...opts, fetch: googleSays({}, 500).fetch }), 'unavailable');
  const down = (async () => { throw new TypeError('fetch failed'); }) as typeof fetch;
  assert.equal(await verifyRecaptcha({ ...opts, fetch: down }), 'unavailable');
  const garbage = (async () => new Response('<html>', { status: 200 })) as typeof fetch;
  assert.equal(await verifyRecaptcha({ ...opts, fetch: garbage }), 'unavailable');
  const hang = ((_u: unknown, init?: RequestInit) =>
    new Promise((_r, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)))) as typeof fetch;
  assert.equal(await verifyRecaptcha({ ...opts, fetch: hang, timeoutMs: 20 }), 'unavailable');
});
