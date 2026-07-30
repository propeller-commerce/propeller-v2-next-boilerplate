/**
 * cXML PunchOutSetupRequest endpoint.
 *
 * The buyer's procurement system (Ariba/Coupa) POSTs a PunchOutSetupRequest.
 * We validate the shared secret, mint a reusable magic token for the buyer
 * contact (admin key), and reply with a PunchOutSetupResponse whose StartPage
 * URL is our `/api/punchout/enter` link. Everything after that is the shared
 * enter → magic-login → cart flow.
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

  let mtoken: string;
  try {
    mtoken = await createPunchoutMagicToken(buyer.contactId);
  } catch {
    return xml(buildErrorResponse(500, 'Could not start punchout session'), 500);
  }

  const origin = new URL(request.url).origin;
  const startUrl = buildStartUrl(`${origin}/api/punchout/enter`, {
    mode: 'cxml',
    mtoken,
    redirect: '/cart',
    HOOK_URL: parsed.browserFormPostUrl,
    buyer_cookie: parsed.buyerCookie,
    cxml_from: parsed.fromIdentity,
    cxml_to: parsed.toIdentity,
    deployment_mode: parsed.deploymentMode,
  });

  return xml(buildSetupResponse({ startUrl }), 200);
}
