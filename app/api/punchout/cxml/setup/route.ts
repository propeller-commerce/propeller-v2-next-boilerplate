/**
 * cXML PunchOutSetupRequest endpoint.
 *
 * The buyer's procurement system (Ariba/Coupa) POSTs a PunchOutSetupRequest.
 * We validate the shared secret, mint a reusable magic token for the buyer
 * contact (admin key), and reply with a PunchOutSetupResponse whose StartPage
 * URL is our `/api/punchout/enter` link. Everything after that is the shared
 * enter → magic-login → cart flow.
 *
 * The BrowserFormPost URL (must be https, and on PUNCHOUT_HOOK_HOSTS when set)
 * and the echo credentials travel to `enter` in one signed `cxml` parameter
 * bound to the minted token, so nobody can swap the return address on the way.
 * Server-to-server: no same-origin rule here.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  parseSetupRequest,
  buildSetupResponse,
  buildErrorResponse,
  buildStartUrl,
} from '@propeller-commerce/propeller-v2-punchout';
import {
  isPunchoutEnabled,
  resolveCxmlBuyer,
  createPunchoutMagicToken,
} from '@/lib/punchout';
import { isAllowedHookUrl, signCxmlStart } from '@/lib/punchout-session/session';

function xml(body: string, status: number) {
  return new NextResponse(body, {
    status,
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}

export async function POST(request: NextRequest) {
  if (!isPunchoutEnabled()) return xml(buildErrorResponse(403, 'PunchOut disabled'), 403);

  const raw = await request.text();
  let parsed;
  try {
    parsed = parseSetupRequest(raw);
  } catch {
    return xml(buildErrorResponse(400, 'Malformed cXML'), 400);
  }

  const buyer = await resolveCxmlBuyer(parsed.sharedSecret || '');
  if (!buyer) {
    return xml(buildErrorResponse(401, 'Invalid credentials'), 401);
  }

  // Checked after the credentials, before a token is minted: a refused setup costs nothing.
  if (!isAllowedHookUrl(parsed.browserFormPostUrl)) {
    return xml(buildErrorResponse(400, 'BrowserFormPost URL not allowed'), 400);
  }

  let mtoken: string;
  try {
    mtoken = await createPunchoutMagicToken(buyer.contactId);
  } catch {
    return xml(buildErrorResponse(500, 'Could not start punchout session'), 500);
  }

  const origin = new URL(request.url).origin;
  const cxml = signCxmlStart(mtoken, {
    returnUrl: parsed.browserFormPostUrl,
    buyerCookie: parsed.buyerCookie,
    from: parsed.fromIdentity,
    to: parsed.toIdentity,
    deploymentMode: parsed.deploymentMode,
  });
  if (!cxml) return xml(buildErrorResponse(500, 'Could not start punchout session'), 500);
  const startUrl = buildStartUrl(`${origin}/api/punchout/enter`, { mode: 'cxml', mtoken, redirect: '/cart', cxml });

  return xml(buildSetupResponse({ startUrl }), 200);
}
