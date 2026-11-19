import { NextRequest, NextResponse } from 'next/server';
import { looksLikeValidJwt } from '@/lib/jwt';
import { clientIp } from '@/lib/http/clientIp';
import { isSameOrigin } from '@/lib/http/sameOrigin';
import { config } from '@/data/config';
import { getVerifiedViewer } from '@/lib/auth/viewer';
import { forVisitor } from '@/lib/catalog/hidePrices';
import { canSeePrices, pricesRestricted } from '@/lib/catalog/priceVisibility';
import { createRateLimiter } from '@/lib/form-protection/rateLimit';
import {
  LAST_ORDER_COOKIE,
  LAST_ORDER_MAX_AGE,
  ORDER_EDITOR_MUTATION_FIELDS,
  contactRegisterParentId,
  createSpentLog,
  elevatedMutationFlag,
  isKnownElevatedMutation,
  isOwnQuotation,
  ORDER_OWNER_QUERY,
  parseDocument,
  placedOrderId,
  quoteAcceptOrderId,
  readSingleField,
  settleReserved,
  shouldUseOrderEditorKey,
  signLastOrder,
  verifyLastOrderState,
  type RoutingContext,
  type SingleField,
} from '@/lib/graphql/orderEditorRouting';
import { isOrderRead, mayReadOrder } from '@/lib/graphql/orderReadRouting';
import { hasPriceFilter, inspectDocument, withoutPriceFilters } from '@/lib/graphql/priceGate';
import {
  REGISTRATION_COOKIE,
  REGISTRATION_MAX_AGE,
  companyCreateVariables,
  createdCompanyId,
  registrationStep,
  signRegistration,
  verifyRegistration,
} from '@/lib/graphql/registrationRouting';
import {
  PUNCHOUT_PENDING_COOKIE,
  clearPunchoutCookies,
  magicTokenExchange,
  promotePending,
  setActiveCookies,
} from '@/lib/punchout-session/session';

const GRAPHQL_ENDPOINT = process.env.BOILERPLATE_GRAPHQL_ENDPOINT || '';
const API_KEY = process.env.BOILERPLATE_API_KEY || '';
// Second API key for order-editor mutations. The Propeller backend authorizes
// these sensitive mutations ONLY against this key, not the general API_KEY —
// sending them with API_KEY returns "Forbidden resource". The client SDK runs
// in proxy mode (no apikey sent), so the routing playground-v2 does in
// PropellerApi::buildHeaders($type) has to happen HERE instead.
const ORDER_EDITOR_API_KEY = process.env.BOILERPLATE_ORDER_EDITOR_API_KEY || '';

// Key routing lives in lib/graphql/orderEditorRouting.ts; X-Client-ID is never forwarded.
const ORDER_EDITOR_CLIENT_ID = 'order-editor';

const isDev = process.env.NODE_ENV !== 'production';

// Semi-closed / closed portals: prices only for a verified Contact or Customer
// (lib/catalog/priceVisibility.ts). Open portals skip the whole gate, viewer lookup included.
const PRICE_GATE = pricesRestricted(config.portal.mode);

// Fields the proxy never forwards: introspection maps the back office, and
// passwordResetLink returns a reset URL for any account to whoever asks.
const REFUSED_FIELDS = ['__schema', '__type', 'passwordResetLink'];

// Elevated checkout mutations already run, per order (see createSpentLog).
const spentElevations = createSpentLog();

// Self-registration companyCreate: each creates a company in Propeller. Per IP, and in total on a
// limiter of its own so a flood of per-IP keys can't evict the total.
const registrationLimiter = createRateLimiter();
const registrationTotalLimiter = createRateLimiter({ maxKeys: 10 });
const REGISTRATION_PER_IP = { limit: 5, windowMs: 60 * 60_000 };
const REGISTRATION_TOTAL = { limit: 30, windowMs: 60 * 60_000 };

/** A refusal in GraphQL's own error shape, so every client (SDK, tests) can read it. */
function refuse(message: string, status: number, code = 'FORBIDDEN'): NextResponse {
  return NextResponse.json({ errors: [{ message, extensions: { code } }] }, { status });
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: !isDev,
  path: '/',
  maxAge,
});

