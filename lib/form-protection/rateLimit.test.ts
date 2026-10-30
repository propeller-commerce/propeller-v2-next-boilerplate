import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from './rateLimit.ts';

const rule = { limit: 3, windowMs: 60_000 };

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

test('allows up to the limit, then refuses with retryAfter in seconds', () => {
  const c = clock();
  const rl = createRateLimiter({ now: c.now });
  for (let i = 0; i < 3; i++) assert.deepEqual(rl.hit('contact:1.1.1.1', rule), { ok: true });
  c.advance(15_000);
  assert.deepEqual(rl.hit('contact:1.1.1.1', rule), { ok: false, retryAfter: 45 });
});

test('the window expiring resets the counter', () => {
  const c = clock();
  const rl = createRateLimiter({ now: c.now });
  for (let i = 0; i < 3; i++) rl.hit('k', rule);
  assert.equal(rl.hit('k', rule).ok, false);
  c.advance(60_000);
  assert.equal(rl.hit('k', rule).ok, true);
});

test('different keys keep separate counters', () => {
  const rl = createRateLimiter({ now: clock().now });
  for (let i = 0; i < 3; i++) rl.hit('contact:1.1.1.1', rule);
  assert.equal(rl.hit('contact:1.1.1.1', rule).ok, false);
  assert.equal(rl.hit('contact:2.2.2.2', rule).ok, true);
  assert.equal(rl.hit('price-request:1.1.1.1', rule).ok, true);
});

test('expired entries are evicted', () => {
  const c = clock();
  const rl = createRateLimiter({ now: c.now });
  for (let i = 0; i < 50; i++) rl.hit(`ip-${i}`, rule);
  assert.equal(rl.size(), 50);
  c.advance(120_000);
  rl.hit('fresh', rule);
  assert.equal(rl.size(), 1);
});

test('the store never grows past maxKeys', () => {
  const rl = createRateLimiter({ now: clock().now, maxKeys: 10 });
  for (let i = 0; i < 100; i++) rl.hit(`ip-${i}`, rule);
  assert.ok(rl.size() <= 10);
});
