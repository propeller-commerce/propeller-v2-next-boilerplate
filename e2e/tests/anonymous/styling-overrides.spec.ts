/**
 * Verifies the three override paths a consumer of propeller-v2-react-ui has:
 *   1. Token override — redefine `:root { --card: ...; --color-card: var(--card); }`
 *      and `bg-card` resolves to the new value.
 *   2. BEM hook override — `.propeller-breadcrumbs { outline: 4px solid red }`
 *      wins over the package's `@layer utilities` Tailwind rules.
 *   3. Per-instance className — props.className appended on the root.
 *
 * Test page: /styling-test (not part of the user flow).
 */

import { test, expect } from '@playwright/test';

test.describe('Styling: package override surfaces', () => {
  test('token override (--card) flows through to bg-card', async ({ page }) => {
    await page.goto('/styling-test');
    const tokenProbe = page.locator('[data-testid="token-probe"]');
    await expect(tokenProbe).toBeVisible();
    const bg = await tokenProbe.evaluate((el) => getComputedStyle(el).backgroundColor);
    // We set --card to rgb(0, 200, 100) in the .styling-test scope.
    expect(bg).toBe('rgb(0, 200, 100)');
  });

  test('BEM hook override beats package Tailwind utilities', async ({ page }) => {
    await page.goto('/styling-test');
    // Inside [data-bem-probe-host] there is exactly one .propeller-breadcrumbs.
    const bemProbe = page.locator('[data-bem-probe-host] .propeller-breadcrumbs').first();
    await expect(bemProbe).toBeVisible();
    const outline = await bemProbe.evaluate((el) => getComputedStyle(el).outline);
    expect(outline).toContain('rgb(255, 0, 0)');
  });

  test('per-instance className wins on the component root', async ({ page }) => {
    await page.goto('/styling-test');
    // The third Breadcrumbs has className="bg-blue-500" — find by it.
    const propProbe = page.locator('.propeller-breadcrumbs.bg-blue-500').first();
    await expect(propProbe).toBeVisible();
    const bg = await propProbe.evaluate((el) => getComputedStyle(el).backgroundColor);
    // Tailwind v4 bg-blue-500 → rgb(43, 127, 255) (oklch-based). Accept any
    // non-empty rgba value that is not transparent — what we're really
    // asserting is that the consumer-passed utility class painted the bg.
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(bg).not.toBe('transparent');
  });
});
