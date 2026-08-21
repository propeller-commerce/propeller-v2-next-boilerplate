import { Page, Locator } from '@playwright/test';

export class CheckoutPage {
  readonly page: Page;

  // Step navigation
  readonly continueButton: Locator;

  // Step 2 — delivery
  readonly sameAddressCheckbox: Locator;

  // Step 3 — payment/carrier
  readonly paymentTiles: Locator;
  readonly carrierTiles: Locator;

  // Step 4 — review
  readonly termsCheckbox: Locator;
  readonly placeOrderButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.continueButton = page.getByRole('button', { name: /continue|next|confirm/i });

    this.sameAddressCheckbox = page.getByRole('checkbox', {
      name: /same as|billing|delivery address same/i,
    });

    this.paymentTiles = page.locator('[data-testid="payment-tile"]');
    this.carrierTiles = page.locator('[data-testid="carrier-tile"]');

    this.termsCheckbox = page.getByRole('checkbox', {
      name: /terms|conditions|agree/i,
    });
    this.placeOrderButton = page.getByRole('button', { name: /place order|submit order/i });
  }

  async goto() {
    await this.page.goto('/checkout');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Gets the first name input by locating the label text "First Name" then the adjacent input.
   * Labels in AddressCard don't use htmlFor so we can't use getByLabel.
   */
  getInputAfterLabel(labelText: string | RegExp): Locator {
    return this.page
      .locator('label')
      .filter({ hasText: labelText })
      .first()
      .locator('xpath=following-sibling::input[1]');
  }

  get firstNameInput(): Locator {
    return this.getInputAfterLabel(/first name/i);
  }

  get lastNameInput(): Locator {
    return this.getInputAfterLabel(/last name/i);
  }

  get streetInput(): Locator {
    return this.getInputAfterLabel(/^street/i);
  }

  get cityInput(): Locator {
    return this.getInputAfterLabel(/^city/i);
  }

  get postalInput(): Locator {
    return this.getInputAfterLabel(/postal|zip/i);
  }

  get numberInput(): Locator {
    return this.getInputAfterLabel(/^number/i);
  }

  async fillInvoiceAddress(data: {
    firstName: string;
    lastName: string;
    street: string;
    number: string;
    postal: string;
    city: string;
  }) {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.streetInput.fill(data.street);
    await this.numberInput.fill(data.number);
    await this.postalInput.fill(data.postal);
    await this.cityInput.fill(data.city);
  }

  async clickFirstPaymentMethod() {
    await this.paymentTiles.first().click();
  }

  async clickFirstCarrier() {
    await this.carrierTiles.first().click();
  }

  /**
   * Waits for the address form (step 1) to become visible.
   * Uses a broad selector since labels have no htmlFor.
   */
  async waitForStep1() {
    // The form is visible when we can see "First Name" label
    await this.page.locator('label').filter({ hasText: /first name/i }).waitFor({
      state: 'visible',
      timeout: 15_000,
    });
  }

  /** Returns true if step 1 form is currently visible */
  async isStep1Visible(): Promise<boolean> {
    const label = this.page.locator('label').filter({ hasText: /first name/i });
    return label.isVisible();
  }
}
