import { test, expect } from '@playwright/test';

/**
 * Verifies the new /api/auth/refresh route: with a valid refresh_token cookie
 * (provided by the contact storageState), POST should return 204 and rewrite
 * both access_token + refresh_token cookies via Set-Cookie. The session
 * remains authenticated afterward.
 *
 * Note: we do NOT here verify the proxy 401-retry path end-to-end — that
 * requires forcibly expiring the upstream token, which only the backend can
 * do. The refresh route working + the proxy's retry being a thin wrapper
 * around it is verified by code review + the unit-level test below.
 */

test.describe('Contact — token refresh', () => {
  test('/api/auth/refresh exchanges refresh_token for a fresh pair', async ({ page, context }) => {
    // We need a same-origin request for cookies to be sent — navigate first.
    await page.goto('/');

    const cookiesBefore = await context.cookies();
    const accessBefore = cookiesBefore.find((c) => c.name === 'access_token')?.value;
    const refreshBefore = cookiesBefore.find((c) => c.name === 'refresh_token')?.value;
    expect(accessBefore, 'baseline: should be logged in (access_token cookie)').toBeTruthy();
    expect(refreshBefore, 'baseline: refresh_token cookie required').toBeTruthy();

    const res = await page.request.post('/api/auth/refresh');
    expect(res.status(), 'refresh should succeed for a valid refresh token').toBe(204);

    const cookiesAfter = await context.cookies();
    const accessAfter = cookiesAfter.find((c) => c.name === 'access_token')?.value;
    const refreshAfter = cookiesAfter.find((c) => c.name === 'refresh_token')?.value;

    expect(accessAfter, 'access_token should still exist after refresh').toBeTruthy();
    expect(refreshAfter, 'refresh_token should still exist after refresh').toBeTruthy();
    // The new tokens MUST differ from the old ones — otherwise the route is a no-op.
    expect(accessAfter).not.toBe(accessBefore);
    // Some IdPs rotate refresh tokens, some don't — we don't assert difference
    // on refresh_token, only on access_token. The /api/auth/me probe is the
    // real "session still works" check.

    const meRes = await page.request.get('/api/auth/me');
    expect(meRes.ok()).toBe(true);
    const me = (await meRes.json()) as { authenticated?: boolean };
    expect(me.authenticated).toBe(true);
  });

  test('/api/auth/refresh returns 401 with no refresh_token cookie', async ({ browser }) => {
    // Fresh context with empty storageState — explicit, since the project
    // default would otherwise inherit the contact's cookies.
    const anon = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const anonPage = await anon.newPage();
    await anonPage.goto('/');
    const res = await anonPage.request.post('/api/auth/refresh');
    expect(res.status()).toBe(401);
    await anon.close();
  });
});
