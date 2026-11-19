import { createHash } from 'node:crypto';

/**
 * Verified viewer: who a Bearer token really belongs to, asked of the Propeller API itself.
 * Upstream accepting the token is the signature check; a token that merely parses as an
 * unexpired JWT (`looksLikeValidJwt`) is never enough for a privilege decision.
 *
 * Answers are cached per sha256(token) for a few minutes in a bounded map, concurrent
 * lookups for one token share one upstream call, and any failure is treated as anonymous
 * (fail closed, not cached).
 */

export type VerifiedViewer =
  | {
      type: 'Contact';
      /** contactId; equals `Order.userId` of the orders this contact placed. */
      userId: number;
      /** The contact's default company. */
      companyId: number | null;
      /** Every company the contact belongs to. */
      companyIds: number[];
      /** Companies where the contact is an AUTHORIZATION_MANAGER. */
      managerCompanyIds: number[];
    }
  | {
      type: 'Customer';
      /** customerId; equals `Order.userId` of the orders this customer placed. */
      userId: number;
    };

// ponytail: the first 100 companies / authorization configs; a contact in more is not a storefront case.
export const VIEWER_QUERY = `query verifiedViewer {
  viewer {
    __typename
    ... on Contact {
      contactId
      company { companyId }
      companies(input: { page: 1, offset: 100 }) { items { companyId } }
      purchaseAuthorizationConfigs(input: { page: 1, offset: 100 }) { items { purchaseRole company { companyId } } }
    }
    ... on Customer { customerId }
  }
}`;

const isId = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0;

type Raw = Record<string, unknown> | null | undefined;
const items = (v: unknown): Raw[] => {
  const list = (v as { items?: unknown } | null | undefined)?.items;
  return Array.isArray(list) ? (list as Raw[]) : [];
};
const companyIdOf = (v: unknown): number | null => {
  const id = (v as { companyId?: unknown } | null | undefined)?.companyId;
  return isId(id) ? id : null;
};

/** A VerifiedViewer from the `viewer` field of VIEWER_QUERY's response; null for anyone else. */
export function toVerifiedViewer(viewer: unknown): VerifiedViewer | null {
  if (!viewer || typeof viewer !== 'object') return null;
  const v = viewer as Record<string, unknown>;
  if (v.__typename === 'Contact' && isId(v.contactId)) {
    const companyId = companyIdOf(v.company);
    const companyIds = items(v.companies).map(companyIdOf).filter(isId);
    if (companyId !== null && !companyIds.includes(companyId)) companyIds.push(companyId);
    const managerCompanyIds = items(v.purchaseAuthorizationConfigs)
      .filter((pac) => pac?.purchaseRole === 'AUTHORIZATION_MANAGER')
      .map((pac) => companyIdOf(pac?.company))
      .filter(isId);
    return { type: 'Contact', userId: v.contactId, companyId, companyIds, managerCompanyIds };
  }
  if (v.__typename === 'Customer' && isId(v.customerId)) return { type: 'Customer', userId: v.customerId };
  return null;
}

export interface ViewerLookupOptions {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
}

/**
 * A cached, single-flight lookup around `fetchViewer`, which returns the raw `viewer` object
 * (or null when upstream says the token is not a user) and throws on transient failures.
 */
export function createViewerLookup(
  fetchViewer: (token: string) => Promise<unknown>,
  { ttlMs = 3 * 60_000, maxEntries = 1000, now = Date.now }: ViewerLookupOptions = {},
) {
  const cache = new Map<string, { at: number; viewer: VerifiedViewer | null }>();
  // A page fires several queries at once: they share one lookup per token.
  const inFlight = new Map<string, Promise<VerifiedViewer | null>>();

  const lookup = async (key: string, token: string): Promise<VerifiedViewer | null> => {
    let viewer: VerifiedViewer | null;
    try {
      viewer = toVerifiedViewer(await fetchViewer(token));
    } catch {
      return null;
    }
    cache.delete(key);
    cache.set(key, { at: now(), viewer });
    // Oldest entry first in a Map: drop it once over the limit.
    while (cache.size > maxEntries) cache.delete(cache.keys().next().value as string);
    return viewer;
  };

  const verifiedViewer = async (raw: string | null | undefined): Promise<VerifiedViewer | null> => {
    // A blank token (`access_token=%09`) is no token: no lookup.
    const token = raw?.trim();
    if (!token) return null;
    const key = createHash('sha256').update(token).digest('hex');
    const hit = cache.get(key);
    if (hit && now() - hit.at < ttlMs) return hit.viewer;
    let pending = inFlight.get(key);
    if (!pending) {
      pending = lookup(key, token).finally(() => inFlight.delete(key));
      inFlight.set(key, pending);
    }
    return pending;
  };
  verifiedViewer.size = () => cache.size;
  return verifiedViewer;
}

/** VIEWER_QUERY upstream with the storefront key and `token` as Bearer. */
async function fetchViewerUpstream(token: string): Promise<unknown> {
  const res = await fetch(process.env.BOILERPLATE_GRAPHQL_ENDPOINT || '', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.BOILERPLATE_API_KEY || '',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query: VIEWER_QUERY }),
    signal: AbortSignal.timeout(10_000),
  });
  // Upstream rejects a token it can't verify with 401: a definite "not a user", worth caching.
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`viewer lookup ${res.status}`);
  const json = (await res.json()) as { data?: { viewer?: unknown } | null; errors?: unknown[] };
  // A partial error on a sub-field still identifies the viewer (its lists just come back empty).
  if (json.data?.viewer) return json.data.viewer;
  if (json.errors?.length) throw new Error('viewer lookup errors');
  return null;
}

/**
 * The verified viewer behind a Bearer token, or null (no token, not a Contact/Customer,
 * or the lookup failed). Process-wide cache; safe to call on every request.
 *
 *   const viewer = await getVerifiedViewer(request.cookies.get('access_token')?.value);
 *   if (viewer?.userId === order.userId) …
 */
export const getVerifiedViewer = createViewerLookup(fetchViewerUpstream);
