import test from 'node:test';
import assert from 'node:assert/strict';
import { ProductSortField, SortOrder } from '@propeller-commerce/propeller-sdk-v2';
import { gateListingOptions } from './listingGate.ts';

test('a guest who may not see prices sends no price range and no PRICE sort upstream', () => {
  const asked = { page: 2, sortField: ProductSortField.PRICE, sortOrder: SortOrder.ASC, priceFilterMin: 50, priceFilterMax: 60 };
  assert.deepEqual(gateListingOptions(asked, true), { page: 2, sortOrder: SortOrder.ASC });
  // Another sort is kept.
  assert.deepEqual(gateListingOptions({ sortField: ProductSortField.NAME }, true), { sortField: ProductSortField.NAME });
});

test('a viewer who sees prices keeps them', () => {
  const asked = { sortField: ProductSortField.PRICE, sortOrder: SortOrder.DESC, priceFilterMin: 50, priceFilterMax: 60 };
  assert.deepEqual(gateListingOptions(asked, false), asked);
});

test('sortField and sortOrder must be enum values; price bounds finite numbers', () => {
  const bad = { sortField: 'PRICE_DESC' as ProductSortField, sortOrder: 'sideways' as SortOrder, priceFilterMin: NaN, priceFilterMax: 10 };
  assert.deepEqual(gateListingOptions(bad, false), { priceFilterMax: 10 });
  assert.deepEqual(gateListingOptions({}, true), {});
});
