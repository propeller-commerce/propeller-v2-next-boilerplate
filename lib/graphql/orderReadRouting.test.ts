import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parse } from 'graphql';
import { createViewerLookup, type VerifiedViewer } from '../auth/viewer.ts';
import { forVisitor } from '../catalog/hidePrices.ts';
import { readSingleField } from './orderEditorRouting.ts';
import { inspectDocument } from './priceGate.ts';
import { documentHash } from './registrationRouting.ts';
import {
  ORDER_READ_DOCUMENT_HASHES,
  isOrderRead,
  isOwnOrder,
  mayReadOrder,
  type OrderReadContext,
} from './orderReadRouting.ts';

// Run with:  npm test

// The installed SDK's own documents: what useOrders sends through /api/graphql.
const OPS = 'node_modules/@propeller-commerce/propeller-sdk-v2/dist/esm/generated/operations/';
const sdkDocument = async (name: string): Promise<string> =>
  (await import(pathToFileURL(`${process.cwd()}/${OPS}${name}.js`).href)).document;

const ORDER = await sdkDocument('order');
const ORDERS = await sdkDocument('orders');
const ORDER_PDF = await sdkDocument('orderGetPDF');
const QUOTE_PDF = await sdkDocument('quoteGetPDF');

const CONTACT: VerifiedViewer = { type: 'Contact', userId: 73, companyId: 5, companyIds: [5, 6], managerCompanyIds: [] };
const CUSTOMER: VerifiedViewer = { type: 'Customer', userId: 88 };

// Orders on the fake tenant: 4711 is the contact's, 4712 someone else's, 4901-4903 the contact's drafts.
const OWNERS: Record<number, [number, string]> = {
  4711: [73, 'NEW'],
  4712: [74, 'NEW'],
  4800: [88, 'QUOTATION'],
  4901: [73, 'DRAFT_ORDER'],
  4902: [73, 'DRAFT_QUOTATION'],
  4903: [73, 'DRAFT_REVIEW'],
};
const lookups: number[] = [];
const ownerLookup = async (orderId: number) => {
  lookups.push(orderId);
  const owner = OWNERS[orderId];
  return { data: { order: owner ? { status: owner[1], userId: owner[0] } : null } };
};

const read = (query: string, ctx: Partial<OrderReadContext> = {}) => {
  const doc = parse(query);
  return mayReadOrder(doc, readSingleField(doc), {
    viewer: null,
    lastOrderId: null,
    variables: {},
    lookupOwner: ownerLookup,
    ...ctx,
  });
};
const isRead = (query: string) => {
  const doc = parse(query);
  return isOrderRead(doc, inspectDocument(doc).fields);
};
// useOrders.getOrderById's variables.
const byId = (orderId: unknown, extra: Record<string, unknown> = {}) => ({
  orderId,
  imageSearchFilters: { page: 1, offset: 1 },
  imageVariantFilters: { transformations: [] },
  language: 'NL',
  ...extra,
});
// useOrders.fetchOrders's variables.
const search = (input: Record<string, unknown>) => ({
  input: { status: ['NEW', 'CONFIRMED', 'VALIDATED', 'ORDER'], page: 1, offset: 10, term: '', termFields: ['ID'], ...input },
});

test('the order-read hashes match the installed SDK documents (update them after an SDK upgrade)', () => {
  assert.equal(documentHash(parse(ORDER)), ORDER_READ_DOCUMENT_HASHES.order);
  assert.equal(documentHash(parse(ORDERS)), ORDER_READ_DOCUMENT_HASHES.orders);
  assert.equal(documentHash(parse(ORDER_PDF)), ORDER_READ_DOCUMENT_HASHES.orderGetPDF);
  assert.equal(documentHash(parse(QUOTE_PDF)), ORDER_READ_DOCUMENT_HASHES.quoteGetPDF);
});

