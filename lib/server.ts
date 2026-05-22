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
  type Cluster,
  type ProductsResponse,
  type CategoryProductSearchInput,
  type ProductSortInput,
  type SearchFieldsInput,
  type FilterAvailableAttributeInput,
  type ProductTextFilterInput,
  type ProductPriceFilterInput,
  type ClusterConfigSetting,
  ProductStatus,
  ProductSortField,
  SortOrder,
  ProductSearchableField,
} from 'propeller-sdk-v2';
import { createServices, toPlain, type Services } from 'propeller-v2-react-ui/shared';
import {
  imageSearchFilters,
  imageSearchFiltersGrid,
  imageVariantFiltersMedium,
  imageVariantFiltersLarge,
} from '@/data/defaults';

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
  return {
    client,
    services,
    user: null,
    language: process.env.BOILERPLATE_DEFAULT_LANGUAGE || 'NL',
    portalMode: process.env.BOILERPLATE_PORTAL_MODE || 'OPEN',
    currency: process.env.BOILERPLATE_CURRENCY || '€',
    includeTax: false,
  };
}

/** True when the request carries an `access_token` cookie (i.e. logged in). */
export async function hasAuthCookie(): Promise<boolean> {
  const store = await cookies();
  return !!store.get('access_token')?.value;
}

/**
 * Pick the right infra for a listing page: anonymous (cacheable) when there
 * is no auth cookie, full (dynamic, personalised) when there is. Reading the
 * cookie here is what makes the authenticated branch dynamic.
 */
export async function getListingInfra(): Promise<ServerInfra> {
  return (await hasAuthCookie()) ? getServerInfra() : getAnonymousInfra();
}

// ── Thin fetch helpers (the data layer Bucket-B components consume) ─────────

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
      imageSearchFilters,
      imageVariantFilters: imageVariantFiltersLarge,
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
 * Build the optional `textFilters` / `price` slice of a
 * `CategoryProductSearchInput` from listing options. Mirrors the client
 * `useProductSearch` listing path. Price defaults match the client's
 * (`from: 0`, `to: 999999`).
 */
function buildFilterInput(opts: ListingFetchOptions): Partial<CategoryProductSearchInput> {
  const slice: Partial<CategoryProductSearchInput> = {};
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

  const categoryProductSearchInput: CategoryProductSearchInput = {
    language: lang,
    page: opts.page ?? 1,
    offset: opts.offset ?? 12,
    statuses: STOREFRONT_STATUSES,
    hidden: false,
    sortInputs,
    ...buildFilterInput(opts),
    ...(userId !== undefined && { userId }),
  };

  try {
    const result = await infra.services.category.getCategory({
      categoryId,
      language: lang,
      categoryProductSearchInput,
      // Ask the backend for the attribute filter facets so the grid filter
      // sidebar has data on first paint.
      filterAvailableAttributeInput: FILTER_AVAILABLE_ATTRIBUTE_INPUT,
      imageSearchFilters: imageSearchFiltersGrid,
      // Category product listings use the grid-sized variant.
      imageVariantFilters: imageVariantFiltersMedium,
    });
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
  };

  try {
    const result = await infra.services.category.getCategory({
      categoryId: baseCategoryId,
      language: lang,
      categoryProductSearchInput,
      // Filter facets for the search page's grid filter sidebar.
      filterAvailableAttributeInput: FILTER_AVAILABLE_ATTRIBUTE_INPUT,
      imageSearchFilters: imageSearchFiltersGrid,
      imageVariantFilters: imageVariantFiltersMedium,
    });
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
  try {
    // Step 1 — config drives the attribute name list.
    const clusterConfig = await infra.services.cluster.getClusterConfig(clusterId);
    const attributeNames: string[] = (clusterConfig?.config?.settings ?? []).map(
      (setting: ClusterConfigSetting) => setting.name
    );

    // Step 2 — full cluster fetch with the config-derived attribute filter.
    const result = await infra.services.cluster.getCluster({
      clusterId,
      language: lang,
      imageSearchFilters: imageSearchFiltersGrid,
      imageVariantFilters: imageVariantFiltersLarge,
      ...(attributeNames.length > 0 && {
        attributeResultSearchInput: {
          attributeDescription: { names: attributeNames },
        },
      }),
    });
    return result ? (toPlain(result) as Cluster) : null;
  } catch (e) {
    if (e instanceof Error && /not found|null for non-nullable/i.test(e.message)) {
      return null;
    }
    throw e;
  }
}
