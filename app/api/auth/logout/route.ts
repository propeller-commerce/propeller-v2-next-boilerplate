import { NextResponse } from 'next/server';

/**
 * Clears the authentication cookies set by `/api/auth/session`.
 * Called by the client on logout (and on session expiry).
 */

const isProd = process.env.NODE_ENV === 'production';

export async function POST() {
  const res = new NextResponse(null, { status: 204 });

  // Expire both cookies (maxAge 0). Path/secure/sameSite must match the
  // attributes used when setting them or the browser won't clear them.
  for (const name of ['access_token', 'refresh_token']) {
    res.cookies.set(name, '', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });
  }

  return res;
}
