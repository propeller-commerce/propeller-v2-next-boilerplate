import { NextRequest, NextResponse } from 'next/server';

/**
 * Sets the authentication token in an httpOnly cookie.
 *
 * The client obtains the SDK access/refresh tokens during login or
 * registration (via the existing `/api/graphql` proxied SDK call) and then
 * POSTs them here. The tokens are written to httpOnly cookies that JavaScript
 * cannot read — closing the XSS token-theft hole that `localStorage` had — and
 * the client immediately discards its in-memory copy on the next page load.
 *
 * The `/api/graphql` proxy reads `access_token` from this cookie server-side
 * and injects the `Authorization: Bearer` header upstream, so authenticated
 * requests keep working across page reloads without the JWT ever being exposed
 * to client JS.
 */

const isProd = process.env.NODE_ENV === 'production';

// Access token: short-ish lifetime, refreshed on each successful login/register.
const ACCESS_MAX_AGE = 60 * 60 * 8; // 8h
// Refresh token kept longer so a future /api/auth/refresh can mint a new access
// token without forcing re-login.
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30d

export async function POST(request: NextRequest) {
  let body: { accessToken?: string; refreshToken?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { accessToken, refreshToken } = body;
  if (!accessToken || typeof accessToken !== 'string') {
    return NextResponse.json({ error: 'accessToken is required' }, { status: 400 });
  }

  const res = new NextResponse(null, { status: 204 });

  res.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_MAX_AGE,
  });

  if (refreshToken && typeof refreshToken === 'string') {
    res.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_MAX_AGE,
    });
  }

  return res;
}
