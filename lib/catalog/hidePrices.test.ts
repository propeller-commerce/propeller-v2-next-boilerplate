import test from 'node:test';
import assert from 'node:assert/strict';
import { forVisitor, hidePrices, PRICE_FIELDS, withoutCostPrices } from './hidePrices.ts';

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

test('priceData keeps its display keys only as scalars: nothing hides under them', () => {
  const smuggled = {
    product: { priceData: { per: { list: 58 }, display: [{ net: 70 }], bulkPriceDiscountType: { cost: 6 }, defaultTaxCode: 'H' } },
    priceData: { per: [{ sku: 'X', price: { net: 70.18 }, priceData: { list: 58 } }] },
  };
  const out = hidePrices(smuggled);
  assert.deepEqual(out.product.priceData, { defaultTaxCode: 'H' });
  assert.deepEqual(out.priceData, {});
  assert.ok(!/70|58|6/.test(JSON.stringify(out)), JSON.stringify(out));
  // The real shape stays: per is a number, the rest enum strings.
  assert.deepEqual(hidePrices({ priceData: { per: 1, display: 'DEFAULT', bulkPriceDiscountType: null, list: 5 } }).priceData, {
    per: 1,
    display: 'DEFAULT',
    bulkPriceDiscountType: null,
  });
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

test('cart and order amounts are cleared too (they use other field names)', () => {
  const cart = {
    cartId: 'c1',
    items: [{ productId: 1, quantity: 2, priceNet: 10, totalPrice: 24.2, totalPriceNet: 20, sum: 24.2, sumNet: 20, totalSum: 24.2, totalSumNet: 20 }],
    total: { subTotal: 24.2, subTotalNet: 20, totalNet: 20, totalGross: 24.2, discountNet: 0, tax: 4.2 },
    taxLevels: [{ taxPercentage: 21, price: 4.2 }],
  };
  const order = {
    id: 9,
    items: [{ priceTotal: 10, priceTotalNet: 8, customerPrice: 8, originalPrice: 9, costPrice: 5, originalGross: 9, originalNet: 8 }],
    total: { gross: 24.2, net: 20, discountValue: 1 },
  };
  const out = JSON.stringify([hidePrices(cart), hidePrices(order)]);
  // Only ids, quantities and the tax percentage are numbers that may survive.
  const numbers = (out.match(/:\s*-?\d+(\.\d+)?/g) || []).map((m) => Number(m.slice(1)));
  assert.deepEqual(numbers.sort((a, b) => a - b), [1, 2, 9, 21]);
});

test('search, discount, margin, tax-level and payment amounts are cleared; totals objects are kept', () => {
  const out = hidePrices({
    items: [{ id: 1, effectivePrice: 18.46, marginAmount: 3, saleMarginPercentage: 10, costPrices: [{ price: 2 }] }],
    total: { totalGross: 10, totalTax: 2, subTotalGross: 12, discountPercentage: 5 },
    taxPercentages: [{ percentage: 21, total: 4.2 }],
    payment: { orderId: 9, amount: 24.2 },
  }) as { items: Record<string, unknown>[]; total: unknown; taxPercentages: unknown; payment: unknown };
  assert.equal(out.items[0].effectivePrice, null);
  assert.equal(out.items[0].marginAmount, null);
  assert.equal(out.items[0].saleMarginPercentage, null);
  assert.deepEqual(out.items[0].costPrices, []);
  assert.deepEqual(out.total, { totalGross: null, totalTax: null, subTotalGross: null, discountPercentage: null });
  assert.deepEqual(out.taxPercentages, [{ percentage: 21, total: null }]);
  assert.deepEqual(out.payment, { orderId: 9, amount: null });
});

test('every price-like number field in the SDK types is cleared or explicitly allowed', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const dir = 'node_modules/@propeller-commerce/propeller-sdk-v2/dist/cjs/type/';
  // Counts, percentages of tax, ids: not amounts.
  const allowed = new Set(['countTotal', 'taxPercentage', 'taxPercentageDecimal', 'totalBatches', 'totalCategories', 'totalClusters', 'totalCount', 'totalDocs', 'totalDocuments', 'totalHours', 'totalProcessed', 'totalProducts', 'totalQuantity']);
  const missing = new Set<string>();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.d.ts') && !f.includes('Input'))) {
    for (const m of readFileSync(dir + file, 'utf8').matchAll(/^\s+([a-zA-Z]*(?:[Pp]rice|[Cc]ost|[Mm]argin|[Dd]iscount|[Tt]ax|[Tt]otal|[Aa]mount|[Ss]um|[Gg]ross|[Nn]et)[a-zA-Z]*)\??: number;/gm)) {
      if (!PRICE_FIELDS.has(m[1]) && !allowed.has(m[1])) missing.add(`${file}:${m[1]}`);
    }
  }
  assert.deepEqual([...missing], []);
});

