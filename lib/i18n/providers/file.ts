import { registry, CANONICAL_LOCALE } from '@/locales/_registry';
import type { TranslationProvider } from '@propeller-commerce/propeller-v2-react-ui';

export function createFileProvider(): TranslationProvider {
  return {
    getNamespace(locale, namespace) {
      const all = registry as Record<string, Record<string, Record<string, string>>>;
      const canonical = all[CANONICAL_LOCALE] ?? {};
      // A locale with no dictionary of its own reads the canonical one rather
      // than {}: an empty namespace renders every label as an empty string, so
      // a shop whose default locale ships no translations came up blank
      // (PWP-978) with nothing pointing at i18n as the cause.
      const langRegistry = all[locale.toLowerCase()] ?? canonical;
      return langRegistry[namespace] ?? canonical[namespace] ?? {};
    },
  };
}
