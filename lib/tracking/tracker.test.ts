import test from 'node:test';
import assert from 'node:assert/strict';
import { createTracker, defaultKey } from './tracker.ts';
import { rangeToUtc, zonedDayStartUtc, addDays } from './timezone.ts';
import type { TrackedEvent, TrackingContext } from './types.ts';

/**
 * Run with:  npm run test:tracking      (node --test, no framework)
 *
 * Node 22 strips TypeScript natively, so this needs no runner, no transform and
 * no new dependency. These cover the only non-trivial logic in the bus — the
 * parts that produce WRONG NUMBERS rather than obvious breakage if they regress.
 */

const ctx: TrackingContext = {
  channelId: 1,
  userMode: 'b2b',
  contactId: 42,
  customerId: null,
  companyId: 7,
  visitorId: 'v-1',
  sessionId: 's-1',
  language: 'NL',
  currency: 'EUR',
};

function collect() {
  const seen: TrackedEvent[] = [];
  const tracker = createTracker();
  tracker.subscribe((e) => seen.push(e));
  return { tracker, seen };
}

test('emits an enriched event once context is set', () => {
  const { tracker, seen } = collect();
  tracker.setContext(ctx);
  tracker.track('page_viewed', { page_type: 'home' });

  assert.equal(seen.length, 1);
  assert.equal(seen[0].name, 'page_viewed');
  assert.equal(seen[0].context.companyId, 7);
  assert.equal(seen[0].props.page_type, 'home');
});

test('deduplicates a repeated key — this is the StrictMode double-invoke', () => {
  const { tracker, seen } = collect();
  tracker.setContext(ctx);

  // Exactly what React 19 StrictMode does to an effect in development, and what
  // an App Router remount does on back/forward navigation.
  tracker.track('search_no_results', { search_term: 'laser' }, 'k1');
  tracker.track('search_no_results', { search_term: 'laser' }, 'k1');
  tracker.track('search_no_results', { search_term: 'laser' }, 'k1');

  assert.equal(seen.length, 1, 'a repeated key inside the window must emit once');
});

test('distinct keys still emit — dedupe must not swallow real repeats', () => {
  const { tracker, seen } = collect();
  tracker.setContext(ctx);
  tracker.track('search_no_results', { search_term: 'laser' }, 'k1');
  tracker.track('search_no_results', { search_term: 'drill' }, 'k2');
  assert.equal(seen.length, 2);
});

test('buffers events fired before context resolves, then flushes them', () => {
  const { tracker, seen } = collect();

  // The first page_viewed fires before auth/company resolve. Dropping it would
  // lose the most important event of every visit.
  tracker.track('page_viewed', { page_type: 'home' });
  assert.equal(seen.length, 0, 'nothing emits until context exists');

  tracker.setContext(ctx);
  assert.equal(seen.length, 1, 'queued event flushes on setContext');
  assert.equal(seen[0].context.contactId, 42, 'flushed event carries the resolved context');
});

test('a throwing subscriber cannot break the page or block other subscribers', () => {
  const tracker = createTracker();
  const ok: TrackedEvent[] = [];
  tracker.subscribe(() => {
    throw new Error('transport exploded');
  });
  tracker.subscribe((e) => ok.push(e));
  tracker.setContext(ctx);

  assert.doesNotThrow(() => tracker.track('login', { method: 'password' }));
  assert.equal(ok.length, 1, 'the healthy subscriber still received the event');
});

test('unsubscribe stops delivery', () => {
  const tracker = createTracker();
  const seen: TrackedEvent[] = [];
  const off = tracker.subscribe((e) => seen.push(e));
  tracker.setContext(ctx);
  tracker.track('login', {}, 'a');
  off();
  tracker.track('logout', {}, 'b');
  assert.equal(seen.length, 1);
});

test('defaultKey ignores objects so identity is stable across renders', () => {
  const a = defaultKey('add_to_cart', { product_id: 1, source: { type: 'search' } });
  const b = defaultKey('add_to_cart', { product_id: 1, source: { type: 'category' } });
  assert.equal(a, b, 'nested payload detail must not change the identity key');
  assert.match(a, /product_id=1/);
});

/* ── Timezone bucketing ────────────────────────────────────────────────── */

test('local day start is not UTC midnight — the every-night off-by-one', () => {
  // Amsterdam in summer is UTC+2, so 2026-08-19 locally begins at 22:00 UTC on
  // the 18th. Bucketing on UTC would file that hour under the wrong day.
  const start = zonedDayStartUtc('2026-08-19', 'Europe/Amsterdam');
  assert.equal(start.toISOString(), '2026-08-18T22:00:00.000Z');
});

test('DST is handled — winter and summer offsets differ', () => {
  const summer = zonedDayStartUtc('2026-07-01', 'Europe/Amsterdam');
  const winter = zonedDayStartUtc('2026-01-01', 'Europe/Amsterdam');
  assert.equal(summer.toISOString(), '2026-06-30T22:00:00.000Z', 'CEST = UTC+2');
  assert.equal(winter.toISOString(), '2025-12-31T23:00:00.000Z', 'CET = UTC+1');
});

test('range is half-open so an event at midnight belongs to one day only', () => {
  const { start, end } = rangeToUtc('2026-08-19', '2026-08-19', 'Europe/Amsterdam');
  assert.equal(start.toISOString(), '2026-08-18T22:00:00.000Z');
  assert.equal(end.toISOString(), '2026-08-19T22:00:00.000Z');
  assert.equal(end.getTime() - start.getTime(), 24 * 3600 * 1000);
});

test('addDays crosses month and year boundaries', () => {
  assert.equal(addDays('2026-08-31', 1), '2026-09-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
});
