import type { Metadata } from 'next';
import { resolveRequestLanguage } from '@/lib/server';
import { getTranslations } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveRequestLanguage();
  const t = getTranslations(language, 'PageTitles');
  return { title: t.accountFavorites };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
