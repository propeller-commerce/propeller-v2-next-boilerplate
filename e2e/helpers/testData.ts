/**
 * Real URLs discovered from the dev server.
 * Run `npm run test:e2e -- --project=anonymous e2e/tests/anonymous/01-home.spec.ts`
 * and check navigation.ts discovery helpers to populate these.
 *
 * Fill in actual IDs/slugs after the first manual run.
 */
export const TEST_DATA = {
  /** A real category URL discovered from the main navigation */
  categoryUrl: '/category/17/todo',

  /** A real product URL discovered from the first category */
  productUrl: '/product/todo/todo',

  /** A real cluster URL (if clusters exist) */
  clusterUrl: '/cluster/todo/todo',

  /** A search term that reliably returns products */
  searchTerm: 'cable',

  /** An action code that can be applied (set to empty string if none) */
  promoCode: '',
} as const;
