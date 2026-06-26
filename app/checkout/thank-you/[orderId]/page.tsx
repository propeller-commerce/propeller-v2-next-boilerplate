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

/** Order statuses that mean the order is settled / paid. */
const PAID_ORDER_STATUSES = new Set(['NEW', 'CONFIRMED', 'VALIDATED', 'COMPLETE']);
/** Payment data statuses that mean the payment succeeded. */
const PAID_PAYMENT_STATUSES = new Set(['PAID', 'AUTHORIZED']);

/** Derive a payment outcome from a loaded order. */
function orderPaymentOutcome(order: Order | null): 'paid' | 'unpaid' | 'unknown' {
  if (!order) return 'unknown';
  const payStatus = (order.paymentData?.status || '').toUpperCase();
  if (payStatus) {
    if (PAID_PAYMENT_STATUSES.has(payStatus)) return 'paid';
    // An explicit non-paid payment status (FAILED/EXPIRED/CANCELLED/OPEN/PENDING)
    return 'unpaid';
  }
  // Fall back to the order status when paymentData has no status yet.
  const status = (order.status || '').toUpperCase();
  if (PAID_ORDER_STATUSES.has(status)) return 'paid';
  if (status === 'UNFINISHED') return 'unpaid';
  return 'unknown';
}

// How long to keep polling for the webhook to land before treating a PSP return
// as failed. Mollie's webhook is async, so a freshly-paid order can still read
// UNFINISHED for a moment when the shopper returns.
const PSP_POLL_ATTEMPTS = 6;
const PSP_POLL_INTERVAL_MS = 2000;

function ThankYouPageInner() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const searchParams = useSearchParams();
  const isQuoteMode = searchParams?.get('mode') === 'quote';
  // The Mollie redirect adds `?clearCart=1` — it marks a PSP return, so we
  // resolve the payment outcome (and only then clear the cart / pick the UI).
  // Non-PSP paths omit it and are treated as already-successful placements.
  const isPspReturn = searchParams?.get('clearCart') === '1';
  const { language } = useLanguage();
  const { state: authState } = useAuth();
  const { clearCart } = useCart();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // For a PSP return, whether we're still waiting for the webhook to resolve.
  const [pspPending, setPspPending] = useState(isPspReturn);
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

  // PSP return: the order may read UNFINISHED for a moment while the webhook is
  // still in flight. Poll a few times before concluding the payment failed.
  useEffect(() => {
    if (!isPspReturn) return;
    if (!order) return;
    if (orderPaymentOutcome(order) === 'paid') {
      setPspPending(false);
      return;
    }
    // Still unpaid — keep polling up to a bounded number of attempts.
    let attempts = 0;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      const result = await getOrderById(Number(orderId));
      if (cancelled) return;
      if (result.success && result.order) {
        setOrder(result.order);
        if (orderPaymentOutcome(result.order) === 'paid') {
          setPspPending(false);
          return;
        }
      }
      if (attempts >= PSP_POLL_ATTEMPTS) {
        setPspPending(false); // give up — treat as unpaid (failed/cancelled)
        return;
      }
      setTimeout(tick, PSP_POLL_INTERVAL_MS);
    };
    const id = setTimeout(tick, PSP_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
    // Only (re)start the poll loop when the order first loads on a PSP return.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPspReturn, order?.id]);

  const outcome = orderPaymentOutcome(order);
  // On a PSP return, "failed" = resolved (not pending) AND not paid.
  const paymentFailed = isPspReturn && !pspPending && outcome !== 'paid';

  // Clear the local cart only on a CONFIRMED-successful order. The Mollie flow
  // redirects off-site and returns with `?clearCart=1`, so checkout never got to
  // clear the cart — but we must NOT clear it on a failed/cancelled payment, or
  // the shopper can't retry the still-UNFINISHED order. Non-PSP returns clear
  // inline in checkout and omit the flag, so we leave their cart alone here (it
  // also avoids wiping a restored manager/authorization cart).
  useEffect(() => {
    if (!isPspReturn) return;
    if (cartClearedRef.current) return;
    if (order && outcome === 'paid') {
      cartClearedRef.current = true;
      clearCart();
    }
  }, [isPspReturn, order, outcome, clearCart]);

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

  // PSP return, payment not yet confirmed — still waiting on the webhook.
  if (isPspReturn && pspPending && outcome !== 'paid') {
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
              We&apos;re waiting for your payment to be confirmed. This usually only takes a few seconds.
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
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Payment not completed</h1>
            <p className="text-lg text-gray-600 mb-2">
              Your payment was not completed, so your order has not been finalized.
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
