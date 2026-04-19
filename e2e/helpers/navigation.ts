import { Page } from '@playwright/test';

/**
 * Discovers a real category URL from HomeFallback's category cards (visible in main content).
 * The header menu links are inside an invisible dropdown — we skip those.
 */
export async function discoverCategoryUrl(page: Page): Promise<string> {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // HomeFallback renders category links inside <main> with /category/{id}/{slug}
  const mainCategoryLink = page.locator('main a[href*="/category/"]').first();
  await mainCategoryLink.waitFor({ state: 'visible', timeout: 20_000 });
  const href = await mainCategoryLink.getAttribute('href');
  if (!href) throw new Error('Could not find a category link in main content');
  return href;
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