test('order reads are recognised anywhere in a query; no other SDK query is one', async () => {
  assert.equal(isRead(ORDER), true);
  assert.equal(isRead('query { cart(id: "x") { cartId } }'), false);
  assert.equal(isRead('query { viewer { __typename } }'), false);
  // Nested, aliased, next to another root field, or in a second operation.
  assert.equal(isRead('query { viewer { __typename x: orders { items { id } } } }'), true);
  assert.equal(isRead('query { a: order(orderId: 1) { id } }'), true);
  assert.equal(isRead('query { viewer { __typename } tender(orderId: 1) { orderId } }'), true);
  assert.equal(isRead('mutation m { logout } query q { orderRevisions(input: {}) { items { orderId } } }'), true);
  // Every SDK query that trips it reads orders: no catalog, cart or account document does.
  const names = readdirSync(`${process.cwd()}/${OPS}`).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));
  const reads: string[] = [];
  for (const name of names) {
    const doc = await sdkDocument(name).catch(() => undefined);
    if (typeof doc === 'string' && isRead(doc)) reads.push(name);
  }
  assert.deepEqual(reads.sort(), [
    'order',
    'orderAddress',
    'orderAddresses',
    'orderGetPDF',
    'orderRevision',
    'orderRevisions',
    'orders',
    'payment',
    'payments',
    'quoteGetPDF',
    'shipment',
    'shipmentItem',
    'shipmentItems',
    'shipments',
    'tender',
  ]);
});

test('shipments, payments and order addresses by id are refused for everyone, at any depth and aliased', async () => {
  const docs = [
    'query($o: Int!) { addressesByOrderId(orderId: $o) { firstName street } }',
    'query { shipment(id: "1") { id orderId } }',
    'query { shipments(input: {}) { items { id orderId } } }',
    'query { shipmentItem(id: 1) { id } }',
    'query { shipmentItems(input: {}) { items { id } } }',
    'query { payment(searchBy: { orderId: 4711 }) { amount userId } }',
    'query { x: payments(input: {}) { items { orderId amount userId } } }',
    'query { viewer { __typename p: payments(input: {}) { items { orderId } } } }',
  ];
  for (const doc of docs) {
    assert.equal(isRead(doc), true, doc);
    assert.equal(await read(doc, { viewer: CONTACT, variables: { o: 4711 }, lastOrderId: 4711 }), false, doc);
    assert.equal(await read(doc, { variables: { o: 4711 }, lastOrderId: 4711 }), false, doc);
  }
  // The SDK documents for them are refused too.
  for (const name of ['shipment', 'shipments', 'shipmentItem', 'shipmentItems', 'payment', 'payments']) {
    assert.equal(await read(await sdkDocument(name), { viewer: CONTACT, lastOrderId: 4711 }), false, name);
  }
  // Order.shipments inside the SDK order document stays: it is the owner's own order.
  assert.equal(await read(ORDER, { viewer: CONTACT, variables: byId(4711) }), true);
});

test('an order-read response loses every costPrice, at item level and nested, for its owner too', () => {
  const order = {
    data: {
      order: {
        id: 4711,
        total: { gross: 10, net: 12.1 },
        items: [
          { id: 1, price: 5, customerPrice: 5, costPrice: 2.5, product: { inventory: { balance: [{ quantity: 3, costPrice: 2.4 }] } } },
          { id: 2, price: 5, costPrice: null },
        ],
      },
    },
  };
  // The owner may see prices (canSeePrices); the cost price still goes.
  const served = forVisitor(order, true);
  assert.equal(JSON.stringify(served).includes('costPrice'), false);
  assert.deepEqual(served, {
    data: {
      order: {
        id: 4711,
        total: { gross: 10, net: 12.1 },
        items: [
          { id: 1, price: 5, customerPrice: 5, product: { inventory: { balance: [{ quantity: 3 }] } } },
          { id: 2, price: 5 },
        ],
      },
    },
  });
  const orders = { data: { orders: { itemsFound: 1, items: [{ id: 4711, items: [{ costPrice: 1, quantity: 2 }] }] } } };
  assert.deepEqual(forVisitor(orders, true), { data: { orders: { itemsFound: 1, items: [{ id: 4711, items: [{ quantity: 2 }] }] } } });
});

test('the cartProcess mutation and other lone mutations are not order reads', async () => {
  assert.equal(isRead(await sdkDocument('cartProcess')), false);
  assert.equal(isRead(await sdkDocument('orderSetStatus')), false);
});

