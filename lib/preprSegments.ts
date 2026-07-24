import type { Contact, Company } from '@propeller-commerce/propeller-sdk-v2';

/** Convert a display name to a Prepr segment slug: "Premium customers" → "premium-customers". */
export function toSegmentSlug(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/**
 * Derive the Prepr personalization segments for a logged-in user from their
 * active company's SYSTEM_USER_GROUPS attribute (e.g. "Premium customers" →
 * ["premium-customers"]). Returns [] for guests or companies without the group.
 */
export function getUserSegments(user: any, selectedCompany: Company | null): string[] {
  if (!user || !('contactId' in user)) return [];

  const company = selectedCompany || (user as Contact).company;
  if (!company) return [];

  const attrs = company.attributes?.items || (company as any)._attributes?.items || [];

  for (const attr of attrs) {
    const name = attr.attributeDescription?.name || attr.attributeDescription?._name;
    if (name === 'SYSTEM_USER_GROUPS') {
      const val = attr.value;
      if (!val) return [];
      let raw: string[] = [];
      // ENUM type: value is in enumValues array
      if (val.enumValues && Array.isArray(val.enumValues)) {
        raw = val.enumValues.map(String).filter(Boolean);
      }
      // TEXT type: value might be in textValues
      else if (val.textValues && Array.isArray(val.textValues)) {
        raw = val.textValues.flatMap((tv: any) => tv.values || []).filter(Boolean);
      }
      // Fallback: direct value
      else if (val.value) {
        if (typeof val.value === 'string') raw = val.value.split(',').map((s: string) => s.trim()).filter(Boolean);
        else if (Array.isArray(val.value)) raw = val.value.map(String).filter(Boolean);
        else raw = [String(val.value)];
      }
      return raw.map(toSegmentSlug).filter(Boolean);
    }
  }
  return [];
}
