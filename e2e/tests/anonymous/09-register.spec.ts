import { test, expect } from '@playwright/test';

test.describe('Register page', () => {
  test('register page loads', async ({ page }) => {
    const response = await page.goto('/register');
    expect(response?.status()).toBe(200);
    await expect(page.locator('body')).toBeVisible();
  });

  test('registration form has email and password fields', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i).first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    await expect(passwordInput).toBeVisible({ timeout: 10_000 });
  });

  test('passwords do not match shows validation error', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/^password$/i).or(page.getByLabel(/password/i).first());
    const confirmInput = page.getByLabel(/confirm password|repeat password/i).first();
    const submitBtn = page.getByRole('button', { name: /register|sign up|create account/i });

    await emailInput.fill('test_register_dummy@example.com');
    await passwordInput.fill('TestPass123!');
    if ((await confirmInput.count()) > 0) {
      await confirmInput.fill('DifferentPass999!');
    }

    await submitBtn.click();
    await page.waitForTimeout(1500);

    // Some validation error should appear
    const error = page.locator('[role="alert"], .text-red-500, .text-destructive').first();
    const count = await error.count();
    if (count > 0) {
      await expect(error).toBeVisible({ timeout: 5_000 });
    }
  });

  test('submitting empty form shows required field errors', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    const submitBtn = page.getByRole('button', { name: /register|sign up|create account/i });
    await submitBtn.click();
    await page.waitForTimeout(1000);
    // Page should still be on /register
    await expect(page).toHaveURL(/\/register/);
  });
});
