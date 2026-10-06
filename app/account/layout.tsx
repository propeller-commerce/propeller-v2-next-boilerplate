import type { Metadata } from 'next';
import { resolveRequestLanguage } from '@/lib/server';
import { getTranslations } from '@/lib/i18n/server';
import AccountShell from './AccountShell';

// Server layout so /account gets its own title; the auth guard and chrome stay
// in the client shell. Sub-routes keep their own layouts and override this.
export async function generateMetadata(): Promise<Metadata> {
  const language = await resolveRequestLanguage();
  const t = getTranslations(language, 'PageTitles');
  return { title: t.account };
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell>{children}</AccountShell>;
}
