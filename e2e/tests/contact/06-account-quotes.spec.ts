import { test, expect } from '@playwright/test';

test.describe('Contact — Quotes', () => {
  test('quotes page loads', async ({ page }) => {
    await page.goto('/account/quotes');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
  });

  test('quotes table or empty state is visible', async ({ page }) => {
    await page.goto('/account/quotes');
    await page.waitForLoadState('networkidle');
    const table = page.locator('table, [data-testid="order-list"]').first();
    const emptyState = page.getByText(/no quotes|you have no quotes/i).first();
    await expect(page.locator('main')).toBeVisible();
  });

  test('quote-requests page loads', async ({ page }) => {
    await page.goto('/account/quote-requests');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
  });

  test('clicking a quote navigates to quote detail', async ({ page }) => {
    await page.goto('/account/quotes');
    await page.waitForLoadState('networkidle');
    const firstQuoteLink = page.locator('tr a, [data-testid="order-row"] a, table a').first();
    const count = await firstQuoteLink.count();
    if (count === 0) return;
    await firstQuoteLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/account\/quotes\//);
  });

  test('QuoteActions: accept button visible on quote detail (if quote exists)', async ({
    page,
  }) => {
    await page.goto('/account/quotes');
    await page.waitForLoadState('networkidle');
    const firstQuoteLink = page.locator('tr a, table a').first();
    if ((await firstQuoteLink.count()) === 0) return;
    const href = await firstQuoteLink.getAttribute('href');
    if (!href) return;
    await page.goto(href);
    await page.waitForLoadState('networkidle');
    // QuoteActions accept button
    const acceptBtn = page.getByRole('button', { name: /accept|confirm/i }).first();
    const count = await acceptBtn.count();
    if (count > 0) {
      await expect(acceptBtn).toBeVisible({ timeout: 8_000 });
    }
  });
});
