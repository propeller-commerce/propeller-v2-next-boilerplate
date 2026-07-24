import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isHomeSlug } from '@/lib/cms/core';

const DEFAULT_LANGUAGE = (process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL').toUpperCase();

/** Locale codes that get a URL prefix (everything except the default). */
const LOCALE_PREFIXES = ['en', 'de', 'fr']; // extend as needed

// Prepr-specific behavior (personalization bridge, tracking-pixel CSP allowlist,
// preview iframe framing) is gated on Prepr being the active CMS. On any other
// provider this file behaves exactly as before: plain locale rewrite + strict
// CSP. `NEXT_PUBLIC_CMS_PROVIDER` is inlined at build time.
const IS_PREPR =
  (process.env.NEXT_PUBLIC_CMS_PROVIDER || process.env.CMS_PROVIDER) === 'prepr';

// ── Prepr personalization bridge (Prepr only) ───────────────────────────────
// The Prepr access token is server-only, so the browser can't fetch
// personalized content itself. This middleware forwards the visitor's identity
// and first-load context to the server render as request headers, which
// `readForwardedPreprHeaders()` (lib/preprHeaders.ts) picks up and passes to the
// CMS fetch. `__prepr_uid` is the SAME cookie the tracking pixel uses, so the
// visitor being tracked is the visitor being personalized — if these diverged,
// none of it would line up.
const PREPR_UID_COOKIE = '__prepr_uid';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

/**
 * Build the forwarded request headers carrying Prepr personalization signals,
 * plus the resolved visitor id and whether it was freshly minted (so the caller
 * can persist the cookie on the response).
 */
function buildPreprHeaders(request: NextRequest): { headers: Headers; uid: string; isNew: boolean } {
  const existing = request.cookies.get(PREPR_UID_COOKIE)?.value;
  const uid = existing || crypto.randomUUID();

  const headers = new Headers(request.headers);
  headers.set('Prepr-Customer-Id', uid);

  // Prepr preview bar segment / A-B switch: the editor's preview appends
  // ?prepr_preview_segment=<segment _id> and ?prepr_preview_ab=A|B so editors can
  // preview each variant. Honor them (segment overrides the cookie), and pass the
  // A/B selection through as Prepr-ABTesting.
  const previewSegment = request.nextUrl.searchParams.get('prepr_preview_segment');
  const previewAb = request.nextUrl.searchParams.get('prepr_preview_ab');

  // Group segments (e.g. "premium-customers") derived from the logged-in user's
  // company and stored in the `prepr-segments` cookie by PreprSegmentsSync —
  // forward them so group-based personalization resolves server-side.
  const segments = previewSegment || request.cookies.get('prepr-segments')?.value;
  if (segments) {
    const sorted = segments.split(',').map((s) => s.trim()).filter(Boolean).sort().join(',');
    if (sorted) headers.set('Prepr-Segments', sorted);
  }
  if (previewAb) headers.set('Prepr-ABTesting', previewAb);

  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (ip) headers.set('Prepr-Visitor-IP', ip);

  for (const key of UTM_KEYS) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) headers.set(`Prepr-Context-${key}`, value);
  }

  return { headers, uid, isNew: !existing };
}

/** Persist a freshly-minted `__prepr_uid` so the pixel and future renders share it. */
function persistPreprUid(response: NextResponse, uid: string, isNew: boolean): NextResponse {
  if (isNew) {
    response.cookies.set(PREPR_UID_COOKIE, uid, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
    });
  }
  return response;
}

// ── Security headers (defense-in-depth) ─────────────────────────────────────
// Applied to every non-API response. Skipped for `/api/*`: those routes are
// JSON-only and not framed/rendered, so CSP/X-Frame-Options are not
// applicable; they have their own concerns (rate limit + auth) at the route
// level. CSP differs in dev vs prod because Next's dev runtime (HMR) requires
// 'unsafe-eval' and a websocket; production runs without either.
const isProd = process.env.NODE_ENV === 'production';

// The Prepr tracking pixel (prepr_v2.min.js) is served from
// cdn.tracking.prepr.io — it must be allowlisted in script-src or CSP blocks
// the script and no tracking/personalization runs. Added only when Prepr is the
// CMS. ('https:' in connect-src already permits the pixel's event beacons.)
const PREPR_SCRIPT_SRC = IS_PREPR ? ' https://cdn.tracking.prepr.io' : '';
// Allow Prepr's in-CMS preview to frame the storefront (editor preview iframe).
// Non-Prepr keeps the strict `'none'` + X-Frame-Options: DENY below.
const FRAME_ANCESTORS = IS_PREPR ? "frame-ancestors 'self' https://*.prepr.io" : "frame-ancestors 'none'";

