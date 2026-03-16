'use client';
import * as React from 'react';

import { useState } from 'react'
  import  { Cart, CartPaymethod } from 'propeller-sdk-v2';



  export interface CartPaymethodsProps {
/** Shopping cart object from which the payment methods will be displayed */
cart: Cart;

/** The CSS class for the payment methods container */
paymentsContainerClass?: string;

/** Display the payment method logo */
showPaymentMethodLogo?: boolean;

/** Display the on account payment method for anonymous users */
showOnAccountForGuests?: boolean;

/** Action when a payment method is selected */
onPaymethodSelect?: (paymethod: CartPaymethod) => void;

/** Custom price formatting function */
formatPrice?: (price: number) => string;

/** Labels for the component */
labels?: Record<string, string>;
}




  function CartPaymethods(props:CartPaymethodsProps) {

  const [_selectedCode, set_selectedCode] = useState(() => (''))


function containerClass() {
return props.paymentsContainerClass || 'cart-paymethods';
}


function showLogo() {
return props.showPaymentMethodLogo !== undefined ? props.showPaymentMethodLogo : true;
}


function showOnAccountForGuests() {
return props.showOnAccountForGuests !== undefined ? props.showOnAccountForGuests : false;
}


function isGuest() {
try {
const user = localStorage.getItem('user');
return !user;
} catch {
return true;
}
}


function payMethods() {
const methods = (props.cart as any)?.payMethods || [];
return methods.filter((m: any) => {
if (!m?.code) return false;
if (!showOnAccountForGuests() && isGuest() && isOnAccountMethod(m)) {
  return false;
}
return true;
});
}


function isOnAccountMethod(method: any) {
const code = (method.code || '').toLowerCase();
return code === 'on_account' || code === 'onaccount' || code === 'on-account';
}


function getLabel(key: string, fallback: string) {
return props.labels?.[key] || fallback;
}


function formatMethodPrice(price: number) {
if (props.formatPrice) {
return props.formatPrice(price);
}
return '\u20AC' + Number(price || 0).toFixed(2);
}


function getLogoUrl(method: any) {
const code = (method.code || '').toLowerCase();
const logoMap: Record<string, string> = {
'ideal': 'https://cdn.propellor.cloud/payment-logos/ideal.svg',
'bancontact': 'https://cdn.propellor.cloud/payment-logos/bancontact.svg',
'creditcard': 'https://cdn.propellor.cloud/payment-logos/creditcard.svg',
'paypal': 'https://cdn.propellor.cloud/payment-logos/paypal.svg',
'klarna': 'https://cdn.propellor.cloud/payment-logos/klarna.svg',
'sofort': 'https://cdn.propellor.cloud/payment-logos/sofort.svg',
'giropay': 'https://cdn.propellor.cloud/payment-logos/giropay.svg',
'eps': 'https://cdn.propellor.cloud/payment-logos/eps.svg'
};
return logoMap[code] || '';
}


function handleSelect(method: any) {
set_selectedCode(method.code);
if (props.onPaymethodSelect) {
props.onPaymethodSelect(method as CartPaymethod);
}
}











return (


  <div  className={containerClass()}>{payMethods().length > 0 ? (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{payMethods()?.map((method, index) => (
  <div  key={method.code}  onClick={(event) => handleSelect(method) }  className={`cursor-pointer border border-gray-200 rounded-lg p-4 flex flex-col gap-2 transition-all ${_selectedCode === method.code ? 'border-violet-600 bg-violet-50 shadow-sm' : 'hover:border-violet-300'}`}><div className="flex justify-between items-center"><div className="flex items-center gap-2">{showLogo() && getLogoUrl(method) ? (
  <img className="h-6 w-auto"  src={getLogoUrl(method)}  alt={method.name || method.code}  />
) : null}<span className="font-medium">{method.name || method.code}</span></div>{method.price > 0 ? (
  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{formatMethodPrice(method.price)}</span>
) : null}</div></div>
))}</div>
) : null}{payMethods().length === 0 ? (
  <p className="text-gray-500 italic">{getLabel('noMethods', 'No payment methods available.')}</p>
) : null}</div>


);
}




  export default CartPaymethods;


