import { Page, Locator } from '@playwright/test';

export class SearchPage {
  readonly page: Page;
  /** ProductCard renders as div with product/cluster links inside */
  readonly productCards: Locator;
  readonly emptyState: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productCards = page.locator('a[href*="/product/"], a[href*="/cluster/"]');
    this.emptyState = page.getByText(/no products found|no results/i);
    this.searchInput = page
      .getByRole('searchbox')
      .or(page.getByPlaceholder(/search/i))
      .first();
  }

  async goto(term?: string) {
    const url = term ? `/search/${encodeURIComponent(term)}` : '/search';
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForResults(timeout = 15_000) {
    // Either products appear or empty state appears
    await Promise.race([
      this.productCards.first().waitFor({ state: 'visible', timeout }),
      this.emptyState.waitFor({ state: 'visible', timeout }),
    ]);
  }
}
