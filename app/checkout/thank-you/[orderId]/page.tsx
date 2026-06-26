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
 * Live Mollie status → how the thank-you page should behave. THREE outcomes:
 *  - paid / authorized      → success UI, CLEAR the cart. The payment is captured
 *    and the webhook will (or already did) finalize the order server-side
 *    (setOrderStatus + deleteCart), so the local cart must go too.
 *  - open / pending         → pending UI, KEEP the cart. The payment isn't
 *    resolved yet and the order is still UNFINISHED — nothing has been finalized
 *    server-side, so clearing the local cart would desync it from the live
 *    backend cart (adding a product would silently reuse the same order's cart).
 *  - failed/canceled/expired → failure UI, KEEP the cart so the shopper retries.
 */
const SUCCESS_MOLLIE_STATUSES = new Set(['paid', 'authorized']);
const PENDING_MOLLIE_STATUSES = new Set(['open', 'pending']);
const FAILED_MOLLIE_STATUSES = new Set(['failed', 'canceled', 'cancelled', 'expired']);

/** Shape returned by GET /api/mollie/payment-status. */
interface MollieStatusResponse {
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
  // The Mollie redirect adds `?psp=mollie` — it marks a PSP return, so we look
  // up the LIVE Mollie payment status and pick the UI / cart action from that.
  // Non-PSP paths omit it and are treated as already-successful placements.
  const isPspReturn = searchParams?.get('psp') === 'mollie';
  const { language } = useLanguage();
  const { state: authState } = useAuth();
  const { clearCart } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // PSP payment state, resolved from the live Mollie status on return.
  const [paymentState, setPaymentState] = useState<PaymentState>(
    isPspReturn ? 'resolving' : 'none'
  );
  const [mollieStatus, setMollieStatus] = useState<string | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const cartClearedRef = useRef(false);

  const orderSummaryLabels = useTranslations('OrderSummary');
  const orderBonusItemsLabels = useTranslations('OrderBonusItems');
  const orderItemCardLabels = useTranslations('OrderItemCard');

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

  // PSP return: resolve the real outcome from the LIVE Mollie status. Mollie
  // redirects to the same URL whatever happened, so the order status alone can't
  // tell open from failed — we ask Mollie directly (via our server route) using
  // the payment id stashed by checkout in sessionStorage.
  useEffect(() => {
    if (!isPspReturn) return;
    let cancelled = false;

    const paymentId =
      typeof window !== 'undefined'
        ? window.sessionStorage.getItem(`mollie_payment_${orderId}`)
        : null;

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

    (async () => {
      try {
        const res = await fetch(
          `/api/mollie/payment-status?paymentId=${encodeURIComponent(paymentId)}`
        );
        const data = (await res.json()) as MollieStatusResponse;
        if (cancelled) return;
        const status = (data.status || '').toLowerCase();
        setMollieStatus(status || null);
        if (data.ok && SUCCESS_MOLLIE_STATUSES.has(status)) {
          // Captured → the order gets finalized server-side. Clear the cart and
          // the one-time stash so a refresh doesn't re-query.
          setPaymentState('success');
          try {
            window.sessionStorage.removeItem(`mollie_payment_${orderId}`);
          } catch {
            /* ignore */
          }
        } else if (data.ok && PENDING_MOLLIE_STATUSES.has(status)) {
          // Still open/pending → keep the cart; nothing is finalized yet. Keep
          // the stash so a re-check (refresh) can pick up the resolved status.
          setPaymentState('pending');
        } else if (FAILED_MOLLIE_STATUSES.has(status)) {
          setPaymentState('failed');
        } else {
          // Unknown/unreachable status — don't wrongly clear the cart. Show
          // pending so the shopper can re-check rather than a misleading state.
          setPaymentState('pending');
        }
      } catch {
        // Couldn't reach the status route — keep the cart, let the shopper retry
        // the check rather than wiping their cart on a transient network error.
        if (!cancelled) setPaymentState('pending');
      }
    })();

    return () => {
      cancelled = true;
    };
    // Re-run when the order id changes or the order first loads (for the
    // no-payment-id fallback branch).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPspReturn, orderId, order?.id]);

  // Clear the local cart ONLY on a captured payment (paymentState 'success' =
  // paid/authorized). The Mollie flow redirects off-site and returns with
  // `?psp=mollie`, so checkout never got to clear the cart — but we must NOT
  // clear it while open/pending (order not finalized server-side; clearing would
  // desync the local cart from the live backend cart) or on failed/canceled/
  // expired (shopper must be able to retry the still-UNFINISHED order). Non-PSP
  // returns clear inline in checkout and omit the flag, so we leave their cart
  // alone here (also avoids wiping a restored manager/authorization cart).
  useEffect(() => {
    if (!isPspReturn) return;
    if (cartClearedRef.current) return;
    if (paymentState === 'success') {
      cartClearedRef.current = true;
      clearCart();
    }
  }, [isPspReturn, paymentState, clearCart]);

  // Manual re-check for a pending (open) payment — the shopper clicks "Check
  // payment status" and we re-query Mollie. Resolves to success / failed / still
  // pending. On success the cart-clearing effect above fires off paymentState.
  const recheckStatus = useCallback(async () => {
    const paymentId =
      typeof window !== 'undefined'
        ? window.sessionStorage.getItem(`mollie_payment_${orderId}`)
        : null;
    if (!paymentId) {
      // Lost the id (refresh on another device) — fall back to a fresh order read.
      await fetchOrderDetails();
      return;
    }
    setRechecking(true);
    try {
      const res = await fetch(
        `/api/mollie/payment-status?paymentId=${encodeURIComponent(paymentId)}`
      );
      const data = (await res.json()) as MollieStatusResponse;
      const status = (data.status || '').toLowerCase();
      setMollieStatus(status || null);
      if (data.ok && SUCCESS_MOLLIE_STATUSES.has(status)) {
        setPaymentState('success');
        try {
          window.sessionStorage.removeItem(`mollie_payment_${orderId}`);
        } catch {
          /* ignore */
        }
      } else if (FAILED_MOLLIE_STATUSES.has(status)) {
        setPaymentState('failed');
      } else {
        // Still open/pending (or unknown) — stay on the pending screen.
        setPaymentState('pending');
      }
    } catch {
      // Leave it pending on a transient error.
    } finally {
      setRechecking(false);
    }
  }, [orderId, fetchOrderDetails]);

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

  // PSP return, still resolving the live Mollie status.
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
              {mollieStatus === 'canceled' || mollieStatus === 'cancelled'
                ? 'Payment canceled'
                : mollieStatus === 'expired'
                ? 'Payment expired'
                : 'Payment not completed'}
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              {mollieStatus === 'canceled' || mollieStatus === 'cancelled'
                ? 'You canceled the payment, so your order has not been finalized.'
                : mollieStatus === 'expired'
                ? 'The payment expired before it was completed, so your order has not been finalized.'
                : 'Your payment was not completed, so your order has not been finalized.'}
            </p>
            <p className="text-gray-600 mb-10">
              Your items are still in your cart — you can try the payment again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={localizeHref('/checkout', language)}
                className="px-8 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/80 transition text-center"
              >
                Try Again
              </Link>
              <Link
                href={localizeHref('/cart', language)}
                className="px-8 py-3 bg-white border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary/5 transition text-center"
              >
                Back to Cart
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // PSP return, payment still OPEN/PENDING. The order is UNFINISHED, nothing has
  // been finalized server-side, and the cart is preserved — the shopper can
  // re-check the status (Mollie may still be processing) or pick up the order
  // later. Distinct from both success and failure.
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Your payment is still open</h1>
            <p className="text-lg text-gray-600 mb-2">
              We haven&apos;t received confirmation of your payment yet. This can take a
              moment while your bank or payment provider processes it.
            </p>
            <p className="text-gray-600 mb-10">
              Your order isn&apos;t finalized yet and your items are still in your cart.
              Check the status again in a moment, or come back later.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                type="button"
                onClick={recheckStatus}
                disabled={rechecking}
                className="px-8 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/80 transition text-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {rechecking ? 'Checking…' : 'Check payment status'}
              </button>
              <Link
                href={localizeHref('/checkout', language)}
                className="px-8 py-3 bg-white border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary/5 transition text-center"
              >
                Back to Checkout
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
              {isQuoteMode ? 'Thank You for Your Quote Request!' : 'Thank You for Your Order!'}
            </h1>
            <p className="text-lg text-gray-600">
              {isQuoteMode
                ? 'Your quote request has been successfully submitted. We will get back to you shortly.'
                : 'Your order has been successfully placed and is being processed.'}
            </p>
          </div>

          {order && (
            <div className="space-y-8">
              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <OrderSummary
                  order={order}
                  countries={COUNTRIES}
                  title="Order Summary"
                  labels={orderSummaryLabels}
                />
              </div>

              {/* Order Overview */}
              <div className="pt-10">
                  <h2 className="text-2xl font-bold mb-6">Order Overview</h2>

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
