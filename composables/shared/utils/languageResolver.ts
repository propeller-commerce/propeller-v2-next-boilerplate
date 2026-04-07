/**
 * languageResolver — Resolve localised string/value from SDK objects.
 *
 * Framework-agnostic. Works with any object that has a `language` field
 * and a `value` field (or `uri`, `name`, etc).
 */

export interface LocalizedEntry {
  language?: string;
  value?: string;
  [key: string]: any;
}

/**
 * Finds the best matching entry for a given language, with fallback to the
 * first entry in the array.
 */
export function resolveLanguageEntry<T extends LocalizedEntry>(
  items: T[] | null | undefined,
  language: string,
  fallback?: string
): T | undefined {
  if (!items || items.length === 0) return undefined;
  const lang = language.toUpperCase();
  return items.find((item) => item.language?.toUpperCase() === lang) ?? items[0];
}

/**
 * Resolves a localised string value from an array of LocalizedString objects.
 * Returns the `value` field of the matching entry, or fallback.
 */
export function getLanguageString(
  items: LocalizedEntry[] | null | undefined,
  language: string,
  fallback = ''
): string {
  const entry = resolveLanguageEntry(items, language);
  return entry?.value ?? fallback;
}

/**
 * Resolves a URI from an array of objects with `language` and `uri` fields.
 */
export function getLanguageUri(
  items: (LocalizedEntry & { uri?: string })[] | null | undefined,
  language: string,
  fallback = ''
): string {
  const entry = resolveLanguageEntry(items, language);
  return entry?.uri ?? fallback;
}
