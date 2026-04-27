export interface Country {
  code: string;
  name: string;
}

export const COUNTRIES: Country[] = [
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
];

/**
 * Resolve an ISO country code to a display name.
 * @param code   The country code (e.g. 'NL').
 * @param list   Optional caller-supplied list (e.g. a localized list).
 *               Falls back to the built-in COUNTRIES when omitted/empty.
 */
export function getCountryName(
  code: string | null | undefined,
  list?: Country[] | null,
): string {
  if (!code) return '';
  const effective = list && list.length > 0 ? list : COUNTRIES;
  const match = effective.find((c) => c.code === code);
  return match?.name ?? code;
}
