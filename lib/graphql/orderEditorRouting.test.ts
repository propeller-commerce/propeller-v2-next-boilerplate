import test from 'node:test';
import assert from 'node:assert/strict';
import {
  contactRegisterParentId,
  createSpentLog,
  elevatedMutationFlag,
  isOwnQuotation,
  parseDocument,
  placedOrderId,
  quoteAcceptOrderId,
  readSingleField,
  settleReserved,
  shouldUseOrderEditorKey,
  signLastOrder,
  verifyLastOrderState,
  type RoutingContext,
} from './orderEditorRouting.ts';

// Run with:  npm test

const SIGN = { key: 'cookie-signing-test-key', now: 1_000_000_000_000 };

const single = (query: unknown) => readSingleField(parseDocument(query));

const ctx = (query: unknown, extra: Partial<RoutingContext> = {}): RoutingContext => ({
  single: single(query),
  variables: {},
  lastOrder: null,
  ...extra,
});

const SET_STATUS = `mutation orderSetStatus($input: OrderSetStatusInput!) {
  orderSetStatus(input: $input) { id }
}`;
const ORDER_QUERY = `fragment OrderFields on Order { id status }
query order($orderId: Int, $orderUUID: String, $language: String) {
  order(orderId: $orderId, orderUUID: $orderUUID) { ...OrderFields }
}`;
const CONTACT_REGISTER = `mutation contactRegister($contactRegisterInput: RegisterContactInput!) {
  contactRegister(input: $contactRegisterInput) { session { accessToken } }
}`;

const last = (orderId: number, used = '') => ({ lastOrder: { orderId, used } });
const checkout = (orderId: number, extra: Record<string, unknown> = {}) => ({
  variables: { input: { orderId, status: 'NEW', payStatus: 'OPEN', sendOrderConfirmationEmail: true, deleteCart: true, ...extra } },
});

test('passwordResetLink never elevates', () => {
  const doc = 'mutation m($input: PasswordResetLinkInput!) { passwordResetLink(input: $input) }';
  assert.equal(shouldUseOrderEditorKey(ctx(doc)), false);
  assert.equal(shouldUseOrderEditorKey(ctx(doc, { ...last(9), variables: { input: { orderId: 9, email: 'x@y.z' } } })), false);
  assert.equal(elevatedMutationFlag(single(doc)), null);
});

test('checkout mutations elevate only for the order in the signed last-order cookie, guests and logged in', () => {
  assert.equal(shouldUseOrderEditorKey(ctx(SET_STATUS, checkout(4711))), false);
  assert.equal(shouldUseOrderEditorKey(ctx(SET_STATUS, { ...checkout(4711), ...last(4711) })), true);
  // A logged-in session gets no more than a guest: still only its own last order.
  assert.equal(shouldUseOrderEditorKey(ctx(SET_STATUS, { ...checkout(4711), ...last(4711) })), true);
  assert.equal(shouldUseOrderEditorKey(ctx(SET_STATUS, { ...checkout(4712), ...last(4711) })), false);
  for (const field of ['triggerQuoteSendRequest', 'triggerOrderSendConfirm']) {
    const doc = `mutation m($input: X!) { ${field}(input: $input) }`;
    assert.equal(shouldUseOrderEditorKey(ctx(doc, { variables: { input: { orderId: 9 } }, ...last(9) })), true, field);
    assert.equal(shouldUseOrderEditorKey(ctx(doc, { variables: { input: { orderId: 8 } }, ...last(9) })), false, field);
    assert.equal(shouldUseOrderEditorKey(ctx(doc, { variables: { input: { orderId: 9 } } })), false, field);
  }
  // Inline input, string id.
  assert.equal(shouldUseOrderEditorKey(ctx('mutation { orderSetStatus(input: { orderId: 9, status: "REQUEST" }) { id } }', last(9))), true);
  assert.equal(shouldUseOrderEditorKey(ctx(SET_STATUS, { ...checkout('9' as unknown as number), ...last(9) })), true);
  // No input, or an id that isn't one.
  assert.equal(shouldUseOrderEditorKey(ctx(SET_STATUS, last(9))), false);
  assert.equal(shouldUseOrderEditorKey(ctx(SET_STATUS, { ...checkout('9x' as unknown as number), ...last(9) })), false);
});

