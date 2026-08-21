/**
 * Regression test for CartItem visual alignment.
 *
 * The cart item's root used `items-center`, which made the image and
 * footer (price + qty + delete) drift to the vertical middle of a tall
 * body when "You might also like" cross-sells were present. Visually
 * the image looked detached from the SKU/title row.
 *
 * Fix: `items-start` on the cart-item root + `md:mt-1` on the footer to
 * optically align with the title baseline.
 *
 * This test asserts the image top is within 24px of the cart-item top
 * (i.e. anchored to the top, not centered over a 200px+ body).
 */

import { test, expect } from '@playwright/test';
import { seedCart } from '../../helpers/cart';

test.describe('CartItem layout', () => {
  test('image is top-aligned within the cart item', async ({ page }) => {
    // Establish origin first so seedCart's localStorage write lands on
    // the right origin — same pattern as 06-cart.spec.ts.
    await page.goto('/');
    await seedCart(page, [
      { productId: 1001, name: 'Test Product', quantity: 2, priceNet: 10, priceGross: 12.1 },
    ]);
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    const cartItem = page.locator('.propeller-cart-item').first();
    await expect(cartItem).toBeVisible({ timeout: 10_000 });

    const media = cartItem.locator('.propeller-cart-item__media').first();
    await expect(media).toBeVisible();

    const cartBox = await cartItem.boundingBox();
    const mediaBox = await media.boundingBox();
    if (!cartBox || !mediaBox) throw new Error('cart-item or media not measurable');

    // Image should be near the top of the card (≤ card padding + a few px).
    // p-4 = 16px, plus a small fudge. `items-center` would put a 96px image
    // at the vertical center of the body, easily 40px+ from top on a
    // bundle or cross-sell-bearing item.
    expect(mediaBox.y - cartBox.y).toBeLessThan(24);
  });
});
