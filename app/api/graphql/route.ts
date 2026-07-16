import { NextRequest, NextResponse } from 'next/server';
import { looksLikeValidJwt } from '@/lib/jwt';

const GRAPHQL_ENDPOINT = process.env.BOILERPLATE_GRAPHQL_ENDPOINT || '';
const API_KEY = process.env.BOILERPLATE_API_KEY || '';
// Second API key for order-editor mutations. The Propeller backend authorizes
// these sensitive mutations ONLY against this key, not the general API_KEY —
// sending them with API_KEY returns "Forbidden resource". The client SDK runs
// in proxy mode (no apikey sent), so the routing playground-v2 does in
// PropellerApi::buildHeaders($type) has to happen HERE instead.
const ORDER_EDITOR_API_KEY = process.env.BOILERPLATE_ORDER_EDITOR_API_KEY || '';

// Mirrors the SDK's DEFAULT_ORDER_EDITOR_MUTATIONS (GraphQLClient.ts). Keep in
// sync if the SDK list changes. These operation names route to the order key.
const ORDER_EDITOR_MUTATIONS = new Set([
  'orderSetStatus',
  'passwordResetLink',
  'triggerQuoteSendRequest',
  'triggerOrderSendConfirm',
]);

// Queries that the general API key isn't allowed to resolve. The `order` query
// (used by the thank-you page and order detail screens to fetch a single order
// by id) returns `Forbidden resource` under the general key; only the
// order-editor key authorizes it. Mirrors the same routing decision the SDK
// embeds for mutations, but applied at the query level where the SDK has no
// equivalent default list — the proxy is the authoritative router in proxy
// mode (see callUpstream below).
const ORDER_EDITOR_QUERIES = new Set(['order']);

