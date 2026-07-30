/**
 * PunchOut entry — the URL the ERP opens (OCI) or the cXML StartPage points at.
 *
 * Captures the punchout session (return address + OCI params / cXML echo
 * credentials) into an httpOnly cookie, drops a readable flag cookie so the
 * cart page can show the transfer button, then redirects into the existing
 * magic-login flow. The `punchout` cookie is separate from the auth cookies, so
 * it survives magic-login's session clear.
 */

import { NextRequest, NextResponse } from 'next/server';
import { mapOciParams } from '@propeller-commerce/propeller-v2-punchout';
import {
  isPunchoutEnabled,
  punchoutTarget,
  PUNCHOUT_COOKIE,
  PUNCHOUT_FLAG_COOKIE,
  type PunchoutSession,
} from '@/lib/punchout';

const isProd = process.env.NODE_ENV === 'production';
const MAX_AGE = 60 * 60; // 1h punchout session

export async function GET(request: NextRequest) {
  if (!isPunchoutEnabled()) return new NextResponse('PunchOut disabled', { status: 404 });

  const url = new URL(request.url);
  const q = Object.fromEntries(url.searchParams.entries());
  const mtoken = q.mtoken || '';
  if (!mtoken) return new NextResponse('Missing mtoken', { status: 400 });

  const mode = q.mode === 'cxml' ? 'cxml' : 'oci';
  const returnUrl = q.HOOK_URL || q.hook_url || q.returnUrl || '';

  const session: PunchoutSession =
    mode === 'oci'
      ? { mode, returnUrl, target: punchoutTarget(), session: mapOciParams(q) }
      : {
          mode,
          returnUrl,
          target: punchoutTarget(),
          session: {},
          buyerCookie: q.buyer_cookie,
          from: q.cxml_from,
          to: q.cxml_to,
          deploymentMode: q.deployment_mode || 'test',
        };

  const redirect = q.redirect || '/cart';
  const magicUrl = new URL('/magic-login', url.origin);
  magicUrl.searchParams.set('mtoken', mtoken);
  magicUrl.searchParams.set('redirect', redirect);

  const res = NextResponse.redirect(magicUrl);
  res.cookies.set(PUNCHOUT_COOKIE, JSON.stringify(session), {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
  res.cookies.set(PUNCHOUT_FLAG_COOKIE, mode, {
    httpOnly: false,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
  return res;
}
