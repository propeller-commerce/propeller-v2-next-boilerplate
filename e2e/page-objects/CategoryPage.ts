import { Page, Locator } from '@playwright/test';

export class CategoryPage {
  readonly page: Page;
  /** ProductCard links in main content (not header menu) */
  readonly productCards: Locator;
  readonly filterSidebar: Locator;
  readonly paginationNext: Locator;
  readonly paginationPrev: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    // ProductCard links inside main content only (not header menu)
    this.productCards = page.locator('main a[href*="/product/"], main a[href*="/cluster/"]');
    this.filterSidebar = page.locator('aside, [data-testid="grid-filters"]');
    this.paginationNext = page.getByRole('button', { name: /next/i });
    this.paginationPrev = page.getByRole('button', { name: /prev|previous/i });
    this.emptyState = page.getByText(/no products found/i);
  }

  async goto(url: string) {
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  /** Wait for product/cluster cards to be visible in main */
  async waitForCards(timeout = 20_000) {
    await this.productCards.first().waitFor({ state: 'visible', timeout });
  }

  async getFirstProductHref(): Promise<string | null> {
    return this.productCards.first().getAttribute('href');
  }

  async clickFirstProduct() {
    await this.productCards.first().click();
  }
}
