import test from 'node:test';
import assert from 'node:assert/strict';
import { parse } from 'graphql';
import { hasPriceFilter, inspectDocument, isAllowedAlias, withoutPriceFilters } from './priceGate.ts';
import { pricesHidden, pricesRestricted, canSeePrices } from '../catalog/priceVisibility.ts';

// Run with:  npm test

const inspect = (query: string) => inspectDocument(parse(query));

test('prices are restricted in semi-closed and closed portals only', () => {
  assert.equal(pricesRestricted('semi-closed'), true);
  assert.equal(pricesRestricted('closed'), true);
  assert.equal(pricesRestricted('open'), false);
  assert.equal(pricesRestricted(''), false);
  assert.equal(pricesRestricted(undefined), false);
});

test('only a logged-in Contact or Customer sees prices there', () => {
  // SSR users (Contact / Customer objects) and verified viewers (lib/auth/viewer.ts).
  assert.equal(canSeePrices({ contactId: 73 }), true);
  assert.equal(canSeePrices({ customerId: 210 }), true);
  assert.equal(canSeePrices({ type: 'Contact', userId: 73 }), true);
  assert.equal(canSeePrices({ type: 'Customer', userId: 210 }), true);
  // The anonymous viewer upstream returns for an expired token, and guests.
  assert.equal(canSeePrices({ __typename: 'User' }), false);
  assert.equal(canSeePrices({ contactId: '73' }), false);
  assert.equal(canSeePrices(null), false);
  assert.equal(pricesHidden('closed', null), true);
  assert.equal(pricesHidden('semi-closed', { __typename: 'User' }), true);
  assert.equal(pricesHidden('semi-closed', { contactId: 73 }), false);
  assert.equal(pricesHidden('open', null), false);
});

test('every field name is collected, introspection anywhere included', () => {
  assert.ok(inspect('{ __schema { types { name } } }').fields.has('__schema'));
  assert.ok(inspect('{ products { items { t: __type(name: "Product") { name } } } }').fields.has('__type'));
  assert.ok(inspect('query { ...F } fragment F on Query { __schema { queryType { name } } }').fields.has('__schema'));
  assert.ok(inspect('mutation { a: viewer { __typename } b: passwordResetLink(input: { email: "x" }) }').fields.has('passwordResetLink'));
  assert.equal(inspect('{ product(productId: 1) { __typename name { value } } }').fields.has('__schema'), false);
});

test('an alias on a price field is detected, also inside fragments', () => {
  assert.equal(inspect('{ products { items { ... on Product { p: price { gross } } } } }').foreignAlias, true);
  assert.equal(inspect('query { product(productId: 1) { ...F } } fragment F on Product { tiers: bulkPrices { net } }').foreignAlias, true);
  assert.equal(inspect('{ product(productId: 1) { pd: priceData { per } } }').foreignAlias, true);
  assert.equal(inspect('{ cart(id: "c") { t: total { totalGross } } }').foreignAlias, true);
  assert.equal(inspect('{ cart(id: "c") { total { g: totalGross } } }').foreignAlias, true);
});

test('aliasing into a key hidePrices keeps is refused: every alias but the SDK ones', () => {
  // (a) the list price under priceData.per
  assert.equal(inspect('{ product(productId: 1) { priceData { per: list } } }').foreignAlias, true);
  // (b) a whole product page, prices included, under priceData.per
  const smuggle = `query { priceData: products(input: { offset: 100, page: 1, term: "" }) {
    per: items { ... on Product { sku price { net gross } bulkPrices { net } priceData { list costPrices { value } } } } } }`;
  assert.equal(inspect(smuggle).foreignAlias, true);
  // Any other alias too, also on harmless fields and inside fragments.
  assert.equal(inspect('{ products { items { ... on Product { name: names { value } } } } }').foreignAlias, true);
  assert.equal(inspect('{ a: product(productId: 1) { productId } }').foreignAlias, true);
  assert.equal(inspect('query { product(productId: 1) { ...F } } fragment F on Product { display: sku }').foreignAlias, true);
  assert.equal(inspect('{ category(categoryId: 1) { urlId: name { value } } }').foreignAlias, true);
  assert.equal(inspect('{ m: machine(source: "x", sourceId: "1") { id } }').foreignAlias, true);
});

test('the SDK aliases and unaliased price fields are fine', () => {
  assert.equal(isAllowedAlias('urlId', 'categoryId'), true);
  assert.equal(inspect('{ category(categoryId: 1) { urlId: categoryId categoryId } }').foreignAlias, false);
  // react-ui's useMachines root query.
  assert.equal(inspect('query RootMachines { machine_0: machine(source: "x", sourceId: "1") { id } machine_12: machine(source: "x", sourceId: "2") { id } }').foreignAlias, false);
  assert.equal(inspect('{ products { items { ... on Product { price { gross } priceData { per display } } } } }').foreignAlias, false);
});

