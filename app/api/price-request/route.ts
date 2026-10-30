import { getMailProvider } from '@/lib/mail';
import { getTranslations } from '@/lib/i18n/server';
import { formProtection } from '@/lib/form-protection';
import { handlePriceRequest } from '@/lib/price-request/handler';

// Price-request submission; logic and tests live in lib/price-request/handler.ts.
export async function POST(req: Request) {
  return handlePriceRequest(req, {
    send: (message) => getMailProvider().send(message),
    recipients: process.env.PRICE_REQUEST_TO_EMAIL,
    shopLanguage:
      process.env.BOILERPLATE_DEFAULT_LANGUAGE || process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
    translate: getTranslations,
    protection: formProtection(),
  });
}