const CSP_PROD = [
  "default-src 'self'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${PREPR_SCRIPT_SRC}`,
  "connect-src 'self' https:",
  // Allow embedded product videos (ProductVideos iframes). Without an explicit
  // frame-src, iframes fall back to default-src 'self' and YouTube/Vimeo embeds
  // are blocked. frame-ancestors below is unrelated (controls who may frame us).
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  FRAME_ANCESTORS,
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const CSP_DEV = [
  "default-src 'self'",
  "img-src 'self' data: https: http:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  // Next.js dev (HMR) requires eval + inline.
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'${PREPR_SCRIPT_SRC}`,
  // Allow ws/wss for HMR websocket.
  "connect-src 'self' ws: wss: https: http:",
  // Allow embedded product videos (ProductVideos iframes) — see CSP_PROD.
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  FRAME_ANCESTORS,
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('Content-Security-Policy', isProd ? CSP_PROD : CSP_DEV);
  // X-Frame-Options is all-or-nothing and can't allow Prepr's preview iframe, so
  // under Prepr framing is controlled by CSP `frame-ancestors` alone (scoped to
  // self + *.prepr.io). Non-Prepr keeps the belt-and-suspenders DENY.
  if (!IS_PREPR) {
    response.headers.set('X-Frame-Options', 'DENY');
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (isProd) {
    // HSTS only in prod; dev runs on http://localhost.
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, Next.js internals — no header injection,
  // no locale rewrite, no personalization. JSON endpoints don't benefit from CSP.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/admin') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // ── Non-Prepr path: unchanged from the original (plain locale rewrite). ──
  if (!IS_PREPR) {
    const match = pathname.match(/^\/([a-z]{2})(\/|$)/);
    if (match && LOCALE_PREFIXES.includes(match[1])) {
      const locale = match[1];
      const strippedPath = pathname.slice(3) || '/';
      const url = request.nextUrl.clone();
      url.pathname = strippedPath;

      const response = NextResponse.rewrite(url);
      response.cookies.set('preferred_language', locale.toUpperCase(), { path: '/' });
      return applySecurityHeaders(response);
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // ── Prepr path: personalization bridge + home-slug rewrite. ──
  // Prepr visitor identity + first-load context, forwarded to the server render.
  // Built once and threaded onto every response path below via
  // `{ request: { headers } }`, then the (possibly new) __prepr_uid persisted.
  const { headers, uid, isNew } = buildPreprHeaders(request);

  // Check if the URL starts with a non-default locale prefix
  const match = pathname.match(/^\/([a-z]{2})(\/|$)/);
  const hasLocalePrefix = !!match && LOCALE_PREFIXES.includes(match[1]);
  // Path with any locale prefix stripped — what we match home slugs against.
  const barePath = hasLocalePrefix ? pathname.slice(3) || '/' : pathname;

  // The personalized home is served at `/`. A request to a home slug
  // (e.g. /home-personalized — Prepr's preview URL for the home page) must land
  // on `/` WITH its query string, so the segment / A-B switch survives. We
  // rewrite (not redirect) so the browser stays on the CSP-allowed URL while `/`
  // renders with the forwarded Prepr-Segments header. Done here because the
  // catch-all page can't read searchParams (it has generateStaticParams).
  if (barePath !== '/' && isHomeSlug(barePath)) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    const response = NextResponse.rewrite(url, { request: { headers } });
    response.cookies.set('preferred_language', DEFAULT_LANGUAGE, { path: '/' });
    return persistPreprUid(applySecurityHeaders(response), uid, isNew);
  }

  if (hasLocalePrefix && match) {
    const locale = match[1];
    // Strip the locale prefix and rewrite to the actual route
    const strippedPath = pathname.slice(3) || '/';
    const url = request.nextUrl.clone();
    url.pathname = strippedPath;

    const response = NextResponse.rewrite(url, { request: { headers } });
    // Set cookie so client-side LanguageContext can pick it up on first load
    response.cookies.set('preferred_language', locale.toUpperCase(), { path: '/' });
    return persistPreprUid(applySecurityHeaders(response), uid, isNew);
  }

  // No locale prefix → default locale. Reset the cookie to the default so a
  // stale prefix cookie (e.g. EN left over from visiting /en) can't override
  // the URL and make an unprefixed page render in the wrong language.
  const response = NextResponse.next({ request: { headers } });
  response.cookies.set('preferred_language', DEFAULT_LANGUAGE, { path: '/' });
  return persistPreprUid(applySecurityHeaders(response), uid, isNew);
}

export const config = {
  matcher: [
    // Match all paths except static files and API
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
