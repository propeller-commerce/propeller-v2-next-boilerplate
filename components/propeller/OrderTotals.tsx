'use client';
import * as React from 'react';
import { Order, Enums } from 'propeller-sdk-v2';

export interface OrderTotalsProps {
  /** The order/quote used to populate the summary data */
  order: Order;

  /** Order summary block title */
  title?: string;

  /** Labels for the component */
  labels?: Record<string, string>;

  /** Display the subtotal of the order/quote */
  showSubtotal?: boolean;

  /** Display the total discount of the order/quote */
  showDiscount?: boolean;

  /** Display the shipping costs of the order/quote */
  showShippingCosts?: boolean;

  /** Display all VATs of the order/quote */
  showVATs?: boolean;

  /** Display the total of the order/quote excluding the VAT */
  showTotalExclVat?: boolean;

  /** Display the total VAT of the order/quote */
  showTotalVat?: boolean;

  /** Custom price formatting function */
  formatPrice?: (price: number) => string;
}

function OrderTotals(props: OrderTotalsProps) {

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

  function getLabel(key: string, fallback: string) {
    return props.labels?.[key] || fallback;
  }

  function formatItemPrice(price: number) {
    if (props.formatPrice) {
      return props.formatPrice(price);
    }
    return '€' + Number(price || 0).toFixed(2);
  }

  function subtotal() {
    return (props.order as any)?.total?.gross || 0;
  }

  function hasDiscount() {
    const total = (props.order as any)?.total;
    return total?.discountType && total.discountType !== Enums.OrderDiscountType.N && total.discountValue > 0;
  }

  function discountDisplay() {
    const total = (props.order as any)?.total;
    if (!total) return '';
    if (total.discountType === Enums.OrderDiscountType.A) {
      return '-' + formatItemPrice(total.discountValue);
    }
    if (total.discountType === Enums.OrderDiscountType.P) {
      return '- ' + total.discountValue + '%';
    }
    return '-' + formatItemPrice(total.discountValue);
  }

  function subtotalWithDiscount() {
    const total = (props.order as any)?.total;
    return (total?.gross || 0) - (total?.discountValue || 0);
  }

  function hasTransactionCosts() {
    return (props.order as any)?.paymentData?.gross > 0;
  }

  function transactionCosts() {
    return Number((props.order as any)?.paymentData?.gross || 0);
  }

  function hasShippingCosts() {
    return (props.order as any)?.postageData?.gross > 0;
  }

  function shippingCosts() {
    return Number((props.order as any)?.postageData?.gross || 0);
  }

  function totalExclVat() {
    return (props.order as any)?.total?.gross || 0;
  }

  function taxPercentages() {
    const taxes = (props.order as any)?.total?.taxPercentages || [];
    return taxes.filter((tax: any) => tax.percentage > 0 && tax.total > 0);
  }

  function totalInclVat() {
    return (props.order as any)?.total?.net || 0;
  }

  function totalVat() {
    let sum = 0;
    const taxes = taxPercentages();
    for (let i = 0; i < taxes.length; i++) {
      sum += Number(taxes[i].total || 0);
    }
    return sum;
  }

  return (
    <div className="w-full md:w-80 bg-white p-6 rounded-lg shadow space-y-3">
      {showSubtotal() ? (
        <div className="flex justify-between text-gray-600">
          <span>{getLabel('subtotal', 'Subtotal:')}</span>
          <span>{formatItemPrice(subtotal())}</span>
        </div>
      ) : null}

      {showDiscount() && hasDiscount() ? (
        <>
          <div className="flex justify-between text-violet-600">
            <span>{getLabel('discount', 'Discount:')}</span>
            <span>{discountDisplay()}</span>
          </div>
          <div className="flex justify-between text-gray-600 border-t pt-2 border-dashed">
            <span>{getLabel('subtotalWithDiscount', 'Subtotal with discount:')}</span>
            <span>{formatItemPrice(subtotalWithDiscount())}</span>
          </div>
        </>
      ) : null}

      {hasTransactionCosts() ? (
        <div className="flex justify-between text-gray-600">
          <span>{getLabel('transactionCosts', 'Transaction costs:')}</span>
          <span>{formatItemPrice(transactionCosts())}</span>
        </div>
      ) : null}

      {showShippingCosts() && hasShippingCosts() ? (
        <div className="flex justify-between text-gray-600">
          <span>{getLabel('shippingCosts', 'Shipping costs:')}</span>
          <span>{formatItemPrice(shippingCosts())}</span>
        </div>
      ) : null}

      {showTotalExclVat() ? (
        <div className="flex justify-between text-gray-600 pt-2 border-t">
          <span>{getLabel('totalExclVat', 'Total excl. VAT:')}</span>
          <span>{formatItemPrice(totalExclVat())}</span>
        </div>
      ) : null}

      {showVATs() && taxPercentages().length > 0 ? (
        <>
          {taxPercentages().map((tax: any, index: number) => (
            <div className="flex justify-between text-gray-600 text-sm" key={index}>
              <span>{tax.percentage}% {getLabel('vat', 'VAT')}:</span>
              <span>{formatItemPrice(Number(tax.total))}</span>
            </div>
          ))}
        </>
      ) : null}

      {showTotalVat() ? (
        <div className="flex justify-between text-gray-600 text-sm">
          <span>{getLabel('totalVat', 'Total VAT:')}</span>
          <span>{formatItemPrice(totalVat())}</span>
        </div>
      ) : null}

      <div className="flex justify-between text-xl font-bold pt-4 border-t text-gray-900 mt-2">
        <span>{getLabel('total', 'Total:')}</span>
        <span>{formatItemPrice(totalInclVat())}</span>
      </div>
    </div>
  );
}

export default OrderTotals;
