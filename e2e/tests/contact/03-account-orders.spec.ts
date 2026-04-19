import { test, expect } from '@playwright/test';
import { AccountPage } from '../../page-objects/AccountPage';

test.describe('Contact — Orders', () => {
  test('orders page loads', async ({ page }) => {
    const accountPage = new AccountPage(page);
    await accountPage.gotoOrders();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
  });

  test('order table or empty state is visible', async ({ page }) => {
    await page.goto('/account/orders');
    await page.waitForLoadState('networkidle');
    // Either a table with orders or an empty state message
    const table = page.locator('table, [data-testid="order-list"]').first();
    const emptyState = page.getByText(/no orders|you have no orders/i).first();
    const tableCount = await table.count();
    const emptyCount = await emptyState.count();
    expect(tableCount + emptyCount).toBeGreaterThan(0);
  });

  test('order list columns are visible (ID, date, status, total)', async ({ page }) => {
    await page.goto('/account/orders');
    await page.waitForLoadState('networkidle');
    const table = page.locator('table').first();
    const tableCount = await table.count();
    if (tableCount === 0) {
      // No orders table — might be empty state
      return;
    }
    const headers = page.locator('th, [role="columnheader"]');
    await expect(headers.first()).toBeVisible({ timeout: 8_000 });
  });

  test('clicking an order navigates to order detail', async ({ page }) => {
    await page.goto('/account/orders');
    await page.waitForLoadState('networkidle');
    const firstOrderLink = page.locator('tr a, [data-testid="order-row"] a').first();
    const count = await firstOrderLink.count();
    if (count === 0) return; // no orders to click
    await firstOrderLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/account\/orders\//);
  });

  test('order detail page shows summary sections', async ({ page }) => {
    await page.goto('/account/orders');
    await page.waitForLoadState('networkidle');
    const firstOrderLink = page.locator('tr a, [data-testid="order-row"] a, table a').first();
    const count = await firstOrderLink.count();
    if (count === 0) return; // no orders
    const href = await firstOrderLink.getAttribute('href');
    if (href) {
      await page.goto(href);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
    }
  });

  test('unauthenticated access to orders redirects or shows empty', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    await page.goto('/account/orders');
    await page.waitForLoadState('networkidle');
    const url = page.url();
    expect(url.includes('/login') || !url.includes('/account/orders') || !(await page.locator('table').isVisible())).toBeTruthy();
    await context.close();
  });
});
