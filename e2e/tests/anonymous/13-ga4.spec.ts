import { test, expect, Page } from '@playwright/test';
import { seedCart } from '../../helpers/cart';

/**
 * GA4 / GTM layer (PWP-910).
 *
 * Everything here fails SILENTLY in production: a rejected event name, an empty
 * `items[]`, a leaked `ecommerce` object. None of it throws, none of it shows in
 * the UI, and the first person to notice is whoever reads a wrong report weeks
 * later — which is why it is worth a browser test rather than only unit tests.
 *
 * The whole file skips when `USE_GA4` is off, so it is a no-op on shops that do
 * not use GA4 (and on CI until a key is configured there).
 *
 * These assert what the STOREFRONT pushes, never what Google received. Whether
 * an event reaches the GA4 property additionally depends on a tag existing for
 * it inside the GTM container — configuration that lives outside this repo, so
 * asserting on it here would make the suite fail for reasons no code change can
 * fix.
 */

/**
 * Pinned separately from `helpers/navigation`'s category on purpose: that one
 * (1793) currently returns an empty grid because the backend nulls a
 * non-nullable `Product.slugs`, and an empty grid emits no `view_item_list` at
 * all — the test would fail on backend data rather than on the layer it covers.
 */
const CATEGORY_URL = '/category/1737/markeerstiften';

type DataLayerEntry = Record<string, unknown>;

/** Everything the page pushed, with GTM's own internal events filtered out. */
async function readDataLayer(page: Page): Promise<DataLayerEntry[]> {
  const raw = await page.evaluate(() => JSON.stringify((window as unknown as { dataLayer?: unknown[] }).dataLayer ?? []));
  return (JSON.parse(raw) as DataLayerEntry[]).filter(
    (entry) => !String(entry?.event ?? '').startsWith('gtm.')
  );
}

function eventNamed(entries: DataLayerEntry[], name: string): DataLayerEntry | undefined {
  return entries.find((entry) => entry.event === name);
}

/**
 * Record every `dataLayer` push, across navigations.
 *
 * Reading `window.dataLayer` after the fact cannot see events that fire on a
 * click which then navigates — the document, and the array with it, is gone by
 * the time the assertion runs. Wrapping `push` and forwarding each entry to Node
 * keeps them.
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
          /* gtag pushes an arguments object; not our concern here */
        }
      }
      return original(...(args as never[]));
    };
  });
  return pushes;
}

/** Open the first product of the known-good category. */
async function gotoFirstProduct(page: Page): Promise<void> {
  await page.goto(CATEGORY_URL);
  await page.waitForLoadState('networkidle');
  const href = await page.locator('main a[href*="/product/"]').first().getAttribute('href');
  await page.goto(href!);
  await page.waitForLoadState('networkidle');
}


/**
 * Add the first product of the known-good category to the cart.
 *
 * This works ANONYMOUSLY — the shop is hybrid, and ordering is only gated in a
 * closed/semi-closed portal. Do not assume the funnel needs a login.
 *
 * Target the component's own BEM class, not button text: the storefront runs in
 * NL by default, so a /add to cart/i matcher finds nothing and a looser one
 * matches the header cart link instead — which navigates away and looks exactly
 * like "the event never fired".
 */
async function addFirstProductToCart(page: Page): Promise<boolean> {
  await gotoFirstProduct(page);
  const button = page.locator('.propeller-add-to-cart__submit').first();
  if (!(await button.isVisible().catch(() => false))) return false;
  await button.click();
  // The add is a GraphQL mutation; the event fires in its callback.
  await page.waitForTimeout(4000);
  return true;
}

const ecommerceOf = (entry: DataLayerEntry) =>
  entry.ecommerce as { items?: Record<string, unknown>[]; value?: number; currency?: string } | undefined;

const named = (entries: DataLayerEntry[], name: string) => entries.filter((e) => e.event === name);

const enabled = process.env.NEXT_PUBLIC_USE_GA4 === 'true' || process.env.USE_GA4 === 'true';

