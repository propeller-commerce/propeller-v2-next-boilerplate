import { registry } from '@/locales/_registry';
import type { TranslationProvider } from '@propeller-commerce/propeller-v2-react-ui';

export function createFileProvider(): TranslationProvider {
  return {
    getNamespace(locale, namespace) {
      const localeKey = locale.toLowerCase();
      const langRegistry = (registry as Record<string, Record<string, Record<string, string>>>)[localeKey];
      if (!langRegistry) return {};
      return langRegistry[namespace] ?? {};
    },
  };
}
