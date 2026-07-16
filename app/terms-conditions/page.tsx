import { cookies } from 'next/headers';
import HeaderServer from '@/components/layout/HeaderServer';
import Footer from '@/components/layout/Footer';
import { getTranslations } from '@/lib/i18n/server';

export default async function TermsConditionsPage() {
  const store = await cookies();
  const locale = store.get('preferred_language')?.value || process.env.BOILERPLATE_DEFAULT_LANGUAGE || 'NL';
  const t = getTranslations(locale, 'StaticPages');

  return (
    <div className="min-h-screen flex flex-col">
      <HeaderServer />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
          <h1 className="text-3xl font-bold mb-6">{t.termsTitle}</h1>
          
          <div className="prose max-w-none">
            <h2 className="text-2xl font-bold mt-6 mb-4">1. Introduction</h2>
            <p className="mb-4">
              Welcome to our e-commerce platform. By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement.
            </p>

            <h2 className="text-2xl font-bold mt-6 mb-4">2. Use of Website</h2>
            <p className="mb-4">
              You may use this website for lawful purposes only. You must not use this website in any way that causes, or may cause, damage to the website or impairment of the availability or accessibility of the website.
            </p>

            <h2 className="text-2xl font-bold mt-6 mb-4">3. Products and Services</h2>
            <p className="mb-4">
              All products and services are subject to availability. We reserve the right to discontinue any product at any time. Prices for our products are subject to change without notice.
            </p>

            <h2 className="text-2xl font-bold mt-6 mb-4">4. Orders and Payment</h2>
            <p className="mb-4">
              By placing an order, you are offering to purchase a product on and subject to the following terms and conditions. All orders are subject to availability and confirmation of the order price.
            </p>

            <h2 className="text-2xl font-bold mt-6 mb-4">5. Delivery</h2>
            <p className="mb-4">
              We will deliver the products ordered by you to the address you provide when placing your order. Delivery times may vary depending on your location and product availability.
            </p>

            <h2 className="text-2xl font-bold mt-6 mb-4">6. Returns and Refunds</h2>
            <p className="mb-4">
              If you are not satisfied with your purchase, you may return it within 14 days of receipt for a full refund, provided the product is in its original condition.
            </p>

            <h2 className="text-2xl font-bold mt-6 mb-4">7. Privacy Policy</h2>
            <p className="mb-4">
              We are committed to protecting your privacy. Any personal information you provide will be used in accordance with our Privacy Policy.
            </p>

            <h2 className="text-2xl font-bold mt-6 mb-4">8. Contact Information</h2>
            <p className="mb-4">
              If you have any questions about these Terms and Conditions, please contact us at info@propeller.com
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