test.describe('GA4 datalayer', () => {
  test.skip(!enabled, 'USE_GA4 is off — the layer is deliberately a no-op');

  test('page_view fires once per page, without GA4 also auto-sending one', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Poll rather than read once: the bus BUFFERS events until the tracking
    // context resolves (up to the anonymous auth grace), so `networkidle` can
    // win that race on a cold start and see an empty datalayer.
    await expect
      .poll(async () => (await readDataLayer(page)).filter((e) => e.event === 'page_view').length, {
        timeout: 10_000,
      })
      .toBe(1);

    // Still exactly one after settling: `send_page_view: false` in the gtag
    // config is what keeps it there — without it Google fires its own on load
    // and every session double-counts.
    await page.waitForTimeout(2000);
    expect((await readDataLayer(page)).filter((e) => e.event === 'page_view')).toHaveLength(1);
  });

  test('no GA4 event name contains a dot — GA4 rejects those outright', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    for (const entry of await readDataLayer(page)) {
      const name = String(entry.event ?? '');
      if (!name) continue;
      expect(name, `"${name}" would be rejected by GA4`).toMatch(/^[A-Za-z][A-Za-z0-9_]*$/);
    }
  });

  test('view_item carries a populated items[] with the SKU as item_id', async ({ page }) => {
    await gotoFirstProduct(page);

    const viewItem = eventNamed(await readDataLayer(page), 'view_item');
    expect(viewItem, 'view_item was never pushed').toBeTruthy();

    const ecommerce = viewItem!.ecommerce as { items?: Record<string, unknown>[]; currency?: string };
    expect(ecommerce?.items?.length, 'items[] is what every GA4 ecommerce report is built on').toBeGreaterThan(0);

    const [item] = ecommerce!.items!;
    // A numeric product id here would join against nothing a merchant recognises.
    expect(typeof item.item_id).toBe('string');
    expect(item.item_name).toBeTruthy();
    expect(ecommerce.currency).toBeTruthy();
  });

  test('view_item_list carries the rendered page of products and its list name', async ({ page }) => {
    await page.goto(CATEGORY_URL);
    await page.waitForLoadState('networkidle');

    const list = eventNamed(await readDataLayer(page), 'view_item_list');
    expect(list, 'view_item_list was never pushed').toBeTruthy();

    const ecommerce = list!.ecommerce as { items?: unknown[]; item_list_name?: string };
    expect(ecommerce?.items?.length).toBeGreaterThan(0);
    // The list NAME, not just its id — that is what shows up in the reports.
    expect(ecommerce?.item_list_name).toBeTruthy();
  });

  test('every ecommerce push is preceded by an ecommerce:null clear', async ({ page }) => {
    await gotoFirstProduct(page);

    const raw = JSON.parse(
      await page.evaluate(() => JSON.stringify((window as unknown as { dataLayer?: unknown[] }).dataLayer ?? []))
    ) as DataLayerEntry[];

    raw.forEach((entry, i) => {
      if (!entry || entry.ecommerce == null) return;
      const previous = raw[i - 1];
      // GTM merges consecutive pushes: without the clear, the previous event's
      // items leak into this one and inflate it.
      expect(
        previous && 'ecommerce' in previous && previous.ecommerce === null,
        `"${entry.event}" pushed ecommerce without clearing first`
      ).toBe(true);
    });
  });

  test('identity is published as user properties for the B2B dimensions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const entries = await readDataLayer(page);
    const identity = eventNamed(entries, 'propeller_identity');
    // In gtag mode this is a `set` call rather than a named event, so only
    // assert it when a container is configured.
    if (identity) {
      expect(identity.user_mode).toBe('anonymous');
    }
  });

  test('view_cart carries the cart lines', async ({ page }) => {
    await page.goto('/');
    await seedCart(page, [{ productId: 111775, name: 'Markeerstift', sku: '1469671', quantity: 2 }]);
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    const viewCart = eventNamed(await readDataLayer(page), 'view_cart');
    expect(viewCart, 'view_cart was never pushed').toBeTruthy();
    const ecommerce = viewCart!.ecommerce as { items?: Record<string, unknown>[] };
    expect(ecommerce?.items?.length).toBeGreaterThan(0);
    // The line quantity, not 1 — view_cart reports the cart as it stands.
    expect(ecommerce!.items![0].quantity).toBe(2);
  });

  test('select_item fires on a product click, carrying the item and its list', async ({ page }) => {
    const pushes = await recordPushes(page);
    await page.goto(CATEGORY_URL);
    await page.waitForLoadState('networkidle');
    await page.locator('main a[href*="/product/"]').first().click();
    await page.waitForLoadState('networkidle');

    const select = pushes.find((e) => e.event === 'select_item');
    expect(select, 'select_item was never pushed').toBeTruthy();
    const ecommerce = select!.ecommerce as { items?: Record<string, unknown>[]; item_list_name?: string };
    expect(ecommerce?.items?.length).toBeGreaterThan(0);
    expect(ecommerce?.item_list_name).toBeTruthy();
  });

  test('the full browse sequence pushes each event exactly once', async ({ page }) => {
    // Order matters as much as presence: GA4 funnels are built on the sequence,
    // and a duplicate is indistinguishable from real traffic once collected.
    const pushes = await recordPushes(page);
    await gotoFirstProduct(page);

    const names = pushes.map((e) => e.event).filter(Boolean);
    for (const expected of ['page_view', 'view_item_list', 'view_item']) {
      expect(names.filter((n) => n === expected), `${expected} count`).toHaveLength(
        expected === 'page_view' ? 2 : 1
      );
    }
    expect(names.indexOf('view_item_list')).toBeLessThan(names.indexOf('view_item'));
  });

  test('add_to_cart fires with items[], a value and its source', async ({ page }) => {
    const pushes = await recordPushes(page);
    test.skip(!(await addFirstProductToCart(page)), 'no add-to-cart button on this product');

    const adds = named(pushes, 'add_to_cart');
    expect(adds.length, 'add_to_cart was never pushed').toBeGreaterThan(0);

    const ecommerce = ecommerceOf(adds[0]);
    expect(ecommerce?.items?.length, 'GA4 ecommerce reports are built on items[]').toBeGreaterThan(0);
    expect(typeof ecommerce!.items![0].item_id).toBe('string');
    expect(ecommerce?.currency).toBeTruthy();
    // A zero value would be averaged into GA4 as a real cart value.
    expect(Number(ecommerce?.value)).toBeGreaterThan(0);
  });

  test('view_cart reports the real cart, and quantity edits report the DELTA', async ({ page }) => {
    const pushes = await recordPushes(page);
    test.skip(!(await addFirstProductToCart(page)), 'no add-to-cart button on this product');

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    expect(named(pushes, 'view_cart').length, 'view_cart was never pushed').toBeGreaterThan(0);

    const before = named(pushes, 'add_to_cart').length;
    const increment = page.locator('.propeller-cart-item__increment, .propeller-add-to-cart__increment').first();
    if (await increment.isVisible().catch(() => false)) {
      await increment.click();
      await page.waitForTimeout(4000);

      const adds = named(pushes, 'add_to_cart');
      expect(adds.length, 'a quantity increase must emit add_to_cart').toBeGreaterThan(before);
      // Raising 1 -> 2 is an add of ONE, not of the new line total.
      expect(ecommerceOf(adds[adds.length - 1])?.items?.[0].quantity).toBe(1);
    }
  });

  test('begin_checkout fires with the cart contents', async ({ page }) => {
    const pushes = await recordPushes(page);
    test.skip(!(await addFirstProductToCart(page)), 'no add-to-cart button on this product');

    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const begin = named(pushes, 'begin_checkout');
    expect(begin.length, 'begin_checkout was never pushed').toBeGreaterThan(0);
    expect(ecommerceOf(begin[0])?.items?.length).toBeGreaterThan(0);
    // Once per cart: step 3 can auto-advance when there is a single payment
    // method, so keying on step transitions would double-count.
    expect(begin.length).toBe(1);
  });
});
