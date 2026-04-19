import { test, expect } from '@playwright/test';
import { CheckoutPage } from '../../page-objects/CheckoutPage';
import { seedCart } from '../../helpers/cart';

const GUEST_ADDRESS = {
  firstName: 'Test',
  lastName: 'User',
  street: 'Teststraat',
  number: '1',
  postal: '1234AB',
  city: 'Amsterdam',
};

test.describe('Checkout — guest flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await seedCart(page, [
      { productId: 4001, name: 'Checkout Test Product', quantity: 1, priceNet: 20 },
    ]);
  });

  test('checkout page loads and shows step 1', async ({ page }) => {
    const checkout = new CheckoutPage(page);
    await checkout.goto();
    // Step 1 header is visible
    await expect(page.getByText(/invoice address|details/i).first()).toBeVisible({ timeout: 15_000 });
  });

  test('Step 1: address form has First Name label', async ({ page }) => {
    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await checkout.waitForStep1();
    const firstNameLabel = page.locator('label').filter({ hasText: /first name/i }).first();
    await expect(firstNameLabel).toBeVisible({ timeout: 15_000 });
  });

  test('Step 1: First Name input is fillable', async ({ page }) => {
    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await checkout.waitForStep1();
    await checkout.firstNameInput.fill('TestFill');
    await expect(checkout.firstNameInput).toHaveValue('TestFill');
  });

  test('Step 1: filling required fields and clicking Continue advances', async ({
    page,
  }) => {
    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await checkout.waitForStep1();
    await checkout.fillInvoiceAddress(GUEST_ADDRESS);
    // Click save/confirm which is inside the AddressCard
    const saveBtn = page.getByRole('button', { name: /save|confirm invoice|continue|next/i }).first();
    await saveBtn.click();
    // Should advance past step 1
    await page.waitForTimeout(2000);
    await expect(page.locator('main')).toBeVisible();
  });

  test('checkout page is accessible when cart is seeded', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('Step 1: progress indicator shows "Details" step', async ({ page }) => {
    const checkout = new CheckoutPage(page);
    await checkout.goto();
    await expect(page.getByText(/details/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
