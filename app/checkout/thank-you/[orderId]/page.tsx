'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { useCart } from '@/context/CartContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@propeller-commerce/propeller-v2-react-ui';
import { graphqlClient } from '@/lib/api';
import { imageSearchFiltersGrid, imageVariantFiltersSmall } from '@/data/defaults';
import { OrderSummary } from '@propeller-commerce/propeller-v2-react-ui';
import { Order, OrderItem } from '@propeller-commerce/propeller-sdk-v2';
import { OrderItemCard } from '@propeller-commerce/propeller-v2-react-ui';
import { OrderBonusItems } from '@propeller-commerce/propeller-v2-react-ui';
import { COUNTRIES } from '@propeller-commerce/propeller-v2-react-ui';
import { useTranslations } from '@/lib/i18n/client';
import AccessErrorView from '@/components/access/AccessErrorView';
import { classifyApiError } from '@/lib/errors';

/**
 * Live PSP status → how the thank-you page should behave. THREE outcomes:
 *  - success (captured)     → success UI, CLEAR the cart. The payment is captured
 *    and the webhook will (or already did) finalize the order server-side
 *    (setOrderStatus + deleteCart), so the local cart must go too.
 *  - pending (not resolved) → pending UI, KEEP the cart. The payment isn't
 *    resolved yet and the order is still UNFINISHED — nothing has been finalized
 *    server-side, so clearing the local cart would desync it from the live
 *    backend cart (adding a product would silently reuse the same order's cart).
 *  - failed                 → failure UI, KEEP the cart so the shopper retries.
 *
 * The two PSPs use different status vocabularies, so the Sets are keyed by the
 * `?psp=` provider slug. Mollie: paid/authorized/open/pending/failed/…;
 * MultiSafepay: completed/reserved/shipped/initialized/uncleared/declined/….
 */
type PspSlug = 'mollie' | 'multisafepay';

const PSP_STATUS_SETS: Record<
  PspSlug,
  { success: Set<string>; pending: Set<string>; failed: Set<string> }
> = {
  mollie: {
    success: new Set(['paid', 'authorized']),
    pending: new Set(['open', 'pending']),
    failed: new Set(['failed', 'canceled', 'cancelled', 'expired']),
  },
  multisafepay: {
    success: new Set(['completed', 'reserved', 'shipped']),
    pending: new Set(['initialized', 'uncleared']),
    failed: new Set(['declined', 'cancelled', 'canceled', 'void', 'expired']),
  },
};

/** API route base for a PSP: mollie → /api/mollie, multisafepay → /api/msp. */
function pspApiBase(provider: PspSlug): string {
  return provider === 'multisafepay' ? '/api/msp' : '/api/mollie';
}

// The PSP redirects the shopper back the instant they finish the hosted
// checkout, but it flips the payment to captured and fires the webhook a beat
// later (async). So the first status check on return very often still reads a
// pending status even though the payment succeeds seconds later — stranding the
// shopper on the "payment still open" screen. Auto-poll a bounded number of
// times before settling on the pending UI: this resolves the common
// redirect⇄webhook race without an unbounded loop. Failure statuses resolve
// immediately (no poll); genuinely slow methods fall through to the pending
// screen with its manual "Check payment status" button intact.
const PENDING_POLL_ATTEMPTS = 5; // total status checks before showing pending
const PENDING_POLL_INTERVAL_MS = 2000; // ~8s of polling across the 5 attempts

/** Shape returned by GET /api/<psp>/payment-status. */
interface PspStatusResponse {
  ok: boolean;
  status?: string;
  settled?: boolean;
  error?: string;
}

type PaymentState = 'none' | 'resolving' | 'success' | 'pending' | 'failed';