test('a price filter or sort smuggled through a variable inside the document is refused', () => {
  // (1) price: $p with { p: { from, to } }
  assert.equal(inspect('query q($p: PriceFilterInput) { products(input: { productIds: [1], price: $p }) { itemsFound } }').inlinePriceFilter, true);
  // (2) sortInputs: [{ field: $f }] with { f: "PRICE" }
  assert.equal(inspect('query q($f: ProductSortField!) { products(input: { sortInputs: [{ field: $f, order: ASC }] }) { itemsFound } }').inlinePriceFilter, true);
  // The SDK's shape (the whole input as one variable) is cleaned, not refused.
  assert.equal(inspect('query q($input: ProductSearchInput) { products(input: $input) { itemsFound } }').inlinePriceFilter, false);
});

test('a PRICE sort passed as a single object (list coercion), at any depth, is found and removed', () => {
  // (3) sortInputs: $s with { s: { field: "PRICE" } }
  assert.equal(hasPriceFilter({ s: { field: 'PRICE', order: 'ASC' } }), true);
  assert.deepEqual(withoutPriceFilters({ s: { field: 'PRICE', order: 'ASC' }, t: 'x' }), { t: 'x' });
  // (4) $i = { sortInputs: { field: "PRICE" } }
  const vars = { i: { term: 'x', sortInputs: { field: 'PRICE', order: 'DESC' } } };
  assert.equal(hasPriceFilter(vars), true);
  assert.deepEqual(withoutPriceFilters(vars), { i: { term: 'x' } });
  assert.equal(hasPriceFilter({ i: { sortInputs: { field: 'NAME' } } }), false);
});

test('price filters and PRICE sorts are found inline and in variables, and removed from variables', () => {
  assert.equal(inspect('{ products(input: { price: { from: 76, to: 77 } }) { itemsFound } }').inlinePriceFilter, true);
  assert.equal(inspect('{ products(input: { sortInputs: [{ field: PRICE, order: ASC }] }) { itemsFound } }').inlinePriceFilter, true);
  assert.equal(inspect('mutation { cartAddItem(id: "c", input: { productId: 1, price: 5 }) { cartId } }').inlinePriceFilter, false);
  assert.equal(inspect('query q($input: ProductSearchInput) { products(input: $input) { itemsFound } }').inlinePriceFilter, false);

  const vars = { input: { term: 'x', price: { from: 76, to: 77 }, sortInputs: [{ field: 'PRICE', order: 'ASC' }, { field: 'NAME', order: 'ASC' }] } };
  assert.equal(hasPriceFilter(vars), true);
  assert.deepEqual(withoutPriceFilters(vars), { input: { term: 'x', sortInputs: [{ field: 'NAME', order: 'ASC' }] } });
  assert.equal(hasPriceFilter({ input: { term: 'x', price: null } }), false);
  assert.equal(hasPriceFilter({ input: { productId: 1, price: 5 } }), false);
  assert.deepEqual(withoutPriceFilters({ input: { productId: 1, price: 5 } }), { input: { productId: 1, price: 5 } });
  assert.equal(hasPriceFilter(undefined), false);
});

test('an alias on a cost-price field is flagged for every viewer, also inside fragments; unaliased or parent aliases are not', () => {
  assert.equal(inspect('{ products { items { ... on Product { priceData { c: costPrices { value } } } } } }').costPriceAlias, true);
  assert.equal(inspect('{ products { items { ... on Product { inventory { balance { cp: costPrice } } } } } }').costPriceAlias, true);
  assert.equal(inspect('query { product(productId: 1) { ...F } } fragment F on Product { priceData { x: costPrices { value } } }').costPriceAlias, true);
  // ProductPrice.cost is the same number.
  assert.equal(inspect('{ product(productId: 1) { price { x: cost } } }').costPriceAlias, true);
  assert.equal(inspect('{ product(productId: 1) { bulkPrices { ... on ProductPrice { c: cost } } } }').costPriceAlias, true);
  assert.equal(inspect('{ product(productId: 1) { price { cost } } }').costPriceAlias, false);
  // Unaliased, or an alias on a parent: the key stays `costPrices` and withoutCostPrices removes it.
  assert.equal(inspect('{ product(productId: 1) { priceData { costPrices { value } } } }').costPriceAlias, false);
  assert.equal(inspect('{ product(productId: 1) { pd: priceData { costPrices { value } } } }').costPriceAlias, false);
});

test('an alias that could carry a discount amount or bulkCostPrices is flagged; plain selections are not', () => {
  for (const query of [
    '{ x: bulkCostPrices(input: {}) { items { value } } }',
    '{ product(productId: 1) { price { d: discount { value } } } }',
    '{ product(productId: 1) { bulkPrices { discount { v: value } } } }',
    '{ product(productId: 1) { bulkPrices { discount { quantityFrom: value } } } }',
    '{ product(productId: 1) { bulkPrices { discount { ... on BulkPrice { q: value } } } } }',
    'query { product(productId: 1) { bulkPrices { discount { ...D } } } } fragment D on BulkPrice { q: value }',
  ]) {
    assert.equal(inspect(query).costPriceAlias, true, query);
  }
  assert.equal(inspect('{ product(productId: 1) { bulkPrices { discount { value quantityFrom } } } }').costPriceAlias, false);
  assert.equal(inspect('{ product(productId: 1) { names: name { nl: value } bulkPrices { discount { value } } } }').costPriceAlias, false);
});
