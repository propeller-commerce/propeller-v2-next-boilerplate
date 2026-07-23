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

import * as React from 'react';
import { cache } from 'react';

/**
 * `experimental_taintObjectReference` is exported only from React's
 * `react-server` build (the runtime that backs React Server Components).
 * Next.js's SSR / prerender path uses the regular `react` build, which
 * doesn't expose it — calling it there throws
 * "experimental_taintObjectReference is not a function".
 *
 * We resolve it dynamically so this module stays callable from both
 * runtimes; when the API isn't present we no-op (the `'server-only'`
 * import above already prevents client bundling, so taint is
 * defence-in-depth, not the primary guard).
 */
const taintObjectReference: (msg: string, obj: object) => void =
  (React as unknown as { experimental_taintObjectReference?: (msg: string, obj: object) => void })
    .experimental_taintObjectReference ?? (() => {});
import { cookies } from 'next/headers';
import {
  GraphQLClient,
  type GraphQLClientConfig,
  type GraphQLFetchOptions,
  type Contact,
  type Customer,
  type Product,
  type Category,
  type Cluster,
  type ProductsResponse,
  type CategoryProductSearchInput,
  type ProductSortInput,
  type SearchFieldsInput,
  type FilterAvailableAttributeInput,
  type ProductTextFilterInput,
  type ProductPriceFilterInput,
  type ClusterConfigSetting,
  type SparePartsMachine,
  type SparePartsMachineProductSearchInput,
  type AttributeResultSearchInput,
  ProductStatus,
  ProductSortField,
  SortOrder,
  ProductSearchableField,
  machineService,
} from '@propeller-commerce/propeller-sdk-v2';
import { createServices, toPlain, type Services, type MenuCategory } from '@propeller-commerce/propeller-v2-react-ui/shared';

// ── Cache control: tags + revalidate window ─────────────────────────────────
// (see `tagFor` below and the `cacheable` flag on `ServerInfra`)

/**
 * Default revalidate window for anonymous catalog fetches (seconds).
 * Authenticated renders bypass the cache entirely via the cookie read.
 *
 * Tune to the real catalog change rate. The `/api/revalidate` route can
 * still bust entries surgically before the window elapses.
 */
export const ANONYMOUS_CACHE_TTL_SECONDS = 300;

/**
 * Umbrella tag attached to every anonymous catalog fetch — a single
 * `revalidateTag(TAG_CATALOG)` busts every cached catalog read at once.
 * Use surgically (e.g. nightly full refresh); per-entity tags below are
 * the preferred path for routine invalidation.
 */
export const TAG_CATALOG = 'catalog';

type CacheableEntity = 'product' | 'category' | 'cluster' | 'menu' | 'search' | 'machine';

/**
 * Constructs a Next.js cache tag for a cacheable entity. Single source of
 * truth for the tag shape — NEVER inline string literals like `'product:42'`
 * elsewhere. The `/api/revalidate` route accepts tags produced by this
 * helper and only those.
 */
export function tagFor(entity: CacheableEntity, id?: number | string): string {
  return id === undefined ? entity : `${entity}:${id}`;
}
import {
  imageSearchFilters,
  imageSearchFiltersGrid,
  imageVariantFiltersMedium,
  imageVariantFiltersLarge,
} from '@/data/defaults';
import { config } from '@/data/config';

/** Statuses the storefront grid shows — mirrors the client `useProductSearch`. */
const STOREFRONT_STATUSES: ProductStatus[] = [
  ProductStatus.A,
  ProductStatus.P,
  ProductStatus.T,
  ProductStatus.S,
];

/**
 * Boosted search-field config — identical to the client `useProductSearch`
 * term path so server-rendered search results rank the same as client ones.
 */
const SEARCH_FIELDS: SearchFieldsInput[] = [
  {
    fieldNames: [
      ProductSearchableField.NAME,
      ProductSearchableField.KEYWORDS,
      ProductSearchableField.SKU,
      ProductSearchableField.CUSTOM_KEYWORDS,
    ],
    boost: 5,
  },
  {
    fieldNames: [
      ProductSearchableField.DESCRIPTION,
      ProductSearchableField.MANUFACTURER,
      ProductSearchableField.MANUFACTURER_CODE,
      ProductSearchableField.EAN_CODE,
      ProductSearchableField.BAR_CODE,
      ProductSearchableField.CLUSTER_ID,
      ProductSearchableField.CUSTOM_KEYWORDS,
      ProductSearchableField.PRODUCT_ID,
      ProductSearchableField.SHORT_DESCRIPTION,
      ProductSearchableField.SUPPLIER,
      ProductSearchableField.SUPPLIER_CODE,
    ],
    boost: 1,
  },
];

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
  /**
   * Bearer token to attach as a static `Authorization` header. Required for
   * authenticated SSR queries: the SDK in `direct` mode sends the `apikey`
   * header but NOT the Bearer token (its `getAccessToken` resolver is only
   * consulted in `proxy` mode — see GraphQLClient.buildHeaders), so without
   * this an authenticated query like `getViewer()` runs anonymously and the
   * backend returns an empty viewer. The header is spread into every request.
   */
  bearerToken?: string;
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
    // Attach the Bearer token as a static header so `direct`-mode SDK calls
    // are actually authenticated (the SDK doesn't send it otherwise — see
    // CreateServerClientOptions.bearerToken).
    ...(opts.bearerToken && { headers: { Authorization: `Bearer ${opts.bearerToken}` } }),
  };
  return new GraphQLClient(config);
}