test('orderSetStatus elevates only with the checkout status values', () => {
  const run = (extra: Record<string, unknown>) => shouldUseOrderEditorKey(ctx(SET_STATUS, { ...checkout(9, extra), ...last(9) }));
  assert.equal(run({ status: 'NEW' }), true);
  assert.equal(run({ status: 'REQUEST' }), true);
  assert.equal(run({ status: 'UNFINISHED' }), true);
  assert.equal(run({ payStatus: undefined }), true);
  assert.equal(run({ status: 'CANCELLED' }), false);
  assert.equal(run({ status: 'QUOTATION' }), false);
  assert.equal(run({ status: undefined }), false);
  assert.equal(run({ payStatus: 'PAID' }), false);
});

test('each checkout mutation runs once per order', () => {
  assert.equal(shouldUseOrderEditorKey(ctx(SET_STATUS, { ...checkout(9), ...last(9, 's') })), false);
  const confirm = 'mutation m($input: X!) { triggerOrderSendConfirm(input: $input) }';
  assert.equal(shouldUseOrderEditorKey(ctx(confirm, { variables: { input: { orderId: 9 } }, ...last(9, 's') })), true);
  assert.equal(shouldUseOrderEditorKey(ctx(confirm, { variables: { input: { orderId: 9 } }, ...last(9, 'sc') })), false);
  assert.equal(elevatedMutationFlag(single(SET_STATUS)), 's');
  assert.equal(elevatedMutationFlag(single(confirm)), 'c');
  assert.equal(elevatedMutationFlag(single('mutation m($input: X!) { triggerQuoteSendRequest(input: $input) }')), 'q');
  assert.equal(elevatedMutationFlag(single(ORDER_QUERY)), null);
});

test('operation names never elevate on their own', () => {
  assert.equal(shouldUseOrderEditorKey(ctx('query orderSetStatus { contacts { items { email } } }', last(9))), false);
  assert.equal(shouldUseOrderEditorKey(ctx('mutation orderSetStatus { contactDelete(id: 1) }', last(9))), false);
  assert.equal(shouldUseOrderEditorKey(ctx('query anything { viewer { __typename } }', last(9))), false);
});

test('a query selecting an allowlisted mutation field does not elevate', () => {
  assert.equal(shouldUseOrderEditorKey(ctx('query q { orderSetStatus(input: { orderId: 9, status: NEW }) { id } }', last(9))), false);
});

test('extra top-level fields or operations do not elevate', () => {
  const extra = { ...checkout(9), ...last(9) };
  assert.equal(shouldUseOrderEditorKey(ctx('mutation m($input: OrderSetStatusInput!) { orderSetStatus(input: $input) { id } contacts { items { email } } }', extra)), false);
  assert.equal(shouldUseOrderEditorKey(ctx(`${SET_STATUS}\nquery other { contacts { items { email } } }`, extra)), false);
  // Aliased second copy is still two fields.
  assert.equal(
    shouldUseOrderEditorKey(ctx('mutation m($input: OrderSetStatusInput!) { a: orderSetStatus(input: $input) { id } b: orderSetStatus(input: $input) { id } }', extra)),
    false,
  );
});

test('__typename and fragment definitions are ignored', () => {
  assert.equal(
    shouldUseOrderEditorKey(ctx('mutation m($input: OrderSetStatusInput!) { __typename orderSetStatus(input: $input) { ...F } }\nfragment F on Order { id }', { ...checkout(9), ...last(9) })),
    true,
  );
});

test('top-level fragment spreads and inline fragments do not elevate', () => {
  const extra = { ...checkout(9), ...last(9) };
  assert.equal(shouldUseOrderEditorKey(ctx('mutation m($input: OrderSetStatusInput!) { ...M }\nfragment M on Mutation { orderSetStatus(input: $input) { id } }', extra)), false);
  assert.equal(shouldUseOrderEditorKey(ctx('mutation m($input: OrderSetStatusInput!) { ... on Mutation { orderSetStatus(input: $input) { id } } }', extra)), false);
});

