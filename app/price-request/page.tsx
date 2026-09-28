'use client';

import { useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { PriceRequestList, usePriceRequest } from '@propeller-commerce/propeller-v2-react-ui';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { localizeHref } from '@/data/config';
import { useTranslations } from '@/lib/i18n/client';
import toast from 'react-hot-toast';

/**
 * Price request — the quote basket for products whose price is not published.
 *
 * Deliberately separate from the cart: a quoted product has no price to total
 * and cannot be paid for, so it must never reach checkout. Login-only, because
 * a quote is addressed to someone.
 */
export default function PriceRequestPage() {
  const { state } = useAuth();
  const { language } = useLanguage();
  const t = useTranslations('PriceRequest');

  // Auth guard: hard `window.location.replace`, not router.replace — during a
  // logout the client-side navigation is dropped and the page hangs.
  const authed = !state.isLoading && state.isAuthenticated;
  useEffect(() => {
    if (!state.isLoading && !state.isAuthenticated) {
      window.location.replace(localizeHref('/login', language));
    }
  }, [state.isLoading, state.isAuthenticated, language]);

  const user = state.user as { email?: string; firstName?: string; lastName?: string; companyName?: string; phone?: string } | null;

  const priceRequest = usePriceRequest({
    onSubmit: async (items, comment) => {
      const res = await fetch('/api/price-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          comment,
          language,
          email: user?.email ?? '',
          name: [user?.firstName, user?.lastName].filter(Boolean).join(' '),
          company: user?.companyName ?? '',
          phone: user?.phone ?? '',
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || 'failed');
      }
    },
  });

  // Keep the shell mounted and gate only the inner content, so the redirect
  // shows a spinner rather than a bare white screen.
  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      <main className="flex-1 py-8">
        <div className="container-width max-w-5xl">
          {!authed ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <div className="bg-card rounded-[var(--radius-container)] shadow-sm p-6">
              <PriceRequestList
                items={priceRequest.items}
                submitting={priceRequest.submitting}
                labels={t}
                onRemove={priceRequest.remove}
                onQuantityChange={priceRequest.setQuantity}
                onSubmit={async (comment: string) => {
                  const ok = await priceRequest.submit(comment);
                  if (!ok) toast.error(t.sendFailed || 'Could not send the request');
                  return ok;
                }}
              />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
