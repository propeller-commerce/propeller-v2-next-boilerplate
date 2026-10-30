import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readSingleField,
  shouldUseOrderEditorKey,
  placedOrderId,
  signLastOrder,
  verifyLastOrder,
  type RoutingContext,
} from './orderEditorRouting.ts';

// Run with:  npm test

const KEY = 'order-editor-test-key';

const base: Omit<RoutingContext, 'query'> = {
  variables: {},
  orderEditorClient: false,
  hasSession: false,
  isAnonymous: true,
  lastOrderId: null,
};

const ctx = (query: unknown, extra: Partial<RoutingContext> = {}): RoutingContext => ({
  ...base,
  query,
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

test('the real order-editor mutations elevate', () => {
  assert.equal(shouldUseOrderEditorKey(ctx(SET_STATUS)), true);
  for (const field of ['passwordResetLink', 'triggerQuoteSendRequest', 'triggerOrderSendConfirm']) {
    assert.equal(shouldUseOrderEditorKey(ctx(`mutation m($input: X) { ${field}(input: $input) }`)), true, field);
  }
});

test('operation names never elevate on their own', () => {
  assert.equal(shouldUseOrderEditorKey(ctx('query orderSetStatus { contacts { items { email } } }')), false);
  assert.equal(shouldUseOrderEditorKey(ctx('mutation orderSetStatus { contactDelete(id: 1) }')), false);
  assert.equal(shouldUseOrderEditorKey(ctx('query anything { viewer { __typename } }')), false);
});

test('a query selecting an allowlisted mutation field does not elevate', () => {
  assert.equal(shouldUseOrderEditorKey(ctx('query q { orderSetStatus(input: {}) { id } }')), false);
});

test('extra top-level fields or operations do not elevate', () => {
  assert.equal(
    shouldUseOrderEditorKey(ctx('mutation m { orderSetStatus(input: {}) { id } contacts { items { email } } }')),
    false,
  );
  assert.equal(
    shouldUseOrderEditorKey(ctx(`${SET_STATUS}\nquery other { contacts { items { email } } }`)),
    false,
  );
  // Aliased second copy is still two fields.
  assert.equal(
    shouldUseOrderEditorKey(ctx('mutation m { a: orderSetStatus(input: {}) { id } b: orderSetStatus(input: {}) { id } }')),
    false,
  );
});

test('__typename and fragment definitions are ignored', () => {
  assert.equal(
    shouldUseOrderEditorKey(ctx('mutation m { __typename orderSetStatus(input: {}) { ...F } }\nfragment F on Order { id }')),
    true,
  );
});

test('top-level fragment spreads and inline fragments do not elevate', () => {
  assert.equal(
    shouldUseOrderEditorKey(ctx('mutation m { ...M }\nfragment M on Mutation { orderSetStatus(input: {}) { id } }')),
    false,
  );
  assert.equal(
    shouldUseOrderEditorKey(ctx('mutation m { ... on Mutation { orderSetStatus(input: {}) { id } } }')),
    false,
  );
});

test('unparseable or non-string documents never elevate', () => {
  assert.equal(shouldUseOrderEditorKey(ctx('mutation orderSetStatus { orderSetStatus(')), false);
  assert.equal(shouldUseOrderEditorKey(ctx(undefined)), false);
  assert.equal(shouldUseOrderEditorKey(ctx({ query: SET_STATUS })), false);
  assert.equal(readSingleField('{{{'), null);
});

test('contactRegister needs both the order-editor client header and a session', () => {
  assert.equal(shouldUseOrderEditorKey(ctx(CONTACT_REGISTER)), false);
  assert.equal(shouldUseOrderEditorKey(ctx(CONTACT_REGISTER, { orderEditorClient: true })), false);
  assert.equal(shouldUseOrderEditorKey(ctx(CONTACT_REGISTER, { hasSession: true })), false);
  assert.equal(
    shouldUseOrderEditorKey(ctx(CONTACT_REGISTER, { orderEditorClient: true, hasSession: true, isAnonymous: false })),
    true,
  );
});

test('anonymous order query elevates only for the signed last order', () => {
  const vars = { orderId: 4711 };
  assert.equal(shouldUseOrderEditorKey(ctx(ORDER_QUERY, { variables: vars })), false);
  assert.equal(shouldUseOrderEditorKey(ctx(ORDER_QUERY, { variables: vars, lastOrderId: 4712 })), false);
  assert.equal(shouldUseOrderEditorKey(ctx(ORDER_QUERY, { variables: vars, lastOrderId: 4711 })), true);
  // String-typed id variable still compares numerically.
  assert.equal(shouldUseOrderEditorKey(ctx(ORDER_QUERY, { variables: { orderId: '4711' }, lastOrderId: 4711 })), true);
  // Inline literal argument.
  assert.equal(shouldUseOrderEditorKey(ctx('query { order(orderId: 4711) { id } }', { lastOrderId: 4711 })), true);
  // A UUID lookup could select a different order.
  assert.equal(
    shouldUseOrderEditorKey(ctx(ORDER_QUERY, { variables: { ...vars, orderUUID: 'abc' }, lastOrderId: 4711 })),
    false,
  );
  // Logged-in callers keep the general key.
  assert.equal(
    shouldUseOrderEditorKey(ctx(ORDER_QUERY, { variables: vars, lastOrderId: 4711, isAnonymous: false })),
    false,
  );
  // Missing id.
  assert.equal(shouldUseOrderEditorKey(ctx(ORDER_QUERY, { variables: {}, lastOrderId: 4711 })), false);
  // `order` as a mutation field is not the query.
  assert.equal(shouldUseOrderEditorKey(ctx('mutation { order(orderId: 4711) { id } }', { lastOrderId: 4711 })), false);
});

test('last-order cookie round-trips and rejects tampering', () => {
  const value = signLastOrder(4711, KEY);
  assert.match(value, /^4711\.[0-9a-f]{64}$/);
  assert.equal(verifyLastOrder(value, KEY), 4711);
  assert.equal(verifyLastOrder(value, 'other-key'), null);
  assert.equal(verifyLastOrder(value.replace('4711', '4712'), KEY), null);
  assert.equal(verifyLastOrder(`${value}0`, KEY), null);
  assert.equal(verifyLastOrder('4711', KEY), null);
  assert.equal(verifyLastOrder('', KEY), null);
  assert.equal(verifyLastOrder(undefined, KEY), null);
  assert.equal(verifyLastOrder(value, ''), null);
});

test('placedOrderId reads cartOrderId from a cartProcess response only', () => {
  const doc = 'mutation cartProcess($id: String!, $input: CartProcessInput!) { cartProcess(id: $id, input: $input) { cartOrderId } }';
  assert.equal(placedOrderId(doc, { data: { cartProcess: { cartOrderId: 99 } } }), 99);
  assert.equal(placedOrderId(doc, { data: { cartProcess: { cartOrderId: '99' } } }), null);
  assert.equal(placedOrderId(doc, { data: { cartProcess: null } }), null);
  assert.equal(placedOrderId('query cartProcess { cart(id: "x") { cartId } }', { data: { cartProcess: { cartOrderId: 99 } } }), null);
});
