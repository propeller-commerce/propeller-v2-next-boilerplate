'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
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
  useEffect(() => {
    if (!selectedName && props.cart?.postageData?.carrier) {
      const name = props.cart.postageData.carrier as string;
      setSelectedName(name);
      if (props.onCarrierSelect) {
        const match = carriers().find((c: CartCarrier) => c.name === name);
        if (match) props.onCarrierSelect(match);
      }
    }
  }, [props.cart]);
  return (
    <div className={`propeller-cart-carriers ${containerClass()}`}>
      {carriers().length > 0 ? (
        <div className="propeller-cart-carriers__grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {carriers()?.map((carrier, index) => (
            <div
              key={`${carrier.name}-${index}`}
              onClick={(event) => handleSelect(carrier)}
              data-selected={selectedName === carrier.name ? 'true' : 'false'}
              className={`propeller-cart-carriers__carrier cursor-pointer border border-border rounded-container p-4 flex flex-col gap-2 transition-all ${selectedName === carrier.name ? 'border-secondary bg-secondary/5 shadow-sm' : 'hover:border-secondary/30'}`}
            >
              <div className="propeller-cart-carriers__carrier-row flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {showLogo() && getLogoUrl(carrier) ? (
                    <img className="propeller-cart-carriers__carrier-logo h-6 w-auto" src={getLogoUrl(carrier)} alt={carrier.name} />
                  ) : null}
                  <span className="propeller-cart-carriers__carrier-name font-medium">{carrier.name}</span>
                </div>
                {props.showPrice !== false ? (
                  <span className="propeller-cart-carriers__carrier-price text-xs bg-surface-hover text-muted-foreground px-2 py-1 rounded-full">
                    {formatCarrierPrice(carrier.price)}
                  </span>
                ) : null}
              </div>
              {carrier.deliveryDeadline ? (
                <p className="propeller-cart-carriers__carrier-deadline text-xs text-muted-foreground">
                  {getLabel('deliveryDeadline', 'Delivery deadline:')}
                  {carrier.deliveryDeadline}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {carriers().length === 0 ? (
        <p className="propeller-cart-carriers__empty text-muted-foreground italic">{getLabel('noCarriers', 'No carriers available.')}</p>
      ) : null}
    </div>
  );
}

export default CartCarriers;
