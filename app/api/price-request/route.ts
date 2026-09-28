import { getMailProvider } from '@/lib/mail';
import {
  detailRow,
  escapeHtml,
  productTable,
  renderEmail,
  sectionHeading,
} from '@/lib/mail/template';
import { getTranslations } from '@/lib/i18n/server';

/**
 * Price-request submission.
 *
 * Sends twice: the shop gets the request with the shopper as reply-to, and the
 * shopper gets a confirmation. A failed confirmation does not fail the request
 * — the shop already has it — but it is logged.
 *
 * Both mails are translated. The shopper's copy uses the language they were
 * browsing in (sent in the payload); the shop's uses the shop default, so the
 * team always reads one language whoever the shopper is.
 */

interface RequestItem {
  code?: string;
  name?: string;
  quantity?: number;
}

interface Payload {
  items?: RequestItem[];
  comment?: string;
  /** The signed-in shopper. The list is only offered to authenticated users. */
  email?: string;
  name?: string;
  company?: string;
  phone?: string;
  /** The shopper's active language, for their confirmation copy. */
  language?: string;
}

/** Cap on products per request — a bound on a public endpoint. */
const MAX_ITEMS = 100;
const MAX_COMMENT = 2000;

const SHOP_LANGUAGE =
  process.env.BOILERPLATE_DEFAULT_LANGUAGE || process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL';

const isEmail = (s: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** Namespace lookup with an English fallback, as getLabel does client-side. */
function labeller(dict: Record<string, string>) {
  return (key: string, fallback: string): string => dict[key] || fallback;
}

function readItems(raw: unknown): RequestItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i): i is RequestItem => !!i && typeof i === 'object')
    .map((i) => ({
      code: String(i.code || '').trim().slice(0, 100),
      name: String(i.name || '').trim().slice(0, 300),
      quantity: Math.max(1, parseInt(String(i.quantity), 10) || 1),
    }))
    .filter((i) => i.code || i.name)
    .slice(0, MAX_ITEMS);
}