/** Default access-token resolver — reads the httpOnly `access_token` cookie. */
async function readCookieAccessToken(): Promise<string | undefined> {
  // `cookies()` is async in Next 15+; awaiting works on older versions too.
  const store = await cookies();
  return store.get('access_token')?.value;
}

/**
 * VAT-inclusive preference, sourced from the non-httpOnly `price_include_tax`
 * cookie set by the Header's toggle (see `context/PriceContext.tsx`).
 * Reading this cookie opts the route into dynamic rendering — anonymous
 * routes that call this MUST set `cacheable: false`.
 */
async function readIncludeTaxCookie(): Promise<boolean> {
  const store = await cookies();
  const raw = store.get('price_include_tax')?.value;
  if (raw === undefined) return true;
  return raw === '1';
}

/**
 * Active companyId from the non-httpOnly `selected_company_id` cookie written
 * by `CompanyContext` when the user picks a company. Reading this cookie opts
 * the route into dynamic rendering, same as `readIncludeTaxCookie` — only the
 * authenticated `getServerInfra()` calls it (anonymous renders have no
 * company affinity).
 */
async function readSelectedCompanyIdCookie(): Promise<number | undefined> {
  const store = await cookies();
  const raw = store.get('selected_company_id')?.value;
  if (!raw) return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Read the portal mode env var and normalise it to the kebab-case values the
 * package's `isContentHidden` helper matches on (`'open'` / `'semi-closed'` /
 * `'closed'`). Old defaults of `'OPEN'` (uppercase) or `'semiClosed'` (camelCase)
 * silently never matched, leaving the semi-closed gate as a no-op.
 */
