'use client';

import { useSyncExternalStore } from 'react';
import { useCart } from '@/context/CartContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { CartItem } from '@propeller-commerce/propeller-v2-react-ui';
import { CartSummary } from '@propeller-commerce/propeller-v2-react-ui';
import { CartBonusItems } from '@propeller-commerce/propeller-v2-react-ui';
import { ActionCode } from '@propeller-commerce/propeller-v2-react-ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { useEffect } from 'react';
import { track, cartItems, cartValue, trackCartDiff } from '@/lib/tracking';
import { restoreManagerCart } from '@/utils/cartHelpers';
import PunchoutTransfer from '@/components/PunchoutTransfer';
import { type Cart, type CartMainItem, CrossupsellType } from '@propeller-commerce/propeller-sdk-v2';
import { useTranslations } from '@/lib/i18n/client';

const subscribe = () => () => { };

export default function CartPage() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const { cart, saveCart, clearCart } = useCart();

  const router = useRouter();
  const { language } = useLanguage();

  // Cart view. Keyed on the cart id so a re-render or a StrictMode
  // double-invoke cannot inflate it.
  useEffect(() => {
    track('page_viewed', { page_type: 'cart' }, 'page_viewed:cart');
    const items = cart?.items?.length ?? 0;
    track(
      'view_cart',
      // `totalGross` is the EX-VAT total in this SDK (see lib/tracking/items.ts).
      // This used to send `totalNet`, which is tax-inclusive — GA4 revenue would
      // have been inflated by the VAT rate against every other event.
      { item_count: items, value: cartValue(cart), items: cartItems(cart, language) },
      `view_cart:${cart?.cartId ?? 'empty'}:${items}`
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart?.cartId, cart?.items?.length, cart?.total?.totalGross, language]);
  const cartItemLabels = useTranslations('CartItem');
  const cartBonusItemsLabels = useTranslations('CartBonusItems');
  const cartSummaryLabels = useTranslations('CartSummary');
  const actionCodeLabels = useTranslations('ActionCode');
  const t = useTranslations('CartPage');

  const items = mounted ? (cart?.items || []) : [];

  // In a PunchOut session the cart is a transfer-only surface — the normal
  // checkout / quote / action-code paths don't apply (the buyer sends the cart
  // back to their procurement system). Gated on `mounted` so SSR + first client
  // render match (the flag cookie is only readable in the browser).
  const punchoutActive =
    mounted && /(?:^|;\s*)punchout_active=/.test(document.cookie);

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      <main className="flex-1 py-8">
        <div className="container-width max-w-7xl">
          <h1 className="text-3xl font-bold mb-8">{t.title}</h1>

          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground mb-4">{t.empty}</p>
              <Link
                href={localizeHref('/', language)}
                className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition"
              >
                {t.continueShopping}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item: CartMainItem) => (
                  <CartItem
                    key={item.itemId}
                    taxZone={'NL'}
                    cartId={cart!.cartId}
                    cartItem={item}
                    enableIncrementDecrement={true}
                    showCrossupsells={true}
                    crossupsellTypes={[CrossupsellType.ACCESSORIES]}
                    crossupsellLimit={2}
                    afterCartUpdate={(updated: Cart) => {
                      // add_to_cart / remove_from_cart with the DELTA — this one
                      // callback covers quantity edits and removals alike.
                      trackCartDiff(cart, updated, language);
                      saveCart(updated);
                    }}
                    labels={cartItemLabels}
                  />
                ))}

                {/* Bonus items — free items added via incentives. Read-only
                    list. currency/includeTax/language resolve from
                    PropellerProvider (PropellerHostBridge). */}
                <CartBonusItems cart={cart ?? undefined} labels={cartBonusItemsLabels} />
              </div>

              {/* Cart Summary */}
              <div className="h-fit space-y-4">
                <PunchoutTransfer />
                {!punchoutActive && cart && (
                  <>
                    <CartSummary
                      cart={cart}
                      onCheckoutButtonClick={() => router.push(localizeHref('/checkout', language))}
                      afterRequestAuthorization={(updatedCart: Cart) => {
                        track(
                          'propeller.purchase_authorization_requested',
                          {
                            cart_id: updatedCart?.cartId ?? null,
                            value: cartValue(updatedCart),
                            item_count: updatedCart?.items?.length ?? 0,
                          },
                          `purchase_authorization_requested:${updatedCart?.cartId ?? ''}`
                        );
                        // If a manager parked their own cart to act on this
                        // request, hand it back; otherwise clear.
                        const parked = restoreManagerCart();
                        if (parked) saveCart(parked); else clearCart();
                        router.push(`/authorization-request-sent/${updatedCart.cartId}`);
                      }}
                      onRequestQuoteClick={() => router.push(localizeHref('/checkout?mode=quote', language))}
                      labels={cartSummaryLabels}
                    />
                    <ActionCode
                      cart={cart}
                      afterActionCodeApply={saveCart}
                      afterActionCodeRemove={saveCart}
                      labels={actionCodeLabels}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
