import type { Metadata } from 'next';
import { resolveRequestLanguage } from '@/lib/server';
import { getTranslations } from '@/lib/i18n/server';
import AccountShell from './AccountShell';

// Server layout so /account gets its own title; the auth guard and chrome stay
// in the client shell. Sub-routes keep their own layouts and override this.
export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveRequestLanguage();
  const t = getTranslations(language, 'PageTitles');
  const siteName = getTranslations(language, 'Metadata').title || 'Propeller E-commerce';
  // `default` + `template`, not a bare string: a plain title here would become
  // the subtree's template and strip the site suffix from every sub-route.
  // `default` stays bare — the root template appends the site name, so
  // including it here would print it twice.
  return { title: { default: t.account, template: `%s | ${siteName}` } };
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
