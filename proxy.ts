import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEFAULT_LANGUAGE = (process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL').toUpperCase();
void DEFAULT_LANGUAGE; // reserved for future locale-aware logic

/** Locale codes that get a URL prefix (everything except the default). */
const LOCALE_PREFIXES = ['en', 'de', 'fr']; // extend as needed

// ── Security headers (defense-in-depth) ─────────────────────────────────────
// Applied to every non-API response. Skipped for `/api/*`: those routes are
// JSON-only and not framed/rendered, so CSP/X-Frame-Options are not
// applicable; they have their own concerns (rate limit + auth) at the route
// level. CSP differs in dev vs prod because Next's dev runtime (HMR) requires
// 'unsafe-eval' and a websocket; production runs without either.
const isProd = process.env.NODE_ENV === 'production';

const CSP_PROD = [
  "default-src 'self'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const CSP_DEV = [
  "default-src 'self'",
  "img-src 'self' data: https: http:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  // Next.js dev (HMR) requires eval + inline.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  // Allow ws/wss for HMR websocket.
  "connect-src 'self' ws: wss: https: http:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('Content-Security-Policy', isProd ? CSP_PROD : CSP_DEV);
  response.headers.set('X-Frame-Options', 'DENY');
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
  // no locale rewrite. JSON endpoints don't benefit from CSP.
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/admin') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if the URL starts with a non-default locale prefix
  const match = pathname.match(/^\/([a-z]{2})(\/|$)/);
  if (match && LOCALE_PREFIXES.includes(match[1])) {
    const locale = match[1];
    // Strip the locale prefix and rewrite to the actual route
    const strippedPath = pathname.slice(3) || '/';
    const url = request.nextUrl.clone();
    url.pathname = strippedPath;

    const response = NextResponse.rewrite(url);
    // Set cookie so client-side LanguageContext can pick it up on first load
    response.cookies.set('preferred_language', locale.toUpperCase(), { path: '/' });
    return applySecurityHeaders(response);
  }

  return applySecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    // Match all paths except static files and API
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
