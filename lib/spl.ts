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
} from '@propeller-commerce/propeller-v2-spl/server';
import type { Product, PriceCalculateProductInput } from '@propeller-commerce/propeller-sdk-v2';
import { config } from '@/data/config';
import type { ServerInfra } from '@/lib/server';
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
