import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly searchInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i)).first();
  }

  /**
   * Category links visible in the main content (HomeFallback cards).
   * The header menu dropdown is invisible until hover — use main content links only.
   */
  get firstCategoryLink(): Locator {
    return this.page.locator('main a[href*="/category/"]').first();
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async waitForHomeFallbackCategories() {
    // Wait until HomeFallback renders its category cards
    await this.firstCategoryLink.waitFor({ state: 'visible', timeout: 20_000 });
  }

  async search(term: string) {
    // Wait for the header and search input to be present before typing.
    // Under parallel suite load the React tree can still be hydrating when
    // the test fires Enter, in which case the native form submission (a
    // GET to the current URL) wins over the not-yet-bound onSubmit handler
    // and the route never changes. The 05-search test does the same thing
    // explicitly for the same reason.
    await this.page.locator('header').waitFor({ state: 'visible' });
    await this.searchInput.waitFor({ state: 'visible' });
    await this.searchInput.fill(term);
    await this.searchInput.press('Enter');
  }
}