/** ORDER_OWNER_QUERY for `orderId` with the order-editor key, no Bearer, never cached. Throws on failure. */
async function readOrderOwner(orderId: number): Promise<unknown> {
  if (!ORDER_EDITOR_API_KEY) throw new Error('no order-editor key');
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ORDER_EDITOR_API_KEY },
    body: JSON.stringify({ query: ORDER_OWNER_QUERY, variables: { orderId } }),
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`order owner lookup ${res.status}`);
  return res.json();
}

/**
 * Quote acceptance (QuoteActions → orderSetStatus { orderId, status: NEW }): elevated only for the
 * verified viewer who placed that order, while it is still a quotation. Read with the order-editor key.
 */
async function ownsQuotation(orderId: number, bearer: string | undefined): Promise<boolean> {
  const viewer = await getVerifiedViewer(bearer);
  if (!viewer) return false;
  try {
    return isOwnQuotation(await readOrderOwner(orderId), viewer);
  } catch {
    return false;
  }
}

/**
 * Elevation that needs the verified viewer: quote acceptance, and an authorization manager adding a
 * contact. `knownDocument`: the document is one of the shop's own (isKnownElevatedMutation).
 */
async function viewerElevation(
  single: SingleField | null,
  variables: unknown,
  bearer: string | undefined,
  orderEditorClient: boolean,
  knownDocument: boolean,
): Promise<boolean> {
  if (!knownDocument) return false;
  const quoteId = quoteAcceptOrderId(single, variables);
  if (quoteId) return ownsQuotation(quoteId, bearer);
  // contactRegister from authorization settings (X-Client-ID: order-editor): only into a company
  // the viewer manages. Public self-registration omits the header and keeps the storefront key.
  const parentId = orderEditorClient ? contactRegisterParentId(single, variables) : null;
  if (!parentId) return false;
  const viewer = await getVerifiedViewer(bearer);
  return viewer?.type === 'Contact' && viewer.managerCompanyIds.includes(parentId);
}

/**
 * Extract an operation name for dev logging only — never used for key routing.
 * Fallback for requests that don't carry `operationName` in the body. Mirrors the SDK's own
 * `extractOperationName`: strips leading `#` comments, then matches the first
 * `query NAME` / `mutation NAME`. Returns undefined for anonymous operations.
 */
