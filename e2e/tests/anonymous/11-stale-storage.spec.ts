/**
 * Storage written by an older build must not break the app (PWP-912).
 *
 * The complaint was that every release needed users to clear their browser
 * storage. Two mechanisms fix that, and this covers both:
 *
 *  - caches written by a previous build are dropped on boot, so a deploy can
 *    never serve a stale menu (`lib/clientStorage.ts`);
 *  - persisted state is validated when read rather than asserted, so an object
 *    from an older release is discarded instead of crashing the code that
 *    dereferences it (`deserializeCart`, `readStoredCompany`).
 *
 * Each Playwright test gets a fresh context, so storage starts empty and is
 * seeded here via an init script — it has to be in place BEFORE the app's
 * modules evaluate, which is exactly the ordering the fix depends on.
 */

import { test, expect } from '@playwright/test';

/** Seed localStorage before any app code runs. */
async function seed(page: import('@playwright/test').Page, entries: Record<string, string>) {
  await page.addInitScript((data) => {
    for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
  }, entries);
}

test.describe('storage left behind by an older build', () => {
  test('drops a menu cache written by a previous app version', async ({ page }) => {
    await seed(page, {
      propeller_app_version: '0.0.1-ancient',
      propeller_menu_17_NL: JSON.stringify({
        data: [{ categoryId: 999, name: 'Category From A Dead Build', slug: 'dead', children: [] }],
        // Far-future expiry: only the version check can evict this, not the TTL.
        expiresAt: Date.now() + 12 * 60 * 60 * 1000,
      }),
    });

    await page.goto('/cart');

    const stored = await page.evaluate(() => ({
      menu: localStorage.getItem('propeller_menu_17_NL'),
      version: localStorage.getItem('propeller_app_version'),
    }));

    expect(stored.menu).toBeNull();
    expect(stored.version).not.toBe('0.0.1-ancient');
    await expect(page.getByText('Category From A Dead Build')).toHaveCount(0);
  });

  test('keeps a menu cache written by the current version', async ({ page }) => {
    // Boot once to learn what this build stamps, then re-seed against it.
    await page.goto('/cart');
    const current = await page.evaluate(() => localStorage.getItem('propeller_app_version'));
    expect(current).toBeTruthy();

    await seed(page, {
      propeller_app_version: current!,
      propeller_menu_17_NL: JSON.stringify({
        data: [{ categoryId: 1, name: 'Still Fresh', slug: 'fresh', children: [] }],
        expiresAt: Date.now() + 12 * 60 * 60 * 1000,
      }),
    });
    await page.goto('/cart');

    const kept = await page.evaluate(() => localStorage.getItem('propeller_menu_17_NL'));
    expect(kept).toContain('Still Fresh');
  });

  test('removes the orphaned MenuService key unconditionally', async ({ page }) => {
    await seed(page, { menuData: JSON.stringify({ data: [], expires: Date.now() + 1e7 }) });
    await page.goto('/cart');
    expect(await page.evaluate(() => localStorage.getItem('menuData'))).toBeNull();
  });

  test('discards a cart whose shape no longer matches, without crashing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // A cart from a build where `items` was an object map, not an array.
    await seed(page, {
      cart: JSON.stringify({ cartId: 'legacy-1', items: { '0': { quantity: 1 } } }),
    });
    await page.goto('/cart');

    expect(errors).toEqual([]);
    // Rejected AND evicted, so it isn't re-parsed on every subsequent load.
    expect(await page.evaluate(() => localStorage.getItem('cart'))).toBeNull();
  });

  test('discards a stored company with no numeric companyId, without crashing', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // Pre-rename shape: the id lived under `id`.
    await seed(page, { selected_company: JSON.stringify({ id: 42, name: 'Old Shape BV' }) });
    await page.goto('/cart');

    expect(errors).toEqual([]);
  });
});
