'use client';
import * as React from 'react';

import { useState } from 'react';
import { Cart, CartAddress, GraphQLClient } from 'propeller-sdk-v2';
import { getLabel } from '@/lib/helpers/labelHelpers';

export interface CartOverviewProps {
  /** GraphQL client for the Propeller SDK */
  graphqlClient: GraphQLClient;

  /** Shopping cart object from which the cart overview will be displayed */
  cart: Cart;

  /** The CSS class for the cart overview container */
  overviewContainerClass?: string;

  /** Title of the cart overview */
  title?: string;

  /** Labels for the cart overview form fields and buttons */
  labels?: Record<string, string>;

  /** Show the notes field for the cart */
  showNotes?: boolean;

  /** Show the reference field for the cart */
  showReference?: boolean;

  /** Show the terms and conditions acceptance */
  showTermsAndConditions?: boolean;

  /** Action when the "Terms and conditions" link is clicked */
  onTermsAndConditionsClick?: () => void;

  /** Show the "Purchase" button for placing an order */
  showPurchaseButton?: boolean;

  /** Action when the purchase button is clicked. Receives cart, reference, and notes */
  onPurchaseButtonClick?: (cart: Cart, reference: string, notes: string) => void;
}
interface CartOverviewState {
  reference: string;
  notes: string;
  termsAccepted: boolean;
  loading: boolean;
  containerClass: () => string;
  showNotes: () => boolean;
  showReference: () => boolean;
  showTermsAndConditions: () => boolean;
  showPurchaseButton: () => boolean;
  getLabel: (key: string, fallback: string) => string;
  invoiceAddress: () => CartAddress;
  deliveryAddress: () => CartAddress;
  formatAddress: (addr: CartAddress) => string;
  paymentMethod: () => string;
  carrierName: () => string;
  requestDate: () => string;
  handleReferenceChange: (value: string) => void;
  handleNotesChange: (value: string) => void;
  handleTermsChange: (checked: boolean) => void;
  handleTermsLinkClick: (event: Event) => void;
  isPurchaseDisabled: () => boolean;
  handlePurchaseClick: () => void;
}
function CartOverview(props: CartOverviewProps) {
  const [reference, setReference] = useState<CartOverviewState['reference']>(() => '');
  const [notes, setNotes] = useState<CartOverviewState['notes']>(() => '');
  const [termsAccepted, setTermsAccepted] = useState<CartOverviewState['termsAccepted']>(
    () => false
  );
  const [loading, setLoading] = useState<CartOverviewState['loading']>(() => false);
  function containerClass(): ReturnType<CartOverviewState['containerClass']> {
    return props.overviewContainerClass || 'cart-overview';
  }
  function showNotes(): ReturnType<CartOverviewState['showNotes']> {
    return props.showNotes !== undefined ? props.showNotes : true;
  }
  function showReference(): ReturnType<CartOverviewState['showReference']> {
    return props.showReference !== undefined ? props.showReference : true;
  }
  function showTermsAndConditions(): ReturnType<CartOverviewState['showTermsAndConditions']> {
    return props.showTermsAndConditions !== undefined ? props.showTermsAndConditions : true;
  }
  function showPurchaseButton(): ReturnType<CartOverviewState['showPurchaseButton']> {
    return props.showPurchaseButton !== undefined ? props.showPurchaseButton : true;
  }
  function invoiceAddress(): ReturnType<CartOverviewState['invoiceAddress']> {
    return props.cart?.invoiceAddress;
  }
  function deliveryAddress(): ReturnType<CartOverviewState['deliveryAddress']> {
    return props.cart?.deliveryAddress;
  }
  function formatAddress(addr: CartAddress): ReturnType<CartOverviewState['formatAddress']> {
    if (!addr || !addr.street) return '';
    const parts: string[] = [];
    if (addr.company) parts.push(addr.company);
    const nameParts: string[] = [];
    if (addr.firstName) nameParts.push(addr.firstName);
    if (addr.middleName) nameParts.push(addr.middleName);
    if (addr.lastName) nameParts.push(addr.lastName);
    if (nameParts.length > 0) parts.push(nameParts.join(' '));
    const streetLine = [addr.street, addr.number, addr.numberExtension].filter(Boolean).join(' ');
    if (streetLine) parts.push(streetLine);
    const cityLine = [addr.postalCode, addr.city].filter(Boolean).join(' ');
    if (cityLine) parts.push(cityLine);
    if (addr.country) parts.push(addr.country);
    return parts.join(', ');
  }
  function paymentMethod(): ReturnType<CartOverviewState['paymentMethod']> {
    return props.cart?.paymentData?.method || '';
  }
  function carrierName(): ReturnType<CartOverviewState['carrierName']> {
    return props.cart?.postageData?.carrier || '';
  }
  function requestDate(): ReturnType<CartOverviewState['requestDate']> {
    const date = props.cart?.postageData?.requestDate;
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return date;
    }
  }
  function handleReferenceChange(
    value: string
  ): ReturnType<CartOverviewState['handleReferenceChange']> {
    setReference(value.slice(0, 255));
  }
  function handleNotesChange(value: string): ReturnType<CartOverviewState['handleNotesChange']> {
    setNotes(value.slice(0, 255));
  }
  function handleTermsChange(checked: boolean): ReturnType<CartOverviewState['handleTermsChange']> {
    setTermsAccepted(checked);
  }
  function handleTermsLinkClick(
    event: Event
  ): ReturnType<CartOverviewState['handleTermsLinkClick']> {
    event.preventDefault();
    if (props.onTermsAndConditionsClick) {
      props.onTermsAndConditionsClick();
    }
  }
  function isPurchaseDisabled(): ReturnType<CartOverviewState['isPurchaseDisabled']> {
    if (showTermsAndConditions() && !termsAccepted) return true;
    if (loading) return true;
    return false;
  }
  function handlePurchaseClick(): ReturnType<CartOverviewState['handlePurchaseClick']> {
    if (isPurchaseDisabled()) return;
    setLoading(true);
    if (props.onPurchaseButtonClick) {
      props.onPurchaseButtonClick(props.cart, reference, notes);
    }
  }
  return (
    <div className={`propeller-cart-overview ${containerClass()}`}>
      {props.title ? <h2 className="propeller-cart-overview__title text-xl font-bold mb-4">{props.title}</h2> : null}
      <div className="propeller-cart-overview__addresses grid grid-cols-1 md:grid-cols-2 gap-6 pb-5">
        <div className="propeller-cart-overview__address space-y-2" data-address="invoice">
          <h3 className="propeller-cart-overview__address-title text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {getLabel(props.labels, 'invoiceAddress', 'Invoice Address')}
          </h3>
          {invoiceAddress() && invoiceAddress().street ? (
            <div className="text-sm space-y-1">
              {invoiceAddress().company ? (
                <p className="font-medium">{invoiceAddress().company}</p>
              ) : null}
              <p>
                {[
                  invoiceAddress().firstName,
                  invoiceAddress().middleName,
                  invoiceAddress().lastName,
                ]
                  .filter(Boolean)
                  .join(' ')}
              </p>
              <p>
                {[
                  invoiceAddress().street,
                  invoiceAddress().number,
                  invoiceAddress().numberExtension,
                ]
                  .filter(Boolean)
                  .join(' ')}
              </p>
              <p>
                {[invoiceAddress().postalCode, invoiceAddress().city].filter(Boolean).join(' ')}
              </p>
              {invoiceAddress().country ? <p>{invoiceAddress().country}</p> : null}
              {invoiceAddress().email ? (
                <p className="propeller-cart-overview__address-email text-muted-foreground">{invoiceAddress().email}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="propeller-cart-overview__address space-y-2" data-address="delivery">
          <h3 className="propeller-cart-overview__address-title text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {getLabel(props.labels, 'deliveryAddress', 'Delivery Address')}
          </h3>
          {deliveryAddress() && deliveryAddress().street ? (
            <div className="text-sm space-y-1">
              {deliveryAddress().company ? (
                <p className="font-medium">{deliveryAddress().company}</p>
              ) : null}
              <p>
                {[
                  deliveryAddress().firstName,
                  deliveryAddress().middleName,
                  deliveryAddress().lastName,
                ]
                  .filter(Boolean)
                  .join(' ')}
              </p>
              <p>
                {[
                  deliveryAddress().street,
                  deliveryAddress().number,
                  deliveryAddress().numberExtension,
                ]
                  .filter(Boolean)
                  .join(' ')}
              </p>
              <p>
                {[deliveryAddress().postalCode, deliveryAddress().city].filter(Boolean).join(' ')}
              </p>
              {deliveryAddress().country ? <p>{deliveryAddress().country}</p> : null}
              {deliveryAddress().email ? (
                <p className="propeller-cart-overview__address-email text-muted-foreground">{deliveryAddress().email}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      <div className="propeller-cart-overview__info-panel bg-surface-hover p-4 rounded-control border border-border space-y-2 text-sm">
        {paymentMethod() ? (
          <div className="flex justify-between">
            <span className="font-medium">{getLabel(props.labels, 'payment', 'Payment:')}</span>
            <span>{paymentMethod()}</span>
          </div>
        ) : null}
        {carrierName() ? (
          <div className="flex justify-between">
            <span className="font-medium">{getLabel(props.labels, 'carrier', 'Carrier:')}</span>
            <span>{carrierName()}</span>
          </div>
        ) : null}
        {requestDate() ? (
          <div className="flex justify-between">
            <span className="font-medium">{getLabel(props.labels, 'deliveryDate', 'Delivery Date:')}</span>
            <span>{requestDate()}</span>
          </div>
        ) : null}
      </div>
      <div className="space-y-4 mt-6">
        {showReference() ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {getLabel(props.labels, 'referenceLabel', 'Reference (Optional)')}
            </label>
            <input
              type="text"
              className="propeller-cart-overview__input flex w-full rounded-control border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-1 focus:ring-secondary"
              value={reference}
              onChange={(event) => handleReferenceChange(event.target.value)}
              placeholder={getLabel(props.labels, 'referencePlaceholder', 'Your reference number')}
              maxLength={255}
            />
          </div>
        ) : null}
        {showNotes() ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {getLabel(props.labels, 'notesLabel', 'Order Notes (Optional)')}
            </label>
            <textarea
              className="propeller-cart-overview__textarea flex w-full rounded-control border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-1 focus:ring-secondary min-h-[80px]"
              value={notes}
              onChange={(event) => handleNotesChange(event.target.value)}
              placeholder={getLabel(props.labels, 'notesPlaceholder', 'Special instructions or comments')}
              maxLength={255}
            />
          </div>
        ) : null}
        {showTermsAndConditions() ? (
          <div className="flex items-center space-x-2 pt-2">
            <input
              type="checkbox"
              id="cart-overview-terms"
              className="propeller-cart-overview__checkbox h-4 w-4 rounded border-input text-primary focus:ring-primary"
              checked={termsAccepted}
              onChange={(event) => handleTermsChange(event.target.checked)}
            />
            <label htmlFor="cart-overview-terms" className="text-sm leading-none">
              {getLabel(props.labels, 'termsPrefix', 'I agree to the')}
              <a
                href="#"
                className="text-primary hover:underline font-medium"
                onClick={(event) => handleTermsLinkClick(event as unknown as Event)}
              >
                {getLabel(props.labels, 'termsLink', 'Terms and Conditions')}
              </a>
            </label>
          </div>
        ) : null}
        {showPurchaseButton() ? (
          <button
            type="button"
            className="propeller-cart-overview__submit flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground text-center py-3 rounded-container hover:bg-primary/80 transition font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            onClick={(event) => handlePurchaseClick()}
            disabled={isPurchaseDisabled()}
          >
            {loading ? (
              <div className="propeller-cart-overview__spinner w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : null}
            {loading ? <>{getLabel(props.labels, 'processing', 'Processing...')}</> : null}
            {!loading ? <>{getLabel(props.labels, 'purchaseButton', 'Place Order')}</> : null}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default CartOverview;
