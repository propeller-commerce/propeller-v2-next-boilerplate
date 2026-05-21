/**
 * Server-side SDK helpers — for use in Server Components, Route Handlers,
 * and Server Actions.
 *
 * Hosted in propeller-next (the consumer) rather than the
 * `propeller-v2-react-ui` package because the wiring is application-specific:
 * the upstream endpoint URL, the auth cookie name, the API-key env-var names,
 * and whether to even use direct upstream calls vs proxying are decisions
 * the consumer owns. The package exports `createServices` and `toPlain` from
 * its `/shared` entry; this module composes them with the boilerplate's own
 * env contract.
 *
 * This module:
 *  - Talks **directly** to the upstream Propeller GraphQL endpoint
 *    (`BOILERPLATE_GRAPHQL_ENDPOINT`) using `securityMode: 'direct'` and the
 *    server-only `BOILERPLATE_API_KEY`. We don't go through our own
 *    `/api/graphql` proxy from the server — the proxy is a public-surface
 *    shield for clients, not a same-server hop we should pay for on every
 *    RSC render.
 *  - Reads the JWT from the `access_token` httpOnly cookie via
 *    `next/headers` for authenticated calls. Anonymous renders skip it.
 *
 * Usage from an async Server Component:
 *
 *   import { getServerInfra, fetchProduct } from '@/lib/server';
 *   export default async function ProductPage({ params }) {
 *     const infra = await getServerInfra();
 *     const product = await fetchProduct(infra, Number(params.productId));
 *     return <ProductPrice price={product.price} {...infra.priceProps} />;
 *   }
 *
 * Server Components run in a Node/Edge runtime where `'use client'`
 * components are not loaded — importing this file from a client component
 * is a build error. Don't.
 */

import 'server-only';

import { cookies } from 'next/headers';
import {
  GraphQLClient,
  type GraphQLClientConfig,
  type Contact,
  type Customer,
  type Product,
  type Category,
} from 'propeller-sdk-v2';
import { createServices, toPlain, type Services } from 'propeller-v2-react-ui/shared';

// ── Environment ──────────────────────────────────────────────────────────────

const GRAPHQL_ENDPOINT = process.env.BOILERPLATE_GRAPHQL_ENDPOINT || '';
const API_KEY = process.env.BOILERPLATE_API_KEY || '';
const ORDER_EDITOR_API_KEY = process.env.BOILERPLATE_ORDER_EDITOR_API_KEY || '';

if (typeof window === 'undefined' && !GRAPHQL_ENDPOINT) {
  // Server-only warning — don't crash, since this module may be imported by
  // pages that haven't moved to server fetching yet.
  // eslint-disable-next-line no-console
  console.warn(
    '[lib/server] BOILERPLATE_GRAPHQL_ENDPOINT is empty. Server-side ' +
      'SDK calls will fail. Set it in .env.local for SSR data fetching.'
  );
}

// ── Client factory ──────────────────────────────────────────────────────────

export interface CreateServerClientOptions {
  /** Override the access token resolver (e.g. tests, service accounts). */
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  /** Override the endpoint (defaults to BOILERPLATE_GRAPHQL_ENDPOINT). */
  endpoint?: string;
  /** Override the API key (defaults to BOILERPLATE_API_KEY). */
  apiKey?: string;
}

/**
 * Build a fresh GraphQLClient bound to the upstream API for server use.
 *
 * Each call returns a NEW client — we don't memoize across requests because
 * the access-token resolver closes over a per-request cookies() snapshot.
 * (Next.js's dynamic-rendering guarantee means cookies() resolves only
 * inside the current request scope; sharing a client across requests would
 * either leak tokens or fail outside request scope.)
 */
export function createServerClient(opts: CreateServerClientOptions = {}): GraphQLClient {
  const config: GraphQLClientConfig = {
    endpoint: opts.endpoint ?? GRAPHQL_ENDPOINT,
    apiKey: opts.apiKey ?? API_KEY,
    orderEditorApiKey: ORDER_EDITOR_API_KEY,
    securityMode: 'direct',
    timeout: 30000,
    getAccessToken: opts.getAccessToken ?? readCookieAccessToken,
  };
  return new GraphQLClient(config);
}

