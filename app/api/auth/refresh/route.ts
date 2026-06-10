import { NextRequest, NextResponse } from 'next/server';
import { GraphQLClient, LoginService } from '@propeller-commerce/propeller-sdk-v2';

/**
 * Exchanges the httpOnly `refresh_token` cookie for a fresh access+refresh pair
 * via the SDK, and rewrites both cookies. Returns 204 on success, 401 if the
 * refresh token is missing or upstream rejects it.
 *
 * The client never sees either token — the proxy will pick up the new
 * `access_token` cookie on the next request automatically. Same cookie
 * attributes as `/api/auth/session` (httpOnly, sameSite=lax, secure in prod).
 *
 * Used by the `/api/graphql` proxy's 401-retry path (see route.ts). Can also
 * be called directly by client code if a future component wants to "warm" the
 * session, but the proxy path is the primary consumer — the typical user never
 * sees this route fire.
 */

const isProd = process.env.NODE_ENV === 'production';

// Mirror /api/auth/session — keep TTLs in sync intentionally.
const ACCESS_MAX_AGE = 60 * 60 * 8; // 8h
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30d

// Server-side SDK client. Talks to the real upstream GraphQL endpoint directly
// (NOT to /api/graphql) — refresh is a server-to-server call and must not
// recurse through our own proxy.
const upstreamEndpoint = process.env.BOILERPLATE_GRAPHQL_ENDPOINT || '';
const upstreamApiKey = process.env.BOILERPLATE_API_KEY || '';

const sdkClient = new GraphQLClient({
  endpoint: upstreamEndpoint,
  apiKey: upstreamApiKey,
  securityMode: 'direct',
  headers: {},
});

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refresh_token')?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: 'no refresh token' }, { status: 401 });
  }

  try {
    const login = new LoginService(sdkClient);
    const result = await login.exchangeRefreshToken({ input: { refreshToken } });

    if (!result?.access_token || !result?.refresh_token) {
      return NextResponse.json({ error: 'upstream rejected refresh' }, { status: 401 });
    }

    // result.expires_in is seconds; honor it if shorter than our default cap,
    // otherwise cap to ACCESS_MAX_AGE so we don't outlive a tightened policy.
    const accessTtl =
      typeof result.expires_in === 'number' && result.expires_in > 0
        ? Math.min(result.expires_in, ACCESS_MAX_AGE)
        : ACCESS_MAX_AGE;

    const res = new NextResponse(null, { status: 204 });
    res.cookies.set('access_token', result.access_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: accessTtl,
    });
    res.cookies.set('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_MAX_AGE,
    });
    return res;
  } catch (e) {
    // Upstream errored or token is invalid — surface as 401 so the proxy's
    // retry path treats it as "give up, let the caller redirect to login".
    if (process.env.NODE_ENV !== 'production') {
      console.error('refresh failed:', e instanceof Error ? e.message : e);
    }
    return NextResponse.json({ error: 'refresh failed' }, { status: 401 });
  }
}
