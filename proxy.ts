import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEFAULT_LANGUAGE = (process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL').toUpperCase();

/** Locale codes that get a URL prefix (everything except the default). */
const LOCALE_PREFIXES = ['en', 'de', 'fr']; // extend as needed

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, Next.js internals
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
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and API
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