/** Default access-token resolver — reads the httpOnly `access_token` cookie. */
async function readCookieAccessToken(): Promise<string | undefined> {
  // `cookies()` is async in Next 15+; awaiting works on older versions too.
  const store = await cookies();
  return store.get('access_token')?.value;
}

// ── Server-side services accessor (mirrors the client-side createServices) ──

/** Same `Services` shape as the client; wired to a server client instance. */
export function getServerServices(client?: GraphQLClient): Services {
  return createServices(client ?? createServerClient());
}

// ── Server-side infra (mirrors the PropellerProvider value-object) ──────────

export interface ServerInfra {
  /** A fresh per-request server client. */
  client: GraphQLClient;
  /** Cached `Services` keyed off the same client. */
  services: Services;
  /** The authenticated user, if the cookie is present and `/api/auth/me` resolves. */
  user: Contact | Customer | null;
  /** Default language. Reads `BOILERPLATE_DEFAULT_LANGUAGE` env, falls back to 'NL'. */
  language: string;
  /** Portal mode. Reads `BOILERPLATE_PORTAL_MODE`, falls back to 'OPEN'. */
  portalMode: string;
  /** Currency symbol. Reads `BOILERPLATE_CURRENCY`, falls back to '€'. */
  currency: string;
  /** Whether to display tax-inclusive prices by default. */
  includeTax: boolean;
}

/**
 * Resolve the per-request server infra bundle. Server components call this
 * once and forward fields into prop-driven display components (Bucket-B).
 *
 * Authentication: we read the JWT cookie and call the SDK's `getViewer`
 * to hydrate `user`. If the cookie is missing or the call fails (expired
 * token, network), `user` is `null` and the page renders anonymously.
 * Refresh-token rotation does NOT happen server-side here — the client-side
 * proxy is the canonical refresh point. If the access token has expired
 * server-side we render anonymously and the next client-side call will
 * trigger a refresh.
 */
export async function getServerInfra(): Promise<ServerInfra> {
  const client = createServerClient();
  const services = createServices(client);

  let user: Contact | Customer | null = null;
  const token = await readCookieAccessToken();
  if (token) {
    try {
      const viewer = await services.user.getViewer({});
      // `toPlain` matches the shape we keep client-side so Bucket-B
      // components see identical input regardless of render runtime.
      user = (viewer ? toPlain(viewer) : null) as Contact | Customer | null;
    } catch {
      // Expired or otherwise invalid token — render anonymously. The client
      // will refresh on its first action.
      user = null;
    }
  }

  return {
    client,
    services,
    user,
    language: process.env.BOILERPLATE_DEFAULT_LANGUAGE || 'NL',
    portalMode: process.env.BOILERPLATE_PORTAL_MODE || 'OPEN',
    currency: process.env.BOILERPLATE_CURRENCY || '€',
    includeTax: false, // sticky-per-user toggle; defaults to net prices on the server
  };
}

// ── Thin fetch helpers (the data layer Bucket-B components consume) ─────────

/**
 * Fetch a single product by ID with default media/transform shape.
 * Throws on network or non-partial GraphQL errors; returns `null` if the
 * product genuinely doesn't exist.
 */
export async function fetchProduct(
  infra: ServerInfra,
  productId: number,
  language?: string
): Promise<Product | null> {
  try {
    const result = await infra.services.product.getProduct({
      productId,
      language: language ?? infra.language,
      imageSearchFilters: {},
      imageVariantFilters: { transformations: [] },
    });
    return result ? (toPlain(result) as Product) : null;
  } catch (e) {
    if (e instanceof Error && /not found|null for non-nullable/i.test(e.message)) {
      return null;
    }
    throw e;
  }
}

/**
 * Fetch a single category with the standard product-search shape. Returns
 * `null` when the category doesn't exist; throws on other failures.
 */
export async function fetchCategory(
  infra: ServerInfra,
  categoryId: number,
  language?: string
): Promise<Category | null> {
  try {
    const result = await infra.services.category.getCategory({
      categoryId,
      language: language ?? infra.language,
      imageSearchFilters: {},
      imageVariantFilters: { transformations: [] },
    });
    return result ? (toPlain(result) as Category) : null;
  } catch (e) {
    if (e instanceof Error && /not found|null for non-nullable/i.test(e.message)) {
      return null;
    }
    throw e;
  }
}
