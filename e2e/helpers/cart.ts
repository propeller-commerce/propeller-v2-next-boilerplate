import { Page } from '@playwright/test';

export interface SeedCartItem {
  productId: number;
  name: string;
  sku?: string;
  quantity: number;
  priceNet?: number;
  priceGross?: number;
}

/**
 * Seeds a cart into localStorage in the exact format produced by serializeCart().
 * Must be called AFTER navigating to the site (e.g. after page.goto('/'))
 * so localStorage is on the correct origin.
 *
 * CartMainItem fields match the SDK GraphQL fragment:
 *   itemId, productId, quantity, priceNet, etc.
 */
export async function seedCart(
  page: Page,
  items: SeedCartItem[],
  cartId = 'test-cart-001',
): Promise<void> {
  const cartData = {
    cartId,
    channelId: 1,
    items: items.map((item, idx) => ({
      itemId: `item-${idx}-${item.productId}`,   // must be itemId, not cartItemId
      productId: item.productId,
      quantity: item.quantity,
      priceNet: item.priceNet ?? 10,
      price: item.priceGross ?? 12.1,
      sumNet: (item.priceNet ?? 10) * item.quantity,
      sum: (item.priceGross ?? 12.1) * item.quantity,
      totalSumNet: (item.priceNet ?? 10) * item.quantity,
      totalSum: (item.priceGross ?? 12.1) * item.quantity,
      product: {
        productId: item.productId,
        names: [{ value: item.name, language: 'NL' }],
        sku: item.sku ?? String(item.productId),
      },
    })),
    total: {
      totalNet: items.reduce((s, i) => s + (i.priceNet ?? 10) * i.quantity, 0),
      totalGross: items.reduce((s, i) => s + (i.priceGross ?? 12.1) * i.quantity, 0),
      subTotalNet: items.reduce((s, i) => s + (i.priceNet ?? 10) * i.quantity, 0),
    },
  };

  await page.evaluate((data) => {
    localStorage.setItem('cart', JSON.stringify(data));
    // Dispatch the events CartContext listens to
    window.dispatchEvent(new Event('cartUpdated'));
    window.dispatchEvent(new StorageEvent('storage', { key: 'cart', newValue: JSON.stringify(data) }));
  }, cartData);
}

/**
 * Clears the cart from localStorage.
 * Only needed if a test needs to explicitly reset cart state.
 * Note: each Playwright test gets a fresh browser context, so localStorage
 * starts empty — you only need clearCart if you've seeded within the same test.
 */
export async function clearCart(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('cart');
    window.dispatchEvent(new Event('cartUpdated'));
  });
}
