import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { Kind, parse, visit } from 'graphql';
import {
  ELEVATED_MUTATION_DOCUMENT_HASHES,
  contactRegisterParentId,
  isKnownElevatedMutation,
  quoteAcceptOrderId,
  readSingleField,
  shouldUseOrderEditorKey,
  type RoutingContext,
} from './orderEditorRouting.ts';
import { inspectDocument, isAllowedAlias } from './priceGate.ts';
import { COST_PRICE_KEYS } from '../catalog/hidePrices.ts';
import { documentHash } from './registrationRouting.ts';

// The installed SDK's own documents: what the shop actually sends through /api/graphql.
const OPS = 'node_modules/@propeller-commerce/propeller-sdk-v2/dist/esm/generated/operations/';
const sdkDocument = async (name: string): Promise<string> =>
  (await import(pathToFileURL(`${process.cwd()}/${OPS}${name}.js`).href)).document;

const ctx = (query: string, extra: Partial<RoutingContext> = {}): RoutingContext => ({
  single: readSingleField(parse(query)),
  variables: {},
  lastOrder: null,
  ...extra,
});

test('the SDK checkout mutations (react-ui placeOrder) elevate only for the last order', async () => {
  // placeOrder: orderSetStatus { orderId, status, payStatus: OPEN, sendOrderConfirmationEmail, … }.
  const setStatus = await sdkDocument('orderSetStatus');
  for (const status of ['NEW', 'REQUEST', 'UNFINISHED']) {
    const input = { orderId: 9, status, payStatus: 'OPEN', sendOrderConfirmationEmail: true, addPDFAttachment: true, triggerOrderSendConfirmEvent: true, deleteCart: true };
    assert.equal(shouldUseOrderEditorKey(ctx(setStatus, { variables: { input }, lastOrder: { orderId: 9, used: '' } })), true, status);
    assert.equal(shouldUseOrderEditorKey(ctx(setStatus, { variables: { input }, lastOrder: { orderId: 8, used: '' } })), false, status);
  }
  // Quote mode: triggerQuoteSendRequest { orderId, language } after orderSetStatus.
  for (const name of ['triggerQuoteSendRequest', 'triggerOrderSendConfirm']) {
    const doc = await sdkDocument(name);
    const variables = { input: { orderId: 9, language: 'NL' } };
    assert.equal(shouldUseOrderEditorKey(ctx(doc, { variables, lastOrder: { orderId: 9, used: 's' } })), true, name);
    assert.equal(shouldUseOrderEditorKey(ctx(doc, { variables })), false, name);
  }
  assert.equal(shouldUseOrderEditorKey(ctx(await sdkDocument('passwordResetLink'), { lastOrder: { orderId: 9, used: '' } })), false);
});

test('the SDK quote acceptance and contactRegister are recognised for the viewer checks', async () => {
  const setStatus = readSingleField(parse(await sdkDocument('orderSetStatus')));
  assert.equal(quoteAcceptOrderId(setStatus, { input: { orderId: 593, status: 'NEW' } }), 593);
  const register = readSingleField(parse(await sdkDocument('contactRegister')));
  assert.equal(contactRegisterParentId(register, { contactRegisterInput: { email: 'a@b.c', parentId: 37 } }), 37);
});

test('the SDK cart and viewer documents never elevate', async () => {
  for (const name of ['cartProcess', 'viewer', 'contactRegister']) {
    const doc = await sdkDocument(name);
    assert.equal(shouldUseOrderEditorKey(ctx(doc, { lastOrder: { orderId: 9, used: '' } })), false, name);
  }
});

test('no SDK document is refused by the proxy guards (foreign alias, inline price filter, cost-price alias, introspection)', async () => {
  const names = readdirSync(`${process.cwd()}/${OPS}`).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));
  assert.ok(names.length > 100, 'SDK operations found');
  const offenders: string[] = [];
  for (const name of names) {
    const doc = await sdkDocument(name).catch(() => undefined);
    if (typeof doc !== 'string') continue;
    const guards = inspectDocument(parse(doc));
    if (guards.foreignAlias || guards.inlinePriceFilter || guards.costPriceAlias || guards.fields.has('__schema') || guards.fields.has('__type')) {
      offenders.push(name);
    }
  }
  assert.deepEqual(offenders, []);
});

