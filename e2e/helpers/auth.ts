import { Page } from '@playwright/test';

/**
 * Auth in this app uses an httpOnly `access_token` cookie that JavaScript
 * cannot read. These helpers therefore work against the cookie / the
 * `/api/auth/me` session probe rather than `localStorage`.
 */

/**
 * Clears the auth session: expires the httpOnly cookie server-side (via
 * `/api/auth/logout`) and removes the non-sensitive `user` render hint.
 * Use to simulate logout in tests that verify unauthenticated state.
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.request.post('/api/auth/logout');
  await page.evaluate(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
  });
}

/**
 * Returns whether an authenticated session exists, per the server-side
 * `/api/auth/me` probe (reads the httpOnly cookie). Replaces the old
 * token-in-localStorage check — the JWT is no longer readable from JS.
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const res = await page.request.get('/api/auth/me');
  if (!res.ok()) return false;
  const body = (await res.json()) as { authenticated?: boolean };
  return !!body.authenticated;
}

/**
 * Back-compat shim for specs that asserted a token was present after login.
 * The token is now httpOnly (not exposable), so this resolves to a truthy
 * sentinel when a session cookie exists and `null` otherwise — keeping
 * `expect(token).not.toBeNull()` style assertions meaningful as a
 * "session established" check.
 */
export async function getAccessToken(page: Page): Promise<string | null> {
  return (await isLoggedIn(page)) ? 'httponly-cookie-session' : null;
}
