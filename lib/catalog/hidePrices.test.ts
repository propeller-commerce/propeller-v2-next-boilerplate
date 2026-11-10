import test from 'node:test';
import assert from 'node:assert/strict';
import { hidePrices } from './hidePrices.ts';

const product = {
  productId: 417,
  name: [{ language: 'NL', value: 'M96 SMART' }],
  price: { list: 58, cost: 6, net: 70.18, gross: 58, discount: null },
  priceData: { per: 'ITEM', list: 58, costPrices: [{ value: 6 }], suggested: 60, store: 59, display: 'DEFAULT' },
  bulkPrices: [{ net: 65, gross: 54 }],
  surcharges: [{ id: 1, value: 2 }],
  bundles: [{ id: 3, price: { net: 100, gross: 82 }, items: [{ product: { price: { net: 1 } } }] }],
  inventory: { totalQuantity: 4 },
};

test('drops every price field and keeps the rest', () => {
  const out = hidePrices(product);
  assert.equal(out.price, null);
  assert.deepEqual(out.priceData, { per: 'ITEM', display: 'DEFAULT' });
  assert.deepEqual(out.bulkPrices, []);
  assert.deepEqual(out.surcharges, []);
  assert.equal(out.bundles[0].price, null);
  assert.equal(out.bundles[0].items[0].product.price, null);
  assert.equal(out.productId, 417);
  assert.deepEqual(out.name, product.name);
  assert.deepEqual(out.inventory, product.inventory);
});

test('no price number survives anywhere in the output', () => {
  const json = JSON.stringify(hidePrices(product));
  for (const n of ['58', '70.18', '"cost"', '"suggested"', '"store"', '"gross"', '"net"']) {
    assert.equal(json.includes(n), false, n);
  }
});

test('listing min/max price and nested products are cleared', () => {
  const listing = {
    itemsFound: 2,
    minPrice: 4,
    maxPrice: 900,
    items: [{ ...product }, { clusterId: 9, defaultProduct: { ...product }, options: [{ products: [{ ...product }] }] }],
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out = hidePrices(listing) as any;
  assert.equal(out.minPrice, null);
  assert.equal(out.maxPrice, null);
  assert.equal(out.itemsFound, 2);
  assert.equal(out.items[0].price, null);
  assert.equal(out.items[1].defaultProduct.price, null);
  assert.equal(out.items[1].options[0].products[0].price, null);
});

test('does not mutate its input', () => {
  const input = structuredClone(product);
  hidePrices(input);
  assert.deepEqual(input, product);
});

test('passes through null and primitives', () => {
  assert.equal(hidePrices(null), null);
  assert.equal(hidePrices(5), 5);
});
