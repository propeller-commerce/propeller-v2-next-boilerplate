/**
 * Regression test for OrderActions button layout on the order details page.
 *
 * The "Order confirmation (PDF)" and "Order again" buttons sit in a
 * `flex flex-row` row inside OrderActions, which itself is placed in a
 * `md:flex-row justify-between` parent next to OrderTotals (md:w-80).
 *
 * Before the fix, the OrderActions outer wrapper had no flex-shrink-0,
 * so the flex parent squeezed it until the button text wrapped mid-word
 * ("Order / confirmation / (PDF)" on three lines). The fix adds
 * `flex-shrink-0` to the outer wrapper plus `whitespace-nowrap` on each
 * button. This test pins both fixes.
 *
 * Requires an authenticated contact with at least one order. The test
 * skips cleanly if no order is found, so it works against any test
 * tenant.
 */

import { test, expect } from '@playwright/test';

test.describe('OrderActions button layout (order details)', () => {
  test('buttons render inline horizontally without text wrap', async ({ page }) => {
    await page.goto('/account/orders');
    await page.waitForLoadState('networkidle');

    // OrderList rows are <tr> with onClick (no anchor). Click the first one.
    const firstRow = page.locator('.propeller-order-list__row').first();
    const hasOrders = await firstRow.isVisible().catch(() => false);
    if (!hasOrders) {
      test.skip();
      return;
    }
    await firstRow.click();
    await page.waitForLoadState('networkidle');

    // There are two OrderActions instances on the page (top card + bottom row).
    // Test the bottom one — that's where the squeeze bug manifested because
    // it shares a flex row with OrderTotals (md:w-80).
    const allActions = page.locator('.propeller-order-actions');
    const count = await allActions.count();
    if (count === 0) {
      test.skip();
      return;
    }
    const bottomActions = allActions.last();
    await expect(bottomActions).toBeVisible({ timeout: 5_000 });

    const pdfBtn = bottomActions.locator('.propeller-order-actions__pdf-btn');
    await expect(pdfBtn).toBeVisible();

    // The fixed button keeps its single-line natural width (~150px for
    // "Order confirmation (PDF)" at text-sm). When wrapped, the button
    // would be ~60px wide and 3 lines tall (~60px).
    const box = await pdfBtn.boundingBox();
    if (!box) throw new Error('PDF button not measurable');
    // Single-line button: ~20px tall. Wrapped 3 lines: ~60px+.
    expect(box.height).toBeLessThan(30);
  });
});
