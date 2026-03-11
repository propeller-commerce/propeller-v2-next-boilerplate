'use client';
import * as React from 'react';





  export interface CartSummaryProps {
/** The shopping cart used to populate the cart summary data */
cart: Cart;

/** Cart summary block title */
title?: string;

/** Labels for the component */
labels?: Record<string, string>;

/** Display the subtotal of the shopping cart */
showSubtotal?: boolean;

/** Display the total discount of the shopping cart */
showDiscount?: boolean;

/** Display the shipping costs of the shopping cart */
showShippingCosts?: boolean;

/** Display all VATs of the shopping cart */
showVATs?: boolean;

/** Display the total of the shopping cart excluding the VAT */
showTotalExclVat?: boolean;

/** Display the total VAT of the shopping cart */
showTotalVat?: boolean;

/** Display the checkout button */
showCheckoutButton?: boolean;

/** Action handler when the checkout button is clicked */
onCheckoutButtonClick?: (cart: Cart) => void;

/** Custom price formatting function */
formatPrice?: (price: number) => string;
}

  import  { Cart } from 'propeller-sdk-v2';



  function CartSummary(props:CartSummaryProps) {

  function title() {
return props.title || 'Order summary';
}


function showSubtotal() {
return props.showSubtotal !== undefined ? props.showSubtotal : true;
}


function showDiscount() {
return props.showDiscount !== undefined ? props.showDiscount : true;
}


function showShippingCosts() {
return props.showShippingCosts !== undefined ? props.showShippingCosts : true;
}


function showVATs() {
return props.showVATs !== undefined ? props.showVATs : true;
}


function showTotalExclVat() {
return props.showTotalExclVat !== undefined ? props.showTotalExclVat : true;
}


function showTotalVat() {
return props.showTotalVat !== undefined ? props.showTotalVat : true;
}


function showCheckoutButton() {
return props.showCheckoutButton !== undefined ? props.showCheckoutButton : true;
}


function getLabel(key: string, fallback: string) {
return props.labels?.[key] || fallback;
}


function formatItemPrice(price: number) {
if (props.formatPrice) {
return props.formatPrice(price);
}
return '\u20AC' + Number(price || 0).toFixed(2);
}


function subtotal() {
return (props.cart as any)?.total?.subTotal || 0;
}


function hasDiscount() {
const total = (props.cart as any)?.total;
return total?.discount > 0;
}


function discountAmount() {
return (props.cart as any)?.total?.discount || 0;
}


function hasShippingCosts() {
return (props.cart as any)?.postageData?.price > 0;
}


function shippingCosts() {
return Number((props.cart as any)?.postageData?.price || 0);
}


function totalExclVat() {
return (props.cart as any)?.total?.totalGross || 0;
}


function taxLevels() {
const levels = (props.cart as any)?.taxLevels || [];
return levels.filter((t: any) => t.taxPercentage > 0 && t.price > 0);
}


function totalVat() {
const net = (props.cart as any)?.total?.totalNet || 0;
const gross = (props.cart as any)?.total?.totalGross || 0;
return net - gross;
}


function totalInclVat() {
return (props.cart as any)?.total?.totalNet || 0;
}


function handleCheckoutClick() {
if (props.onCheckoutButtonClick) {
props.onCheckoutButtonClick(props.cart);
}
}











return (


  <div className="w-full bg-white p-6 rounded-lg shadow space-y-3"><h2 className="text-xl font-bold mb-4">{title()}</h2>{showSubtotal() ? (
  <div className="flex justify-between text-gray-600"><span>{getLabel('subtotal', 'Subtotal:')}</span><span>{formatItemPrice(subtotal())}</span></div>
) : null}{showDiscount() && hasDiscount() ? (
  <div className="flex justify-between text-red-600"><span>{getLabel('discount', 'Discount:')}</span><span>-{formatItemPrice(discountAmount())}</span></div>
) : null}{showShippingCosts() && hasShippingCosts() ? (
  <div className="flex justify-between text-gray-600"><span>{getLabel('shippingCosts', 'Shipping costs:')}</span><span>{formatItemPrice(shippingCosts())}</span></div>
) : null}{showTotalExclVat() ? (
  <div className="flex justify-between text-gray-600 pt-2 border-t"><span>{getLabel('totalExclVat', 'Total excl. VAT:')}</span><span>{formatItemPrice(totalExclVat())}</span></div>
) : null}{showVATs() && taxLevels().length > 0 ? (
  <>{taxLevels()?.map((tax, index) => (
  <div className="flex justify-between text-gray-600 text-sm"  key={index}><span>{tax.taxPercentage}% {getLabel('vat', 'VAT')}:</span><span>{formatItemPrice(Number(tax.price))}</span></div>
))}</>
) : null}{showTotalVat() && totalVat() > 0 ? (
  <div className="flex justify-between text-gray-600 text-sm"><span>{getLabel('totalVat', 'Total VAT:')}</span><span>{formatItemPrice(totalVat())}</span></div>
) : null}<div className="flex justify-between text-xl font-bold pt-4 border-t text-gray-900 mt-2"><span>{getLabel('total', 'Total:')}</span><span>{formatItemPrice(totalInclVat())}</span></div>{showCheckoutButton() ? (
  <button  type="button" className="block w-full bg-violet-600 text-white text-center py-3 rounded-lg hover:bg-violet-700 transition font-semibold mt-4"  onClick={(event) => handleCheckoutClick() }>{getLabel('checkoutButton', 'Continue to Checkout')}</button>
) : null}</div>


);
}




  export default CartSummary;


