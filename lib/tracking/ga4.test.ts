import test from 'node:test';
import assert from 'node:assert/strict';
import { toGa4 } from './ga4.ts';
import { diffCartLines, itemsFromCart, itemsFromOrder, itemsFromProducts, MAX_ITEMS } from './items.ts';
import type { TrackedEvent, TrackingContext } from './types.ts';

/**
 * Run with:  npm run test:tracking
 *
 * These cover the GA4 projection, not the bus (see `tracker.test.ts`). Every
 * case here is one that fails SILENTLY in production — a rejected event name, a
 * dropped item array, a revenue figure inflated by VAT — rather than throwing.
 */

const context: TrackingContext = {
  channelId: 621,
  userMode: 'b2b',
  contactId: 42,
  customerId: null,
  companyId: 7,
  visitorId: 'v-1',
  sessionId: 's-1',
  language: 'NL',
  currency: 'EUR',
};

const event = (name: string, props: Record<string, unknown> = {}): TrackedEvent => ({
  name,
  ts: 1,
  key: 'k',
  context,
  props,
});

/* ── Name mapping ───────────────────────────────────────────────────────── */

test('a dot in an event name is illegal in GA4 and must be rewritten', () => {
  // GA4 rejects `propeller.quote_viewed` outright — the event is lost, not
  // merely unmapped, so this is data loss rather than a cosmetic difference.
  const out = toGa4(event('propeller.quote_viewed', { order_id: 5 }));
  assert.equal(out?.name, 'propeller_quote_viewed');
  assert.match(out!.name, /^[A-Za-z][A-Za-z0-9_]*$/);
});

test('favorites map to the GA4 recommended wishlist event', () => {
  assert.equal(toGa4(event('propeller.favorite_added'))?.name, 'add_to_wishlist');
});

test('session_started and identify never reach GA4', () => {
  // GA4 derives sessions itself, and `identify` is not an event in its model —
  // sending either double-counts or errors.
  assert.equal(toGa4(event('session_started')), null);
  assert.equal(toGa4(event('identify', { user_id: 42 })), null);
});

/* ── Payload shape ──────────────────────────────────────────────────────── */

test('purchase renames order_id to transaction_id', () => {
  const out = toGa4(event('purchase', { order_id: 900123, value: 250, tax: 52.5, items: [{ item_id: 'X' }] }));
  assert.equal(out?.params.transaction_id, '900123');
  assert.equal(out?.params.order_id, undefined, 'the internal name must not also be sent');
  assert.equal(out?.params.tax, 52.5);
  assert.equal(out?.ecommerce, true);
});

test('currency falls back to the session context when the event omits it', () => {
  const out = toGa4(event('add_to_cart', { value: 10, items: [] }));
  assert.equal(out?.params.currency, 'EUR');
});

test('null and empty props are dropped rather than sent as empty keys', () => {
  const out = toGa4(event('add_to_cart', { value: 10, coupon: null, items: [] }));
  assert.ok(!('coupon' in out!.params));
});

test('custom events keep scalars and drop nested objects', () => {
  // GA4 takes flat parameters only; a stringified object is worse than none.
  const out = toGa4(event('propeller.quick_order_submitted', {
    line_count: 4,
    source: { type: 'search' },
    unmatched_skus: ['A', 'B'],
  }));
  assert.equal(out?.params.line_count, 4);
  assert.ok(!('source' in out!.params));
  assert.ok(!('unmatched_skus' in out!.params));
});

test('ecommerce events are flagged so GTM gets its ecommerce:null clear', () => {
  // Without the clear, GTM merges pushes and the previous event's items leak in.
  assert.equal(toGa4(event('view_cart', { items: [] }))?.ecommerce, true);
  assert.equal(toGa4(event('login', { method: 'password' }))?.ecommerce, false);
});

test('page_view carries no page_location — that is read from the browser', () => {
  // Reading it here would mean useSearchParams(), which deopts static rendering.
  const out = toGa4(event('page_viewed', { page_type: 'product', entity_name: 'Drill' }));
  assert.equal(out?.name, 'page_view');
  assert.equal(out?.params.page_title, 'Drill');
  assert.equal(out?.params.page_location, undefined);
});

/* ── Items ──────────────────────────────────────────────────────────────── */

const product = (over: Record<string, unknown> = {}) => ({
  productId: 4471,
  sku: 'SKU-4471',
  names: [{ language: 'NL', value: 'Boormachine' }, { language: 'EN', value: 'Drill' }],
  manufacturer: 'Makita',
  minimumQuantity: 1,
  price: { gross: 129.5, net: 156.7 },
  categoryPath: [{ categoryId: 1, names: [{ language: 'NL', value: 'Gereedschap' }] }],
  ...over,
}) as never;

test('item_id is the SKU, not the numeric product id', () => {
  // The numeric id joins against nothing a merchant recognises in GA4.
  const [item] = itemsFromProducts([product()], { language: 'NL' });
  assert.equal(item.item_id, 'SKU-4471');
});

