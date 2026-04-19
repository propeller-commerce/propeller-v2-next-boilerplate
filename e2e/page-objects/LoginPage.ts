import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly alreadyLoggedInHeading: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel(/email/i);
    this.passwordInput = page.getByLabel(/password/i);
    this.submitButton = page.getByRole('button', { name: /login|sign in|log in|submit/i });
    this.errorMessage = page.locator('[role="alert"], .text-red-500, .text-destructive').first();
    this.alreadyLoggedInHeading = page.getByText(/already logged in/i);
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async waitForRedirectToAccount() {
    await this.page.waitForURL(/\/account/, { timeout: 20_000 });
  }
}
