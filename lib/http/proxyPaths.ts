// Real static files (public/, metadata routes) by extension.
const STATIC_FILE =
  /\.(ico|png|jpe?g|gif|svg|webp|avif|txt|xml|json|webmanifest|woff2?|ttf|css|js|map|pdf|xlsx|csv|mp4|webm)$/i;

/**
 * How proxy.ts treats a request path:
 * - 'bypass': API routes, untouched. API responses get no CSP on purpose: the
 *   punchout transfer (/api/punchout/transfer) auto-posts the cart to the
 *   buyer's external HOOK_URL, which `form-action 'self'` would block.
 * - 'file': a static-file extension or another Next internal path (the matcher
 *   already skips /_next/static and /_next/image). Security headers only
 *   (harmless on a real file), no visitor cookie, locale rewrite or
 *   personalization. The headers are not optional here: a page renders under
 *   such a path too (/product/1/x.js, /search/a.json, the 404 page under
 *   /_next/x) and needs CSP and frame protection like any page.
 * - 'page': everything else, a dot in the path included (/search/a.b).
 */
export function proxyPathKind(pathname: string): 'bypass' | 'file' | 'page' {
  if (pathname.startsWith('/api/')) return 'bypass';
  return STATIC_FILE.test(pathname) || pathname.startsWith('/_next/') ? 'file' : 'page';
}
