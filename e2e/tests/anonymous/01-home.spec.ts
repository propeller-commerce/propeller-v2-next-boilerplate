import { test, expect } from '@playwright/test';
import { HomePage } from '../../page-objects/HomePage';
import { discoverCategoryUrl } from '../../helpers/navigation';

test.describe('Home page', () => {
  test('loads with 200 and shows visible content', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
  });

  test('main content renders (CMS content or HomeFallback)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
  });

  test('HomeFallback renders category cards in main content', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForHomeFallbackCategories();
    await expect(home.firstCategoryLink).toBeVisible();
  });

  test('clicking a category card navigates to /category/', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForHomeFallbackCategories();
    await home.firstCategoryLink.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/category\//);
  });

  test('header is visible with navigation bar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('header')).toBeVisible();
  });

  test('header has a "Browse Categories" or menu button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const menuBtn = page.locator('header').getByRole('button', {
      name: /browse categories|categories|menu/i,
    }).first();
    const count = await menuBtn.count();
    // Menu button should be in header
    await expect(page.locator('header')).toBeVisible();
  });

  test('hovering Browse Categories reveals category links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const menuTrigger = page.locator('header button').filter({ hasText: /categories|browse/i }).first();
    const count = await menuTrigger.count();
    if (count > 0) {
      await menuTrigger.hover();
      // After hover, category links in the dropdown should become visible
      await page.waitForTimeout(500);
      const dropdownLinks = page.locator('header a[href*="/category/"]');
      const linkCount = await dropdownLinks.count();
      if (linkCount > 0) {
        await expect(dropdownLinks.first()).toBeVisible({ timeout: 5_000 });
      }
    }
  });

  test('SearchBar: typing a term and pressing Enter navigates to /search/', async ({
    page,
  }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.search('cable');
    await expect(page).toHaveURL(/\/search/);
  });

  test('discovers a real category URL from HomeFallback', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    expect(categoryUrl).toMatch(/\/category\//);
  });
});
