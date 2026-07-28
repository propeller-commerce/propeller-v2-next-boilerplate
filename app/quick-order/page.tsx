'use client';

import { useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { QuickOrder } from '@propeller-commerce/propeller-v2-react-ui';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { localizeHref, config } from '@/data/config';
import { useTranslations } from '@/lib/i18n/client';
import { parseQuickOrderXlsx } from '@/lib/parseQuickOrderXlsx';
import toast from 'react-hot-toast';
import type { Cart } from '@propeller-commerce/propeller-sdk-v2';

/**
 * Quick-order — a standalone, auth-gated bulk order pad. Type/paste SKUs (with
 * typeahead) or upload an XLSX of code+quantity pairs, then add everything to
 * the cart in one bulk mutation. Not under /account, but still login-only:
 * unauthenticated visitors are redirected to /login.
 */
export default function QuickOrderPage() {
  const { state } = useAuth();
  const { selectedCompany } = useCompany();
  const { saveCart } = useCart();
  const { language } = useLanguage();
  const t = useTranslations('QuickOrder');

  // Auth guard: wait for auth to finish loading, then redirect if signed out.
  // Covers logout-while-on-page: this effect re-runs when isAuthenticated flips.
  //
  // We use a hard `window.location.replace` rather than the App-Router
  // `router.replace`. During a logout the auth context dispatches while this
  // page is mid-render; the client-side router navigation was being dropped in
  // that window (spinner stuck, never reaching /login). A full-document
  // navigation is immune to that race and always lands on the login page.
  const authed = !state.isLoading && state.isAuthenticated;
  useEffect(() => {
    if (!state.isLoading && !state.isAuthenticated) {
      window.location.replace(localizeHref('/login', language));
    }
  }, [state.isLoading, state.isAuthenticated, language]);

  // Keep the Header/Footer shell mounted at all times and gate only the inner
  // content — the unauthenticated state shows a spinner while the hard redirect
  // above navigates, instead of a bare white screen.
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      <main className="flex-1 py-8">
        <div className="container-width max-w-7xl">
          {!authed ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
          <>
          <h1 className="text-3xl font-bold mb-8">{t.pageTitle}</h1>
          <div className="bg-card rounded-[var(--radius-container)] shadow-sm p-6">
            <QuickOrder
              companyId={selectedCompany?.companyId}
              language={language}
              currency={config.currency}
              configuration={{
                imageSearchFiltersGrid: config.imageSearchFiltersGrid,
                imageVariantFiltersSmall: config.imageVariantFiltersSmall,
              }}
              parseSpreadsheet={parseQuickOrderXlsx}
              templateUrl="/files/quickorder-template.xlsx"
              afterAddToCart={(cart: Cart) => {
                saveCart(cart);
                toast.success(t.added);
              }}
              onMissingCodes={(codes: string[]) => {
                if (codes.length) toast.error(`${t.missing}: ${codes.join(', ')}`);
              }}
              labels={t}
            />
          </div>
          </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
