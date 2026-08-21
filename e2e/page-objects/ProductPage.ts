import { Page, Locator } from '@playwright/test';

export class ProductPage {
  readonly page: Page;
  readonly productTitle: Locator;
  readonly addToCartButton: Locator;
  readonly quantityInput: Locator;
  readonly incrementButton: Locator;
  readonly decrementButton: Locator;
  /** AddToCart custom toast (fixed top-4 right-4, bg-green-50 on success) */
  readonly successToast: Locator;
  readonly favoriteButton: Locator;
  readonly galleryMainImage: Locator;
  readonly tabsBar: Locator;
  readonly breadcrumbs: Locator;

  constructor(page: Page) {
    this.page = page;
    this.productTitle = page.locator('h1').first();
    this.addToCartButton = page
      .getByRole('button', { name: /add to cart/i })
      .first();
    this.quantityInput = page.locator('input[type="number"]').first();
    // AddToCart uses +/- buttons adjacent to the qty input
    this.incrementButton = page.locator('button').filter({ hasText: /^\+$/ }).first();
    this.decrementButton = page.locator('button').filter({ hasText: /^[-−]$/ }).first();
    // AddToCart toast: fixed overlay div containing "added to cart" text
    this.successToast = page.locator('.bg-green-50').or(
      page.locator('div').filter({ hasText: /added to cart/i }).last()
    );
    this.favoriteButton = page
      .getByRole('button', { name: /favorite|wish|♥|heart/i })
      .or(page.locator('button[aria-label*="favorite" i], button[aria-label*="wish" i]'))
      .first();
    this.galleryMainImage = page.locator('img').first();
    this.tabsBar = page.locator('[role="tablist"]').first();
    this.breadcrumbs = page.locator('nav[aria-label*="breadcrumb" i], [data-testid="breadcrumbs"], ol').first();
  }

  async goto(url: string) {
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  async addToCart() {
    await this.addToCartButton.click();
  }

  async clickTab(name: string | RegExp) {
    await this.page.getByRole('tab', { name }).click();
  }
}
