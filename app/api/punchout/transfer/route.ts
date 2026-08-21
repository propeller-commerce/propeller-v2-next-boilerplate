/**
 * PunchOut cart transfer.
 *
 * Posted from the cart page (with the cart id) once the buyer is done. Reads
 * the authoritative cart with the logged-in user's bearer (the magic-login
 * `access_token` cookie), builds the OCI NEW_ITEM field set or the cXML
 * PunchOutOrderMessage per the punchout session, deletes the shop cart, and
 * returns a self-submitting form that POSTs the payload back to the ERP.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { CartService } from '@propeller-commerce/propeller-sdk-v2';
import {
  buildOciFields,
  buildOrderCxml,
  buildAutoPostForm,
  buildDebugPage,
  type PunchoutContext,
  type PunchoutCart,
} from '@propeller-commerce/propeller-v2-punchout';
import { createServerClient } from '@/lib/server';
import { config } from '@/data/config';
import {
  PUNCHOUT_COOKIE,
  PUNCHOUT_FLAG_COOKIE,
  punchoutCurrency,
  ociMapping,
  cxmlMapping,
  isPunchoutDebug,
  type PunchoutSession,
} from '@/lib/punchout';

export async function POST(request: NextRequest) {
  const store = await cookies();
  const rawSession = store.get(PUNCHOUT_COOKIE)?.value;
  if (!rawSession) return new NextResponse('No punchout session', { status: 400 });

  let session: PunchoutSession;
  try {
    session = JSON.parse(rawSession);
  } catch {
    return new NextResponse('Bad punchout session', { status: 400 });
  }
  if (!session.returnUrl) return new NextResponse('No return URL', { status: 400 });

  const form = await request.formData();
  const cartId = String(form.get('cartId') || '');
  if (!cartId) return new NextResponse('Missing cartId', { status: 400 });

  const bearer = store.get('access_token')?.value;
  const client = createServerClient({ bearerToken: bearer });
  const cartService = new CartService(client);

  let cart: PunchoutCart;
  try {
    cart = (await cartService.getCart({
      cartId,
      language: config.language,
      imageSearchFilters: config.imageSearchFiltersGrid,
      imageVariantFilters: config.imageVariantFiltersSmall,
    })) as unknown as PunchoutCart;
  } catch {
    return new NextResponse('Could not load cart', { status: 502 });
  }

  const ctx: PunchoutContext = {
    language: config.language,
    currency: punchoutCurrency(),
    session: session.session,
    buyerCookie: session.buyerCookie,
    from: session.from,
    to: session.to,
    deploymentMode: session.deploymentMode,
  };

  const debug = isPunchoutDebug();
  let html: string;
  if (session.mode === 'cxml') {
    const orderXml = buildOrderCxml(cart, ctx, cxmlMapping());
    html = debug
      ? buildDebugPage({ mode: 'cxml', returnUrl: session.returnUrl, xml: orderXml, target: session.target })
      : buildAutoPostForm(session.returnUrl, { 'cxml-urlencoded': orderXml }, {
          target: session.target,
          submitLabel: 'Transfer cart to procurement',
        });
  } else {
    const fields = buildOciFields(cart, ctx, ociMapping());
    html = debug
      ? buildDebugPage({ mode: 'oci', returnUrl: session.returnUrl, fields, target: session.target })
      : buildAutoPostForm(session.returnUrl, fields, {
          target: session.target,
          submitLabel: 'Transfer cart to procurement',
        });
  }

  const res = new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });

  // In debug mode keep the cart + session so the preview is re-runnable. In a
  // real transfer, delete the shop cart (items live in the ERP now) and clear
  // the punchout cookies.
  if (!debug) {
    try {
      await cartService.deleteCart({ id: cartId });
    } catch {
      /* non-fatal: the ERP already has the payload */
    }
    res.cookies.set(PUNCHOUT_COOKIE, '', { path: '/', maxAge: 0 });
    res.cookies.set(PUNCHOUT_FLAG_COOKIE, '', { path: '/', maxAge: 0 });
  }
  return res;
}
