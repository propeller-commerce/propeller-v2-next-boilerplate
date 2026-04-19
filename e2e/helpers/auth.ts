import { Page } from '@playwright/test';

/**
 * Clears all auth-related localStorage keys and reloads the page.
 * Use this to simulate logout in tests that need to verify unauthenticated state.
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('expiresAt');
    localStorage.removeItem('user');
  });
}

/**
 * Reads the access token from localStorage (useful for asserting login succeeded).
 */
export async function getAccessToken(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem('accessToken'));
}

/**
 * Checks if the user is logged in according to localStorage.
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const token = await getAccessToken(page);
  return !!token;
}
