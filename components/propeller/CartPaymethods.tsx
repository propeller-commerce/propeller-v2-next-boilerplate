'use client';
import * as React from 'react';

import { useState } from 'react';
import { Cart, CartPaymethod, Contact, Customer } from 'propeller-sdk-v2';

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
interface CartPaymethodsState {
  selectedCode: string;
  containerClass: () => string;
  showOnAccountForGuests: () => boolean;
  isGuest: () => boolean;
  payMethods: () => CartPaymethod[];
  isOnAccountMethod: (method: CartPaymethod) => boolean;
  getLabel: (key: string, fallback: string) => string;
  formatMethodPrice: (price: number) => string;
  handleSelect: (method: CartPaymethod) => void;
}

function CartPaymethods(props: CartPaymethodsProps) {
  const [selectedCode, setSelectedCode] = useState<CartPaymethodsState['selectedCode']>(() => '');

  function containerClass(): ReturnType<CartPaymethodsState['containerClass']> {
    return props.paymentsContainerClass || 'cart-paymethods';
  }

  function showOnAccountForGuests(): ReturnType<CartPaymethodsState['showOnAccountForGuests']> {
    return props.showOnAccountForGuests !== undefined ? props.showOnAccountForGuests : false;
  }

  function isGuest(): ReturnType<CartPaymethodsState['isGuest']> {
    return !props.user;
  }

  function payMethods(): ReturnType<CartPaymethodsState['payMethods']> {
    const methods: CartPaymethod[] = props.cart?.payMethods || [];
    return methods.filter((m: CartPaymethod) => {
      if (!m?.code) return false;
      if (!showOnAccountForGuests() && isGuest() && isOnAccountMethod(m)) {
        return false;
      }
      return true;
    });
  }

  function isOnAccountMethod(
    method: CartPaymethod
  ): ReturnType<CartPaymethodsState['isOnAccountMethod']> {
    const code = (method.code || '').toLowerCase();
    return code === 'on_account' || code === 'onaccount' || code === 'on-account';
  }

  function getLabel(key: string, fallback: string): ReturnType<CartPaymethodsState['getLabel']> {
    return props.labels?.[key] || fallback;
  }

  function formatMethodPrice(price: number): ReturnType<CartPaymethodsState['formatMethodPrice']> {
    if (props.formatPrice) {
      return props.formatPrice(price);
    }
    return '\u20AC' + Number(price || 0).toFixed(2);
  }

  function handleSelect(method: CartPaymethod): ReturnType<CartPaymethodsState['handleSelect']> {
    setSelectedCode(method.code);
    if (props.onPaymethodSelect) {
      props.onPaymethodSelect(method);
    }
  }

  return (
    <div className={containerClass()}>
      {payMethods().length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {payMethods()?.map((method, index) => (
            <div
              key={method.code}
              onClick={(event) => handleSelect(method)}
              className={`cursor-pointer border border-gray-200 rounded-lg p-4 flex flex-col gap-2 transition-all ${selectedCode === method.code ? 'border-secondary bg-secondary/5 shadow-sm' : 'hover:border-secondary/30'}`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{method.name || method.code}</span>
                </div>
                {method.price > 0 ? (
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                    {formatMethodPrice(method.price)}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {payMethods().length === 0 ? (
        <p className="text-gray-500 italic">
          {getLabel('noMethods', 'No payment methods available.')}
        </p>
      ) : null}
    </div>
  );
}

export default CartPaymethods;
