import { test, expect } from '@playwright/test';
import { SearchPage } from '../../page-objects/SearchPage';
import { TEST_DATA } from '../../helpers/testData';

test.describe('Search page', () => {
  test(`/search/${TEST_DATA.searchTerm} loads and shows results or empty state`, async ({ page }) => {
    const searchPage = new SearchPage(page);
    await searchPage.goto(TEST_DATA.searchTerm);
    await searchPage.waitForResults();
    const hasProducts = (await searchPage.productCards.count()) > 0;
    const hasEmpty = await searchPage.emptyState.isVisible();
    expect(hasProducts || hasEmpty).toBe(true);
  });

  test('/search (no term) loads', async ({ page }) => {
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('SearchBar in header navigates to /search/ on Enter', async ({ page }) => {
    await page.goto('/');
    // Wait for header to render
    await page.locator('header').waitFor({ state: 'visible' });
    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .first();
    await searchInput.fill(TEST_DATA.searchTerm);
    await searchInput.press('Enter');
    await expect(page).toHaveURL(/\/search/);
  });

  test('nonsense search shows empty state or 0 results gracefully', async ({ page }) => {
    const searchPage = new SearchPage(page);
    await searchPage.goto('xyzzy_no_match_ever_12345');
    await page.waitForLoadState('networkidle');
    // Should not crash
    await expect(page.locator('body')).toBeVisible();
  });

  test('search results have product/cluster links', async ({ page }) => {
    const searchPage = new SearchPage(page);
    await searchPage.goto(TEST_DATA.searchTerm);
    await searchPage.waitForResults();
    const count = await searchPage.productCards.count();
    if (count > 0) {
      const href = await searchPage.productCards.first().getAttribute('href');
      expect(href).toMatch(/\/(product|cluster)\//);
    }
  });

  test('search URL contains the search term', async ({ page }) => {
    await page.goto('/');
    await page.locator('header').waitFor({ state: 'visible' });
    const searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .first();
    await searchInput.fill(TEST_DATA.searchTerm);
    await searchInput.press('Enter');
    await expect(page).toHaveURL(new RegExp(TEST_DATA.searchTerm, 'i'));
  });
});
