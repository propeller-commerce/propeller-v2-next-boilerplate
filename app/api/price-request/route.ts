import { NextResponse, type NextRequest } from 'next/server';
import { getMailProvider } from '@/lib/mail';
import { getTranslations } from '@/lib/i18n/server';
import { formProtection } from '@/lib/form-protection';
import { handlePriceRequest } from '@/lib/price-request/handler';
import { getVerifiedViewer } from '@/lib/auth/viewer';
import { isSameOriginJson } from '@/lib/http/sameOrigin';

// Price-request submission; logic and tests live in lib/price-request/handler.ts.
// Login-only, like the /price-request page: the request needs a contact to answer,
// and the shopper's confirmation goes to the address in the body.
export async function POST(req: NextRequest) {
  if (!isSameOriginJson(req, process.env.NEXT_PUBLIC_SITE_URL)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!(await getVerifiedViewer(req.cookies.get('access_token')?.value))) {
    return NextResponse.json({ error: 'login required' }, { status: 401 });
  }
  return handlePriceRequest(req, {
    send: (message) => getMailProvider().send(message),
    recipients: process.env.PRICE_REQUEST_TO_EMAIL,
    shopLanguage:
      process.env.BOILERPLATE_DEFAULT_LANGUAGE || process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
    translate: getTranslations,
    protection: formProtection(),
  });
}
