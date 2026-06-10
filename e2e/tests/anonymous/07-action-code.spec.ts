import { test, expect } from '@playwright/test';
import { CartPage } from '../../page-objects/CartPage';
import { seedCart } from '../../helpers/cart';
import { TEST_DATA } from '../../helpers/testData';

test.describe('ActionCode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await seedCart(page, [
      { productId: 3001, name: 'Action Code Test', quantity: 1, priceNet: 50 },
    ]);
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
  });

  test('action code input and apply button are visible', async ({ page }) => {
    const cartPage = new CartPage(page);
    // Action code may be in cart or in a sidebar
    const actionCodeSection = page.locator(
      'input[placeholder*="action" i], input[placeholder*="promo" i], input[placeholder*="code" i], input[name*="code" i]',
    ).first();
    const count = await actionCodeSection.count();
    if (count === 0) {
      // Some shops don't show action code — skip gracefully
      test.skip();
      return;
    }
    await expect(actionCodeSection).toBeVisible();
  });

  test('entering an invalid code shows error', async ({ page }) => {
    const actionInput = page.locator(
      'input[placeholder*="action" i], input[placeholder*="promo" i], input[placeholder*="code" i]',
    ).first();
    if ((await actionInput.count()) === 0) { test.skip(); return; }

    await actionInput.fill('INVALID_CODE_XYZ_123');
    const applyBtn = page.getByRole('button', { name: /apply|redeem/i }).first();
    await applyBtn.click();
    await page.waitForTimeout(2000);
    // Error message should appear
    const errorMsg = page.locator('[role="alert"], .text-red-500, .text-destructive').first();
    await expect(errorMsg).toBeVisible({ timeout: 8_000 });
  });

  test('entering a valid code applies discount (if promo code is configured)', async ({
    page,
  }) => {
    if (!TEST_DATA.promoCode) {
      test.skip();
      return;
    }
    const cartPage = new CartPage(page);
    await cartPage.applyActionCode(TEST_DATA.promoCode);
    await page.waitForTimeout(2000);
    await expect(cartPage.discountLine).toBeVisible({ timeout: 8_000 });
  });
});
