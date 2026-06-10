import { test, expect } from '@playwright/test';
import { ProductPage } from '../../page-objects/ProductPage';
import { discoverCategoryUrl, discoverProductUrl } from '../../helpers/navigation';

test.describe('Product detail page', () => {
  test('loads and shows product title', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    const productUrl = await discoverProductUrl(page, categoryUrl);
    const productPage = new ProductPage(page);
    await productPage.goto(productUrl);
    await expect(productPage.productTitle).toBeVisible({ timeout: 15_000 });
  });

  test('product image is visible', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    const productUrl = await discoverProductUrl(page, categoryUrl);
    const productPage = new ProductPage(page);
    await productPage.goto(productUrl);
    await expect(productPage.galleryMainImage).toBeVisible({ timeout: 10_000 });
  });

  test('price is displayed', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    const productUrl = await discoverProductUrl(page, categoryUrl);
    await page.goto(productUrl);
    await page.waitForLoadState('networkidle');
    // Price element — look for any element with a currency-like format
    const price = page.locator('*').filter({ hasText: /[€$£]\s*[\d,]+|[\d,]+\s*[€$£]/ }).first();
    await expect(price).toBeVisible({ timeout: 10_000 });
  });

  test('AddToCart: quantity input has a default value > 0', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    const productUrl = await discoverProductUrl(page, categoryUrl);
    const productPage = new ProductPage(page);
    await productPage.goto(productUrl);
    const val = await productPage.quantityInput.inputValue();
    expect(Number(val)).toBeGreaterThan(0);
  });

  test('AddToCart: clicking Add to Cart shows success toast', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    const productUrl = await discoverProductUrl(page, categoryUrl);
    const productPage = new ProductPage(page);
    await productPage.goto(productUrl);
    // Skip if no Add to cart button (may be a cluster that needs selection)
    const hasBtn = await productPage.addToCartButton.isVisible().catch(() => false);
    if (!hasBtn) { test.skip(); return; }
    await productPage.addToCart();
    // AddToCart shows a fixed overlay toast (bg-green-50) or a modal
    const feedback = page.locator('.bg-green-50, [role="dialog"]').first();
    await expect(feedback).toBeVisible({ timeout: 10_000 });
  });

  test('ProductTabs: tab bar is visible if tabs are rendered', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    const productUrl = await discoverProductUrl(page, categoryUrl);
    await page.goto(productUrl);
    await page.waitForLoadState('networkidle');
    const tabsBar = page.locator('[role="tablist"]');
    const count = await tabsBar.count();
    if (count > 0) {
      await expect(tabsBar.first()).toBeVisible();
    }
  });

  test('ProductTabs: clicking Description tab shows content', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    const productUrl = await discoverProductUrl(page, categoryUrl);
    await page.goto(productUrl);
    await page.waitForLoadState('networkidle');
    const descTab = page.getByRole('tab', { name: /description/i });
    const tabCount = await descTab.count();
    if (tabCount > 0) {
      await descTab.click();
      await expect(page.getByRole('tabpanel')).toBeVisible();
    }
  });

  test('breadcrumbs are visible', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    const productUrl = await discoverProductUrl(page, categoryUrl);
    await page.goto(productUrl);
    await page.waitForLoadState('networkidle');
    const breadcrumbs = page.locator('nav[aria-label*="breadcrumb" i], ol').first();
    await expect(breadcrumbs).toBeVisible({ timeout: 10_000 });
  });

  test('AddToCart: add button is present and enabled', async ({ page }) => {
    const categoryUrl = await discoverCategoryUrl(page);
    const productUrl = await discoverProductUrl(page, categoryUrl);
    await page.goto(productUrl);
    await page.waitForLoadState('networkidle');
    await page.locator('h1').first().waitFor({ state: 'visible', timeout: 15_000 });
    const addBtn = page.getByRole('button', { name: /add to cart/i }).first();
    const visible = await addBtn.isVisible().catch(() => false);
    if (!visible) { test.skip(); return; } // cluster or no-stock product
    await expect(addBtn).toBeEnabled();
  });
});
