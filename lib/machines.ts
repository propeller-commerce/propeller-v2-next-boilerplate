/**
 * Machine (spare-parts) route helpers, shared by the Server Component shells
 * and the client island.
 *
 * Deliberately runtime-agnostic — no `server-only`, no `next/headers` — for the
 * same reason as `lib/listingParams.ts`: the RSC and the island must agree on
 * sort defaults and URL shape, and the cheapest way to guarantee that is to
 * read them from one module.
 */

import { ProductSortField, SortOrder } from '@propeller-commerce/propeller-sdk-v2';
import type { SparePartsMachine, Contact, Customer } from '@propeller-commerce/propeller-sdk-v2';
import { config } from '@/data/config';

/** Company track attribute holding the contact's installation ids. */
const MY_INSTALLATIONS = 'MY_INSTALLATIONS';

/**
 * Read the contact's installation ids off the company `MY_INSTALLATIONS` track
 * attribute, resolving which company applies the same way the server does
 * (`resolveSelectedCompany`): the switched company (matched by id in the user's
 * companies), else the default. The company must carry hydrated `.attributes`
 * (login / `refreshUser` fetch them with `companyAttributesInput`).
 *
 * The app-side bridge between auth/company context and `<MachineGrid sourceIds>`.
 * Returns `[]` for anonymous visitors and customers (no company).
 */
export function resolveInstallationIds(
  user: Contact | Customer | null | undefined,
  selectedCompanyId: number | undefined
): string[] {
  const contact = user && 'contactId' in user ? (user as Contact) : null;
  if (!contact) return [];
  const company =
    (selectedCompanyId != null &&
      contact.companies?.items?.find((c) => c?.companyId === selectedCompanyId)) ||
    contact.company ||
    null;
  const items = company?.attributes?.items ?? [];
  const match = items.find((i) => i.attributeDescription?.name === MY_INSTALLATIONS);
  return readAttributeStringValues(match?.value);
}

/**
 * Pull a string list off an SDK `AttributeValue`. The value is the concrete
 * typed shape, NOT the `.value` convenience field (that's a TS-only shim the
 * transport doesn't populate): a TEXT attribute carries `textValues[].values`
 * (per language), an ENUM carries `enumValues`. Same read as the CMS
 * `PersonalizedPage`. Cross-language repeats are deduped, order preserved.
 */
export function readAttributeStringValues(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const v = value as {
    textValues?: { values?: unknown[] }[];
    enumValues?: unknown[];
    value?: unknown;
  };
  const out: string[] = [];
  if (Array.isArray(v.textValues)) {
    for (const tv of v.textValues) for (const s of tv?.values ?? []) out.push(String(s));
  }
  if (Array.isArray(v.enumValues)) {
    for (const s of v.enumValues) out.push(String(s));
  }
  // Fallback: a scalar `.value` (possibly comma-joined) if the typed lists are empty.
  if (out.length === 0 && v.value != null) {
    return String(v.value)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [...new Set(out.map((s) => s.trim()).filter(Boolean))];
}

/**
 * The language the machine TREE is authored in — not the storefront language.
 *
 * `machine(slug:, language:)` is language-scoped and hard-errors with
 * "No machine found for slug and language" when the machine has no name/slug in
 * that language. Machine names and slugs are typically maintained in English
 * only, while the spare parts are localized. Resolve tree names/slugs with this;
 * resolve part names with the storefront language.
 */
export const MACHINE_LANGUAGE: string = config.machines?.language || 'EN';

/**
 * Storefront browse depth for the machine tree. The WP reference generates one
 * rewrite rule per level and silently 404s past the last one; we cap explicitly.
 */
export const MACHINE_MAX_DEPTH = 5;

/**
 * Default sort for a machine's spare-parts list. Parts are looked up by name,
 * so alphabetical beats the catalog's relevance/date defaults.
 *
 * These are also the values `updateURL` omits from the query string, so the
 * island imports them rather than repeating literals (the category island's
 * `'CATEGORY_ORDER'` / `'DESC'` literals are duplicated between its `updateURL`
 * and `parseListingParams` call — not repeating that here).
 */
export const MACHINE_SORT_FIELD_DEFAULT = ProductSortField.NAME;
export const MACHINE_SORT_ORDER_DEFAULT = SortOrder.ASC;

/** Resolve a machine's slug for a language, falling back to its first. */
export function getMachineSlug(
  machine: SparePartsMachine,
  language: string
): string {
  return (
    machine.slug?.find((s) => s.language === language)?.value ??
    machine.slug?.[0]?.value ??
    ''
  );
}

/** Resolve a machine's display name for a language, falling back to its first. */
export function getMachineName(
  machine: SparePartsMachine,
  language: string,
  fallback = 'Machine'
): string {
  return (
    machine.name?.find((n) => n.language === language)?.value ??
    machine.name?.[0]?.value ??
    fallback
  );
}

/**
 * Turn a URL slug into a human-ish label for a breadcrumb.
 *
 * Ancestor segments in `/machines/a/b/c` are display-only — the backend is only
 * ever asked about the LAST one (as in the WP reference), so we have no fetched
 * name for the ancestors. Title-casing the slug avoids N extra round-trips just
 * to label a breadcrumb.
 * ponytail: swap for real names if the crumbs ever need to be exact.
 */
export function machineSlugToLabel(slug: string): string {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// The concatenated root query (`buildRootMachinesQuery` / `fetchRootMachinesConcat`)
// now lives in the `useMachines` composable in propeller-v2-react-ui — the app
// passes `source` + the MY_INSTALLATIONS ids to <MachineGrid> and the package
// owns the query. See `MachineGrid` / `useMachines`.
