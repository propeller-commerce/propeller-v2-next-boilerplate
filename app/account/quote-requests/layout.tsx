import type { Metadata } from 'next';
import { resolveRequestLanguage } from '@/lib/server';
import { getTranslations } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveRequestLanguage();
  const t = getTranslations(language, 'PageTitles');
  const siteName = getTranslations(language, 'Metadata').title || 'Propeller E-commerce';
  // Re-declare the template: a bare title here would become this subtree's
  // own template and strip the suffix from the detail page below it.
  return { title: { default: t.accountQuoteRequests, template: `%s | ${siteName}` } };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
