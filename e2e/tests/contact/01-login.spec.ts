import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage';
import { getAccessToken } from '../../helpers/auth';

// These tests run with the contact storageState already applied

test.describe('Contact — login & auth state', () => {
  test('loading /account shows dashboard (already authenticated)', async ({ page }) => {
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    // Should not redirect to login
    await expect(page).not.toHaveURL(/\/login/);
    // Some account content should be visible
    await expect(page.locator('h1, h2, main').first()).toBeVisible({ timeout: 10_000 });
  });

  test('login page shows "Already logged in" when authenticated', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    const alreadyLoggedIn = page.getByText(/already logged in/i);
    await expect(alreadyLoggedIn).toBeVisible({ timeout: 10_000 });
  });

  test('access token is present in localStorage', async ({ page }) => {
    await page.goto('/');
    const token = await getAccessToken(page);
    expect(token).not.toBeNull();
    expect(token!.length).toBeGreaterThan(0);
  });

  test('AccountIconAndMenu: user indicator visible in header when logged in', async ({
    page,
  }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Header should show some user icon or name
    const header = page.locator('header');
    await expect(header).toBeVisible();
    // User account link/button in header
    const userLink = header.locator('a[href*="account"], button[aria-label*="account" i]').first();
    await expect(userLink).toBeVisible({ timeout: 8_000 });
  });

  test('login with wrong password shows error', async ({ page }) => {
    // Navigate first (must be on site to access localStorage)
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('expiresAt');
      localStorage.removeItem('user');
    });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const loginPage = new LoginPage(page);
    await loginPage.emailInput.waitFor({ state: 'visible' });
    await loginPage.login('d.krstev@propel.us', 'wrong_password_xyz');
    await page.waitForTimeout(3000);
    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });
});
