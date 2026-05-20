'use client';
/**
 * @rsc-blocked — Client-only component: interactive state (useState/useReducer).
 * Must be rendered inside (or below) a Client Component boundary; cannot be
 * imported directly into a React Server Component. The 'use client' header
 * above marks this boundary to Next.js.
 */
import * as React from 'react';

import { useState, useEffect } from 'react';
import { Cart, CartPaymethod, Contact, Customer } from 'propeller-sdk-v2';
import { getLabel } from '@/composables/shared/utils/labelHelpers';

export interface CartPaymethodsProps {
  /** Shopping cart object from which the payment methods will be displayed */
  cart: Cart;

  /** Authenticated user — used for cart creation / lookup. */
  user: Contact | Customer | null;

  /** The CSS class for the payment methods container */
  paymentsContainerClass?: string;

  /** Display the on account payment method for anonymous users */
  showOnAccountForGuests?: boolean;

  /** Action when a payment method is selected */
  onPaymethodSelect?: (paymethod: CartPaymethod) => void;

  /** Custom price formatting function */
  formatPrice?: (price: number) => string;

  /** Labels for the component */
  labels?: Record<string, string>;
}
function isOnAccountMethod(method: CartPaymethod): boolean {
  const code = (method.code || '').toLowerCase();
  return code === 'on_account' || code === 'onaccount' || code === 'on-account';
}

function CartPaymethods(props: CartPaymethodsProps) {
  const [selectedCode, setSelectedCode] = useState('');
  const containerClass = props.paymentsContainerClass || 'cart-paymethods';
  const showOnAccountForGuests = !!props.showOnAccountForGuests;
  const isGuest = !props.user;
  const payMethods: CartPaymethod[] = (props.cart?.payMethods || []).filter((m: CartPaymethod) => {
    if (!m?.code) return false;
    if (!showOnAccountForGuests && isGuest && isOnAccountMethod(m)) return false;
    return true;
  });
  function formatMethodPrice(price: number): string {
    if (props.formatPrice) return props.formatPrice(price);
    return '\u20AC' + Number(price || 0).toFixed(2);
  }
  function handleSelect(method: CartPaymethod): void {
    setSelectedCode(method.code);
    if (props.onPaymethodSelect) props.onPaymethodSelect(method);
  }
  // Adopt the cart's stored payment method once it loads (cart may be
  // undefined on mount, then arrive). Intentional external-prop →
  // local-state sync; derived-from-props can't replace this because
  // handleSelect lets the user override the cart value locally and we also
  // fire onPaymethodSelect.
  useEffect(() => {
    if (!selectedCode && props.cart?.paymentData?.method) {
      const code = props.cart.paymentData.method as string;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCode(code);
      if (props.onPaymethodSelect) {
        const match = payMethods.find((m: CartPaymethod) => m.code === code);
        if (match) props.onPaymethodSelect(match);
      }
    }
  }, [props.cart, selectedCode, props.onPaymethodSelect, payMethods, props]);
  return (
    <div className={`propeller-cart-paymethods ${containerClass}`}>
      {payMethods.length > 0 ? (
        <div className="propeller-cart-paymethods__grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {payMethods.map((method, index) => (
            <div
              key={method.code}
              onClick={() => handleSelect(method)}
              data-selected={selectedCode === method.code ? 'true' : 'false'}
              className={`propeller-cart-paymethods__method cursor-pointer border border-border rounded-container p-4 flex flex-col gap-2 transition-all ${selectedCode === method.code ? 'border-secondary bg-secondary/5 shadow-sm' : 'hover:border-secondary/30'}`}
            >
              <div className="propeller-cart-paymethods__method-row flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="propeller-cart-paymethods__method-name font-medium">{method.name || method.code}</span>
                </div>
                {method.price > 0 ? (
                  <span className="propeller-cart-paymethods__method-price text-xs bg-surface-hover text-muted-foreground px-2 py-1 rounded-full">
                    {formatMethodPrice(method.price)}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {payMethods.length === 0 ? (
        <p className="propeller-cart-paymethods__empty text-muted-foreground italic">
          {getLabel(props.labels, 'noMethods', 'No payment methods available.')}
        </p>
      ) : null}
    </div>
  );
}

export default CartPaymethods;