test('guest: only the order of the signed last-order cookie, by id', async () => {
  lookups.length = 0;
  assert.equal(await read(ORDER, { variables: byId(4712) }), false);
  assert.equal(await read(ORDER, { variables: byId(4712), lastOrderId: 4711 }), false);
  assert.equal(await read(ORDER, { variables: byId(4711), lastOrderId: 4711 }), true);
  assert.equal(await read(ORDER, { variables: byId('4711'), lastOrderId: 4711 }), true);
  // A UUID lookup could resolve a different order; no id at all is nothing.
  assert.equal(await read(ORDER, { variables: byId(4711, { orderUUID: 'abc' }), lastOrderId: 4711 }), false);
  assert.equal(await read(ORDER, { variables: byId(undefined), lastOrderId: 4711 }), false);
  // The thank-you page reads no PDF; lists and quote PDFs need an account.
  assert.equal(await read(ORDER_PDF, { variables: { orderId: 4711 }, lastOrderId: 4711 }), false);
  assert.equal(await read(QUOTE_PDF, { variables: { quoteId: 4711 }, lastOrderId: 4711 }), false);
  assert.equal(await read(ORDERS, { variables: search({ userId: [73] }), lastOrderId: 4711 }), false);
  // A guest never triggers an owner lookup.
  assert.deepEqual(lookups, []);
});

test('verified owner: their order, its PDF and their quote PDF; anyone else\'s is refused', async () => {
  lookups.length = 0;
  assert.equal(await read(ORDER, { viewer: CONTACT, variables: byId(4711) }), true);
  assert.equal(await read(ORDER_PDF, { viewer: CONTACT, variables: { orderId: 4711 } }), true);
  assert.equal(await read(QUOTE_PDF, { viewer: CONTACT, variables: { quoteId: 4711 } }), true);
  assert.deepEqual(lookups, [4711, 4711, 4711]);
  assert.equal(await read(ORDER, { viewer: CONTACT, variables: byId(4712) }), false);
  assert.equal(await read(ORDER_PDF, { viewer: CONTACT, variables: { orderId: 4712 } }), false);
  assert.equal(await read(QUOTE_PDF, { viewer: CONTACT, variables: { quoteId: 4712 } }), false);
  assert.equal(await read(ORDER, { viewer: CUSTOMER, variables: byId(4800) }), true);
  assert.equal(await read(ORDER, { viewer: CUSTOMER, variables: byId(4711) }), false);
  // The last-order cookie gives a logged-in viewer nothing beyond their own orders.
  assert.equal(await read(ORDER, { viewer: CUSTOMER, variables: byId(4711), lastOrderId: 4711 }), false);
  // By UUID: refused, no lookup.
  lookups.length = 0;
  assert.equal(await read(ORDER, { viewer: CONTACT, variables: byId(4711, { orderUUID: 'abc' }) }), false);
  assert.equal(await read(ORDER, { viewer: CONTACT, variables: byId(null, { orderUUID: 'abc' }) }), false);
  assert.deepEqual(lookups, []);
});

test('an owner lookup that fails, errors or finds nothing refuses', async () => {
  const answer = (response: unknown) => async () => response;
  const viaLookup = (lookupOwner: OrderReadContext['lookupOwner']) =>
    read(ORDER, { viewer: CONTACT, variables: byId(4711), lookupOwner });
  assert.equal(
    await viaLookup(async () => {
      throw new TypeError('fetch failed');
    }),
    false,
  );
  assert.equal(await viaLookup(answer({ errors: [{ extensions: { code: 'ORDER_NOT_FOUND' } }], data: null })), false);
  assert.equal(await viaLookup(answer({ data: { order: null } })), false);
  assert.equal(await viaLookup(answer(null)), false);
  assert.equal(await viaLookup(answer({ data: { order: { userId: '73', status: 'NEW' } } })), false);
  // No status to tell a draft from an order: no.
  assert.equal(await viaLookup(answer({ data: { order: { userId: 73 } } })), false);
  assert.equal(isOwnOrder({ data: { order: { userId: 73, status: 'NEW' } } }, CONTACT), true);
});

test('drafts stay hidden from their owner: no single read, PDF or quote PDF of a DRAFT_* order', async () => {
  for (const orderId of [4901, 4902, 4903]) {
    assert.equal(await read(ORDER, { viewer: CONTACT, variables: byId(orderId) }), false, String(orderId));
    assert.equal(await read(ORDER_PDF, { viewer: CONTACT, variables: { orderId } }), false, String(orderId));
    assert.equal(await read(QUOTE_PDF, { viewer: CONTACT, variables: { quoteId: orderId } }), false, String(orderId));
  }
  // A published quotation is the owner's to read.
  assert.equal(await read(QUOTE_PDF, { viewer: CUSTOMER, variables: { quoteId: 4800 } }), true);
});

