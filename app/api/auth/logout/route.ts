import { NextResponse } from 'next/server';
import { isSameOrigin } from '@/lib/http/sameOrigin';
import { clearSessionCookies, KEEP_PUNCHOUT_PENDING } from '@/lib/auth/logout';

/**
 * Clears the authentication cookies set by `/api/auth/session`, and with them
 * what the session left behind: the last-order and registration cookies and the
 * punchout session (lib/auth/logout.ts).
 * Called by the client on logout (and on session expiry).
 */

export async function POST(request: Request) {
  // Another site can't log the visitor out.
  if (!isSameOrigin(request, process.env.NEXT_PUBLIC_SITE_URL)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  const res = new NextResponse(null, { status: 204 });

  // The pending punchout entry stays only for magic-login's logout right before
  // it exchanges the token that entry is bound to.
  const keep = new URL(request.url).searchParams.get('keep');
  clearSessionCookies(res, { keepPunchoutPending: keep === KEEP_PUNCHOUT_PENDING });

  return res;
}
