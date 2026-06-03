import { createFileProvider } from './providers/file';
import type { TranslationProvider } from 'propeller-v2-react-ui';

let _provider: TranslationProvider | null = null;

export function getTranslationProvider(): TranslationProvider {
  if (_provider) return _provider;
  const which = process.env.TRANSLATIONS_PROVIDER ?? 'file';
  switch (which) {
    case 'file':
    default:
      _provider = createFileProvider();
  }
  return _provider;
}