test('orders: only the statuses the shop\'s pages ask for, never a draft', async () => {
  const list = (status: unknown) =>
    read(ORDERS, {
      viewer: CONTACT,
      variables: { input: { userId: [73], companyIds: [5], page: 1, offset: 10, ...(status !== undefined && { status }) } },
    });
  // react-ui useOrders' default (orders page, dashboard), the quotes page and dashboard card, quote requests.
  assert.equal(await list(['NEW', 'CONFIRMED', 'VALIDATED', 'ORDER']), true);
  assert.equal(await list(['QUOTATION']), true);
  assert.equal(await list(['REQUEST']), true);
  assert.equal(await list('QUOTATION'), true);
  // No status filter would list drafts too; drafts and other statuses are refused.
  assert.equal(await list(undefined), false);
  assert.equal(await list(null), false);
  assert.equal(await list([]), false);
  assert.equal(await list(['DRAFT_QUOTATION']), false);
  assert.equal(await list(['NEW', 'DRAFT_ORDER']), false);
  assert.equal(await list(['REJECTED']), false);
  assert.equal(await list([['NEW']]), false);
});

test('orders: only pinned to the viewer, companies only a contact\'s own', async () => {
  const own = (input: Record<string, unknown>, viewer: VerifiedViewer = CONTACT) =>
    read(ORDERS, { viewer, variables: search(input) });
  assert.equal(await own({ userId: [73] }), true);
  assert.equal(await own({ userId: 73 }), true);
  assert.equal(await own({ userId: [73], companyIds: [5] }), true);
  assert.equal(await own({ userId: [73], companyIds: [5, 6] }), true);
  assert.equal(await own({ userId: [73], companyIds: null }), true);
  assert.equal(await own({ userId: [74] }), false);
  assert.equal(await own({ userId: [73, 74] }), false);
  assert.equal(await own({ userId: ['73'] }), false);
  assert.equal(await own({ userId: [] }), false);
  assert.equal(await own({}), false);
  assert.equal(await own({ companyIds: [5] }), false);
  assert.equal(await own({ userId: [73], companyIds: [7] }), false);
  assert.equal(await own({ userId: [73], companyIds: [5, 7] }), false);
  assert.equal(await own({ userId: [88] }, CUSTOMER), true);
  assert.equal(await own({ userId: [88], companyIds: [5] }, CUSTOMER), false);
  assert.equal(await read(ORDERS, { viewer: CONTACT, variables: {} }), false);
});

test('only the SDK documents are served: own selections, aliases, nesting and extra fields are refused', async () => {
  const owner = { viewer: CONTACT, variables: byId(4711), lastOrderId: 4711 };
  assert.equal(await read(ORDER, owner), true);
  // The order-editor key would run any selection: Order.company's contacts, prices for any company.
  assert.equal(await read('query q($orderId: Int) { order(orderId: $orderId) { company { contacts { items { email } } } } }', owner), false);
  assert.equal(await read('query { order(orderId: 4711) { id } }', owner), false);
  assert.equal(await read(ORDER.replace('order(orderId:', 'x: order(orderId:'), owner), false);
  assert.equal(await read(ORDER.replace('order(orderId:', 'viewer { __typename } order(orderId:'), owner), false);
  assert.equal(await read('query { viewer { __typename } order(orderId: 4711) { id } }', owner), false);
  // The same for a guest's last order.
  assert.equal(await read('query { order(orderId: 4711) { id company { name } } }', { lastOrderId: 4711 }), false);
});

test('a bearer upstream does not accept reads as a guest', async () => {
  // Upstream answers 401 / a bare User for a forged or expired token: no verified viewer.
  const verifiedViewer = createViewerLookup(async () => null);
  const viewer = await verifiedViewer('forged.jwt.token');
  assert.equal(viewer, null);
  assert.equal(await read(ORDER, { viewer, variables: byId(4712) }), false);
  assert.equal(await read(ORDERS, { viewer, variables: search({ userId: [74] }) }), false);
  assert.equal(await read(ORDER, { viewer, variables: byId(4711), lastOrderId: 4711 }), true);
});
