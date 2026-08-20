import { test as setup, expect } from '@playwright/test';

const AUTH_FILE = 'e2e/storage-state/contact.json';

// Credentials come from env so CI can inject them as masked secrets (the
// package's downstream e2e gate does this). The fallbacks keep the local
// `npm run test:e2e` workflow zero-config against the shared dev backend.
const EMAIL =
  process.env.TEST_CONTACT_USERNAME || process.env.E2E_CONTACT_EMAIL || 'd.krstev@propel.us';
const PASSWORD =
  process.env.TEST_CONTACT_PASSWORD || process.env.E2E_CONTACT_PASSWORD || 'darko000';

setup('authenticate as contact', async ({ page }) => {
  await page.goto('/login');

  // Locate by input id, not by label text: the labels are localized ("Email" /
  // "Wachtwoord" on the NL default), so `getByLabel(/password/i)` matched
  // nothing and the whole authenticated suite could not log in.
  const email = page.locator('#login-email');
  const password = page.locator('#login-password');
  await email.waitFor({ state: 'visible' });

  await email.fill(EMAIL);
  await password.fill(PASSWORD);
  await page.getByRole('button', { name: /login|sign in|log in|submit|inloggen|aanmelden/i }).click();

  // afterLogin pushes to /account (or /en/account depending on primaryLanguage)
  await page.waitForURL(/\/account/, { timeout: 20_000 });

  // Confirm we are authenticated
  await expect(page).not.toHaveURL(/\/login/);

  await page.context().storageState({ path: AUTH_FILE });
});
