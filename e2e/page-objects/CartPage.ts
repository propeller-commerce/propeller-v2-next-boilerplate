import { Page, Locator } from '@playwright/test';

export class CartPage {
  readonly page: Page;
  readonly emptyState: Locator;
  readonly cartItems: Locator;
  readonly checkoutButton: Locator;
  readonly actionCodeInput: Locator;
  readonly actionCodeApply: Locator;
  readonly cartTotal: Locator;
  readonly discountLine: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emptyState = page.getByText(/your cart is empty|cart is empty/i);
    this.cartItems = page.locator('[data-testid="cart-item"]').or(
      page.locator('ul li').filter({ has: page.locator('img') })
    );
    this.checkoutButton = page.getByRole('link', { name: /checkout/i }).or(
      page.getByRole('button', { name: /checkout/i })
    ).first();
    this.actionCodeInput = page.getByPlaceholder(/action code|promo|coupon|voucher/i).or(
      page.locator('input[name*="action" i], input[name*="promo" i], input[name*="coupon" i]')
    ).first();
    this.actionCodeApply = page.getByRole('button', { name: /apply|redeem/i }).first();
    this.cartTotal = page.locator('[data-testid="cart-total"]').or(
      page.getByText(/total/i).last()
    );
    this.discountLine = page.getByText(/discount|action code/i).first();
  }

  async goto() {
    await this.page.goto('/cart');
    await this.page.waitForLoadState('networkidle');
  }

  async getItemCount(): Promise<number> {
    return this.cartItems.count();
  }

  async applyActionCode(code: string) {
    await this.actionCodeInput.fill(code);
    await this.actionCodeApply.click();
  }
}
