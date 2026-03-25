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
interface OrderTotalsState {
  title: () => string;
  showSubtotal: () => boolean;
  showDiscount: () => boolean;
  showShippingCosts: () => boolean;
  showVATs: () => boolean;
  showTotalExclVat: () => boolean;
  showTotalVat: () => boolean;
  getLabel: (key: string, fallback: string) => string;
  formatItemPrice: (price: number) => string;
  subtotal: () => number;
  hasDiscount: () => boolean;
  discountDisplay: () => string;
  subtotalWithDiscount: () => number;
  hasTransactionCosts: () => boolean;
  transactionCosts: () => number;
  hasShippingCosts: () => boolean;
  shippingCosts: () => number;
  totalExclVat: () => number;
  taxPercentages: () => any[];
  totalInclVat: () => number;
  totalVat: () => number;
}

function OrderTotals(props: OrderTotalsProps) {
  function title(): ReturnType<OrderTotalsState['title']> {
    return props.title || 'Order summary';
  }

  function showSubtotal(): ReturnType<OrderTotalsState['showSubtotal']> {
    return props.showSubtotal !== undefined ? props.showSubtotal : true;
  }

  function showDiscount(): ReturnType<OrderTotalsState['showDiscount']> {
    return props.showDiscount !== undefined ? props.showDiscount : true;
  }

  function showShippingCosts(): ReturnType<OrderTotalsState['showShippingCosts']> {
    return props.showShippingCosts !== undefined ? props.showShippingCosts : true;
  }

  function showVATs(): ReturnType<OrderTotalsState['showVATs']> {
    return props.showVATs !== undefined ? props.showVATs : true;
  }

  function showTotalExclVat(): ReturnType<OrderTotalsState['showTotalExclVat']> {
    return props.showTotalExclVat !== undefined ? props.showTotalExclVat : true;
  }

  function showTotalVat(): ReturnType<OrderTotalsState['showTotalVat']> {
    return props.showTotalVat !== undefined ? props.showTotalVat : true;
  }

  function getLabel(key: string, fallback: string): ReturnType<OrderTotalsState['getLabel']> {
    return props.labels?.[key] || fallback;
  }

  function formatItemPrice(price: number): ReturnType<OrderTotalsState['formatItemPrice']> {
    if (props.formatPrice) {
      return props.formatPrice(price);
    }
    return '€' + Number(price || 0).toFixed(2);
  }

  function subtotal(): ReturnType<OrderTotalsState['subtotal']> {
    return (props.order as any)?.total?.gross || 0;
  }

  function hasDiscount(): ReturnType<OrderTotalsState['hasDiscount']> {
    const total = (props.order as any)?.total;
    return (
      total?.discountType &&
      total.discountType !== Enums.OrderDiscountType.N &&
      total.discountValue > 0
    );
  }

  function discountDisplay(): ReturnType<OrderTotalsState['discountDisplay']> {
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

  function subtotalWithDiscount(): ReturnType<OrderTotalsState['subtotalWithDiscount']> {
    const total = (props.order as any)?.total;
    return (total?.gross || 0) - (total?.discountValue || 0);
  }

  function hasTransactionCosts(): ReturnType<OrderTotalsState['hasTransactionCosts']> {
    return (props.order as any)?.paymentData?.gross > 0;
  }

  function transactionCosts(): ReturnType<OrderTotalsState['transactionCosts']> {
    return Number((props.order as any)?.paymentData?.gross || 0);
  }

  function hasShippingCosts(): ReturnType<OrderTotalsState['hasShippingCosts']> {
    return (props.order as any)?.postageData?.gross > 0;
  }

  function shippingCosts(): ReturnType<OrderTotalsState['shippingCosts']> {
    return Number((props.order as any)?.postageData?.gross || 0);
  }

  function totalExclVat(): ReturnType<OrderTotalsState['totalExclVat']> {
    return (props.order as any)?.total?.gross || 0;
  }

  function taxPercentages(): ReturnType<OrderTotalsState['taxPercentages']> {
    const taxes = (props.order as any)?.total?.taxPercentages || [];
    return taxes.filter((tax: any) => tax.percentage > 0 && tax.total > 0);
  }

  function totalInclVat(): ReturnType<OrderTotalsState['totalInclVat']> {
    return (props.order as any)?.total?.net || 0;
  }

  function totalVat(): ReturnType<OrderTotalsState['totalVat']> {
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
          <div className="flex justify-between text-secondary">
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
          {taxPercentages()?.map((tax, index) => (
            <div className="flex justify-between text-gray-600 text-sm" key={index}>
              <span>
                {tax.percentage}% {getLabel('vat', 'VAT')}:
              </span>
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