function extractOperationName(query: unknown): string | undefined {
  if (typeof query !== 'string') return undefined;
  const stripped = query.replace(/^\s*(#[^\n]*\n)+/g, '').trimStart();
  const match = stripped.match(/^(?:query|mutation)\s+(\w+)/);
  return match ? match[1] : undefined;
}

// ── Proxy hardening limits ──────────────────────────────────────────────────
// These are defensive guards. They do not replace upstream validation, but
// they do stop an authenticated client (or a stolen cookie) from trivially
// DoS-ing the backend through this proxy.
const MAX_BODY_BYTES = 100 * 1024; // 100 KB — accommodates large bulk queries
const MAX_QUERY_DEPTH = 12; // generous; deep cart/order trees are ~6-7
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 min rolling window
// These are intentionally generous — a real shopper clicking around fires
// 4–8 GraphQL calls per page navigation (header menu, search box, cart, price
// toggle, ProductGrid, PDP tabs), so a brisk session crosses 60+/min easily.
// The cap is a bot/scraper / DoS shield, not a user-behavior shield. The
// e2e suite at workers=2 also brushed against 30/min before this was raised.
const RATE_LIMIT_AUTH = 300; // per-IP, authenticated
const RATE_LIMIT_ANON = 150; // per-IP, anonymous

/**
 * Approximate GraphQL query depth by counting maximum brace nesting in the
 * query string. NOT a full AST walk (runs before any parse); braces
 * inside string literals could in principle fool this, but GraphQL string
 * literals can't contain unescaped `{`/`}`, so the counter is safe for
 * well-formed queries. Malformed queries fail upstream anyway.
 */
function estimateQueryDepth(query: unknown): number {
  if (typeof query !== 'string') return 0;
  let depth = 0;
  let max = 0;
  let inString = false;
  for (let i = 0; i < query.length; i++) {
    const c = query[i];
    if (c === '"') {
      // Toggle string state; respect backslash escape
      if (i === 0 || query[i - 1] !== '\\') inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === '{') {
      depth++;
      if (depth > max) max = depth;
    } else if (c === '}') {
      depth--;
    }
  }
  return max;
}

/**
 * Per-IP rolling-window rate limiter. In-memory `Map<ip, timestamps[]>` —
 * suitable for a single Next instance (the boilerplate's default). In
 * production behind multiple instances, replace with Redis or a CDN edge
 * limit. Documented in README.
 */
const rateLimitBuckets = new Map<string, number[]>();

function isRateLimited(ip: string, limit: number): boolean {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  const bucket = rateLimitBuckets.get(ip) ?? [];
  // Drop expired entries.
  const fresh = bucket.filter((t) => t > cutoff);
  if (fresh.length >= limit) {
    rateLimitBuckets.set(ip, fresh);
    return true;
  }
  fresh.push(now);
  rateLimitBuckets.set(ip, fresh);
  return false;
}

/**
 * Calls the upstream GraphQL endpoint once with the supplied bearer (or
 * none). Returns the raw Response so the caller can inspect status before
 * deciding to retry. `useOrderKey` selects ORDER_EDITOR_API_KEY over API_KEY.
 */
async function callUpstream(
  body: { query: string; variables?: unknown; operationName?: unknown },
  bearer: string | undefined,
  useOrderKey: boolean,
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: useOrderKey && ORDER_EDITOR_API_KEY ? ORDER_EDITOR_API_KEY : API_KEY,
  };
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`;
  return fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  });
}

type RefreshResult = { newAccessToken: string; setCookies: string[] } | null;

// Single-flight refresh. When a page fires several parallel GraphQL queries
// with an expired access token, each gets a 401 and would independently POST
// /api/auth/refresh. Because that route ROTATES the refresh_token on every
// call, if the upstream invalidates the old refresh token on first use only
// one refresh survives and the rest 401 with a now-dead token — breaking
// those UI sections despite a valid session. Deduping on the refresh_token
// value means all concurrent 401s from the same session await one refresh and
// share its result (new access token + Set-Cookie headers).
// ponytail: in-memory map, per-instance. Fine for the single-instance
// boilerplate default; behind N instances each dedupes its own slice, which
// only reduces the win, never breaks correctness.
const inflightRefreshes = new Map<string, Promise<RefreshResult>>();

async function doRefresh(request: NextRequest): Promise<RefreshResult> {
  // Build absolute URL — fetch() in route handlers needs it.
  const url = new URL('/api/auth/refresh', request.url);
  const refreshRes = await fetch(url, {
    method: 'POST',
    headers: { cookie: request.headers.get('cookie') ?? '' },
  });
  if (!refreshRes.ok) return null;

  // The refresh route Set-Cookie's the new access_token + refresh_token. We
  // can't read the new access_token from there directly (it's httpOnly), but
  // we CAN forward the Set-Cookie headers verbatim to our caller, AND parse
  // the access_token out of the Set-Cookie line to use it for our immediate
  // retry against upstream within this same request.
  const setCookies = refreshRes.headers.getSetCookie?.() ?? [];
  const accessCookie = setCookies.find((c) => c.startsWith('access_token='));
  if (!accessCookie) return null;
  const match = accessCookie.match(/^access_token=([^;]+)/);
  const newAccessToken = match?.[1];
  if (!newAccessToken) return null;

  return { newAccessToken, setCookies };
}

/**
 * Attempts a refresh by calling our own /api/auth/refresh route, forwarding
 * the incoming request's cookies. Concurrent calls carrying the same
 * refresh_token share a single in-flight refresh (see inflightRefreshes).
 * Returns the new access_token + Set-Cookie headers on success, or null.
 */
async function tryRefresh(request: NextRequest): Promise<RefreshResult> {
  const refreshToken = request.cookies.get('refresh_token')?.value;
  // No refresh token to key on — just run it (nothing to dedupe against).
  if (!refreshToken) return doRefresh(request);

  const existing = inflightRefreshes.get(refreshToken);
  if (existing) return existing;

  const promise = doRefresh(request).finally(() => {
    inflightRefreshes.delete(refreshToken);
  });
  inflightRefreshes.set(refreshToken, promise);
  return promise;
}

export async function POST(request: NextRequest) {
  try {
    // ── Rate limit (per-IP, anon vs auth) ────────────────────────────────
    // We check before parsing the body so a flood of malformed requests still
    // gets rate-limited.
    // A blank cookie or header (`access_token=%09`) is no token, everywhere below.
    const sessionCookie = request.cookies.get('access_token')?.value?.trim() || undefined;
    // The higher rate-limit tier is gated on a token that at least parses as a
    // non-expired JWT — not raw cookie presence, which a raw HTTP client can
    // forge with any `access_token=x` value to claim the auth ceiling. A rate
    // tier only: every privilege decision below uses the verified viewer.
    const hasAuthToken = looksLikeValidJwt(sessionCookie);
    const ip = clientIp(request.headers);
    const limit = hasAuthToken ? RATE_LIMIT_AUTH : RATE_LIMIT_ANON;
    if (isRateLimited(ip, limit)) {
      return refuse('rate limit exceeded', 429, 'RATE_LIMITED');
    }
    // A browser on another site sends its own Origin: refused. No Origin (a non-browser client)
    // is allowed; it can't carry a visitor's cookies.
    if (!isSameOrigin(request, process.env.NEXT_PUBLIC_SITE_URL)) {
      return refuse('cross-site request refused', 403);
    }

    // ── Body-size cap ────────────────────────────────────────────────────
    // Read once as text, size-check, then JSON-parse. content-length is
    // checked first as a fast path when the client sends it.
    const contentLength = Number(request.headers.get('content-length') ?? '');
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return refuse('payload too large', 413, 'PAYLOAD_TOO_LARGE');
    }
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return refuse('payload too large', 413, 'PAYLOAD_TOO_LARGE');
    }
    let parsed: { query?: unknown; variables?: unknown; operationName?: unknown } | null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return refuse('invalid JSON body', 400, 'BAD_REQUEST');
    }
    // Only a query string goes upstream: a persisted-query hash (`extensions`) would run a
    // document these guards never saw, so it is refused and nothing but these three keys is sent.
    if (!parsed || typeof parsed !== 'object' || typeof parsed.query !== 'string') {
      return refuse('query must be a string', 400, 'BAD_REQUEST');
    }
    const body: { query: string; variables?: unknown; operationName?: unknown } = {
      query: parsed.query,
      variables: parsed.variables,
      operationName: parsed.operationName,
    };

    // Dev logging only; key routing parses the document instead.
    const operationName =
      (typeof body.operationName === 'string' ? body.operationName : undefined) ??
      extractOperationName(body.query);

    // Opt-in signal for contactRegister from authorization settings. Public
    // self-registration omits it.
    const orderEditorOptIn = request.headers.get('x-client-id') === ORDER_EDITOR_CLIENT_ID;

    // ── Query-depth limit ────────────────────────────────────────────────
    const depth = estimateQueryDepth(body.query);
    if (depth > MAX_QUERY_DEPTH) {
      return refuse(`query depth ${depth} exceeds limit ${MAX_QUERY_DEPTH}`, 400, 'BAD_REQUEST');
    }

    // ── Parse once; every guard below shares this AST ────────────────────
    // A document this parser can't read is refused rather than forwarded: upstream would
    // reject it too, and nothing unchecked reaches it.
    const doc = parseDocument(body.query);
    if (!doc) return refuse('query does not parse', 400, 'GRAPHQL_PARSE_FAILED');
    const guards = inspectDocument(doc);
    const refused = REFUSED_FIELDS.find((f) => guards.fields.has(f));
    if (refused) return refuse(`${refused} is not allowed`, 403);
    // Cost prices are stripped by response key for everyone; an alias would rename them past it.
    if (guards.costPriceAlias) return refuse('Aliases on cost prices are not allowed', 403);
    const single = readSingleField(doc);
    // The checkout's order-editor mutations run only as the shop's own documents: the order-editor
    // key would resolve any selection on the returned order. Never sent with the storefront key either.
    const knownElevatedDocument = isKnownElevatedMutation(doc);
    const elevatedField = [...ORDER_EDITOR_MUTATION_FIELDS].some((f) => guards.fields.has(f));
    if (elevatedField && !knownElevatedDocument) return refuse('This operation is not allowed', 403);

    // Auth precedence:
    // 1. httpOnly `access_token` cookie — the source of truth. Token never
    //    exposed to client JS; survives page reloads; set by /api/auth/session.
    // 2. Client `Authorization` header — a deliberate one-request bridge, NOT
    //    tech debt to delete. During login, useAuth.login() calls getViewer()
    //    immediately after authenticating, in the sub-second window BEFORE
    //    afterLogin POSTs the token to /api/auth/session and the cookie lands.
    //    For that single in-flight request the cookie doesn't exist yet, so the
    //    in-memory Bearer header (set via graphqlClient.updateConfig, never
    //    persisted to localStorage) carries auth. Once the cookie is set it
    //    always wins here, so the header is inert for every subsequent request.
    const cookieToken = sessionCookie;
    const authHeader = request.headers.get('authorization');
    const headerToken = (authHeader?.startsWith('Bearer ') && authHeader.slice(7).trim()) || undefined;
    let initialBearer = cookieToken ?? headerToken;
    const isAnonymous = !cookieToken && !headerToken;

    // The order this browser just placed (signed httpOnly cookie). Flags from the cookie plus the
    // server's own record, which a replayed older cookie can't undo.
    const lastOrderCookie = verifyLastOrderState(request.cookies.get(LAST_ORDER_COOKIE)?.value);
    const lastOrder = lastOrderCookie
      ? { orderId: lastOrderCookie.orderId, used: lastOrderCookie.used + spentElevations.flags(lastOrderCookie.orderId) }
      : null;
    const routing: RoutingContext = { single, variables: body.variables, lastOrder };

    let refreshSetCookies: string[] = [];

    // Proactive refresh for a stale session. The upstream does NOT 401 an
    // expired/invalid Bearer — it silently resolves the request as anonymous
    // (HTTP 200, `viewer` → bare `User`). So the 401-refresh below never fires
    // for ordinary token expiry, and a logged-in session silently degrades to
    // anonymous once the access JWT's 60-min `exp` passes inside the 8h cookie
    // window: getViewer() stops returning the Contact, `state.user` starves,
    // and user-scoped queries (orders, quotes, favorites) come back empty
    // while the UI still paints logged-in. Detect the expiry HERE — the one
    // choke point every client call passes through — and refresh before the
    // first upstream attempt. Shares the single-flight tryRefresh, so a page
    // firing N parallel queries with a stale token still does ONE refresh.
    if (cookieToken && !looksLikeValidJwt(cookieToken)) {
      const refreshed = await tryRefresh(request);
      if (refreshed) {
        refreshSetCookies = refreshed.setCookies;
        initialBearer = refreshed.newAccessToken;
      }
      // If the refresh failed the refresh_token is dead too — fall through
      // with the stale Bearer; upstream treats it as anonymous, and the
      // client-side session-expiry handling (refreshUser) takes over.
    }

    // Self-registration steps the storefront key may not run: the SDK's own companyCreate
    // (anonymous, rate-limited) and companyAddressCreate for the company this browser just created.
    // Sent without the Bearer, so only the order-editor key decides (lib/graphql/registrationRouting.ts).
    const registration = verifyRegistration(request.cookies.get(REGISTRATION_COOKIE)?.value);
    const regStep = ORDER_EDITOR_API_KEY ? registrationStep(doc, body.variables, { isAnonymous, registration }) : null;
    if (regStep?.kind === 'company') {
      const perIp = registrationLimiter.hit(`registration-company:${ip}`, REGISTRATION_PER_IP);
      if (!perIp.ok || !registrationTotalLimiter.hit('registration-company', REGISTRATION_TOTAL).ok) {
        return refuse('Too many registrations, try again later', 429, 'RATE_LIMITED');
      }
      body.variables = companyCreateVariables(body.variables);
    }

    // ── Price gate (semi-closed / closed only) ───────────────────────────
    // The viewer lookup for this token runs alongside the upstream call (never rejects).
    let canSeeLookup: Promise<boolean> = !PRICE_GATE
      ? Promise.resolve(true)
      : regStep
        ? Promise.resolve(false)
        : getVerifiedViewer(initialBearer).then(canSeePrices);
    // Documents that could reveal prices despite stripping need the answer first: aliases other
    // than the shop's own (hidePrices works on response keys, so an alias renames a price field or
    // hides one under a kept key) and inline price filters/sorts are refused (counting results per
    // price range gives the exact price); price filters and sorts in variables are dropped silently.
    if (PRICE_GATE && (guards.foreignAlias || guards.inlinePriceFilter || hasPriceFilter(body.variables))) {
      if (!(await canSeeLookup)) {
        if (guards.foreignAlias || guards.inlinePriceFilter) {
          return refuse('Aliases other than the SDK ones, price filters and price sorts are not allowed', 403);
        }
        body.variables = withoutPriceFilters(body.variables);
      }
    }

    // ── Order reads: the verified owner, or a guest's last order (lib/graphql/orderReadRouting.ts) ──
    // Served with the order-editor key and without the Bearer; every other order read is refused.
    const orderRead = isOrderRead(doc, guards.fields);
    if (orderRead) {
      const allowed = await mayReadOrder(doc, single, {
        viewer: await getVerifiedViewer(initialBearer),
        lastOrderId: lastOrder?.orderId ?? null,
        variables: body.variables,
        lookupOwner: readOrderOwner,
      });
      if (!allowed) return refuse('Forbidden: this order is not available to you', 403);
    }
    // Sent without the Bearer: only the order-editor key and the checks above decide.
    const sendBearer = !regStep && !orderRead;

    // ── Order-editor key ─────────────────────────────────────────────────
    const cookieElevated = !regStep && knownElevatedDocument && shouldUseOrderEditorKey(routing);
    const usedOrderKey =
      !!regStep ||
      orderRead ||
      cookieElevated ||
      (await viewerElevation(single, body.variables, initialBearer, orderEditorOptIn, knownElevatedDocument));
    // The checkout's order-editor mutations never run with the storefront key: either they are
    // elevated for this browser's own order (or the viewer's own quotation), or refused here.
    if (!usedOrderKey && elevatedField) {
      return refuse('This operation is not allowed', 403);
    }
    // Spend the checkout mutation for this order before the call. The flags read above can be
    // stale by now (tryRefresh and the viewer lookups awaited since), so reserve() checks and
    // spends in one synchronous step with no await before the upstream call: of N parallel
    // requests with the same last-order cookie only one gets the key.
    const spent = cookieElevated ? elevatedMutationFlag(single) : null;
    if (spent && lastOrder && !spentElevations.reserve(lastOrder.orderId, spent)) {
      return refuse('This operation is not allowed', 403);
    }

    if (isDev) {
      // Dev-only: query/variables can contain PII (cart contents, contact data).
      // Never log them in production.
      console.log('📤 GraphQL Proxy Request:', {
        endpoint: GRAPHQL_ENDPOINT,
        hasApiKey: !!API_KEY,
        operationName,
        usingOrderKey: usedOrderKey,
        query: body.query.substring(0, 100) + '...',
        variables: body.variables,
        depth,
      });
    }

    // A failed elevated call, or one that throws, doesn't spend the mutation.
    const reserved = spent && lastOrder ? { orderId: lastOrder.orderId, flag: spent } : null;
    const { response, upstreamData } = await settleReserved(
      spentElevations,
      reserved,
      async () => {
        // First attempt.
        let response = await callUpstream(body, sendBearer ? initialBearer : undefined, usedOrderKey);

        // 401-refresh-retry: ONLY when we had a cookie token (a logged-in session
        // that may have just expired). If the request came in anonymously, no
        // refresh is possible and we just propagate the 401. The key routing
        // stands: it never depended on that token being fresh.
        if (response.status === 401 && cookieToken && sendBearer) {
          const refreshed = await tryRefresh(request);
          if (refreshed) {
            refreshSetCookies = refreshed.setCookies;
            if (PRICE_GATE) canSeeLookup = getVerifiedViewer(refreshed.newAccessToken).then(canSeePrices);
            response = await callUpstream(body, refreshed.newAccessToken, usedOrderKey);
          }
        }
        return { response, upstreamData: await response.json() };
      },
      (r) => !r.response.ok || !!(r.upstreamData as { errors?: unknown[] } | null)?.errors?.length,
    );
    // Prices only for a verified viewer (semi-closed / closed) and nobody ever gets the merchant's cost
    // prices: the storefront key answers them in the catalog, the order-editor key in order reads.
    const data = forVisitor(upstreamData, await canSeeLookup);
    const hasErrors = !response.ok || !!(data as { errors?: unknown[] } | null)?.errors?.length;

    // PunchOut (#20): a successful magicTokenLogin promotes this browser's pending punchout entry
    // if it was bound to that very token; a failed exchange clears every punchout cookie.
    const exchange = magicTokenExchange(doc, body.variables, upstreamData);
    const applyPunchout = (res: NextResponse) => {
      if (!exchange) return;
      const promoted = exchange.accessToken
        ? promotePending(request.cookies.get(PUNCHOUT_PENDING_COOKIE)?.value, exchange.token, exchange.accessToken)
        : null;
      if (promoted) setActiveCookies(res, promoted);
      else if (!exchange.accessToken) clearPunchoutCookies(res);
    };

    if (!response.ok) {
      if (isDev) {
        console.error('❌ GraphQL Error Response:', { status: response.status, data });
      } else {
        // Production: status only — `data` can echo back the query/variables.
        console.error(`❌ GraphQL upstream error (status ${response.status})`);
      }
      const errRes = NextResponse.json(
        { error: 'GraphQL request failed', details: data },
        { status: response.status },
      );
      // Even on error, forward refreshed cookies if we got new ones — the
      // refresh succeeded; the second upstream call failed for a different
      // reason and the client should keep the new tokens for next attempt.
      for (const c of refreshSetCookies) errRes.headers.append('set-cookie', c);
      applyPunchout(errRes);
      return errRes;
    }

    if (isDev) {
      console.log('✅ GraphQL Success');
    }
    const okRes = NextResponse.json(data);
    for (const c of refreshSetCookies) okRes.headers.append('set-cookie', c);
    // Remember the order this browser just placed (guest or logged in): its checkout mutations
    // and the guest thank-you page are bound to it.
    const newOrderId = ORDER_EDITOR_API_KEY ? placedOrderId(single, data) : null;
    const lastOrderValue = newOrderId
      ? signLastOrder(newOrderId)
      : spent && lastOrderCookie && !hasErrors
        ? signLastOrder(lastOrderCookie.orderId, lastOrderCookie.used + spent)
        : null;
    if (lastOrderValue) okRes.cookies.set(LAST_ORDER_COOKIE, lastOrderValue, cookieOptions(LAST_ORDER_MAX_AGE));
    // Remember the company this browser just registered, and which of its addresses were created.
    const newCompanyId = regStep?.kind === 'company' ? createdCompanyId(data) : null;
    const regCookie = newCompanyId
      ? signRegistration(newCompanyId)
      : regStep?.kind === 'address' && registration && !hasErrors
        ? signRegistration(regStep.companyId, registration.used + regStep.flag)
        : null;
    if (regCookie) okRes.cookies.set(REGISTRATION_COOKIE, regCookie, cookieOptions(REGISTRATION_MAX_AGE));
    applyPunchout(okRes);
    return okRes;
  } catch (error) {
    if (isDev) {
      console.error('❌ GraphQL proxy error:', error);
    } else {
      console.error('❌ GraphQL proxy error');
    }
    // Internal details only in development; production answers generically.
    return NextResponse.json(
      isDev
        ? { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }
        : { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
