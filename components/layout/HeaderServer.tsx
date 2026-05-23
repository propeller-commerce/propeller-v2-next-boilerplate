/**
 * HeaderServer — async Server Component wrapper around `Header`.
 *
 * Resolves the category navigation tree server-side via `fetchMenu` (which
 * goes through `getAnonymousInfra()` so the underlying GraphQL call hits
 * Next.js's data cache, tagged for surgical invalidation via
 * `revalidateTag('menu')`). The pre-fetched tree is handed to the client
 * `Header` body as a serialisable prop, so:
 *
 *   - Anonymous users get menu HTML in the initial response (good for SEO,
 *     no loading flash).
 *   - Logged-in users get the same tree from the same cache — the menu
 *     doesn't personalise per user.
 *   - The package's `<Menu tree={...} />` short-circuits its internal
 *     `useMenu` fetch, so there is no avoidable client-side roundtrip on
 *     hydration.
 *
 * Use this from Server Components (catalog pages, PDP, etc.). Client-only
 * pages (login/register/cart/checkout) keep importing `Header` directly —
 * those fall back to the package's legacy client-side `useMenu` fetch,
 * which is correct: their auth/cart-bound shells aren't crawl targets and
 * benefit less from a server-rendered menu.
 */
import { fetchMenu, getAnonymousInfra } from '@/lib/server';
import Header from './Header';

const BASE_CATEGORY_ID = parseInt(
  process.env.NEXT_PUBLIC_BASE_CATEGORY_ID || '1',
  10
);

export default async function HeaderServer() {
  // Anonymous infra → the menu fetch is cacheable. Logged-in users do NOT
  // get a personalised menu (the catalog tree is not user-specific), so
  // resolving from the anonymous, cached path here is correct for all visitors.
  const menuTree = await fetchMenu(getAnonymousInfra(), BASE_CATEGORY_ID);
  return <Header menuTree={menuTree} />;
}