// A product as the SDK's product / products / category documents return it with the storefront key.
const withCosts = {
  productId: 417,
  name: [{ language: 'NL', value: 'M96 SMART' }],
  // ProductPrice.cost is the same number as costPrices[0].value.
  price: { gross: 58, net: 70.18, cost: 6 },
  bulkPrices: [{ quantityFrom: 10, gross: 50, net: 60.5, cost: 6 }],
  priceData: { per: 'ITEM', list: 58, display: 'DEFAULT', costPrices: [{ quantityFrom: 1, value: 6 }] },
  inventory: { totalQuantity: 4, balance: [{ warehouseId: 1, quantity: 4, costPrice: 5.9, location: 'A1' }] },
};
const withoutCosts = {
  productId: 417,
  name: [{ language: 'NL', value: 'M96 SMART' }],
  price: { gross: 58, net: 70.18 },
  bulkPrices: [{ quantityFrom: 10, gross: 50, net: 60.5 }],
  priceData: { per: 'ITEM', list: 58, display: 'DEFAULT' },
  inventory: { totalQuantity: 4, balance: [{ warehouseId: 1, quantity: 4, location: 'A1' }] },
};
const hasCostKey = (v: unknown) => /"(costPrices?|cost)"/.test(JSON.stringify(v));

test('no visitor gets cost prices: a guest in an open shop and a verified viewer lose only costPrice(s) and cost', () => {
  // The proxy and SSR both serve forVisitor(data, canSeePrices): true for everyone in an open shop
  // and for a verified viewer in semi-closed / closed.
  const proxyResponse = { data: { products: { itemsFound: 1, items: [withCosts] } } };
  assert.deepEqual(forVisitor(proxyResponse, true), { data: { products: { itemsFound: 1, items: [withoutCosts] } } });
  assert.deepEqual(withoutCostPrices(withCosts), withoutCosts);
  // Nested anywhere: cluster products, cart items, order items.
  const cart = { data: { cart: { items: [{ product: withCosts, costPrice: 4, price: 5 }], cluster: { products: [withCosts] } } } };
  assert.equal(hasCostKey(forVisitor(cart, true)), false);
  assert.equal(forVisitor(cart, true).data.cart.items[0].price, 5);
});

test('a gated guest loses cost prices and prices', () => {
  const served = forVisitor({ data: { product: withCosts } }, false);
  assert.equal(hasCostKey(served), false);
  assert.deepEqual(served, hidePrices({ data: { product: withoutCosts } }));
});

test('SSR fetcher results (a product, a listing) lose cost prices for every viewer', () => {
  // lib/server.ts forViewer = forVisitor(data, !pricesHidden(...)) for fetchProduct / fetchCategory /
  // fetchSearch / fetchCluster / fetchMachine.
  const listing = { itemsFound: 2, minPrice: 1, maxPrice: 9, items: [withCosts, { ...withCosts, productId: 418 }] };
  for (const canSee of [true, false]) {
    assert.equal(hasCostKey(forVisitor(withCosts, canSee)), false, `product, canSee=${canSee}`);
    assert.equal(hasCostKey(forVisitor(listing, canSee)), false, `listing, canSee=${canSee}`);
  }
  assert.deepEqual(forVisitor(listing, true), { ...listing, items: [withoutCosts, { ...withoutCosts, productId: 418 }] });
  // Input untouched.
  assert.equal(hasCostKey(withCosts), true);
});
