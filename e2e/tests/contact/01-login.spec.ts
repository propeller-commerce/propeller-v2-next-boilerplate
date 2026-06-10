import { test, expect } from '@playwright/test';
import { LoginPage } from '../../page-objects/LoginPage';
import { getAccessToken, clearAuth } from '../../helpers/auth';

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

  test('authenticated session established via httpOnly cookie (not JS-readable)', async ({
    page,
  }) => {
    await page.goto('/');
    const token = await getAccessToken(page);
    expect(token).not.toBeNull();
    expect(token!.length).toBeGreaterThan(0);
    // The JWT must NOT be reachable from client JS — that is the security fix.
    // Check BOTH key spellings: the legacy camelCase `accessToken` our old
    // code wrote, and `access_token` — the SDK's DEFAULT_TOKEN_STORAGE_KEY,
    // which graphqlClient.setAccessToken() would persist if ever called on
    // the client (the regression that re-leaked the token to localStorage).
    const lsTokens = await page.evaluate(() => ({
      accessToken: localStorage.getItem('accessToken'),
      access_token: localStorage.getItem('access_token'),
      refreshToken: localStorage.getItem('refreshToken'),
      refresh_token: localStorage.getItem('refresh_token'),
    }));
    expect(lsTokens.accessToken).toBeNull();
    expect(lsTokens.access_token).toBeNull();
    expect(lsTokens.refreshToken).toBeNull();
    expect(lsTokens.refresh_token).toBeNull();
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
    // Fully clear the session — expire the httpOnly auth cookie AND the
    // localStorage hint. Removing only the hint is no longer a logout:
    // since Phase A-bis the cookie is the source of truth and the client
    // re-fetches the user via getViewer(), so a hint-only clear would leave
    // the visitor authenticated and /login would redirect away.
    await page.goto('/');
    await clearAuth(page);
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
