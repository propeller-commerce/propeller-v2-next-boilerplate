/**
 * PunchOut entry — the URL the ERP opens (OCI) or the cXML StartPage points at.
 *
 * Captures the punchout session (return address + OCI params / cXML echo
 * credentials) into a signed, short-lived *pending* cookie bound to the magic
 * token, then redirects into the existing magic-login flow. Nothing is active
 * yet: the GraphQL proxy promotes the pending entry to the signed `punchout`
 * cookie (and the readable `punchout_active` flag) only when magic-login
 * exchanges that same token successfully (lib/punchout-session/session.ts). A
 * link with a made-up token or someone else's HOOK_URL therefore never changes
 * the visitor's cart page.
 *
 * OCI: HOOK_URL comes from the query, as the protocol has it; it must be https
 * and, when PUNCHOUT_HOOK_HOSTS is set, on one of those hosts. cXML: the
 * BrowserFormPost and echo credentials come from the signed `cxml` parameter
 * that the shared-secret-authenticated setup put into the StartPage URL, never
 * from plain query parameters.
 */

import { NextRequest, NextResponse } from 'next/server';
import { mapOciParams } from '@propeller-commerce/propeller-v2-punchout';
import { isPunchoutEnabled, punchoutTarget } from '@/lib/punchout';
import {
  isAllowedHookUrl,
  setPendingCookie,
  signPending,
  verifyCxmlStart,
  type PunchoutSession,
} from '@/lib/punchout-session/session';
import { localPath } from '@/lib/http/localPath';

export async function GET(request: NextRequest) {
  if (!isPunchoutEnabled()) return new NextResponse('PunchOut disabled', { status: 404 });

  const url = new URL(request.url);
  const q = Object.fromEntries(url.searchParams.entries());
  const mtoken = q.mtoken || '';
  if (!mtoken) return new NextResponse('Missing mtoken', { status: 400 });

  let session: PunchoutSession;
  if (q.mode === 'cxml') {
    const start = verifyCxmlStart(q.cxml, mtoken);
    if (!start) return new NextResponse('Invalid cXML punchout session', { status: 400 });
    session = {
      mode: 'cxml',
      returnUrl: start.returnUrl,
      target: punchoutTarget(),
      session: {},
      buyerCookie: start.buyerCookie,
      from: start.from,
      to: start.to,
      deploymentMode: start.deploymentMode || 'test',
    };
  } else {
    const returnUrl = q.HOOK_URL || q.hook_url || q.returnUrl || '';
    if (!isAllowedHookUrl(returnUrl)) return new NextResponse('HOOK_URL is not an allowed https address', { status: 400 });
    session = { mode: 'oci', returnUrl, target: punchoutTarget(), session: mapOciParams(q) };
  }

  const pending = signPending(mtoken, session);
  if (!pending) return new NextResponse('PunchOut needs COOKIE_SIGNING_SECRET', { status: 503 });

  const magicUrl = new URL('/magic-login', url.origin);
  magicUrl.searchParams.set('mtoken', mtoken);
  magicUrl.searchParams.set('redirect', localPath(q.redirect) || '/cart');

  const res = NextResponse.redirect(magicUrl);
  setPendingCookie(res, pending);
  return res;
}
