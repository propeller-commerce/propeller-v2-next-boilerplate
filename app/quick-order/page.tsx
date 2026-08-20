'use client';

import { useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { QuickOrder } from '@propeller-commerce/propeller-v2-react-ui';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useCart } from '@/context/CartContext';
import { useLanguage } from '@/context/LanguageContext';
import { useBaseCategoryId } from '@/context/BaseCategoryContext';
import { localizeHref, config } from '@/data/config';
import { useTranslations } from '@/lib/i18n/client';
import { parseQuickOrderXlsx } from '@/lib/parseQuickOrderXlsx';
import { track, cartItems } from '@/lib/tracking';
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
  const baseCategoryId = useBaseCategoryId();
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
                baseCategoryId,
              }}
              parseSpreadsheet={(file: File) => {
                // Row count before matching: an upload that yields few matches
                // is a data gap, and that only shows if both numbers exist.
                const parsed = parseQuickOrderXlsx(file);
                Promise.resolve(parsed)
                  .then((rows) => {
                    track(
                      'propeller.quick_order_file_uploaded',
                      { row_count: Array.isArray(rows) ? rows.length : null },
                      `quick_order_file_uploaded:${Math.floor(Date.now() / 2000)}`
                    );
                  })
                  .catch(() => {
                    /* parse errors are the component's to surface, not ours */
                  });
                return parsed;
              }}
              templateUrl="/files/quickorder-template.xlsx"
              afterAddToCart={(cart: Cart) => {
                track(
                  'propeller.quick_order_submitted',
                  { item_count: cart?.items?.length ?? 0, items: cartItems(cart, language) },
                  `quick_order_submitted:${cart?.cartId ?? ''}:${Math.floor(Date.now() / 2000)}`
                );
                saveCart(cart);
                toast.success(t.added);
              }}
              onMissingCodes={(codes: string[]) => {
                // The same class of signal as a zero-result search: a named
                // account typing SKUs we cannot match is an assortment gap.
                if (codes.length) {
                  track(
                    'propeller.quick_order_submitted',
                    { unmatched_count: codes.length, unmatched_skus: codes.slice(0, 20) },
                    `quick_order_unmatched:${codes.join(',').slice(0, 60)}`
                  );
                  toast.error(`${t.missing}: ${codes.join(', ')}`);
                }
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
