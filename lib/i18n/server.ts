import { getTranslationProvider } from './index';

/**
 * Read a namespace's translated strings for a given locale.
 * Safe to call from Server Components. Sync — the file provider has no I/O at runtime.
 *
 * Pass the locale from your existing language source (typically the `preferred_language`
 * cookie set by proxy.ts). Casing is normalised internally — passing 'NL' or 'nl' both work.
 *
 * Returns an empty object if the locale or namespace is unknown; downstream components
 * fall back to their English defaults via getLabel(labels, key, fallback).
 */
export function getTranslations(
  locale: string,
  namespace: string,
): Record<string, string> {
  return getTranslationProvider().getNamespace(locale, namespace);
}
