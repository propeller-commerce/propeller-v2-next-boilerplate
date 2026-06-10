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
// Refresh token kept by /api/auth/refresh; same 30d window as the session here.
const REFRESH_MAX_AGE = 60 * 60 * 24 * 30; // 30d

/**
 * Decode-only JWT payload extractor — does NOT verify the signature. The
 * upstream backend (Google Cloud Identity Platform, RS256) is the signature
 * source of truth, and `/api/graphql` will reject any forged token on the
 * next request. This shape check is here to stop *garbage* from being written
 * to the httpOnly cookie: bare strings, expired tokens, or tokens for a
 * different IdP. Cheap defense-in-depth on a route that previously trusted
 * the client blindly.
 *
 * Returns null on any parse failure or shape mismatch (caller treats as
 * "reject this token"); returns the payload object on success.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    // base64url -> base64 -> JSON
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = Buffer.from(padded, 'base64').toString('utf8');
    const obj = JSON.parse(json);
    if (typeof obj !== 'object' || obj === null) return null;
    return obj as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Validates an accessToken's shape and expiry without verifying the
 * signature. Returns { ok: true } if acceptable to store, otherwise
 * { ok: false, reason } so the caller can return a precise 400.
 */
function validateAccessTokenShape(
  token: string,
): { ok: true } | { ok: false; reason: string } {
  const payload = decodeJwtPayload(token);
  if (!payload) return { ok: false, reason: 'malformed JWT' };

  const exp = payload.exp;
  if (typeof exp !== 'number') return { ok: false, reason: 'missing exp claim' };
  // exp is seconds-since-epoch per RFC 7519.
  if (exp * 1000 <= Date.now()) return { ok: false, reason: 'token already expired' };

  const iss = payload.iss;
  if (typeof iss !== 'string' || iss.length === 0) {
    return { ok: false, reason: 'missing iss claim' };
  }
  // GCIP issuer pattern is https://securetoken.google.com/<project-id>.
  // We don't pin the exact project (env-dependent and not surfaced to this
  // route) but we reject obviously-wrong issuers cheaply.
  if (!/^https?:\/\//.test(iss)) {
    return { ok: false, reason: 'invalid iss claim' };
  }

  return { ok: true };
}

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

  // Defense-in-depth shape check (decode-only, no signature verify — see
  // helper docstring). Stops obvious garbage / expired tokens from being
  // written to the httpOnly cookie. Signature is upstream's job.
  const shape = validateAccessTokenShape(accessToken);
  if (!shape.ok) {
    return NextResponse.json(
      { error: `invalid accessToken: ${shape.reason}` },
      { status: 400 },
    );
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