// Operations that route to the order key ONLY when the caller identifies as the
// order-editor client. `contactRegister` is used by BOTH public self-registration
// (general key) AND authorization-settings "add contact" (order key) — the
// operationName is identical, so the caller signals intent via the SDK's
// `clientId` (sent as `X-Client-ID`) and the proxy routes accordingly. The
// header is server-internal: not forwarded upstream.
const ORDER_EDITOR_OPT_IN_MUTATIONS = new Set(['contactRegister']);
const ORDER_EDITOR_CLIENT_ID = 'order-editor';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Extract an operation name from a GraphQL document — fallback for requests
 * that don't carry `operationName` in the body. Mirrors the SDK's own
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
 * query string. NOT a full AST walk (we don't depend on graphql-js); braces
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

function clientIp(request: NextRequest): string {
  // Trust the first hop only if present; otherwise fall back to a sentinel.
  // x-forwarded-for is set by Vercel/most proxies; client-set headers can
  // be spoofed but rate-limiting from a known shared sentinel is a known
  // tradeoff (worst case: a single noisy LAN trips the limit together).
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const xri = request.headers.get('x-real-ip');
  if (xri) return xri;
  return 'unknown';
}

/**
 * Calls the upstream GraphQL endpoint once with the supplied bearer (or
 * none). Returns the raw Response so the caller can inspect status before
 * deciding to retry.
 *
 * `operationName` selects the API key: order-editor mutations route to
 * ORDER_EDITOR_API_KEY, everything else to the general API_KEY. If the order
 * key is unset we fall back to the general key (which the backend will reject
 * for these mutations — surfaced as the same "Forbidden resource" error rather
 * than a silent mismatch).
 */
async function callUpstream(
  body: unknown,
  bearer: string | undefined,
  operationName: string | undefined,
  orderEditorOptIn = false,
  isAnonymous = false,
): Promise<Response> {
  // ORDER_EDITOR_QUERIES is gated on `isAnonymous` so logged-in flows
  // (e.g. /account/orders/[id]) keep using the general key with their own
  // bearer token, which is the path the backend authorizes for owners.
  // Guest sessions have no bearer at all, so the only way the thank-you
  // page can read its just-placed order is through the order-editor key.
  const useOrderKey =
    !!ORDER_EDITOR_API_KEY &&
    !!operationName &&
    (ORDER_EDITOR_MUTATIONS.has(operationName) ||
      (isAnonymous && ORDER_EDITOR_QUERIES.has(operationName)) ||
      (orderEditorOptIn && ORDER_EDITOR_OPT_IN_MUTATIONS.has(operationName)));
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: useOrderKey ? ORDER_EDITOR_API_KEY : API_KEY,
  };
  if (bearer) headers['Authorization'] = `Bearer ${bearer}`;
  return fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
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
    const sessionCookie = request.cookies.get('access_token')?.value;
    const hasSessionCookie = !!sessionCookie;
    // The higher auth tier is gated on a token that at least parses as a
    // non-expired JWT — not raw cookie presence, which a raw HTTP client can
    // forge with any `access_token=x` value to claim the auth ceiling.
    const hasAuthToken = looksLikeValidJwt(sessionCookie);
    const ip = clientIp(request);
    const limit = hasAuthToken ? RATE_LIMIT_AUTH : RATE_LIMIT_ANON;
    if (isRateLimited(ip, limit)) {
      return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429 });
    }

    // ── Body-size cap ────────────────────────────────────────────────────
    // Read once as text, size-check, then JSON-parse. content-length is
    // checked first as a fast path when the client sends it.
    const contentLength = Number(request.headers.get('content-length') ?? '');
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'payload too large' }, { status: 413 });
    }
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'payload too large' }, { status: 413 });
    }
    let body: { query?: unknown; variables?: unknown; operationName?: unknown };
    try {
      body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
    }

    // Resolve the operation name (used to pick the API key). The SDK sends it
    // in the body; fall back to parsing the query for any caller that doesn't.
    const operationName =
      (typeof body.operationName === 'string' ? body.operationName : undefined) ??
      extractOperationName(body.query);

    // Opt-in signal for clientId-gated order-editor operations (contactRegister
    // from authorization settings). Public self-registration uses the default
    // client (no clientId) and omits it.
    const orderEditorOptIn = request.headers.get('x-client-id') === ORDER_EDITOR_CLIENT_ID;

    // ── Query-depth limit ────────────────────────────────────────────────
    const depth = estimateQueryDepth(body.query);
    if (depth > MAX_QUERY_DEPTH) {
      return NextResponse.json(
        { error: `query depth ${depth} exceeds limit ${MAX_QUERY_DEPTH}` },
        { status: 400 },
      );
    }

    if (isDev) {
      // Dev-only: query/variables can contain PII (cart contents, contact data).
      // Never log them in production.
      const querySnippet =
        typeof body.query === 'string' ? body.query.substring(0, 100) + '...' : '<non-string>';
      console.log('📤 GraphQL Proxy Request:', {
        endpoint: GRAPHQL_ENDPOINT,
        hasApiKey: !!API_KEY,
        operationName,
        usingOrderKey:
          !!operationName &&
          (ORDER_EDITOR_MUTATIONS.has(operationName) ||
            (!hasSessionCookie && ORDER_EDITOR_QUERIES.has(operationName))),
        query: querySnippet,
        variables: body.variables,
        depth,
      });
    }

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
    const cookieToken = request.cookies.get('access_token')?.value;
    const authHeader = request.headers.get('authorization');
    let initialBearer =
      cookieToken ?? (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined);

    // Guest sessions are the ones the ORDER_EDITOR_QUERIES gate cares about.
    // `hasSessionCookie` was computed up-top for rate limiting and is the same
    // signal we want here: no cookie ⇒ anonymous request ⇒ guest-only routing
    // is permitted to escalate the `order` query to the order-editor key.
    const isAnonymous = !hasSessionCookie;

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

    // First attempt.
    let response = await callUpstream(
      body,
      initialBearer,
      operationName,
      orderEditorOptIn,
      isAnonymous,
    );

    // 401-refresh-retry: ONLY when we had a cookie token (a logged-in session
    // that may have just expired). If the request came in anonymously, no
    // refresh is possible and we just propagate the 401.
    if (response.status === 401 && cookieToken) {
      const refreshed = await tryRefresh(request);
      if (refreshed) {
        refreshSetCookies = refreshed.setCookies;
        // After a successful refresh the request is no longer anonymous, so
        // the retry runs with `isAnonymous=false` and skips the guest gate.
        response = await callUpstream(
          body,
          refreshed.newAccessToken,
          operationName,
          orderEditorOptIn,
          false,
        );
      }
    }

    const data = await response.json();

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
      return errRes;
    }

    if (isDev) {
      console.log('✅ GraphQL Success');
    }
    const okRes = NextResponse.json(data);
    for (const c of refreshSetCookies) okRes.headers.append('set-cookie', c);
    return okRes;
  } catch (error) {
    if (isDev) {
      console.error('❌ GraphQL proxy error:', error);
    } else {
      console.error('❌ GraphQL proxy error');
    }
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
