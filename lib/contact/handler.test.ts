import test from 'node:test';
import assert from 'node:assert/strict';
import { handleContact, MAX_MESSAGE } from './handler.ts';
import type { MailMessage } from '../mail/core.ts';
import { createRateLimiter } from '../form-protection/rateLimit.ts';
import type { FormProtection } from '../form-protection/index.ts';

// Run with:  npm test

function post(body: unknown, ip = '203.0.113.7'): Request {
  return new Request('http://shop.test/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

// Fresh limiter, captcha off.
function open(extra: Partial<FormProtection> = {}): FormProtection {
  return { limiter: createRateLimiter(), recaptcha: null, ...extra };
}

function fakeSender() {
  const sent: MailMessage[] = [];
  return { sent, send: async (m: MailMessage) => { sent.push(m); } };
}

const valid = { name: 'Ada Visitor', email: 'ada@example.com', message: 'Hello <b>shop</b>' };

test('a valid submission is mailed to the configured recipient only', async () => {
  const mail = fakeSender();
  const res = await handleContact(
    post({ ...valid, to: 'attacker@example.com', recipient: 'x@example.com' }),
    { send: mail.send, protection: open(), recipients: 'shop@example.com, sales@example.com' },
  );
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(mail.sent.length, 1);
  const [m] = mail.sent;
  assert.deepEqual(m.to, ['shop@example.com', 'sales@example.com']);
  assert.equal(m.replyTo, 'ada@example.com');
  assert.match(m.subject, /Ada Visitor/);
  assert.match(m.text, /Hello <b>shop<\/b>/);
  assert.ok(m.html.includes('Hello &lt;b&gt;shop&lt;/b&gt;'));
  assert.ok(!m.html.includes('<b>shop</b>'));
});

test('unset or empty recipient answers 503 and sends nothing', async () => {
  for (const recipients of [undefined, '', ' , ']) {
    const mail = fakeSender();
    const res = await handleContact(post(valid), { send: mail.send, protection: open(), recipients });
    assert.equal(res.status, 503);
    assert.equal(mail.sent.length, 0);
  }
});

test('invalid input answers 400 and sends nothing', async () => {
  const cases: unknown[] = [
    'not json',
    [],
    { ...valid, name: '' },
    { ...valid, name: '   ' },
    { ...valid, email: 'not-an-email' },
    { ...valid, email: 'a@b' },
    { ...valid, email: 'ada@example.com\r\nBcc: x@example.com' },
    { ...valid, message: '' },
    { ...valid, message: 'x'.repeat(MAX_MESSAGE + 1) },
    { ...valid, name: 'x'.repeat(201) },
    { ...valid, email: `${'a'.repeat(250)}@example.com` },
    { ...valid, message: 42 },
  ];
  for (const body of cases) {
    const mail = fakeSender();
    const res = await handleContact(post(body), { send: mail.send, protection: open(), recipients: 'shop@example.com' });
    assert.equal(res.status, 400, JSON.stringify(body).slice(0, 80));
    assert.equal(mail.sent.length, 0);
  }
});

test('line breaks in the name never reach the subject', async () => {
  const mail = fakeSender();
  const res = await handleContact(
    post({ ...valid, name: 'Ada\r\nBcc: x@example.com' }),
    { send: mail.send, protection: open(), recipients: 'shop@example.com' },
  );
  assert.equal(res.status, 200);
  assert.ok(!/[\r\n]/.test(mail.sent[0].subject));
});

test('a failing sender answers 502', async () => {
  const res = await handleContact(post(valid), {
    send: async () => { throw new Error('smtp down'); },
    protection: open(), recipients: 'shop@example.com',
  });
  assert.equal(res.status, 502);
});

test('the sixth request from one IP in ten minutes answers 429, even when invalid', async () => {
  const mail = fakeSender();
  const deps = { send: mail.send, protection: open(), recipients: 'shop@example.com' };
  for (let i = 0; i < 5; i++) await handleContact(post('not json'), deps);
  const res = await handleContact(post(valid), deps);
  assert.equal(res.status, 429);
  assert.ok(Number(res.headers.get('Retry-After')) > 0);
  assert.deepEqual(await res.json(), { error: 'rate_limited' });
  assert.equal(mail.sent.length, 0);
  assert.equal((await handleContact(post(valid, '198.51.100.1'), deps)).status, 200);
});

test('a filled honeypot looks like success but sends nothing', async () => {
  const mail = fakeSender();
  const res = await handleContact(post({ ...valid, website: 'http://spam.example' }), {
    send: mail.send, protection: open(), recipients: 'shop@example.com',
  });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(mail.sent.length, 0);
});

test('with reCAPTCHA on, a missing token is captcha_failed and nothing is sent', async () => {
  const mail = fakeSender();
  const res = await handleContact(post(valid), {
    send: mail.send, protection: open({ recaptcha: { secret: 's', minScore: 0.5 } }), recipients: 'shop@example.com',
  });
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'captcha_failed' });
  assert.equal(mail.sent.length, 0);
});

test('with reCAPTCHA on, a verified contact token is mailed', async () => {
  const mail = fakeSender();
  let token = '';
  const fetch = (async (_u: unknown, init?: RequestInit) => {
    token = new URLSearchParams(String(init?.body)).get('response') || '';
    return Response.json({ success: true, score: 0.9, action: 'contact' });
  }) as typeof globalThis.fetch;
  const res = await handleContact(post({ ...valid, recaptchaToken: 'tok' }), {
    send: mail.send, protection: open({ recaptcha: { secret: 's', minScore: 0.5 }, fetch }), recipients: 'shop@example.com',
  });
  assert.equal(res.status, 200);
  assert.equal(token, 'tok');
  assert.equal(mail.sent.length, 1);
});
