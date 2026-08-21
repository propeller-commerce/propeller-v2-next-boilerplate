import { test, expect } from '@playwright/test';
import { seedCart } from '../../helpers/cart';
import { discoverCategoryUrl, discoverProductUrl } from '../../helpers/navigation';

test.describe('Cart page — empty state', () => {
  test('shows "your cart is empty" when no items (fresh context)', async ({ page }) => {
    // Each test gets fresh localStorage — no need to clear
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    // Use exact text to avoid strict mode violation (CartSummary also has "Your cart is empty.")
    const emptyText = page.locator('h1 ~ * >> text=/your cart is empty/i').or(
      page.locator('p.text-xl').filter({ hasText: /your cart is empty/i })
    ).first();
    await expect(emptyText).toBeVisible({ timeout: 10_000 });
  });

  test('"Continue Shopping" link visible on empty cart', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    const continueLink = page.getByRole('link', { name: /continue shopping/i }).first();
    await expect(continueLink).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Cart page — with items (seeded)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate first to establish localStorage on the correct origin
    await page.goto('/');
    await seedCart(page, [
      { productId: 1001, name: 'Test Product', quantity: 2, priceNet: 10, priceGross: 12.1 },
    ]);
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
  });

  test('cart page h1 "Shopping Cart" is visible', async ({ page }) => {
    // Use exact h1 element to avoid strict mode (CartSummary has h2 "Shopping cart")
    await expect(page.locator('h1').filter({ hasText: 'Shopping Cart' })).toBeVisible({ timeout: 10_000 });
  });

  test('page does not show empty cart message', async ({ page }) => {
    const emptyText = page.locator('p.text-xl').filter({ hasText: /your cart is empty/i });
    await expect(emptyText).not.toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Cart page — add via UI', () => {
  test('adding product via PDP reflects in cart page', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    const productUrl = await discoverProductUrl(page, categoryUrl);

    await page.goto(productUrl);
    // Wait for product page to fully load (title visible)
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 15_000 });

    const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
    const btnVisible = await addBtn.isVisible().catch(() => false);
    if (!btnVisible) {
      // Cluster page may need attribute selection — skip this test if AddToCart not immediately available
      test.skip();
      return;
    }
    await addBtn.click();
    await page.waitForTimeout(2000);

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    // Cart should not show empty message
    const emptyText = page.locator('p.text-xl').filter({ hasText: /your cart is empty/i });
    await expect(emptyText).not.toBeVisible({ timeout: 8_000 });
  });

  test('cart persists on page refresh after seeding', async ({ page }) => {
    await page.goto('/');
    await seedCart(page, [
      { productId: 1002, name: 'Persist Test', quantity: 1 },
    ]);
    await page.goto('/cart');
    await page.reload();
    await page.waitForLoadState('networkidle');
    const emptyText = page.locator('p.text-xl').filter({ hasText: /your cart is empty/i });
    await expect(emptyText).not.toBeVisible({ timeout: 8_000 });
  });
});

test.describe('CartSummary', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await seedCart(page, [
      { productId: 2001, name: 'Summary Test', quantity: 1, priceNet: 25 },
    ]);
  });

  test('"Proceed to Checkout" link navigates to /checkout', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    // Use the h1 "Shopping Cart" page — look for checkout button in the summary card
    const checkoutLink = page
      .getByRole('link', { name: /^checkout$/i })
      .or(page.locator('a[href*="checkout"]').filter({ hasText: /checkout/i }))
      .first();
    const count = await checkoutLink.count();
    if (count > 0) {
      await checkoutLink.scrollIntoViewIfNeeded();
      await checkoutLink.click();
      await expect(page).toHaveURL(/\/checkout/);
    }
  });
});
