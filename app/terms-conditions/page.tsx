import { cookies, headers } from 'next/headers';
import HeaderServer from '@/components/layout/HeaderServer';
import Footer from '@/components/layout/Footer';
import { getTranslations } from '@/lib/i18n/server';

export default async function TermsConditionsPage() {
  const [store, hdrs] = await Promise.all([cookies(), headers()]);
  // Prefixed URL wins (via the proxy's header), else the stored preference.
  const locale =
    hdrs.get('x-cms-locale') ||
    store.get('preferred_language')?.value ||
    process.env.BOILERPLATE_DEFAULT_LANGUAGE ||
    'NL';
  const t = getTranslations(locale, 'StaticPages');

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderServer />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
          <h1 className="text-3xl font-bold mb-6">{t.termsTitle}</h1>
          
          <div className="prose max-w-none">
            {[
              [t.termsIntroTitle, t.termsIntroBody],
              [t.termsUseTitle, t.termsUseBody],
              [t.termsProductsTitle, t.termsProductsBody],
              [t.termsOrdersTitle, t.termsOrdersBody],
              [t.termsDeliveryTitle, t.termsDeliveryBody],
              [t.termsReturnsTitle, t.termsReturnsBody],
              [t.termsPrivacyTitle, t.termsPrivacyBody],
              [t.termsContactTitle, t.termsContactBody],
            ].map(([title, body]) => (
              <section key={title}>
                <h2 className="text-2xl font-bold mt-6 mb-4">{title}</h2>
                <p className="mb-4">{body}</p>
              </section>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
