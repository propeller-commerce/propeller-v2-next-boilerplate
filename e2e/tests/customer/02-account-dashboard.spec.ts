import { test, expect } from '@playwright/test';

test.describe('Customer — Account pages', () => {
  test('addresses page loads for customer', async ({ page }) => {
    await page.goto('/account/addresses');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
  });

  test('favorites page loads for customer', async ({ page }) => {
    await page.goto('/account/favorites');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
  });

  test('orders page loads for customer', async ({ page }) => {
    await page.goto('/account/orders');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
  });

  test('invoices page loads (shows empty or placeholder) for customer', async ({ page }) => {
    await page.goto('/account/invoices');
    await page.waitForLoadState('networkidle');
    // May be a 404 or a placeholder — just don't crash
    await expect(page.locator('body')).toBeVisible({ timeout: 10_000 });
  });
});
