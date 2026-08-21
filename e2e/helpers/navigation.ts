import { Page } from '@playwright/test';

/**
 * Known-good category URL on the staging backend.
 *
 * History: this helper used to discover the first category link from
 * HomeFallback dynamically, but the menu order is not stable across runs and
 * some categories carry malformed cluster products that crash the whole
 * `getCategory` query with "Cannot return null for non-nullable field
 * Product.slugs" (e.g. category 1737 / outdoor-en-travel as of 2026-05-20).
 * Pinning to a known-good category keeps the e2e suite green regardless of
 * staging data drift; if 1793 ever breaks, swap the constant below.
 */
const STABLE_CATEGORY_URL = '/category/1793/computers-accessoires';

export async function discoverCategoryUrl(page: Page): Promise<string> {
  // Visit home first to mirror the real-user flow (warm cookies, hydrate
  // PropellerProvider, etc.) — the previous implementation depended on home
  // page side effects and tests downstream may too.
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  return STABLE_CATEGORY_URL;
}

/**
 * Discovers a real PRODUCT (not cluster) URL from a category page.
 * Falls back to first product/cluster if no standalone product exists.
 */
export async function discoverProductUrl(
  page: Page,
  categoryUrl: string,
): Promise<string> {
  await page.goto(categoryUrl);
  await page.waitForLoadState('networkidle');

  // Prefer /product/ links (not /cluster/)
  const productLinkLocator = page.locator('main a[href*="/product/"]');
  const clusterLinkLocator = page.locator('main a[href*="/cluster/"]');

  // Wait for either to appear
  await page.locator('main a[href*="/product/"], main a[href*="/cluster/"]').first().waitFor({
    state: 'visible',
    timeout: 20_000,
  });

  // Try product first
  const productCount = await productLinkLocator.count();
  if (productCount > 0) {
    const href = await productLinkLocator.first().getAttribute('href');
    if (href) return href;
  }

  // Fall back to cluster
  const clusterCount = await clusterLinkLocator.count();
  if (clusterCount > 0) {
    const href = await clusterLinkLocator.first().getAttribute('href');
    if (href) return href;
  }

  throw new Error('Could not find a product or cluster link on the category page');
}

/**
 * Discovers a real cluster URL by visiting a category and reading the first cluster card link.
 */
export async function discoverClusterUrl(
  page: Page,
  categoryUrl: string,
): Promise<string> {
  await page.goto(categoryUrl);
  await page.waitForLoadState('networkidle');
  const href = await page
    .locator('main a[href*="/cluster/"]')
    .first()
    .getAttribute('href');
  if (!href) throw new Error('Could not find a cluster link on the category page');
  return href;
}