test('unparseable or non-string documents never elevate', () => {
  assert.equal(parseDocument('mutation orderSetStatus { orderSetStatus('), null);
  assert.equal(parseDocument(undefined), null);
  assert.equal(parseDocument({ query: SET_STATUS }), null);
  assert.equal(shouldUseOrderEditorKey(ctx('mutation orderSetStatus { orderSetStatus(', { ...checkout(9), ...last(9) })), false);
  assert.equal(readSingleField(null), null);
});

test('order reads never elevate here (orderReadRouting decides them)', () => {
  assert.equal(shouldUseOrderEditorKey(ctx(ORDER_QUERY, { variables: { orderId: 4711 }, ...last(4711) })), false);
  assert.equal(shouldUseOrderEditorKey(ctx('query { order(orderId: 4711) { id } }', last(4711))), false);
});

test('contactRegister: the parent company comes from the input, whatever the variable is called', () => {
  assert.equal(contactRegisterParentId(single(CONTACT_REGISTER), { contactRegisterInput: { email: 'a@b.c', parentId: 37 } }), 37);
  assert.equal(contactRegisterParentId(single(CONTACT_REGISTER), { contactRegisterInput: { email: 'a@b.c' } }), null);
  assert.equal(contactRegisterParentId(single('mutation { contactRegister(input: { parentId: 37 }) { session { accessToken } } }'), {}), 37);
  // Never elevated by the cookie path.
  assert.equal(shouldUseOrderEditorKey(ctx(CONTACT_REGISTER, { variables: { contactRegisterInput: { parentId: 37 } }, ...last(37) })), false);
  assert.equal(contactRegisterParentId(single(SET_STATUS), { input: { parentId: 37 } }), null);
});

test('quote acceptance is recognised only as exactly { orderId, status: NEW }', () => {
  const doc = single(SET_STATUS);
  assert.equal(quoteAcceptOrderId(doc, { input: { orderId: 593, status: 'NEW' } }), 593);
  assert.equal(quoteAcceptOrderId(doc, { input: { orderId: 593, status: 'NEW', payStatus: 'PAID' } }), null);
  assert.equal(quoteAcceptOrderId(doc, { input: { orderId: 593, status: 'CANCELLED' } }), null);
  assert.equal(quoteAcceptOrderId(doc, { input: { status: 'NEW' } }), null);
  assert.equal(quoteAcceptOrderId(single('mutation m($input: X!) { triggerOrderSendConfirm(input: $input) }'), { input: { orderId: 593, status: 'NEW' } }), null);
});

test('quote acceptance elevates only for the verified viewer\'s own order while it is a quotation', () => {
  const answer = (order: unknown) => ({ data: { order } });
  const viewer = { type: 'Contact', userId: 73 };
  // Order 593 as the order-editor key reads it on the test tenant.
  assert.equal(isOwnQuotation(answer({ status: 'QUOTATION', userId: 73 }), viewer), true);
  // Someone else's quotation, an order already accepted, or a string id.
  assert.equal(isOwnQuotation(answer({ status: 'QUOTATION', userId: 74 }), viewer), false);
  assert.equal(isOwnQuotation(answer({ status: 'NEW', userId: 73 }), viewer), false);
  assert.equal(isOwnQuotation(answer({ status: 'QUOTATION', userId: '73' }), viewer), false);
  // No verified viewer (guest, forged or expired token), or no order (ORDER_NOT_FOUND).
  assert.equal(isOwnQuotation(answer({ status: 'QUOTATION', userId: 73 }), null), false);
  assert.equal(isOwnQuotation({ errors: [{ extensions: { code: 'ORDER_NOT_FOUND' } }], data: null }, viewer), false);
  assert.equal(isOwnQuotation(null, viewer), false);
});

test('the last-order cookie round-trips with its flags and rejects tampering', () => {
  const fresh = signLastOrder(4711, '', SIGN)!;
  assert.deepEqual(verifyLastOrderState(fresh, SIGN), { orderId: 4711, used: '' });
  const after = signLastOrder(4711, 'sq', SIGN)!;
  assert.deepEqual(verifyLastOrderState(after, SIGN), { orderId: 4711, used: 'sq' });
  // Dropping the flags from a used cookie breaks the signature.
  assert.equal(verifyLastOrderState(after.replace('4711.sq.', '4711.'), SIGN), null);
  assert.equal(verifyLastOrderState(fresh.replace('4711', '4712'), SIGN), null);
  assert.equal(verifyLastOrderState(fresh, { ...SIGN, key: 'other-key' }), null);
  // The old unsigned-purpose format (orderId.hex) no longer verifies.
  assert.equal(verifyLastOrderState(`4711.${'a'.repeat(64)}`, SIGN), null);
  assert.equal(verifyLastOrderState('', SIGN), null);
  assert.equal(verifyLastOrderState(undefined, SIGN), null);
  // Expired after an hour.
  assert.equal(verifyLastOrderState(fresh, { ...SIGN, now: SIGN.now + 3601_000 }), null);
});

