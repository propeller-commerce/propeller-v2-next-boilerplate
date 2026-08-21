/**
 * The search-bar dropdown must find what the results page finds.
 *
 * `useProductSearch` runs its autosuggest against `configuration.baseCategoryId`
 * and bails to an empty result set — silently, no error, no spinner — when that
 * value is falsy. `config.baseCategoryId` is deliberately
 * `undefined` on any shop that lets the channel decide the catalog root, so the
 * host has to splice the resolved id into `configuration` (see
 * `PropellerHostBridge`). While it didn't, typing a SKU produced "no results"
 * while pressing Enter on the same string returned the product — the reported
 * symptom, and the same gap breaks QuickOrder and Breadcrumbs.
 *
 * This asserts the two paths agree rather than asserting a specific hit count,
 * so it holds on any tenant: whatever the results page finds for a term, the
 * dropdown must find too.
 */

import { test, expect } from '@playwright/test';

/** Take a SKU from the catalogue itself so the test carries no tenant data. */
async function firstSku(page: import('@playwright/test').Page): Promise<string | null> {
  await page.goto('/search');
  const sku = page.locator('.propeller-product-card__sku').first();
  // The grid re-fetches on hydration, so wait for a card rather than reading
  // whatever happens to be in the DOM — under parallel workers the bare read
  // raced the render and skipped the test.
  await sku.waitFor({ state: 'attached', timeout: 30_000 }).catch(() => {});
  if (await sku.count()) {
    // The card prints a label alongside the code on some themes.
    const raw = (await sku.textContent()) || '';
    return raw.replace(/^\s*(SKU|Art\.?nr\.?)\s*:?\s*/i, '').trim() || null;
  }
  return null;
}

test('the autosuggest finds what the results page finds', async ({ page }) => {
  const sku = await firstSku(page);
  test.skip(!sku, 'no SKU rendered on the search page for this tenant');

  // The results page — the path that always worked.
  await page.goto(`/search/${encodeURIComponent(sku!)}`);
  const resultsCount = await page.locator('[class*="propeller-product-card"]').count();
  expect(resultsCount).toBeGreaterThan(0);

  // The dropdown — the path that silently returned nothing.
  await page.goto('/');
  const input = page.locator('.propeller-search-bar__input').first();
  await input.click();
  await input.fill(sku!);

  const dropdown = page.locator('.propeller-search-bar__dropdown');
  await expect(dropdown).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.propeller-search-bar__result').first()).toBeVisible({
    timeout: 15_000,
  });
});
