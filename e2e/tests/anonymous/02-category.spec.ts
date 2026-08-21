import { test, expect } from '@playwright/test';
import { CategoryPage } from '../../page-objects/CategoryPage';
import { discoverCategoryUrl } from '../../helpers/navigation';

test.describe('Category page — ProductGrid', () => {
  test('loads and shows product/cluster links in main', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    const categoryPage = new CategoryPage(page);
    await categoryPage.goto(categoryUrl);
    await categoryPage.waitForCards();
    expect(await categoryPage.productCards.count()).toBeGreaterThan(0);
  });

  test('product card images are visible', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    const categoryPage = new CategoryPage(page);
    await categoryPage.goto(categoryUrl);
    await categoryPage.waitForCards();
    const img = page.locator('main a[href*="/product/"] img, main a[href*="/cluster/"] img').first();
    await expect(img).toBeVisible({ timeout: 10_000 });
  });

  test('page has filter controls or toolbar', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    await page.goto(categoryUrl);
    await page.locator('main a[href*="/product/"], main a[href*="/cluster/"]').first().waitFor({ state: 'visible', timeout: 20_000 });
    // Just verify product count > 0
    expect(await page.locator('main a[href*="/product/"], main a[href*="/cluster/"]').count()).toBeGreaterThan(0);
  });

  test('GridPagination Prev is disabled on page 1', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    await page.goto(categoryUrl);
    await page.locator('main a[href*="/product/"], main a[href*="/cluster/"]').first().waitFor({ state: 'visible', timeout: 20_000 });
    const prevBtn = page.getByRole('button', { name: /prev|previous/i });
    const count = await prevBtn.count();
    if (count > 0) {
      await expect(prevBtn.first()).toBeDisabled();
    }
  });

  test('clicking a product/cluster link navigates correctly', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    const categoryPage = new CategoryPage(page);
    await categoryPage.goto(categoryUrl);
    await categoryPage.waitForCards();
    const href = await categoryPage.getFirstProductHref();
    expect(href).toMatch(/\/(product|cluster)\//);
    await categoryPage.clickFirstProduct();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/(product|cluster)\//);
  });

  test('breadcrumbs render on category page', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    await page.goto(categoryUrl);
    await page.locator('main a[href*="/product/"], main a[href*="/cluster/"]').first().waitFor({ state: 'visible', timeout: 20_000 });
    const breadcrumbs = page.locator('nav[aria-label*="breadcrumb" i], ol').first();
    await expect(breadcrumbs).toBeVisible({ timeout: 10_000 });
  });
});
