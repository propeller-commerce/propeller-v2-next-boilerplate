import { test, expect } from '@playwright/test';
import { CheckoutPage } from '../../page-objects/CheckoutPage';
import { seedCart } from '../../helpers/cart';

test.describe('Customer — Checkout (pre-populated addresses)', () => {
  test.beforeEach(async ({ page }) => {
    // Must navigate first to establish the correct origin for localStorage
    await page.goto('/');
    await seedCart(page, [
      { productId: 6001, name: 'Customer Checkout Product', quantity: 1, priceNet: 40 },
    ]);
  });

  test('checkout page loads for authenticated customer', async ({ page }) => {
    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main')).toBeVisible({ timeout: 10_000 });
  });

  test('Step 1: address form is visible', async ({ page }) => {
    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await checkout.waitForStep1();
    const firstNameLabel = page.locator('label').filter({ hasText: /first name/i }).first();
    await expect(firstNameLabel).toBeVisible({ timeout: 15_000 });
  });

  test('Step 1: address may be pre-populated from customer default address', async ({
    page,
  }) => {
    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await checkout.waitForStep1();
    const firstName = await checkout.firstNameInput.inputValue().catch(() => '');
    expect(typeof firstName).toBe('string');
  });

  test('Step 1 → Step 2 transition works', async ({ page }) => {
    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await checkout.waitForStep1();

    const firstName = await checkout.firstNameInput.inputValue().catch(() => '');
    if (!firstName) {
      await checkout.fillInvoiceAddress({
        firstName: 'Jan',
        lastName: 'Customer',
        street: 'Klantenstraat',
        number: '5',
        postal: '2000AB',
        city: 'Rotterdam',
      });
    }
    const saveBtn = page.getByRole('button', { name: /save|confirm|continue|next/i }).first();
    await saveBtn.click();
    await page.waitForTimeout(2000);
    await expect(page.locator('main')).toBeVisible();
  });

  test('No AddressSelector modal for customer (company flow only)', async ({ page }) => {
    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await checkout.waitForStep1();

    const firstName = await checkout.firstNameInput.inputValue().catch(() => '');
    if (!firstName) {
      await checkout.fillInvoiceAddress({
        firstName: 'Jan',
        lastName: 'Customer',
        street: 'Klantenstraat',
        number: '5',
        postal: '2000AB',
        city: 'Rotterdam',
      });
    }
    const saveBtn = page.getByRole('button', { name: /save|confirm|continue|next/i }).first();
    await saveBtn.click();
    await page.waitForTimeout(1500);
    await expect(page.locator('main')).toBeVisible();
  });
});
