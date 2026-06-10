import { Page, Locator } from '@playwright/test';

export class ClusterPage {
  readonly page: Page;
  readonly clusterTitle: Locator;
  readonly configuratorSelects: Locator;
  readonly addToCartButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.clusterTitle = page.locator('h1').first();
    this.configuratorSelects = page.locator('select, [role="combobox"]').filter({
      hasNot: page.locator('nav select'),
    });
    this.addToCartButton = page
      .getByRole('button', { name: /add to cart/i })
      .first();
  }

  async goto(url: string) {
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }
}
