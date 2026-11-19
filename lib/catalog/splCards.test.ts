import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCards } from '@propeller-commerce/propeller-v2-spl/server';
import { hidePrices } from './hidePrices.ts';
import { viewerScopedResolver } from './priceVisibility.ts';

// What the SPL hotspot lookup (lib/spl.ts buildSplProductResolver) resolves: the whole product.
const product = (sku: string, display: string) => ({
  productId: 1,
  sku,
  names: [{ language: 'NL', value: `Part ${sku}` }],
  price: { net: 70.18, gross: 58, list: 58 },
  priceData: { per: 1, display, list: 58, costPrices: [{ value: 6 }], suggested: 60 },
  bulkPrices: [{ net: 65 }],
});
const resolve = async (skus: string[]) =>
  new Map(skus.map((sku) => [sku, product(sku, sku === 'ASK' ? 'ON_REQUEST' : 'DEFAULT')]));
const hotspot = (id: number, oem: string) => ({ id, pos: String(id), func: [{ oem }] });
const hotspots = [hotspot(1, 'P-1'), hotspot(2, 'ASK'), hotspot(3, 'MISSING')];

async function cards(portalMode: string, user: unknown) {
  const resolver = viewerScopedResolver(resolve, portalMode, user, hidePrices);
  const found = await resolver(['P-1', 'ASK']);
  return buildCards(hotspots as never, found as never, 'NL') as Array<{ kind: string; product: ReturnType<typeof product> | null }>;
}

test('a guest in a semi-closed or closed portal gets SPL cards without prices', async () => {
  for (const mode of ['semi-closed', 'closed']) {
    const out = await cards(mode, null);
    for (const card of out.filter((c) => c.product)) {
      assert.equal(card.product!.price, null, mode);
      assert.deepEqual(card.product!.bulkPrices, [], mode);
      assert.equal('list' in card.product!.priceData, false, mode);
      assert.equal('costPrices' in card.product!.priceData, false, mode);
    }
    assert.ok(!/70\.18|"list"|costPrices/.test(JSON.stringify(out)), mode);
    // The card kinds don't depend on prices: display stays.
    assert.deepEqual(out.map((c) => c.kind), ['default', 'on-request', 'not-found'], mode);
  }
});

test('a logged-in contact, and everyone in an open portal, keeps the prices', async () => {
  for (const [mode, user] of [['semi-closed', { contactId: 73 }], ['closed', { customerId: 9 }], ['open', null]] as const) {
    const out = await cards(mode, user);
    assert.equal(out[0].product!.price.net, 70.18, mode);
    assert.equal(out[1].kind, 'on-request', mode);
  }
});