function ThankYouPageInner() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const searchParams = useSearchParams();
  const isQuoteMode = searchParams?.get('mode') === 'quote';
  // The PSP redirect adds `?psp=<provider>` (mollie | multisafepay) — it marks a
  // PSP return, so we look up the LIVE payment status from that PSP and pick the
  // UI / cart action from it. Non-PSP paths omit it and are treated as
  // already-successful placements.
  const pspParam = (searchParams?.get('psp') || '').toLowerCase();
  const pspProvider: PspSlug | null =
    pspParam === 'mollie' || pspParam === 'multisafepay' ? pspParam : null;
  const isPspReturn = pspProvider !== null;
  // Status vocabulary + route base for the active PSP (fall back to mollie's so
  // the non-PSP path — where these go unused — still has a valid shape).
  const statusSets = PSP_STATUS_SETS[pspProvider ?? 'mollie'];
  const apiBase = pspApiBase(pspProvider ?? 'mollie');
  const stashKey = `${pspProvider ?? 'mollie'}_payment_${orderId}`;
  const { language } = useLanguage();
  const { state: authState } = useAuth();
  const { clearCart } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // PSP payment state, resolved from the live PSP status on return.
  const [paymentState, setPaymentState] = useState<PaymentState>(
    isPspReturn ? 'resolving' : 'none'
  );
  const [pspStatus, setPspStatus] = useState<string | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const cartClearedRef = useRef(false);

  const orderSummaryLabels = useTranslations('OrderSummary');
  const orderBonusItemsLabels = useTranslations('OrderBonusItems');
  const orderItemCardLabels = useTranslations('OrderItemCard');
  const t = useTranslations('CheckoutThankYou');

  const { getOrderById } = useOrders({
    graphqlClient,
    user: authState.user,
    language,
    configuration: { imageSearchFiltersGrid, imageVariantFiltersSmall },
  });

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    const result = await getOrderById(Number(orderId));
    if (result.success && result.order) {
      setOrder(result.order);
    } else {
      setError(result.error ?? 'Failed to load order details');
    }
    setLoading(false);
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // PSP return: resolve the real outcome from the LIVE PSP status. The PSP
  // redirects to the same URL whatever happened, so the order status alone can't
  // tell pending from failed — we ask the PSP directly (via our server route)
  // using the payment id stashed by checkout in sessionStorage.
  useEffect(() => {
    if (!isPspReturn) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const paymentId =
      typeof window !== 'undefined' ? window.sessionStorage.getItem(stashKey) : null;

    // No stashed payment id (e.g. returned on another device) — fall back to the
    // order status as a best-effort signal. Only a fully-paid order is a success
    // here; an UNFINISHED order is still pending (keep the cart), not failed.
    if (!paymentId) {
      const status = (order?.paymentData?.status || order?.status || '').toUpperCase();
      if (status === 'PAID' || status === 'NEW' || status === 'AUTHORIZED') {
        setPaymentState('success');
      } else if (order) {
        setPaymentState('pending');
      }
      return;
    }

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, ms);
        timers.push(timer);
      });

    // Poll the live status, retrying while still `open`/`pending` to absorb the
    // redirect⇄webhook race (see PENDING_POLL_* above). Resolves as soon as the
    // status is terminal (paid/authorized/failed/canceled/expired); otherwise
    // settles on `pending` after PENDING_POLL_ATTEMPTS.
    (async () => {
      for (let attempt = 1; attempt <= PENDING_POLL_ATTEMPTS; attempt++) {
        try {
          const res = await fetch(
            `${apiBase}/payment-status?paymentId=${encodeURIComponent(paymentId)}`
          );
          const data = (await res.json()) as PspStatusResponse;
          if (cancelled) return;
          const status = (data.status || '').toLowerCase();
          setPspStatus(status || null);

          if (data.ok && statusSets.success.has(status)) {
            // Captured → the order gets finalized server-side. Clear the cart and
            // the one-time stash so a refresh doesn't re-query.
            setPaymentState('success');
            try {
              window.sessionStorage.removeItem(stashKey);
            } catch {
              /* ignore */
            }
            return;
          }
          if (statusSets.failed.has(status)) {
            // Terminal failure — no point polling further.
            setPaymentState('failed');
            return;
          }
          // Still open/pending (or unknown/unreachable). If we have attempts
          // left, wait and re-check — the webhook is likely mid-flight. Stay in
          // `resolving` so the shopper sees a spinner, not a premature "open".
          if (attempt < PENDING_POLL_ATTEMPTS) {
            await sleep(PENDING_POLL_INTERVAL_MS);
            if (cancelled) return;
            continue;
          }
          // Exhausted attempts → settle on pending. Keep the cart and the stash
          // so a manual re-check (or refresh) can still pick up the resolved
          // status later.
          setPaymentState('pending');
          return;
        } catch {
          // Couldn't reach the status route. Retry if attempts remain; otherwise
          // keep the cart and let the shopper retry rather than wiping it on a
          // transient network error.
          if (cancelled) return;
          if (attempt < PENDING_POLL_ATTEMPTS) {
            await sleep(PENDING_POLL_INTERVAL_MS);
            if (cancelled) return;
            continue;
          }
          setPaymentState('pending');
          return;
        }
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
    // Resolve from the LIVE Mollie status. Intentionally does NOT depend on the
    // order load (`order?.id`) — re-running mid-poll would cancel and restart
    // the bounded poll, which can leave it stranded. The backend order is the
    // authoritative override below; this path just gives the fastest signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPspReturn, orderId]);

  // Authoritative override: once the order loads, a PAID/AUTHORIZED backend
  // order means the webhook already confirmed AND finalized the payment — that's
  // the source of truth, regardless of what the (async, occasionally lagging)
  // live PSP poll returned. Promote to success so a confirmed-paid order can
  // never strand the shopper on the "payment still open" screen. Only ever
  // upgrades toward success; never downgrades a already-resolved success.
  useEffect(() => {
    if (!isPspReturn || !order) return;
    const orderStatus = (order.paymentData?.status || order.status || '').toUpperCase();
    if (orderStatus === 'PAID' || orderStatus === 'AUTHORIZED') {
      setPaymentState('success');
      try {
        window.sessionStorage.removeItem(stashKey);
      } catch {
        /* ignore */
      }
    } else {
      // Order loaded but not yet paid. If the live-status poll is still spinning
      // (`resolving`) with nothing stashed to poll, settle on pending so the UI
      // never hangs on the spinner. Never downgrade an already-resolved state.
      const hasStash =
        typeof window !== 'undefined' && !!window.sessionStorage.getItem(stashKey);
      if (!hasStash) {
        setPaymentState((prev) => (prev === 'resolving' ? 'pending' : prev));
      }
    }
  }, [isPspReturn, order, orderId, stashKey]);

  // Clear the local cart ONLY on a captured payment (paymentState 'success').
  // The PSP flow redirects off-site and returns with `?psp=<provider>`, so
  // checkout never got to clear the cart — but we must NOT clear it while pending
  // (order not finalized server-side; clearing would desync the local cart from
  // the live backend cart) or on a failure (shopper must be able to retry the
  // still-UNFINISHED order). Non-PSP returns clear inline in checkout and omit
  // the flag, so we leave their cart alone here (also avoids wiping a restored
  // manager/authorization cart).
  useEffect(() => {
    if (!isPspReturn) return;
    if (cartClearedRef.current) return;
    if (paymentState === 'success') {
      cartClearedRef.current = true;
      clearCart();
    }
  }, [isPspReturn, paymentState, clearCart]);

  // Manual re-check for a pending payment — the shopper clicks "Check payment
  // status" and we re-query the PSP. Resolves to success / failed / still
  // pending. On success the cart-clearing effect above fires off paymentState.
  const recheckStatus = useCallback(async () => {
    const paymentId =
      typeof window !== 'undefined' ? window.sessionStorage.getItem(stashKey) : null;
    if (!paymentId) {
      // Lost the id (refresh on another device) — fall back to a fresh order read.
      await fetchOrderDetails();
      return;
    }
    setRechecking(true);
    try {
      const res = await fetch(
        `${apiBase}/payment-status?paymentId=${encodeURIComponent(paymentId)}`
      );
      const data = (await res.json()) as PspStatusResponse;
      const status = (data.status || '').toLowerCase();
      setPspStatus(status || null);
      if (data.ok && statusSets.success.has(status)) {
        setPaymentState('success');
        try {
          window.sessionStorage.removeItem(stashKey);
        } catch {
          /* ignore */
        }
      } else if (statusSets.failed.has(status)) {
        setPaymentState('failed');
      } else {
        // Still pending (or unknown) — stay on the pending screen.
        setPaymentState('pending');
      }
    } catch {
      // Leave it pending on a transient error.
    } finally {
      setRechecking(false);
    }
  }, [orderId, fetchOrderDetails, apiBase, stashKey, statusSets]);

  const paymentFailed = isPspReturn && paymentState === 'failed';
  const paymentPending = isPspReturn && paymentState === 'pending';

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto space-y-8 animate-pulse">
            <div className="h-24 bg-gray-200 rounded-lg w-full"></div>
            <div className="h-64 bg-gray-200 rounded-lg w-full"></div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <AccessErrorView kind={classifyApiError(error)} />
        </main>
        <Footer />
      </div>
    );
  }

  // PSP return, still resolving the live PSP status.
  if (isPspReturn && paymentState === 'resolving') {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Confirming your payment…</h1>
            <p className="text-lg text-gray-600">
              We&apos;re checking your payment status. This only takes a moment.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // PSP return, payment did not complete (failed / cancelled / expired). The
  // order is still UNFINISHED and the cart was preserved, so the shopper can
  // retry from the cart.
  if (paymentFailed) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {pspStatus === 'canceled' || pspStatus === 'cancelled'
                ? t.paymentCanceledTitle
                : pspStatus === 'expired'
                ? t.paymentExpiredTitle
                : t.paymentNotCompletedTitle}
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              {pspStatus === 'canceled' || pspStatus === 'cancelled'
                ? t.paymentCanceledText
                : pspStatus === 'expired'
                ? t.paymentExpiredText
                : t.paymentNotCompletedText}
            </p>
            <p className="text-gray-600 mb-10">
              {t.itemsStillInCart}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={localizeHref('/checkout', language)}
                className="px-8 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/80 transition text-center"
              >
                {t.tryAgain}
              </Link>
              <Link
                href={localizeHref('/cart', language)}
                className="px-8 py-3 bg-white border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary/5 transition text-center"
              >
                {t.backToCart}
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // PSP return, payment still pending. The order is UNFINISHED, nothing has been
  // finalized server-side, and the cart is preserved — the shopper can re-check
  // the status (the PSP may still be processing) or pick up the order later.
  // Distinct from both success and failure.
  if (paymentPending) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{t.paymentPendingTitle}</h1>
            <p className="text-lg text-gray-600 mb-2">
              {t.paymentPendingText1}
            </p>
            <p className="text-gray-600 mb-10">
              {t.paymentPendingText2}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={recheckStatus}
                disabled={rechecking}
                className="px-8 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/80 transition text-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {rechecking ? t.checking : t.checkPaymentStatus}
              </button>
              <Link
                href={localizeHref('/checkout', language)}
                className="px-8 py-3 bg-white border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary/5 transition text-center"
              >
                {t.backToCheckout}
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              {isQuoteMode ? t.thankYouQuoteTitle : t.thankYouOrderTitle}
            </h1>
            <p className="text-lg text-gray-600">
              {isQuoteMode
                ? t.thankYouQuoteText
                : t.thankYouOrderText}
            </p>
          </div>

          {order && (
            <div className="space-y-8">
              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <OrderSummary
                  order={order}
                  countries={COUNTRIES}
                  title={t.orderSummaryTitle}
                  labels={orderSummaryLabels}
                />
              </div>

              {/* Order Overview */}
              <div className="pt-10">
                  <h2 className="text-2xl font-bold mb-6">{t.orderOverviewTitle}</h2>

                  {/* Regular Products (grouped parent/child) */}
                  {(() => {
                      const allProducts = order.items?.filter((item: OrderItem) =>
                          item.class === "product" && item.isBonus === "N"
                      ) || [];
                      const parentItems = allProducts.filter((item: OrderItem) => !item.parentOrderItemId);
                      const childMap = new Map<number, OrderItem[]>();
                      allProducts.filter((item: OrderItem) => item.parentOrderItemId).forEach((item: OrderItem) => {
                          const children = childMap.get(item.parentOrderItemId!) || [];
                          children.push(item);
                          childMap.set(item.parentOrderItemId!, children);
                      });

                      if (parentItems.length > 0) {
                          return (
                              <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                                  <table className="w-full">
                                      <thead className="bg-gray-50 border-b">
                                          <tr>
                                              <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 w-2/3">Product</th>
                                              <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">Quantity</th>
                                              <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Price</th>
                                          </tr>
                                      </thead>
                                      {parentItems.map((item: OrderItem) => (
                                          <OrderItemCard
                                              key={item.id}
                                              orderItem={item}
                                              childItems={childMap.get(item.id) || []}
                                              labels={orderItemCardLabels}
                                          />
                                      ))}
                                  </table>
                              </div>
                          );
                      }
                      return null;
                  })()}

                  {/* Bonus Items */}
                  <OrderBonusItems order={order} labels={orderBonusItemsLabels} />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                {authState.isAuthenticated && (
                  <Link
                    href={localizeHref('/account/orders', language)}
                    className="px-8 py-3 bg-white border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary/5 transition text-center"
                  >
                    View Order History
                  </Link>
                )}
                <Link
                  href={localizeHref('/', language)}
                  className="px-8 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/80 transition text-center"
                >
                  Continue Shopping
                </Link>
              </div>

              <div className="text-center text-gray-500 pt-4">
                <p>If you have any questions about your order, please <Link href={localizeHref('/contact', language)} className="text-primary hover:underline">contact our customer service team</Link>.</p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense>
      <ThankYouPageInner />
    </Suspense>
  );
}
