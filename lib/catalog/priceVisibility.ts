/**
 * Who may see prices. In `semi-closed` and `closed` portals only a logged-in Contact or
 * Customer does; in `open` portals everyone does. One rule for SSR (lib/server.ts) and the
 * GraphQL proxy (app/api/graphql/route.ts).
 *
 * The package's `isContentHidden` covers `semi-closed` only, and treats any truthy user as
 * logged in; this rule covers `closed` too and wants a real Contact/Customer id.
 * Projects with a stricter rule (e.g. a contact attribute) change `canSeePrices`.
 */

/** Whether the portal mode hides prices from visitors at all. */
export function pricesRestricted(portalMode: string | null | undefined): boolean {
  return portalMode === 'semi-closed' || portalMode === 'closed';
}

const isId = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v > 0;

/** Whether `user` (a Contact/Customer object, a VerifiedViewer, or null) may see prices in a restricted portal. */
export function canSeePrices(user: unknown): boolean {
  if (!user || typeof user !== 'object') return false;
  const u = user as { contactId?: unknown; customerId?: unknown; type?: unknown; userId?: unknown };
  if (isId(u.contactId) || isId(u.customerId)) return true;
  // A VerifiedViewer (lib/auth/viewer.ts).
  return (u.type === 'Contact' || u.type === 'Customer') && isId(u.userId);
}

/** Whether prices must be stripped for this user in this portal mode. */
export function pricesHidden(portalMode: string | null | undefined, user: unknown): boolean {
  return pricesRestricted(portalMode) && !canSeePrices(user);
}

/**
 * A product resolver (sku → product, e.g. the SPL hotspot lookup) whose products are
 * stripped with `strip` (hidePrices) when this user may not see prices in this portal mode.
 */
export function viewerScopedResolver<T>(
  resolve: (skus: string[]) => Promise<Map<string, T>>,
  portalMode: string | null | undefined,
  user: unknown,
  strip: (product: T) => T,
): (skus: string[]) => Promise<Map<string, T>> {
  if (!pricesHidden(portalMode, user)) return resolve;
  return async (skus) => new Map([...(await resolve(skus))].map(([sku, product]) => [sku, strip(product)]));
}
