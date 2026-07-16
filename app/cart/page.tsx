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
import { restoreManagerCart } from '@/utils/cartHelpers';
import { type Cart, type CartMainItem, CrossupsellType } from '@propeller-commerce/propeller-sdk-v2';
import { useTranslations } from '@/lib/i18n/client';

const subscribe = () => () => { };

export default function CartPage() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const { cart, saveCart, clearCart } = useCart();
  const router = useRouter();
  const { language } = useLanguage();
  const cartItemLabels = useTranslations('CartItem');
  const cartBonusItemsLabels = useTranslations('CartBonusItems');
  const cartSummaryLabels = useTranslations('CartSummary');
  const actionCodeLabels = useTranslations('ActionCode');
  const t = useTranslations('CartPage');

  const items = mounted ? (cart?.items || []) : [];

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
                    afterCartUpdate={(cart: Cart) => { saveCart(cart); }}
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
                {cart && (
                  <>
                    <CartSummary
                      cart={cart}
                      onCheckoutButtonClick={() => router.push(localizeHref('/checkout', language))}
                      afterRequestAuthorization={(updatedCart: Cart) => {
                        // If a manager parked their own cart to act on this
                        // request, hand it back; otherwise clear.
                        const parked = restoreManagerCart();
                        if (parked) saveCart(parked); else clearCart();
                        router.push(`/authorization-request-sent/${updatedCart.cartId}`);
                      }}
                      onRequestQuoteClick={(cart) => router.push(localizeHref('/checkout?mode=quote', language))}
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