export async function POST(req: Request) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const items = readItems(body.items);
  const comment = String(body.comment || '').trim().slice(0, MAX_COMMENT);
  const email = String(body.email || '').trim();
  const name = String(body.name || '').trim().slice(0, 200);
  const company = String(body.company || '').trim().slice(0, 200);
  const phone = String(body.phone || '').trim().slice(0, 50);
  const shopperLanguage = String(body.language || SHOP_LANGUAGE).slice(0, 10);

  if (!items.length) {
    return Response.json({ error: 'At least one product is required' }, { status: 400 });
  }
  if (!email || !isEmail(email)) {
    return Response.json({ error: 'A valid email is required' }, { status: 400 });
  }

  const to = (process.env.PRICE_REQUEST_TO_EMAIL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!to.length) {
    console.error('[api/price-request] PRICE_REQUEST_TO_EMAIL is not configured');
    return Response.json({ error: 'Recipient not configured' }, { status: 500 });
  }

  const shop = labeller(getTranslations(SHOP_LANGUAGE, 'PriceRequest'));
  const shopper = labeller(getTranslations(shopperLanguage, 'PriceRequest'));

  const mail = getMailProvider();
  const count = items.length;

  // ── The shop's copy ───────────────────────────────────────────────────────
  const shopHeadings = {
    code: shop('emailColCode', 'Article no. / SKU'),
    name: shop('emailColName', 'Product'),
    quantity: shop('emailColQuantity', 'Qty'),
  };
  const shopTable = productTable(items, shopHeadings);
  const productsHeading =
    count === 1 ? shop('emailProduct', 'Product') : `${shop('emailProducts', 'Products')} (${count})`;

  const subject = `${shop('emailSubjectShop', 'Price request')} - ${
    count === 1 ? items[0].name || items[0].code : `${count} ${shop('emailProducts', 'Products').toLowerCase()}`
  }`;

  const text = [
    `${shop('emailName', 'Name')}: ${name || shop('emailNotGiven', '(not given)')}`,
    `${shop('emailEmail', 'Email')}: ${email}`,
    company ? `${shop('emailCompany', 'Company')}: ${company}` : null,
    phone ? `${shop('emailPhone', 'Phone')}: ${phone}` : null,
    '',
    `${shop('emailProducts', 'Products')} (${count}):`,
    ...items.map((i) => `  ${i.code || '-'}  ${i.name || '-'}  x${i.quantity}`),
    '',
    `${shop('comments', 'Comments')}:`,
    comment || shop('emailNone', '(none)'),
  ].filter((l) => l !== null) as string[];

  try {
    await mail.send({
      to,
      replyTo: email,
      subject,
      text: text.join('\n'),
      html: renderEmail({
        title: shop('emailTitleShop', 'New price request'),
        body: [
          sectionHeading(shop('emailContactDetails', 'Contact details')),
          detailRow(shop('emailName', 'Name'), escapeHtml(name || shop('emailNotGiven', '(not given)'))),
          detailRow(
            shop('emailEmail', 'Email'),
            `<a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>`
          ),
          company ? detailRow(shop('emailCompany', 'Company'), escapeHtml(company)) : '',
          phone ? detailRow(shop('emailPhone', 'Phone'), escapeHtml(phone)) : '',
          sectionHeading(productsHeading),
          shopTable,
          sectionHeading(shop('comments', 'Comments')),
          `<p style="margin:0;font-size:15px;line-height:22px;color:#333333;white-space:pre-wrap">${escapeHtml(
            comment || shop('emailNone', '(none)')
          )}</p>`,
        ].join(''),
      }),
    });
  } catch (e) {
    console.error('[api/price-request] send to shop failed:', e);
    return Response.json({ error: 'Failed to send the request' }, { status: 502 });
  }

  // ── The shopper's confirmation, in their own language ─────────────────────
  const shopperTable = productTable(items, {
    code: shopper('emailColCode', 'Article no. / SKU'),
    name: shopper('emailColName', 'Product'),
    quantity: shopper('emailColQuantity', 'Qty'),
  });
  const greeting = name
    ? shopper('emailGreeting', 'Dear {name},').replace('{name}', name)
    : shopper('emailGreetingNoName', 'Hello,');
  const shopperProducts =
    count === 1
      ? shopper('emailProduct', 'Product')
      : `${shopper('emailProducts', 'Products')} (${count})`;


  try {
    await mail.send({
      to: [email],
      subject: shopper('emailSubjectShopper', 'We received your price request'),
      text: [
        greeting,
        '',
        shopper('emailIntro', 'Thank you for your price request. We will contact you shortly.'),
        '',
        `${shopper('emailProducts', 'Products')} (${count}):`,
        ...items.map((i) => `  ${i.code || '-'}  ${i.name || '-'}  x${i.quantity}`),
        comment ? `\n${shopper('emailYourComments', 'Your comments')}:\n${comment}` : '',
      ].join('\n'),
      html: renderEmail({
        title: shopper('emailTitleShopper', 'We received your price request'),
        body: [
          `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:#333333">${escapeHtml(greeting)}</p>`,
          `<p style="margin:0 0 8px;font-size:15px;line-height:22px;color:#333333">${escapeHtml(
            shopper('emailIntro', 'Thank you for your price request. We will contact you shortly.')
          )}</p>`,
          sectionHeading(shopperProducts),
          shopperTable,
          comment
            ? sectionHeading(shopper('emailYourComments', 'Your comments')) +
              `<p style="margin:0;font-size:15px;line-height:22px;color:#333333;white-space:pre-wrap">${escapeHtml(comment)}</p>`
            : '',
        ].join(''),
      }),
    });
  } catch (e) {
    console.error('[api/price-request] confirmation to shopper failed:', e);
  }

  return Response.json({ ok: true });
}
