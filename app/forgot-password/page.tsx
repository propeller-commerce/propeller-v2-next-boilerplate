'use client';

import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ForgotPassword } from '@propeller-commerce/propeller-v2-react-ui';
import { localizeHref } from '@/data/config';
import { useTranslations } from '@/lib/i18n/client';
import { useLanguage } from '@/context/LanguageContext';

export default function ForgotPasswordPage() {
  const { language } = useLanguage();
  const forgotPasswordLabels = useTranslations('ForgotPassword');
  const t = useTranslations('AuthPages');

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow">
          {/* The page owns its h1; the component's own title would be a second
              heading, so it is suppressed with an empty `title`. */}
          <h1 className="text-2xl font-bold mb-6">{forgotPasswordLabels.title}</h1>

          {/* buttonText/responseMessage are props, not label keys — pass them
              from the same namespace so they follow the language. */}
          <ForgotPassword
            labels={forgotPasswordLabels}
            title=""
            buttonText={forgotPasswordLabels.submitButton}
            responseMessage={forgotPasswordLabels.responseMessage}
          />

          <div className="mt-6 text-center">
            <Link href={localizeHref('/login', language)} className="text-primary hover:underline">
              {t.backToLogin}
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
