import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyWebhookSignature } from '@propeller-commerce/propeller-v2-msp';
import { createRateLimiter } from '../form-protection/rateLimit.ts';
import {
  createProcessedLog,
  handleMspNotification,
  mspSigningKey,
  signedOrderId,
  UNSIGNED_PER_IP,
  type MspNotificationDeps,
} from './mspNotifications.ts';

test('the signing key is the active mode API key', () => {
  assert.equal(mspSigningKey({ MSP_TEST_KEY: 't', MSP_LIVE_KEY: 'l' }), 't');
  assert.equal(mspSigningKey({ MSP_TEST_MODE: 'false', MSP_TEST_KEY: 't', MSP_LIVE_KEY: 'l' }), 'l');
  assert.equal(mspSigningKey({ MSP_TEST_MODE: 'false' }), '');
});

test('a POST is processed only with a valid, fresh signature over the raw body', () => {
  const body = '{"transactionid":"4711"}';
  const ts = String(Math.floor(Date.now() / 1000));
  const sign = (key: string, raw = body, t = ts) =>
    Buffer.from(`${t}:${createHmac('sha512', key).update(`${t}:${raw}`).digest('hex')}`).toString('base64');
  assert.equal(verifyWebhookSignature(body, sign('k'), 'k'), true);
  assert.equal(verifyWebhookSignature(body, sign('other'), 'k'), false);
  assert.equal(verifyWebhookSignature(`${body} `, sign('k'), 'k'), false);
  assert.equal(verifyWebhookSignature(body, '', 'k'), false);
  assert.equal(verifyWebhookSignature(body, sign('k', body, String(Number(ts) - 3600)), 'k'), false);
  // No key configured: nothing verifies.
  assert.equal(verifyWebhookSignature(body, sign(''), ''), false);
});

test('a status already processed for an order is a duplicate; a new one is not', () => {
  const log = createProcessedLog(2);
  assert.equal(log.isDuplicate('1', 'initialized'), false);
  log.record('1', 'initialized');
  assert.equal(log.isDuplicate('1', 'initialized'), true);
  assert.equal(log.isDuplicate('1', 'completed'), false);
  log.record('1', 'completed');
  assert.equal(log.isDuplicate('1', 'completed'), true);
  // Unknown status never counts as a duplicate.
  assert.equal(log.isDuplicate('1', undefined), false);
  // Bounded: the oldest id goes first.
  log.record('2', 'completed');
  log.record('3', 'completed');
  assert.equal(log.isDuplicate('1', 'completed'), false);
  assert.equal(log.isDuplicate('3', 'completed'), true);
});

// ── handleMspNotification (final review #1): unsigned GET replays ───────────

const fakeMsp = (statusByOrder: Record<number, string>) => {
  const calls = { handleWebhook: [] as string[], fetchOrder: [] as number[] };
  const deps: MspNotificationDeps = {
    limiter: createRateLimiter(),
    processed: createProcessedLog(),
    fetchOrder: async (orderId) => {
      calls.fetchOrder.push(orderId);
      return statusByOrder[orderId] ? { status: statusByOrder[orderId] } : null;
    },
    provider: () => ({
      getPaymentStatus: async () => ({ ok: true, status: 'completed' }),
      handleWebhook: async (id) => {
        calls.handleWebhook.push(id);
        return { ok: true, mspStatus: 'completed' };
      },
    }),
  };
  return { deps, calls };
};
const get = (id: string, ip = '203.0.113.7') => ({ method: 'GET', id, ip, signed: false });

test('a GET for an order still awaiting payment is processed', async () => {
  const { deps, calls } = fakeMsp({ 4711: 'UNFINISHED' });
  assert.deepEqual(await handleMspNotification(get('4711'), deps), { status: 200, body: 'OK' });
  assert.deepEqual(calls.handleWebhook, ['4711']);
});

test('a GET for a paid, unknown or unparsable order is acknowledged and never processed', async () => {
  const { deps, calls } = fakeMsp({ 4711: 'NEW', 4712: 'REQUEST' });
  for (const id of ['4711', '4712', '999', 'abc', '']) {
    assert.deepEqual(await handleMspNotification(get(id), deps), { status: 200, body: 'OK' });
  }
  assert.deepEqual(calls.handleWebhook, []);
  // No order lookup for an id that isn't one.
  assert.deepEqual(calls.fetchOrder, [4711, 4712, 999]);
  // A failed lookup counts as "not awaiting payment".
  const failing = fakeMsp({});
  failing.deps.fetchOrder = async () => {
    throw new Error('upstream down');
  };
  await handleMspNotification(get('4711'), failing.deps);
  assert.deepEqual(failing.calls.handleWebhook, []);
});

const post = (id: string, bodyOrderId: unknown, signed = true) => ({
  method: 'POST',
  id,
  ip: '203.0.113.7',
  signed,
  body: JSON.stringify({ order_id: bodyOrderId, transaction_id: 99887766, status: 'completed' }),
});

test('an unsigned POST is refused; a signed one is processed whatever the order status', async () => {
  const { deps, calls } = fakeMsp({ 4711: 'NEW', 4712: 'NEW' });
  assert.deepEqual(await handleMspNotification(post('4711', '4711', false), deps), { status: 401, body: 'Invalid signature' });
  assert.deepEqual(calls.handleWebhook, []);
  assert.equal((await handleMspNotification(post('4711', '4711'), deps)).status, 200);
  assert.equal((await handleMspNotification(post('4712', 4712), deps)).status, 200);
  assert.deepEqual(calls.handleWebhook, ['4711', '4712']);
});

test('a signed POST is processed only for the order its signed body names', async () => {
  const { deps, calls } = fakeMsp({ 4711: 'UNFINISHED', 4712: 'UNFINISHED' });
  // A captured notification for order 4711 replayed with another order id in the query string.
  assert.deepEqual(await handleMspNotification(post('4712', '4711'), deps), { status: 403, body: 'Order mismatch' });
  for (const body of ['', 'not json', '{}', '{"order_id":null}', '[]']) {
    const n = { method: 'POST', id: '4712', ip: 'x', signed: true, body };
    assert.equal((await handleMspNotification(n, deps)).status, 403, body);
  }
  assert.equal((await handleMspNotification(post('', ''), deps)).status, 403);
  assert.deepEqual(calls.handleWebhook, []);
  assert.equal(signedOrderId('{"order_id":" 4711 "}'), '4711');
});

test('GETs are limited per client IP, whatever order ids they name', async () => {
  const { deps, calls } = fakeMsp({});
  for (let i = 1; i <= UNSIGNED_PER_IP.limit; i++) {
    assert.equal((await handleMspNotification(get(String(i)), deps)).status, 200);
  }
  assert.deepEqual(await handleMspNotification(get('4711'), deps), { status: 429, body: 'Too many notifications' });
  assert.equal(calls.fetchOrder.length, UNSIGNED_PER_IP.limit, 'a limited request costs no order lookup');
  // Another address has its own budget; signed POSTs are never limited.
  assert.equal((await handleMspNotification(get('1', '198.51.100.1'), deps)).status, 200);
  assert.equal((await handleMspNotification(post('1', '1'), deps)).status, 200);
});