test('every alias in every SDK document is on the proxy allowlist (a new one fails here first)', async () => {
  const names = readdirSync(`${process.cwd()}/${OPS}`).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));
  const seen = new Set<string>();
  for (const name of names) {
    const doc = await sdkDocument(name).catch(() => undefined);
    if (typeof doc !== 'string') continue;
    visit(parse(doc), {
      [Kind.FIELD](node) {
        if (node.alias) seen.add(`${node.alias.value}: ${node.name.value}`);
      },
    });
  }
  assert.ok(seen.has('urlId: categoryId'), 'the SDK alias is found');
  for (const pair of seen) {
    const [alias, field] = pair.split(': ');
    assert.equal(isAllowedAlias(alias, field), true, pair);
  }
});

test('the elevated mutation hashes match the installed SDK documents (update them after an SDK upgrade)', async () => {
  for (const [name, hash] of Object.entries(ELEVATED_MUTATION_DOCUMENT_HASHES)) {
    assert.equal(documentHash(parse(await sdkDocument(name))), hash, name);
  }
});

test('elevated mutations run only as the shop\'s own documents: a custom selection on each is refused', async () => {
  // What react-ui placeOrder / QuoteActions and the authorization settings send.
  for (const name of ['orderSetStatus', 'triggerQuoteSendRequest', 'triggerOrderSendConfirm', 'contactRegister']) {
    assert.equal(isKnownElevatedMutation(parse(await sdkDocument(name))), true, name);
  }
  // The order-editor key would resolve any selection on the returned order or contact.
  const custom = [
    'mutation m($input: OrderSetStatusInput!) { orderSetStatus(input: $input) { company { contacts { items { email } } } } }',
    'mutation m($input: OrderSetStatusInput!) { orderSetStatus(input: $input) { id } }',
    'mutation m($input: TriggerQuoteSendRequestEventInput!) { triggerQuoteSendRequest(input: $input) }',
    'mutation m($input: TriggerOrderSendConfirmEventInput!) { triggerOrderSendConfirm(input: $input) }',
    'mutation m($input: RegisterContactInput!) { contactRegister(input: $input) { contact { company { contacts { items { email } } } } } }',
  ];
  for (const doc of custom) assert.equal(isKnownElevatedMutation(parse(doc)), false, doc);
  // The SDK document aliased, or with one more field, is no longer the shop's own.
  const setStatus = await sdkDocument('orderSetStatus');
  assert.equal(isKnownElevatedMutation(parse(setStatus.replace('orderSetStatus(input:', 'x: orderSetStatus(input:'))), false);
  assert.equal(isKnownElevatedMutation(parse(setStatus.replace('orderSetStatus(input: $input) {', 'orderSetStatus(input: $input) { company { name }'))), false);
  // Other documents are not elevated mutations at all.
  for (const name of ['cartProcess', 'order', 'passwordResetLink']) {
    assert.equal(isKnownElevatedMutation(parse(await sdkDocument(name))), false, name);
  }
});

test('no SDK document aliases a cost-price field (costPrice, costPrices, cost): the proxy refuses those aliases', async () => {
  const names = readdirSync(`${process.cwd()}/${OPS}`).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3));
  const aliased: string[] = [];
  let selecting = 0;
  for (const name of names) {
    const doc = await sdkDocument(name).catch(() => undefined);
    if (typeof doc !== 'string') continue;
    let selects = false;
    visit(parse(doc), {
      [Kind.FIELD](node) {
        if (!COST_PRICE_KEYS.has(node.name.value)) return;
        selects = true;
        if (node.alias) aliased.push(`${name}: ${node.alias.value}: ${node.name.value}`);
      },
    });
    if (selects) selecting++;
  }
  assert.ok(selecting > 10, 'SDK documents select cost prices');
  assert.deepEqual(aliased, []);
});
