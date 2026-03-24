'use client';
import * as React from 'react';

import { useState } from 'react';
import { Cart, CartCarrier } from 'propeller-sdk-v2';

export interface CartCarriersProps {
  /** Shopping cart object from which the carriers will be displayed */
  cart: Cart;

  /** The CSS class for the carriers container */
  carriersContainerClass?: string;

  /** Display the carrier logo */
  showCarrierLogo?: boolean;

  /** Action when a carrier is selected */
  onCarrierSelect?: (carrier: CartCarrier) => void;

  /** Custom price formatting function */
  formatPrice?: (price: number) => string;

  /** Show carrier price (default: true) */
  showPrice?: boolean;

  /** Labels for the component */
  labels?: Record<string, string>;
}
interface CartCarriersState {
  selectedName: string;
  containerClass: () => string;
  showLogo: () => boolean;
  carriers: () => CartCarrier[];
  getLabel: (key: string, fallback: string) => string;
  formatCarrierPrice: (price: number) => string;
  getLogoUrl: (carrier: CartCarrier) => string;
  handleSelect: (carrier: CartCarrier) => void;
}

function CartCarriers(props: CartCarriersProps) {
  const [selectedName, setSelectedName] = useState<CartCarriersState['selectedName']>(() => '');

  function containerClass(): ReturnType<CartCarriersState['containerClass']> {
    return props.carriersContainerClass || 'cart-carriers';
  }

  function showLogo(): ReturnType<CartCarriersState['showLogo']> {
    return props.showCarrierLogo !== undefined ? props.showCarrierLogo : true;
  }

  function carriers(): ReturnType<CartCarriersState['carriers']> {
    return props.cart?.carriers || [];
  }

  function getLabel(key: string, fallback: string): ReturnType<CartCarriersState['getLabel']> {
    return props.labels?.[key] || fallback;
  }

  function formatCarrierPrice(price: number): ReturnType<CartCarriersState['formatCarrierPrice']> {
    if (props.formatPrice) {
      return props.formatPrice(price);
    }
    return '\u20AC' + Number(price || 0).toFixed(2);
  }

  function getLogoUrl(carrier: CartCarrier): ReturnType<CartCarriersState['getLogoUrl']> {
    return carrier.logo || '';
  }

  function handleSelect(carrier: CartCarrier): ReturnType<CartCarriersState['handleSelect']> {
    setSelectedName(carrier.name);
    if (props.onCarrierSelect) {
      props.onCarrierSelect(carrier);
    }
  }

  return (
    <div className={containerClass()}>
      {carriers().length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {carriers()?.map((carrier, index) => (
            <div
              key={`${carrier.name}-${index}`}
              onClick={(event) => handleSelect(carrier)}
              className={`cursor-pointer border border-gray-200 rounded-lg p-4 flex flex-col gap-2 transition-all ${selectedName === carrier.name ? 'border-violet-600 bg-violet-50 shadow-sm' : 'hover:border-violet-300'}`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {showLogo() && getLogoUrl(carrier) ? (
                    <img className="h-6 w-auto" src={getLogoUrl(carrier)} alt={carrier.name} />
                  ) : null}
                  <span className="font-medium">{carrier.name}</span>
                </div>
                {props.showPrice !== false ? (
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                    {formatCarrierPrice(carrier.price)}
                  </span>
                ) : null}
              </div>
              {carrier.deliveryDeadline ? (
                <p className="text-xs text-gray-500">
                  {getLabel('deliveryDeadline', 'Delivery deadline:')}
                  {carrier.deliveryDeadline}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {carriers().length === 0 ? (
        <p className="text-gray-500 italic">{getLabel('noCarriers', 'No carriers available.')}</p>
      ) : null}
    </div>
  );
}

export default CartCarriers;
