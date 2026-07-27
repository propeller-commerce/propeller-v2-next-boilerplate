/**
 * Server-side SpareParts Live (SPL) wiring — the sibling of `lib/msp.ts`.
 *
 * Builds the SPL API client from the boilerplate env contract and a
 * viewer-scoped product resolver (base category + the current viewer's
 * contact/company for pricing), mirroring the WP
 * `PropellerSparepartsHotspotsController`.
 *
 * Used by `app/api/spl/{drawings,drawing}/route.ts`. Server-only — never import
 * from a client component. The SPL token stays here.
 */
import 'server-only';

import {
  createSplClient,
  resolveHotspotProducts,
  type SplClient,
  type SplContactPayload,
} from '@propeller-commerce/propeller-v2-spl/server';
import {
  eventActionConfigService,
  type Product,
  type PriceCalculateProductInput,
} from '@propeller-commerce/propeller-sdk-v2';
import { config } from '@/data/config';
import { createServerClient, type ServerInfra } from '@/lib/server';
import { readAttributeStringValues } from '@/lib/machines';

/** SPL is active only when a base URL + token are configured. */
export function isSplEnabled(): boolean {
  return !!(process.env.SPL_TOKEN || '').trim() && !!(process.env.SPL_BASE_URL || '').trim();
}

/** The product track-attribute whose value is the SPL publication id. */
export function splProductAttribute(): string {
  return (process.env.SPL_PRODUCT_ATTRIBUTE || '').trim();
}

/**
 * Read the SPL publication id off a product's track attribute (gates the panel).
 * Requires the product to have been fetched WITH that attribute name — see
 * `fetchProduct(..., attributeNames)`. Returns `null` when absent/empty.
 */
export function resolveSplPublicationId(product: Product): string | null {
  const attr = splProductAttribute();
  if (!attr) return null;
  const items =
    (product as unknown as {
      attributes?: { items?: Array<{ attributeDescription?: { name?: string }; value?: unknown }> };
    }).attributes?.items ?? [];
  const match = items.find((i) => i.attributeDescription?.name === attr);
  return readAttributeStringValues(match?.value)[0] ?? null;
}

/** Fresh SPL client (a thin fetch wrapper — cheap to build per request). */
export function getSplClient(): SplClient {
  return createSplClient({
    baseUrl: (process.env.SPL_BASE_URL || '').trim(),
    token: (process.env.SPL_TOKEN || '').trim(),
  });
}

/**
 * A product resolver bound to the current viewer — parts are looked up under
 * `BOILERPLATE_BASE_CATEGORY_ID` and priced for the viewer's contact/company,
 * exactly like the storefront's own listing fetch (`lib/server.ts`).
 */
export function buildSplProductResolver(
  infra: ServerInfra
): (skus: string[]) => Promise<Map<string, Product>> {
  const user = infra.user;
  const price: PriceCalculateProductInput = { taxZone: config.taxZone };
  if (user && 'contactId' in user) price.contactId = user.contactId;
  else if (user && 'customerId' in user) price.customerId = user.customerId;

  const companyId =
    infra.selectedCompanyId ??
    (user && 'contactId' in user ? user.company?.companyId : undefined);
  if (companyId != null) price.companyId = companyId;

  const baseCategoryId = Number(process.env.BOILERPLATE_BASE_CATEGORY_ID) || 0;

  return (skus: string[]) =>
    resolveHotspotProducts({
      client: infra.client,
      baseCategoryId,
      language: infra.language,
      skus,
      imageSearchFilters: config.imageSearchFilters,
      imageVariantFilters: config.imageVariantFiltersSmall,
      priceCalculateProductInput: price,
    });
}

/** Recipient of the "Information request" email. */
export function splContactEmail(): string {
  return (process.env.NEXT_PUBLIC_SPL_CONTACT_EMAIL || '').trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function contactHtml(p: SplContactPayload): string {
  const f = p.form;
  const fullName = [f.firstName, f.middleName, f.lastName].filter(Boolean).join(' ');
  const machine = p.hostProduct?.name
    ? `${p.hostProduct.name}${p.hostProduct.sku ? ` (${p.hostProduct.sku})` : ''}`
    : undefined;
  const rows: Array<[string, string | undefined]> = [
    ['Part', `${p.part.name} (${p.part.sku})`],
    ['Position', p.part.pos],
    ['Drawing', p.breadcrumb?.length ? p.breadcrumb.join(' » ') : undefined],
    ['Machine / product', machine],
    ['Company', f.company],
    ['Name', fullName],
    ['E-mail', f.email],
    ['Phone', f.phone],
    ['Remarks', f.remarks],
  ];
  const body = rows
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;vertical-align:top">${escapeHtml(
          k
        )}</td><td style="padding:4px 0">${escapeHtml(v as string)}</td></tr>`
    )
    .join('');
  return `<div style="font-family:Arial,sans-serif;font-size:14px"><h2>Spare part information request</h2><table>${body}</table></div>`;
}

/**
 * Send the "Information request" email via the Propeller backend's mail
 * (`publishEmailSendEvent`) — no SMTP setup, any recipient. Sends to the
 * configured SPL contact email. Anonymous apikey client (no viewer needed).
 *
 * @throws when the contact email isn't configured, or the backend rejects the send.
 */
export async function sendSplContactEmail(payload: SplContactPayload): Promise<void> {
  const to = splContactEmail();
  if (!to) throw new Error('SPL contact email not configured');
  const client = createServerClient({ getAccessToken: () => undefined });
  await eventActionConfigService(client).publishEmailSendEvent({
    subject: `Spare part information request: ${payload.part.name} (${payload.part.sku})`,
    content: contactHtml(payload),
    from: { email: to, name: payload.form.company || 'SpareParts Live' },
    to: [{ email: to }],
  });
}
