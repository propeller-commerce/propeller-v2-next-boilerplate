'use client';

import { useSyncExternalStore } from 'react';
import { useCart } from '@/context/CartContext';
import { usePrice } from '@/context/PriceContext';
import { useAuth } from '@/context/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartItem from '@/components/propeller/CartItem';
import CartSummary from '@/components/propeller/CartSummary';
import ActionCode from '@/components/propeller/ActionCode';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { type CartMainItem, type Cart, type Contact, type Customer, Enums } from 'propeller-sdk-v2';
import { graphqlClient } from '@/lib/api';
import { config } from '@/data/config';

const subscribe = () => () => { };

export default function CartPage() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const { cart, saveCart } = useCart();
  const { includeTax } = usePrice();
  const { state } = useAuth();
  const router = useRouter();
  const { language } = useLanguage();

  const items = mounted ? (cart?.items || []) : [];

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      <main className="flex-1 py-8">
        <div className="container-width max-w-7xl">
          <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

          {items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground mb-4">Your cart is empty</p>
              <Link
                href={localizeHref('/', language)}
                className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item: CartMainItem) => (
                  <CartItem
                    key={item.itemId}
                    includeTax={includeTax}
                    user={state.user as Contact | Customer}
                    taxZone={'NL'}
                    language={'NL'}
                    graphqlClient={graphqlClient}
                    cartId={cart!.cartId}
                    cartItem={item}
                    configuration={config}
                    showCrossupsells={true}
                    crossupsellTypes={[Enums.CrossupsellType.ACCESSORIES]}
                    crossupsellLimit={2}
                    afterCartUpdate={saveCart}
                  />
                ))}
              </div>

              {/* Cart Summary */}
              <div className="h-fit space-y-4">
                {cart && (
                  <>
                    <CartSummary
                      cart={cart}
                      onCheckoutButtonClick={() => router.push(localizeHref('/checkout', language))}
                    />
                    <ActionCode
                      graphqlClient={graphqlClient}
                      cart={cart}
                      configuration={config}
                      afterActionCodeApply={saveCart}
                      afterActionCodeRemove={saveCart}
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