function readPortalMode(): string {
  const raw = (process.env.BOILERPLATE_PORTAL_MODE || 'open').trim().toLowerCase();
  // Tolerate the historical camelCase value too — it means the same thing.
  if (raw === 'semiclosed') return 'semi-closed';
  return raw;
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
  /** Portal mode — `'open'` / `'semi-closed'` / `'closed'`. Reads `BOILERPLATE_PORTAL_MODE`,
   *  normalised to lowercase kebab-case (the package's `isContentHidden` matches on these). */
  portalMode: string;
  /** Currency symbol. Reads `BOILERPLATE_CURRENCY`, falls back to '€'. */
  currency: string;
  /** Whether to display tax-inclusive prices by default. */
  includeTax: boolean;
  /**
   * Active companyId selected via the CompanySwitcher (`selected_company_id`
   * cookie). Overrides the user's default company in product / price queries.
   * `undefined` for anonymous renders and for authenticated users who haven't
   * switched away from their default company.
   */
  selectedCompanyId?: number;
  /**
   * Whether the underlying fetches on THIS infra are safe to cache via Next's
   * data cache. True for `getAnonymousInfra()`, false for `getServerInfra()`
   * (authenticated). The fetch helpers (`fetchProduct`/`fetchCategory`/etc.)
   * branch on this flag to decide whether to attach `next.revalidate` +
   * `tags` to the SDK call. Authenticated renders are already dynamic via
   * the cookie read; attaching cache hints would be harmless but misleading.
   */
  cacheable: boolean;
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
/**
 * Per-request `getViewer` dedupe. Within one request, a layout + page +
 * `generateMetadata` may each call `getServerInfra()` — without this wrap,
 * `getViewer` runs once per call. `React.cache` keys on the function
 * identity + arguments and dedupes for the lifetime of the request render
 * (not across requests — that's the fetch cache's job).
 */
const cachedGetViewer = cache(
  async (services: Services): Promise<Contact | Customer | null> => {
    try {
      // Ask the viewer to include the company track attributes (machine
      // installations etc.). Without `companyAttributesInput` the SDK viewer
      // selects `company.attributes(input: $companyAttributesInput)` with a
      // null input and the backend returns no items — so `fetchRootMachines`
      // (which reads the ids off `user.company.attributes`) would see nothing.
      // Scoped to the configured names so we don't drag the whole attribute set.
      const viewer = await services.user.getViewer(viewerVariablesWithTrackAttrs());
      return viewer ? ((toPlain(viewer) as unknown) as Contact | Customer) : null;
    } catch {
      // Expired or otherwise invalid token — render anonymously. The client
      // will refresh on its first action.
      return null;
    }
  }
);

/**
 * Viewer variables that pull the configured company track attributes into
 * `user.company.attributes` AND `user.companies.items[].attributes`. Empty
 * (`{}`) when no attributes are configured, so this is a no-op for tenants not
 * using them.
 *
 * The `companies` list is loaded (with the same attribute input) so a multi-
 * company contact who switched companies can have the SELECTED company's
 * attributes read server-side — the switcher persists the pick in the
 * `selected_company_id` cookie, mirrored here into `resolveCompanyId`. Without
 * the list, only the default company's attributes are available and `/machines`
 * would ignore the switch.
 */
function viewerVariablesWithTrackAttrs(): {
  companyAttributesInput?: AttributeResultSearchInput;
  contactCompaniesSearchInput?: { page: number; offset: number };
  contactPAConfigInput?: { page: number; offset: number };
} {
  const names = config.companyTrackAttributes ?? [];
  // Companies + purchase-auth configs are paginated on every viewer fetch (see
  // data/config.ts — objects, never `[]`), independent of track attributes, so
  // a multi-company / multi-PA contact isn't truncated by the server default.
  const base = {
    contactCompaniesSearchInput: config.contactCompaniesSearchInput,
    contactPAConfigInput: config.contactPAConfigInput,
  };
  if (names.length === 0) return base;
  const companyAttributesInput: AttributeResultSearchInput = {
    attributeDescription: { names: [...names] },
    page: 1,
    offset: names.length,
  };
  return { ...base, companyAttributesInput };
}

/**
 * Mark the GraphQL client + services as server-only. If a Server Component
 * ever tried to forward one of these objects as a prop into a client island,
 * React would throw — preventing accidental leakage of an authenticated
 * client (with its Bearer token in the headers config) into the browser
 * bundle. Pure defence-in-depth on top of the `'server-only'` import.
 */
function taintInfra(infra: ServerInfra): void {
  taintObjectReference(
    'Do not pass GraphQLClient to client components — it carries server-only auth state.',
    infra.client
  );
  taintObjectReference(
    'Do not pass the Services bag to client components — it captures the server GraphQLClient.',
    infra.services as unknown as object
  );
}

export async function getServerInfra(): Promise<ServerInfra> {
  // Read the token + tax preference + active company FIRST. The token is
  // attached as the client's Authorization header (direct-mode SDK calls
  // aren't authenticated otherwise); the tax flag and active companyId flow
  // into the infra value object so server components render the right
  // gross/net price and the right company-scoped assortment in the initial
  // HTML.
  const [token, includeTax, selectedCompanyId] = await Promise.all([
    readCookieAccessToken(),
    readIncludeTaxCookie(),
    readSelectedCompanyIdCookie(),
  ]);
  const client = createServerClient({ bearerToken: token });
  const services = createServices(client);

  const user: Contact | Customer | null = token ? await cachedGetViewer(services) : null;

  const infra: ServerInfra = {
    client,
    services,
    user,
    language: process.env.BOILERPLATE_DEFAULT_LANGUAGE || 'NL',
    portalMode: readPortalMode(),
    currency: process.env.BOILERPLATE_CURRENCY || '€',
    includeTax,
    selectedCompanyId,
    cacheable: false,  // cookie read forces dynamic rendering — no fetch cache
  };
  taintInfra(infra);
  return infra;
}

/**
 * Resolve the per-request server infra bundle for an **anonymous** render.
 *
 * Unlike `getServerInfra()`, this NEVER reads the `access_token` cookie and
 * NEVER calls `getViewer()` — `user` is always `null`. Because it does not
 * touch `cookies()`, a route that only ever calls this can be statically
 * rendered / cached (pair it with `export const revalidate = <window>`).
 *
 * The intended pattern (category / search / cluster listing pages):
 *   - The page checks for the `access_token` cookie up front.
 *   - No cookie  → `getAnonymousInfra()` → cacheable, generic pricing.
 *   - Cookie set → `getServerInfra()` → reading the cookie opts the route
 *     into dynamic rendering, so logged-in users always get fresh,
 *     contact-priced HTML.
 *
 * Personalised pricing for the (rare) case of a logged-in user served a
 * cached anonymous shell is reconciled client-side once their auth context
 * resolves and the grid re-fetches.
 */
export function getAnonymousInfra(): ServerInfra {
  const client = createServerClient({ getAccessToken: () => undefined });
  const services = createServices(client);
  const infra: ServerInfra = {
    client,
    services,
    user: null,
    language: process.env.BOILERPLATE_DEFAULT_LANGUAGE || 'NL',
    portalMode: readPortalMode(),
    currency: process.env.BOILERPLATE_CURRENCY || '€',
    includeTax: false,
    cacheable: true, // no cookie read → Next data cache applies when tags + revalidate are attached
  };
  taintInfra(infra);
  return infra;
}

/** True when the request carries an `access_token` cookie (i.e. logged in). */
export async function hasAuthCookie(): Promise<boolean> {
  const store = await cookies();
  return !!store.get('access_token')?.value;
}

/**
 * Anonymous infra variant that honours the VAT toggle cookie. Reading the
 * cookie opts the route into dynamic rendering, so this returns
 * `cacheable: false` — use it for routes that render prices in the initial
 * HTML and need the gross/net toggle to take effect server-side.
 *
 * Routes that don't render prices (or render only generic, non-personalised
 * chrome) should keep using `getAnonymousInfra()` — it stays cacheable and
 * always renders net prices, which is correct for SEO crawlers and first-time
 * visitors with no cookie set.
 */
export async function getAnonymousInfraWithTax(): Promise<ServerInfra> {
  const includeTax = await readIncludeTaxCookie();
  const client = createServerClient({ getAccessToken: () => undefined });
  const services = createServices(client);
  const infra: ServerInfra = {
    client,
    services,
    user: null,
    language: process.env.BOILERPLATE_DEFAULT_LANGUAGE || 'NL',
    portalMode: readPortalMode(),
    currency: process.env.BOILERPLATE_CURRENCY || '€',
    includeTax,
    cacheable: false, // cookie read forces dynamic rendering
  };
  taintInfra(infra);
  return infra;
}

/**
 * Pick the right infra for a listing page that renders prices: full server
 * infra (auth + tax cookie, dynamic) when logged in; anonymous-with-tax
 * (no auth, tax cookie, dynamic) when logged out. Both branches read the
 * tax cookie, so this is always dynamic — pages that don't show prices
 * should call `getAnonymousInfra()` directly to stay cacheable.
 */
export async function getListingInfra(): Promise<ServerInfra> {
  return (await hasAuthCookie()) ? getServerInfra() : getAnonymousInfraWithTax();
}

// ── Thin fetch helpers (the data layer Bucket-B components consume) ─────────

/**
 * Build `GraphQLFetchOptions` (cache hints) for a given infra + tag set.
 * Returns `undefined` when the infra is not cacheable (authenticated render),
 * which lets the SDK call run as a normal uncached POST.
 *
 * Centralising this here means every fetch helper applies the same TTL and
 * the same per-call tag conventions; nobody hand-writes `next: { ... }`.
 */
function cacheOptions(
  infra: ServerInfra,
  tags: readonly string[]
): GraphQLFetchOptions | undefined {
  if (!infra.cacheable) return undefined;
  return {
    next: {
      revalidate: ANONYMOUS_CACHE_TTL_SECONDS,
      tags,
    },
  };
}

/**
 * Fetch a single product by ID with default media/transform shape.
 * Throws on network or non-partial GraphQL errors; returns `null` if the
 * product genuinely doesn't exist.
 *
 * `imageVariantFilters` MUST request at least one transformation: the
 * backend only populates `image.imageVariants[].url` for transformations
 * that were asked for. An empty `transformations: []` returns image items
 * with empty variant arrays — which is why the PDP gallery rendered blank.
 * We request the `large` variant (the gallery's size).
 *
 * **Cache-key keying note:** the SDK serialises the GraphQL request body
 * byte-for-byte for Next.js's POST cache key. Keep the variable order below
 * stable — `{productId, language, imageSearchFilters, imageVariantFilters}` —
 * because reordering produces a different cache entry.
 */
export async function fetchProduct(
  infra: ServerInfra,
  productId: number,
  language?: string
): Promise<Product | null> {
  try {
    const result = await infra.services.product.getProduct(
      {
        productId,
        language: language ?? infra.language,
        imageSearchFilters,
        imageVariantFilters: imageVariantFiltersLarge,
      },
      cacheOptions(infra, [TAG_CATALOG, tagFor('product'), tagFor('product', productId)])
    );
    return result ? (toPlain(result) as Product) : null;
  } catch (e) {
    if (e instanceof Error && /not found|null for non-nullable/i.test(e.message)) {
      return null;
    }
    throw e;
  }
}

/**
 * Options for the initial server-side listing fetch. All optional — the
 * defaults reproduce the *first paint* the client grid would produce
 * (page 1, 12 per page, default sort). The client `ProductGrid` island
 * takes over for subsequent filter/sort/page changes.
 */
export interface ListingFetchOptions {
  /** 1-based page. Defaults to 1. */
  page?: number;
  /** Items per page. Defaults to 12 (the storefront grid default). */
  offset?: number;
  /** Sort field. Categories default to CATEGORY_ORDER, search to RELEVANCE. */
  sortField?: ProductSortField;
  /** Sort direction. Defaults to DESC. */
  sortOrder?: SortOrder;
  /**
   * Active attribute (checkbox) filters. When supplied, the server-rendered
   * first page is the *filtered* result — so refreshing a filtered URL
   * server-renders products that match the URL, not the unfiltered set.
   */
  textFilters?: ProductTextFilterInput[];
  /** Active price-range filter lower bound. */
  priceFilterMin?: number;
  /** Active price-range filter upper bound. */
  priceFilterMax?: number;
  /** Language override. Defaults to `infra.language`. */
  language?: string;
}

/**
 * The `textFilters` / `price` pair is shared verbatim by every product-search
 * input the storefront builds (`CategoryProductSearchInput`,
 * `SparePartsMachineProductSearchInput`, …), so `buildFilterInput` returns just
 * that slice and each caller spreads it into its own input type.
 */
type ListingFilterSlice = Pick<CategoryProductSearchInput, 'textFilters' | 'price'>;

/**
 * Build the optional `textFilters` / `price` slice of a product-search input
 * from listing options. Mirrors the client `useProductSearch` listing path.
 * Price defaults match the client's (`from: 0`, `to: 999999`).
 */
function buildFilterInput(opts: ListingFetchOptions): ListingFilterSlice {
  const slice: ListingFilterSlice = {};
  if (opts.textFilters?.length) slice.textFilters = opts.textFilters;
  if (opts.priceFilterMin !== undefined || opts.priceFilterMax !== undefined) {
    const price: ProductPriceFilterInput = {
      from: opts.priceFilterMin ?? 0,
      to: opts.priceFilterMax ?? 999999,
    };
    slice.price = price;
  }
  return slice;
}

/**
 * Tells the backend to compute and return the available attribute filter
 * facets (`products.filters`) alongside the product list. WITHOUT this the
 * `getCategory` response carries an empty `filters` array — so the grid
 * filter sidebar would render "No filters available". Mirrors the client
 * `useProductSearch` listing query.
 */
const FILTER_AVAILABLE_ATTRIBUTE_INPUT: FilterAvailableAttributeInput = {
  isSearchable: true,
};

/** Resolve the `userId` the SDK price/search inputs expect from the infra user. */
function resolveUserId(user: Contact | Customer | null): number | undefined {
  if (!user) return undefined;
  if ('contactId' in user) return (user as Contact).contactId;
  if ('customerId' in user) return (user as Customer).customerId;
  return undefined;
}

/**
 * Resolve the contact's `companyId` for product/search scoping. The client grid
 * (propeller-v2-react-ui `useProductSearch`) ALWAYS scopes a contact's listing
 * query by the active company (CompanyContext's `selectedCompany`), falling
 * back to the user's default. The SSR fetch must do the same — else the
 * server seeds products + filter facets from a broader (or wrong-company)
 * assortment than the client re-fetch and any filter the user picks from the
 * seeded sidebar returns 0 products. The active selection arrives here via
 * the `selected_company_id` cookie set by CompanyContext. Customers have no
 * company.
 */
function resolveCompanyId(infra: ServerInfra): number | undefined {
  if (infra.selectedCompanyId !== undefined) return infra.selectedCompanyId;
  const user = infra.user;
  if (!user || !('contactId' in user)) return undefined;
  return (user as Contact).company?.companyId;
}

/**
 * Fetch a single category WITH its first page of products — the shape the
 * category page needs to server-render real product cards in the initial
 * HTML. Returns `null` when the category doesn't exist; throws on other
 * failures.
 *
 * The `categoryProductSearchInput` mirrors the client `useProductSearch`
 * listing path (`services.category.getCategory`) so the server-rendered
 * first page matches what the client grid would have fetched.
 */
export async function fetchCategory(
  infra: ServerInfra,
  categoryId: number,
  opts: ListingFetchOptions = {}
): Promise<Category | null> {
  const lang = opts.language ?? infra.language;
  const sortField = opts.sortField ?? ProductSortField.CATEGORY_ORDER;
  const sortOrder = opts.sortOrder ?? SortOrder.DESC;
  const sortInputs: ProductSortInput[] = [{ field: sortField, order: sortOrder }];
  const userId = resolveUserId(infra.user);
  const companyId = resolveCompanyId(infra);

  const categoryProductSearchInput: CategoryProductSearchInput = {
    language: lang,
    page: opts.page ?? 1,
    offset: opts.offset ?? 12,
    statuses: STOREFRONT_STATUSES,
    hidden: false,
    sortInputs,
    ...buildFilterInput(opts),
    ...(userId !== undefined && { userId }),
    ...(companyId !== undefined && { companyId }),
  };

  try {
    // Variable order locked in for Next.js cache-key keying — see the note
    // in `fetchProduct`. Don't reorder the keys below casually.
    const result = await infra.services.category.getCategory(
      {
        categoryId,
        language: lang,
        categoryProductSearchInput,
        // Ask the backend for the attribute filter facets so the grid filter
        // sidebar has data on first paint.
        filterAvailableAttributeInput: FILTER_AVAILABLE_ATTRIBUTE_INPUT,
        imageSearchFilters: imageSearchFiltersGrid,
        // Category product listings use the grid-sized variant.
        imageVariantFilters: imageVariantFiltersMedium,
      },
      cacheOptions(infra, [TAG_CATALOG, tagFor('category'), tagFor('category', categoryId)])
    );
    return result ? (toPlain(result) as Category) : null;
  } catch (e) {
    // The known `Product.slugs` backend break surfaces as "null for
    // non-nullable" — swallow it so the page can still render its shell and
    // let the client grid re-fetch. Genuine "not found" → null too.
    if (e instanceof Error && /not found|null for non-nullable/i.test(e.message)) {
      return null;
    }
    throw e;
  }
}

/**
 * Server-side product search — the first page of results for a search term.
 * Mirrors the client `useProductSearch` term path: it queries the base
 * category (`baseCategoryId`) with a `term` + boosted `searchFields`.
 *
 * `baseCategoryId` must be supplied by the caller (it lives in the consumer's
 * `data/config`, which this server module deliberately does not import).
 * Returns the category's `ProductsResponse`, or `null` on failure.
 */
export async function fetchSearch(
  infra: ServerInfra,
  baseCategoryId: number,
  term: string,
  opts: ListingFetchOptions = {}
): Promise<ProductsResponse | null> {
  const lang = opts.language ?? infra.language;
  const sortField = opts.sortField ?? ProductSortField.RELEVANCE;
  const sortOrder = opts.sortOrder ?? SortOrder.DESC;
  const sortInputs: ProductSortInput[] = [{ field: sortField, order: sortOrder }];
  const userId = resolveUserId(infra.user);
  const companyId = resolveCompanyId(infra);

  const categoryProductSearchInput: CategoryProductSearchInput = {
    language: lang,
    page: opts.page ?? 1,
    offset: opts.offset ?? 12,
    statuses: STOREFRONT_STATUSES,
    hidden: false,
    ...(term && { term, searchFields: SEARCH_FIELDS }),
    sortInputs,
    ...buildFilterInput(opts),
    ...(userId !== undefined && { userId }),
    ...(companyId !== undefined && { companyId }),
  };

  try {
    // Cache-key keying note: variable order locked. See `fetchProduct`.
    const result = await infra.services.category.getCategory(
      {
        categoryId: baseCategoryId,
        language: lang,
        categoryProductSearchInput,
        // Filter facets for the search page's grid filter sidebar.
        filterAvailableAttributeInput: FILTER_AVAILABLE_ATTRIBUTE_INPUT,
        imageSearchFilters: imageSearchFiltersGrid,
        imageVariantFilters: imageVariantFiltersMedium,
      },
      // Search isn't tagged per-term — long-tail terms would explode the tag
      // namespace. Long-tail entries age out via the revalidate window.
      cacheOptions(infra, [TAG_CATALOG, tagFor('search')])
    );
    const products = result?.products as ProductsResponse | undefined;
    return products ? (toPlain(products) as ProductsResponse) : null;
  } catch (e) {
    if (e instanceof Error && /not found|null for non-nullable/i.test(e.message)) {
      return null;
    }
    throw e;
  }
}

/**
 * Fetch a single cluster for the cluster detail page.
 *
 * Mirrors the two-step fetch the client `ClusterInfo` / `useProductInfo`
 * performs: first `getClusterConfig()` to discover the configurator's
 * attribute names, then `getCluster()` with an `attributeResultSearchInput`
 * scoped to those names (so image-badge attributes resolve).
 *
 * Returns `null` when the cluster doesn't exist; throws on other failures.
 * The cluster page server-renders the *default product*'s title/price/
 * description/stock from this; configurator-driven selection (which changes
 * the displayed product) is reconciled client-side.
 */
export async function fetchCluster(
  infra: ServerInfra,
  clusterId: number,
  language?: string
): Promise<Cluster | null> {
  const lang = language ?? infra.language;
  const clusterTags = [TAG_CATALOG, tagFor('cluster'), tagFor('cluster', clusterId)];
  try {
    // Step 1 — config drives the attribute name list.
    const clusterConfig = await infra.services.cluster.getClusterConfig(
      clusterId,
      cacheOptions(infra, clusterTags)
    );
    const attributeNames: string[] = (clusterConfig?.config?.settings ?? []).map(
      (setting: ClusterConfigSetting) => setting.name
    );

    // Step 2 — full cluster fetch with the config-derived attribute filter.
    // Cache-key keying note: variable order locked. See `fetchProduct`.
    const result = await infra.services.cluster.getCluster(
      {
        clusterId,
        language: lang,
        imageSearchFilters: imageSearchFiltersGrid,
        imageVariantFilters: imageVariantFiltersLarge,
        ...(attributeNames.length > 0 && {
          attributeResultSearchInput: {
            attributeDescription: { names: attributeNames },
          },
        }),
      },
      cacheOptions(infra, clusterTags)
    );
    return result ? (toPlain(result) as Cluster) : null;
  } catch (e) {
    if (e instanceof Error && /not found|null for non-nullable/i.test(e.message)) {
      return null;
    }
    throw e;
  }
}

// ── Menu (category tree) ────────────────────────────────────────────────────

/**
 * Default depth of the menu tree. Matches `useMenu`'s default (3) so the
 * server-fetched tree and the legacy client-fetched tree have the same shape.
 */
const MENU_DEPTH_DEFAULT = 3;

/**
 * Raw shape returned by the recursive `categories { ... }` GraphQL query —
 * mirrors `MenuCategoryRaw` in the package's `useMenu`. We map to the
 * serialisable `MenuCategory` shape the `<Menu tree={...} />` prop consumes
 * before returning, so the Server Component → client island hop carries plain
 * data (no nested LocalizedString arrays).
 */
interface RawMenuCategory {
  categoryId: number;
  hidden?: boolean | string;
  name?: Array<{ value: string; language: string }>;
  slug?: Array<{ value: string; language?: string }>;
  categories?: RawMenuCategory[];
}

function isMenuCategoryHidden(raw: RawMenuCategory): boolean {
  return raw.hidden === true || raw.hidden === 'Y';
}

function buildMenuCategoriesFragment(depth: number): string {
  if (depth === 0) return '';
  return `
    categories {
      categoryId
      hidden
      name(language: $language) { value language }
      slug(language: $language) { value }
      ${buildMenuCategoriesFragment(depth - 1)}
    }
  `;
}

function mapRawMenuCategory(raw: RawMenuCategory, language: string): MenuCategory {
  const nameEntry = raw.name?.find((n) => n.language === language) ?? raw.name?.[0];
  const slugEntry = raw.slug?.[0];
  return {
    categoryId: raw.categoryId,
    name: nameEntry?.value ?? '',
    slug: slugEntry?.value ?? '',
    children: (raw.categories ?? [])
      .filter((child) => !isMenuCategoryHidden(child))
      .map((child) => mapRawMenuCategory(child, language)),
  };
}

/**
 * Server-side menu fetch — returns the `MenuCategory[]` tree the package's
 * `<Menu tree={...} />` prop accepts. Calls the same recursive GraphQL query
 * the client `useMenu` composable uses, but at the network layer with cache
 * hints attached (when `infra.cacheable`).
 *
 * Bypasses the service layer because the menu query is hand-built and not
 * exposed as an SDK service method. `client.execute({...fetchOptions})` is
 * the lowest-level entry point and is the right tool here.
 *
 * Returns an empty array on failure rather than throwing — the menu is
 * non-critical chrome, and a transient backend error shouldn't break the
 * whole layout. The `<Menu>` component renders its empty state in that case.
 */
export async function fetchMenu(
  infra: ServerInfra,
  rootCategoryId: number,
  language?: string,
  depth: number = MENU_DEPTH_DEFAULT
): Promise<MenuCategory[]> {
  const lang = language ?? infra.language;
  // Cache-key keying note: variable order locked (categoryId, language). See
  // the note on `fetchProduct`.
  const query = `
    query Menu($categoryId: Float, $language: String) {
      category(categoryId: $categoryId) {
        categoryId
        hidden
        name(language: $language) { value language }
        slug(language: $language) { value }
        ${buildMenuCategoriesFragment(depth)}
      }
    }
  `;
  try {
    const result = await infra.client.execute<{ category: RawMenuCategory | null }>({
      query,
      variables: { categoryId: rootCategoryId, language: lang },
      operationName: 'Menu',
      fetchOptions: cacheOptions(infra, [TAG_CATALOG, tagFor('menu')]),
    });
    const root = result.data?.category ?? null;
    if (!root) return [];
    return (root.categories ?? [])
      .filter((cat) => !isMenuCategoryHidden(cat))
      .map((cat) => mapRawMenuCategory(cat, lang));
  } catch {
    // Menu is non-critical; fall back to an empty tree rather than failing
    // the whole layout render. The client `<Menu>` shows its empty state.
    return [];
  }
}

// ── Machines / spare parts ──────────────────────────────────────────────────

// MACHINE_MAX_DEPTH lives in lib/machines.ts (runtime-agnostic — the client
// pages import it too) and is re-exported here for the server call sites.
export { MACHINE_MAX_DEPTH } from '@/lib/machines';
import { readAttributeStringValues } from '@/lib/machines';

/**
 * Name of the company track attribute holding the contact's machine
 * ("installation") source-ids, as a comma-separated list. Must also appear in
 * `config.companyTrackAttributes` — that list is what the tenant opts in with,
 * mirroring WP's `PROPELLER_COMPANY_TRACK_ATTR`.
 */
const MACHINE_INSTALLATIONS_ATTRIBUTE = 'MY_INSTALLATIONS';

/**
 * Fetch a single machine WITH the (possibly filtered) page of its spare parts —
 * the shape the machine page needs to server-render real cards in the initial
 * HTML. Returns `null` when the machine doesn't exist; throws on other failures.
 *
 * The parts input mirrors `fetchCategory`'s `categoryProductSearchInput` so a
 * machine's parts list behaves exactly like a category listing.
 *
 * NOTE `machineService(...)` rather than `infra.services.machine` — the
 * package's `createServices` bundle has no machine entry (it lives in
 * `propeller-v2-core-ui`), so the SDK factory is called directly against the
 * per-request client.
 * ponytail: swap to `infra.services.machine` if core-ui ever ships it.
 */
export async function fetchMachine(
  infra: ServerInfra,
  slug: string,
  opts: ListingFetchOptions & { term?: string } = {}
): Promise<SparePartsMachine | null> {
  // Two languages, deliberately. `machine(slug:, language:)` is language-scoped
  // and hard-errors ("No machine found for slug and language") when the machine
  // isn't authored in that language — machine trees are typically EN-only while
  // the parts are localized. So the TREE resolves in `config.machines.language`
  // and the PARTS list in the storefront language. Mirrors the WP reference's
  // `$language = "EN"` / `$parts_language` split.
  const machineLang = config.machines?.language || 'EN';
  const lang = opts.language ?? infra.language;
  const sortField = opts.sortField ?? ProductSortField.NAME;
  const sortOrder = opts.sortOrder ?? SortOrder.ASC;
  const userId = resolveUserId(infra.user);
  const companyId = resolveCompanyId(infra);

  // `language` / `page` / `offset` / `statuses` are NON_NULL on
  // SparePartsMachineProductSearchInput — passing the input at all means
  // passing all four, or the query fails validation upstream.
  const sparePartsMachineProductSearchInput: SparePartsMachineProductSearchInput = {
    language: lang,
    page: opts.page ?? 1,
    offset: opts.offset ?? 12,
    statuses: STOREFRONT_STATUSES,
    hidden: false,
    sortInputs: [{ field: sortField, order: sortOrder }],
    ...(opts.term ? { term: opts.term } : {}),
    ...buildFilterInput(opts),
    ...(userId !== undefined && { userId }),
    ...(companyId !== undefined && { companyId }),
  };

  try {
    // Variable order locked in for Next.js cache-key keying — see the note in
    // `fetchProduct`. Don't reorder the keys below casually.
    const result = await machineService(infra.client).getMachine(
      {
        slug,
        // The machine tree's own language — NOT the storefront's. See above.
        language: machineLang,
        sparePartsMachineProductSearchInput,
        // Ask the backend for the attribute filter facets so the grid filter
        // sidebar has data on first paint. Without this the response's
        // `filters` array is empty — same trap as `fetchCategory`.
        filterAvailableAttributeInput: FILTER_AVAILABLE_ATTRIBUTE_INPUT,
        imageSearchFilters: imageSearchFiltersGrid,
        imageVariantFilters: imageVariantFiltersMedium,
      },
      cacheOptions(infra, [TAG_CATALOG, tagFor('machine'), tagFor('machine', slug)])
    );
    return result ? (toPlain(result) as SparePartsMachine) : null;
  } catch (e) {
    // Same swallow as `fetchCategory`: the known `Product.slugs` backend break
    // surfaces as "null for non-nullable" and reaches us through the spare
    // parts' Product/Cluster resolution. Genuine "not found" → null too.
    if (e instanceof Error && /not found|null for non-nullable/i.test(e.message)) {
      return null;
    }
    throw e;
  }
}

/**
 * Read the logged-in contact's machine ("installation") ids off the company
 * track attribute already loaded on `infra.user` by the viewer query.
 *
 * Mirrors the WP reference: `UserController::process_company_attributes()` walks
 * the company's `attributes`, finds the ones named in the configured track-attr
 * list, and stashes each `get_value()` in the session; `MachineController` then
 * reads `MY_INSTALLATIONS` and splits it on commas into machine source-ids. The
 * value is a comma-separated id list, e.g. `"M-1001,M-1002"`.
 *
 * We don't probe: `getServerInfra` already asked the viewer for these attributes
 * (see `viewerVariablesWithTrackAttrs`), so this is a pure read off `user`.
 * The value is read from the concrete typed shape (`textValues[].values` for a
 * TEXT attr, `enumValues` for ENUM) via `readAttributeStringValues` — NOT the
 * SDK's `.value` convenience field, which is a TS-only shim the transport does
 * not populate at runtime.
 */
function readCompanyTrackAttribute(
  company: Contact['company'] | undefined,
  attributeName: string
): string[] {
  const items = company?.attributes?.items ?? [];
  const match = items.find((i) => i.attributeDescription?.name === attributeName);
  return readAttributeStringValues(match?.value);
}

/**
 * The company whose track attributes apply for this request: the one the user
 * switched to (`selected_company_id` cookie → `infra.selectedCompanyId`), else
 * the contact's default. Same precedence as `resolveCompanyId` so the machine
 * root and the product listings agree on which company they're scoped to.
 * Returns `undefined` for anonymous visitors and customers (no company).
 */
function resolveSelectedCompany(infra: ServerInfra): Contact['company'] | undefined {
  const user = infra.user;
  if (!user || !('contactId' in user)) return undefined;
  const contact = user as Contact;
  const selectedId = infra.selectedCompanyId;
  if (selectedId !== undefined) {
    const match = contact.companies?.items?.find((c) => c?.companyId === selectedId);
    if (match) return match;
  }
  return contact.company;
}

/**
 * The machine tree's root level: the installations belonging to the logged-in
 * contact's company.
 *
 * Two steps, mirroring WP: read the id list off the `MY_INSTALLATIONS` company
 * track attribute (loaded on the viewer), then resolve each id to a machine via
 * the `source`/`sourceId` pair. WP builds one aliased mega-query
 * (`machine_1: machine(...) machine_2: machine(...)`); we issue the same calls
 * in parallel, which needs no runtime query-string building.
 *
 * Returns `[]` for anonymous visitors and for contacts whose company has no
 * installations — the page renders its empty state rather than erroring.
 */
export async function fetchRootMachines(infra: ServerInfra): Promise<SparePartsMachine[]> {
  const source = config.machines?.source;
  const trackedAttributes: readonly string[] = config.companyTrackAttributes ?? [];
  // No configured source, or the tenant hasn't opted the attribute in → the
  // feature isn't wired here. Don't guess.
  if (!source || !trackedAttributes.includes(MACHINE_INSTALLATIONS_ATTRIBUTE)) return [];

  const company = resolveSelectedCompany(infra);
  const ids = readCompanyTrackAttribute(company, MACHINE_INSTALLATIONS_ATTRIBUTE);
  if (ids.length === 0) return [];

  const machines = await Promise.all(
    ids.map(async (sourceId) => {
      try {
        const result = await machineService(infra.client).getMachine(
          {
            source,
            sourceId,
            // Machine-tree language, not the storefront's — see `fetchMachine`.
            language: config.machines?.language || 'EN',
            imageSearchFilters: imageSearchFiltersGrid,
            imageVariantFilters: imageVariantFiltersMedium,
          },
          cacheOptions(infra, [TAG_CATALOG, tagFor('machine'), tagFor('machine', sourceId)])
        );
        return result ? (toPlain(result) as SparePartsMachine) : null;
      } catch {
        // One bad/stale id shouldn't blank the whole list.
        return null;
      }
    })
  );
  return machines.filter((m): m is SparePartsMachine => m !== null);
}
