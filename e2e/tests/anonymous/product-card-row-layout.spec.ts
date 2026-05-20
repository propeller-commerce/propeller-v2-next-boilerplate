/**
 * Regression test for the ProductCard row (list) layout.
 *
 * After Phase E extraction, the `md:flex-nowrap` and `md:w-auto` Tailwind
 * utilities used in ternary template-literal expressions were silently
 * dropped from `dist/styles.css` because v4's source scanner missed them.
 * The card's `__footer` (price + qty + Add button) wrapped onto a second
 * line at desktop widths instead of staying on the same row as the title.
 *
 * Fix: an `@source inline(...)` directive in `src/styles.css` force-includes
 * the responsive utilities that live inside ternaries. This test pins the
 * fix in place.
 */

import { test, expect } from '@playwright/test';
import { discoverCategoryUrl } from '../../helpers/navigation';

test.describe('ProductCard row layout', () => {
  test('list view keeps image, body and footer on the same row at desktop width', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    await page.goto(categoryUrl);
    await page.waitForLoadState('networkidle');

    // Category page initial state is `viewMode: 'list'` which feeds
    // `columns={1}` into ProductGrid, so cards render in row layout from the
    // start — no click needed. Wait for the first card to mount.
    await page.waitForSelector('.propeller-product-card', { timeout: 15_000 });
    // Then assert the row data-attribute landed (proves the grid config
    // context propagated columns=1 to ProductCard).
    await page.waitForSelector('.propeller-product-card[data-layout="row"]', { timeout: 5_000 });

    const firstCard = page.locator('.propeller-product-card[data-layout="row"]').first();
    const footer = firstCard.locator('.propeller-product-card__footer').first();
    await expect(firstCard).toBeVisible();
    await expect(footer).toBeVisible();

    // Card root and footer should share roughly the same vertical position.
    // If `md:flex-nowrap` is missing, the footer wraps onto a second line
    // and its top sits below the card top by the body's full height.
    const cardBox = await firstCard.boundingBox();
    const footerBox = await footer.boundingBox();
    if (!cardBox || !footerBox) throw new Error('card or footer not measurable');

    // Same row: footer top within ~30px of card top (padding tolerance).
    // Wrapped: delta is the body's full height, usually 60px+.
    expect(footerBox.y - cardBox.y).toBeLessThan(30);
  });
});
