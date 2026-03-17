'use client';
import * as React from 'react';

import { useState } from 'react'
  import  { Cart, CartAddress, GraphQLClient } from 'propeller-sdk-v2';



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




  function CartOverview(props:CartOverviewProps) {

  const [_reference, set_reference] = useState(() => (''))


const [_notes, set_notes] = useState(() => (''))


const [_termsAccepted, set_termsAccepted] = useState(() => (false))


const [_loading, set_loading] = useState(() => (false))


function containerClass() {
return props.overviewContainerClass || 'cart-overview';
}


function showNotes() {
return props.showNotes !== undefined ? props.showNotes : true;
}


function showReference() {
return props.showReference !== undefined ? props.showReference : true;
}


function showTermsAndConditions() {
return props.showTermsAndConditions !== undefined ? props.showTermsAndConditions : true;
}


function showPurchaseButton() {
return props.showPurchaseButton !== undefined ? props.showPurchaseButton : true;
}


function getLabel(key: string, fallback: string) {
return props.labels?.[key] || fallback;
}


function invoiceAddress() {
return props.cart?.invoiceAddress;
}


function deliveryAddress() {
return props.cart?.deliveryAddress;
}


function formatAddress(addr: CartAddress) {
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


function paymentMethod() {
return props.cart?.paymentData?.method || '';
}


function carrierName() {
return props.cart?.postageData?.carrier || '';
}


function requestDate() {
const date = props.cart?.postageData?.requestDate;
if (!date) return '';
try {
return new Date(date).toLocaleDateString();
} catch {
return date;
}
}


function handleReferenceChange(value: string) {
set_reference(value);
}


function handleNotesChange(value: string) {
set_notes(value);
}


function handleTermsChange(checked: boolean) {
set_termsAccepted(checked);
}


function handleTermsLinkClick(event: Event) {
event.preventDefault();
if (props.onTermsAndConditionsClick) {
props.onTermsAndConditionsClick();
}
}


function isPurchaseDisabled() {
if (showTermsAndConditions() && !_termsAccepted) return true;
if (_loading) return true;
return false;
}


function handlePurchaseClick() {
if (isPurchaseDisabled()) return;
if (props.onPurchaseButtonClick) {
props.onPurchaseButtonClick(props.cart, _reference, _notes);
}
}











return (


  <div  className={containerClass()}>{props.title ? (
  <h2 className="text-xl font-bold mb-4">{props.title}</h2>
) : null}<div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-5"><div className="space-y-2"><h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{getLabel('invoiceAddress', 'Invoice Address')}</h3>{invoiceAddress() && invoiceAddress().street ? (
  <div className="text-sm space-y-1">{invoiceAddress().company ? (
  <p className="font-medium">{invoiceAddress().company}</p>
) : null}<p>{[invoiceAddress().firstName, invoiceAddress().middleName, invoiceAddress().lastName].filter(Boolean).join(' ')}</p><p>{[invoiceAddress().street, invoiceAddress().number, invoiceAddress().numberExtension].filter(Boolean).join(' ')}</p><p>{[invoiceAddress().postalCode, invoiceAddress().city].filter(Boolean).join(' ')}</p>{invoiceAddress().country ? (
  <p>{invoiceAddress().country}</p>
) : null}{invoiceAddress().email ? (
  <p className="text-gray-500">{invoiceAddress().email}</p>
) : null}</div>
) : null}</div><div className="space-y-2"><h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{getLabel('deliveryAddress', 'Delivery Address')}</h3>{deliveryAddress() && deliveryAddress().street ? (
  <div className="text-sm space-y-1">{deliveryAddress().company ? (
  <p className="font-medium">{deliveryAddress().company}</p>
) : null}<p>{[deliveryAddress().firstName, deliveryAddress().middleName, deliveryAddress().lastName].filter(Boolean).join(' ')}</p><p>{[deliveryAddress().street, deliveryAddress().number, deliveryAddress().numberExtension].filter(Boolean).join(' ')}</p><p>{[deliveryAddress().postalCode, deliveryAddress().city].filter(Boolean).join(' ')}</p>{deliveryAddress().country ? (
  <p>{deliveryAddress().country}</p>
) : null}{deliveryAddress().email ? (
  <p className="text-gray-500">{deliveryAddress().email}</p>
) : null}</div>
) : null}</div></div><div className="bg-gray-50 p-4 rounded-md border border-gray-200 space-y-2 text-sm">{paymentMethod() ? (
  <div className="flex justify-between"><span className="font-medium">{getLabel('payment', 'Payment:')}</span><span>{paymentMethod()}</span></div>
) : null}{carrierName() ? (
  <div className="flex justify-between"><span className="font-medium">{getLabel('carrier', 'Carrier:')}</span><span>{carrierName()}</span></div>
) : null}{requestDate() ? (
  <div className="flex justify-between"><span className="font-medium">{getLabel('deliveryDate', 'Delivery Date:')}</span><span>{requestDate()}</span></div>
) : null}</div><div className="space-y-4 mt-6">{showReference() ? (
  <div className="space-y-2"><label className="text-sm font-medium">{getLabel('referenceLabel', 'Reference (Optional)')}</label><input  type="text" className="flex w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500"  value={_reference}  onChange={(event) => handleReferenceChange(event.target.value) }  placeholder={getLabel('referencePlaceholder', 'Your reference number')}  /></div>
) : null}{showNotes() ? (
  <div className="space-y-2"><label className="text-sm font-medium">{getLabel('notesLabel', 'Order Notes (Optional)')}</label><textarea className="flex w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 min-h-[80px]"  value={_notes}  onChange={(event) => handleNotesChange(event.target.value) }  placeholder={getLabel('notesPlaceholder', 'Special instructions or comments')}  /></div>
) : null}{showTermsAndConditions() ? (
  <div className="flex items-center space-x-2 pt-2"><input  type="checkbox"  id="cart-overview-terms" className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"  checked={_termsAccepted}  onChange={(event) => handleTermsChange(event.target.checked) }  /><label  htmlFor="cart-overview-terms" className="text-sm leading-none">{getLabel('termsPrefix', 'I agree to the')}<a  href="#" className="text-violet-600 hover:underline font-medium"  onClick={(event) => handleTermsLinkClick(event as unknown as Event) }>{getLabel('termsLink', 'Terms and Conditions')}</a></label></div>
) : null}{showPurchaseButton() ? (
  <button  type="button" className="block w-full bg-violet-600 text-white text-center py-3 rounded-lg hover:bg-violet-700 transition font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"  onClick={(event) => handlePurchaseClick() }  disabled={isPurchaseDisabled()}>{getLabel('purchaseButton', 'Place Order')}</button>
) : null}</div></div>


);
}




  export default CartOverview;


