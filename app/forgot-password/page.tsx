'use client';

import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { ForgotPassword } from 'propeller-v2-react-ui';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';

export default function ForgotPasswordPage() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow">
          <ForgotPassword />

          <div className="mt-6 text-center">
            <Link href={localizeHref('/login', language)} className="text-primary hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
