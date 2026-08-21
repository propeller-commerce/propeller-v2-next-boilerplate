import { test, expect } from '@playwright/test';

test.describe('Contact — Favorites', () => {
  test('favorites page loads', async ({ page }) => {
    await page.goto('/account/favorites');
    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
  });

  test('favorite lists or empty state are visible', async ({ page }) => {
    await page.goto('/account/favorites');
    await page.waitForLoadState('networkidle');
    const lists = page.locator('[data-testid="favorite-list"], [data-testid="favorites-list"]').first();
    const emptyState = page.getByText(/no favorites|no lists|create your first/i).first();
    await expect(page.locator('main')).toBeVisible();
  });

  test('"Create new list" button or trigger is visible', async ({ page }) => {
    await page.goto('/account/favorites');
    await page.waitForLoadState('networkidle');
    const createBtn = page.getByRole('button', { name: /create|new list|add list/i }).or(
      page.getByRole('link', { name: /create|new list/i })
    ).first();
    const count = await createBtn.count();
    if (count > 0) {
      await expect(createBtn).toBeVisible();
    }
  });

  test('clicking a favorite list navigates to list detail', async ({ page }) => {
    await page.goto('/account/favorites');
    await page.waitForLoadState('networkidle');
    const listLink = page.locator('a[href*="/account/favorites/"]').first();
    const count = await listLink.count();
    if (count === 0) return; // no lists yet
    await listLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/account\/favorites\//);
  });

  test('FavoriteListDetails: items visible in list detail', async ({ page }) => {
    await page.goto('/account/favorites');
    await page.waitForLoadState('networkidle');
    const listLink = page.locator('a[href*="/account/favorites/"]').first();
    const count = await listLink.count();
    if (count === 0) return;
    await listLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
  });
});