test('the spent log survives a replayed older cookie and releases a failed call', () => {
  let now = 0;
  const log = createSpentLog({ ttlMs: 1000, maxEntries: 2, now: () => now });
  assert.equal(log.flags(9), '');
  log.add(9, 's');
  log.add(9, 's');
  log.add(9, 'q');
  assert.equal(log.flags(9), 'sq');
  log.remove(9, 's');
  assert.equal(log.flags(9), 'q');
  log.add(10, 's');
  log.add(11, 's');
  // Bounded: the oldest order went first.
  assert.equal(log.flags(9), '');
  now = 1001;
  assert.equal(log.flags(11), '');
});

test('placedOrderId reads cartOrderId from a cartProcess response only', () => {
  const doc = single('mutation cartProcess($id: String!, $input: CartProcessInput!) { cartProcess(id: $id, input: $input) { cartOrderId } }');
  assert.equal(placedOrderId(doc, { data: { cartProcess: { cartOrderId: 99 } } }), 99);
  assert.equal(placedOrderId(doc, { data: { cartProcess: { cartOrderId: '99' } } }), null);
  assert.equal(placedOrderId(doc, { data: { cartProcess: null } }), null);
  assert.equal(placedOrderId(single('query cartProcess { cart(id: "x") { cartId } }'), { data: { cartProcess: { cartOrderId: 99 } } }), null);
});

test('parallel requests with the same last-order cookie: only one reserves the checkout mutation', async () => {
  const log = createSpentLog();
  // The route's awaits between reading the flags and spending one (tryRefresh, viewer lookups).
  const slowLookup = () => new Promise((resolve) => setTimeout(resolve, 5));
  const request = async () => {
    const lastOrder = { orderId: 4711, used: log.flags(4711) };
    const elevated = shouldUseOrderEditorKey(ctx(SET_STATUS, { ...checkout(4711), lastOrder }));
    await slowLookup();
    const flag = elevatedMutationFlag(single(SET_STATUS));
    return elevated && !!flag && log.reserve(4711, flag);
  };
  const results = await Promise.all(Array.from({ length: 5 }, request));
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(log.flags(4711), 's');
  // A failed upstream call releases it for a retry; then it is spent again.
  log.remove(4711, 's');
  assert.equal(log.reserve(4711, 's'), true);
  assert.equal(log.reserve(4711, 's'), false);
});

test('a reserved checkout flag is released when the upstream call throws or fails, kept when it ran', async () => {
  const log = createSpentLog();
  const reserved = { orderId: 4711, flag: 'c' };
  const failed = (r: { ok: boolean }) => !r.ok;
  // A network error (or an unreadable body) after reserve(): released, error passed on.
  assert.equal(log.reserve(4711, 'c'), true);
  const fetchThrows = async (): Promise<{ ok: boolean }> => {
    throw new TypeError('fetch failed');
  };
  await assert.rejects(settleReserved(log, reserved, fetchThrows, failed), /fetch failed/);
  assert.equal(log.flags(4711), '');
  // An upstream error answer: released.
  assert.equal(log.reserve(4711, 'c'), true);
  await settleReserved(log, reserved, async () => ({ ok: false }), failed);
  assert.equal(log.flags(4711), '');
  // It ran: stays spent.
  assert.equal(log.reserve(4711, 'c'), true);
  await settleReserved(log, reserved, async () => ({ ok: true }), failed);
  assert.equal(log.flags(4711), 'c');
  // No reservation: only runs the call.
  assert.deepEqual(await settleReserved(log, null, async () => ({ ok: false }), failed), { ok: false });
  assert.equal(log.flags(4711), 'c');
});