test('price is the ex-VAT figure — this SDK inverts gross and net', () => {
  // `gross` is EXCLUDING VAT here. Taking `net` would inflate all GA4 revenue.
  const [item] = itemsFromProducts([product()]);
  assert.equal(item.price, 129.5);
});

test('hidePrices omits the field entirely rather than sending zero', () => {
  // A zero would be averaged into GA4 as a real price.
  const [item] = itemsFromProducts([product()], { hidePrices: true });
  assert.ok(!('price' in item));
});

test('names resolve for the requested language, falling back to the first', () => {
  assert.equal(itemsFromProducts([product()], { language: 'EN' })[0].item_name, 'Drill');
  assert.equal(itemsFromProducts([product()], { language: 'FR' })[0].item_name, 'Boormachine');
});

test('index is global across pagination, not page-local', () => {
  // Page 2 of a 12-per-page grid starts at 13 — otherwise every page reports
  // positions 1..12 and list-position analysis is meaningless.
  const [item] = itemsFromProducts([product()], { page: 2, offset: 12 });
  assert.equal(item.index, 13);
});

test('a cluster maps off its defaultProduct but keeps its own name', () => {
  const cluster = {
    clusterId: 900,
    names: [{ language: 'NL', value: 'Boormachines' }],
    defaultProduct: product(),
  } as never;
  const [item] = itemsFromProducts([cluster], { language: 'NL' });
  assert.equal(item.item_id, 'SKU-4471');
  assert.equal(item.item_name, 'Boormachines');
});

test('list items are capped so the beacon stays under its size limit', () => {
  const many = Array.from({ length: MAX_ITEMS + 20 }, () => product());
  assert.equal(itemsFromProducts(many).length, MAX_ITEMS);
});

test('bundle children become their own items with item_variant', () => {
  // GA4 has no nesting; reporting only the parent under-reports every component.
  const items = itemsFromCart([
    {
      itemId: '1',
      quantity: 2,
      sum: 50,
      product: product(),
      childItems: [{ itemId: '2', quantity: 1, price: 10, product: product({ sku: 'SKU-CHILD', names: [{ language: 'NL', value: 'Bit' }] }) }],
    },
  ] as never, { language: 'NL' });

  assert.equal(items.length, 2);
  assert.equal(items[1].item_id, 'SKU-CHILD');
  assert.equal(items[1].item_variant, 'Bit');
  assert.deepEqual(items.map((i) => i.index), [1, 2], 'index stays contiguous across children');
});

test('order items map from the flat OrderItem shape', () => {
  const items = itemsFromOrder(
    [{ sku: 'SKU-1', name: 'Drill', manufacturer: 'Makita', quantity: 3, price: 99 }] as never,
    { currency: 'EUR' }
  );
  assert.deepEqual(items[0], {
    item_id: 'SKU-1',
    item_name: 'Drill',
    item_brand: 'Makita',
    currency: 'EUR',
    quantity: 3,
    price: 99,
    index: 1,
  });
});

test('empty and missing collections produce an empty array, never a throw', () => {
  assert.deepEqual(itemsFromProducts(null), []);
  assert.deepEqual(itemsFromCart(undefined), []);
  assert.deepEqual(itemsFromOrder([]), []);
});

/* ── Cart diff ──────────────────────────────────────────────────────────── */

const line = (itemId: string, quantity: number) => ({ itemId, quantity, sum: 10 }) as never;

test('a quantity increase reports the DELTA, not the new line total', () => {
  // 2 -> 5 is an add of THREE. Sending 5 multiplies cart-add volume, which is
  // the exact mistake the WordPress plugin avoids with its prev_quantity check.
  const out = diffCartLines([line('a', 2)], [line('a', 5)]);
  assert.deepEqual(out.map((d) => [d.direction, d.delta]), [['added', 3]]);
});

test('a quantity decrease is a removal of the difference', () => {
  const out = diffCartLines([line('a', 5)], [line('a', 2)]);
  assert.deepEqual(out.map((d) => [d.direction, d.delta]), [['removed', 3]]);
});

test('a line that disappears is removed in full', () => {
  const out = diffCartLines([line('a', 4)], []);
  assert.deepEqual(out.map((d) => [d.direction, d.delta]), [['removed', 4]]);
});

test('a new line is an add of its whole quantity', () => {
  const out = diffCartLines([], [line('b', 2)]);
  assert.deepEqual(out.map((d) => [d.direction, d.delta]), [['added', 2]]);
});

test('an unchanged line emits nothing — re-renders must not invent events', () => {
  assert.deepEqual(diffCartLines([line('a', 3)], [line('a', 3)]), []);
});

test('adds and removals in one update are reported separately', () => {
  const out = diffCartLines([line('a', 2), line('b', 1)], [line('a', 1), line('c', 5)]);
  assert.deepEqual(
    out.map((d) => [d.line.itemId, d.direction, d.delta]).sort(),
    [['a', 'removed', 1], ['b', 'removed', 1], ['c', 'added', 5]].sort()
  );
});
