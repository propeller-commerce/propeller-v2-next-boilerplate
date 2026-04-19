import { test as setup, expect } from '@playwright/test';

const AUTH_FILE = 'e2e/storage-state/contact.json';

setup('authenticate as contact', async ({ page }) => {
  await page.goto('/login');

  // Wait for the login form to be ready
  await page.getByLabel(/email/i).waitFor({ state: 'visible' });

  await page.getByLabel(/email/i).fill('d.krstev@propel.us');
  await page.getByLabel(/password/i).fill('darko000');
  await page.getByRole('button', { name: /login|sign in|log in|submit/i }).click();

  // afterLogin pushes to /account (or /en/account depending on primaryLanguage)
  await page.waitForURL(/\/account/, { timeout: 20_000 });

  // Confirm we are authenticated
  await expect(page).not.toHaveURL(/\/login/);

  await page.context().storageState({ path: AUTH_FILE });
});
