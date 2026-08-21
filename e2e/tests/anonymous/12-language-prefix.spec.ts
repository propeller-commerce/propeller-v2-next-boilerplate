/**
 * Locale resolution on the SERVER: URL prefix, then cookie, then default
 *.
 *
 * `proxy.ts` strips the `/en` prefix before the route sees it, and used to hand
 * the locale on only as a response cookie — which the current render cannot
 * read. So `/en` server-rendered Dutch and every page was a language behind.
 * The prefix now rides along as the `x-cms-locale` request header, and every
 * page resolves through `resolveRequestLanguage()` so none of them can read the
 * cookie alone and lose to a stale value.
 *
 * These assertions deliberately look at the SERVER response — a raw
 * `request.get`, or a `page.goto` read before any client work matters.
 * Asserting on the settled DOM would pass even with the bug, because the client
 * takes its language from the URL; that divergence is what made the category
 * description vanish while the heading stayed Dutch.
 */

import { test, expect } from '@playwright/test';

test.describe('server-side locale resolution', () => {
  test('a cold /en request renders English, not the default language', async ({ request }) => {
    // No cookie jar, no prior visit — the state that used to fall back to the
    // site default because the only locale signal was a cookie not yet set.
    const [nl, en] = await Promise.all([request.get('/'), request.get('/en')]);

    expect(nl.ok()).toBeTruthy();
    expect(en.ok()).toBeTruthy();

    // `<html lang>` is resolved from the same value the page fetches its data
    // with, so it is the cheapest tenant-independent proof of which language
    // the SERVER chose. Before the fix both said `nl`.
    expect(await nl.text()).toContain('<html lang="nl"');
    expect(await en.text()).toContain('<html lang="en"');
  });

  test('the URL prefix beats a stale cookie from the previous language', async ({ request }) => {
    const res = await request.get('/en', { headers: { Cookie: 'preferred_language=NL' } });
    expect(await res.text()).toContain('<html lang="en"');
  });

  test('an unprefixed URL keeps the stored preference', async ({ request }) => {
    // Deliberate, and the other half of the contract: the cookie is the
    // persisted choice, so `/cart` after picking EN stays English rather than
    // snapping back to Dutch. Only a prefix outranks it.
    const res = await request.get('/', { headers: { Cookie: 'preferred_language=EN' } });
    expect(await res.text()).toContain('<html lang="en"');
  });

  test('server-rendered copy is localized on the first paint', async ({ page }) => {
    // Copy from the i18n bundles rather than the catalog, so this holds on any
    // tenant regardless of which categories happen to be translated.
    await page.goto('/terms-conditions');
    const dutch = await page.locator('h1').first().textContent();

    await page.goto('/en/terms-conditions');
    const english = await page.locator('h1').first().textContent();

    expect(dutch?.trim()).toBeTruthy();
    expect(english?.trim()).toBeTruthy();
    expect(english).not.toEqual(dutch);
  });
});
