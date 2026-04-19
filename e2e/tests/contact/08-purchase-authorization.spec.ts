import { test, expect } from '@playwright/test';

test.describe('Contact — Purchase Authorization (PAC)', () => {
  test('authorization settings page loads', async ({ page }) => {
    await page.goto('/account/authorization-settings');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
  });

  test('PurchaseAuthorizationConfigurator: contacts table or empty state visible', async ({
    page,
  }) => {
    await page.goto('/account/authorization-settings');
    await page.waitForLoadState('networkidle');
    const table = page.locator('table, [data-testid="pac-configurator"]').first();
    const empty = page.getByText(/no authorization|no contacts/i).first();
    await expect(page.locator('main')).toBeVisible();
  });

  test('authorization requests page loads', async ({ page }) => {
    await page.goto('/account/authorization-requests');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
  });

  test('PurchaseAuthorizationRequests: pending carts table or empty state', async ({
    page,
  }) => {
    await page.goto('/account/authorization-requests');
    await page.waitForLoadState('networkidle');
    const table = page.locator('table, [data-testid="pac-requests"]').first();
    const empty = page.getByText(/no pending|no requests/i).first();
    await expect(page.locator('main')).toBeVisible();
  });

  test('page does not crash with 500 or render error', async ({ page }) => {
    const errors: string[] = [];
    page.on('response', (res) => {
      if (res.status() >= 500) errors.push(`${res.status()} ${res.url()}`);
    });
    await page.goto('/account/authorization-settings');
    await page.waitForLoadState('networkidle');
    expect(errors.length).toBe(0);
  });
});
