import { test, expect, Page } from '@playwright/test';

/**
 * GA4 events that genuinely require an account (PWP-910).
 *
 * The commerce funnel itself lives in the ANONYMOUS spec: this is a hybrid
 * shop, so add-to-cart and checkout work logged out. Only `purchase` (needs an
 * order) and the account-area intent events belong here.
 *
 * Nothing here places an order: `purchase` is asserted on the thank-you page of
 * an order the account ALREADY has. Same code path, same payload, no new orders
 * on the backend every time the suite runs.
 */

const CATEGORY_URL = '/category/1737/markeerstiften';

type DataLayerEntry = Record<string, unknown>;

/**
 * Record every `dataLayer` push, across navigations — a click that navigates
 * destroys the array before an after-the-fact read can see it.
 */
async function recordPushes(page: Page): Promise<DataLayerEntry[]> {
  const pushes: DataLayerEntry[] = [];
  await page.exposeFunction('__ga4Record', (entry: DataLayerEntry) => {
    pushes.push(entry);
  });
  await page.addInitScript(() => {
    const w = window as unknown as { dataLayer?: unknown[]; __ga4Record?: (e: unknown) => void };
    w.dataLayer = w.dataLayer || [];
    const original = w.dataLayer.push.bind(w.dataLayer);
    w.dataLayer.push = (...args: unknown[]) => {
      for (const arg of args) {
        try {
          w.__ga4Record?.(JSON.parse(JSON.stringify(arg)));
        } catch {
          /* gtag pushes an arguments object; not our concern */
        }
      }
      return original(...(args as never[]));
    };
  });
  return pushes;
}

const named = (entries: DataLayerEntry[], name: string) => entries.filter((e) => e.event === name);
const ecommerceOf = (entry: DataLayerEntry) =>
  entry.ecommerce as { items?: Record<string, unknown>[]; value?: number; currency?: string } | undefined;

/** Open the first product of the known-good category and add it to the cart. */
async function addFirstProductToCart(page: Page): Promise<boolean> {
  await page.goto(CATEGORY_URL);
  await page.waitForLoadState('networkidle');
  const href = await page.locator('main a[href*="/product/"]').first().getAttribute('href');
  await page.goto(href!);
  await page.waitForLoadState('networkidle');

  // Target the component's own BEM class, not button text: the storefront runs
  // in NL by default, so a /add to cart/i matcher finds nothing and a looser one
  // matches the header cart link instead — which navigates away and looks like
  // "the event never fired".
  const button = page.locator('.propeller-add-to-cart__submit').first();
  if (!(await button.isVisible().catch(() => false))) return false;
  await button.click();
  // The add is a GraphQL mutation; the event fires in its callback.
  await page.waitForTimeout(4000);
  return true;
}

/**
 * The most recent order id for this account.
 *
 * Read from the table text rather than from a link: `OrderList` renders rows
 * that navigate programmatically, so there is no `<a href="/account/orders/N">`
 * to click and a link-based lookup silently reports "account has no orders".
 */
async function latestOrderId(page: Page): Promise<string | null> {
  await page.goto('/account/orders');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  const text = await page.locator('main').innerText();
  const match = text.match(/^\s*(\d{2,})\s+\d{2}-\d{2}-\d{4}/m);
  return match ? match[1] : null;
}

const enabled = process.env.NEXT_PUBLIC_USE_GA4 === 'true' || process.env.USE_GA4 === 'true';

test.describe('Contact — GA4 commerce funnel', () => {
  test.skip(!enabled, 'USE_GA4 is off — the layer is deliberately a no-op');

  test('purchase fires on the thank-you page with transaction_id and items[]', async ({ page }) => {
    // Reuse an existing order rather than placing one: same code path, no new
    // order on the backend per run.
    const orderId = await latestOrderId(page);
    test.skip(!orderId, 'account has no orders to replay');

    const pushes = await recordPushes(page);
    await page.goto(`/checkout/thank-you/${orderId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(4000);

    const purchases = named(pushes, 'purchase');
    expect(purchases.length, 'purchase was never pushed').toBe(1);

    const ecommerce = purchases[0].ecommerce as Record<string, unknown>;
    // GA4 keys de-duplication on transaction_id; `order_id` means nothing to it.
    expect(String(ecommerce.transaction_id)).toBe(String(orderId));
    expect((ecommerce.items as unknown[])?.length).toBeGreaterThan(0);
    expect(ecommerce.currency).toBeTruthy();
  });

  test('the account area emits its B2B intent events', async ({ page }) => {
    const orderId = await latestOrderId(page);
    test.skip(!orderId, 'account has no orders');

    const pushes = await recordPushes(page);
    await page.goto(`/account/orders/${orderId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // "An old order reopened" is a service signal a rep wants before the call,
    // not during it.
    const viewed = named(pushes, 'propeller_order_viewed');
    expect(viewed.length, 'propeller_order_viewed was never pushed').toBeGreaterThan(0);
    expect(viewed[0].order_id).toBeTruthy();
  });
});
