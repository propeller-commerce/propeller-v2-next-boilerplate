import Link from 'next/link';
import HeaderServer from '@/components/layout/HeaderServer';
import Footer from '@/components/layout/Footer';
import { localizeHref } from '@/data/config';
import { getTranslations } from '@/lib/i18n/server';
import { resolveRequestLanguage } from '@/lib/server';

export default async function NotFound() {
  // Prefixed URL wins (via the proxy's header), else the stored preference.
  const locale = await resolveRequestLanguage();
  const t = getTranslations(locale, 'NotFound');

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderServer />
      <main className="flex-1 container mx-auto px-4 py-8 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-600 mb-4">{t.title}</h2>
          <p className="text-gray-500 mb-8">
            {t.message}
          </p>
          <Link
            href={localizeHref('/')}
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition"
          >
            {t.goHome}
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
