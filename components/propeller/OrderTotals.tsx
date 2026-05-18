import * as React from 'react';
import { Order, OrderDiscountType } from 'propeller-sdk-v2';
import { getLabel } from '@/composables/shared/utils/labelHelpers';
import { formatPrice } from '@/composables/shared/utils/formatting';
import { config } from '@/data/config';

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
  function formatItemPrice(price: number): ReturnType<OrderTotalsState['formatItemPrice']> {
    if (props.formatPrice) {
      return props.formatPrice(price);
    }
    return formatPrice(price || 0, { symbol: config.currency });
  }
  function subtotal(): ReturnType<OrderTotalsState['subtotal']> {
    return (props.order as any)?.total?.gross || 0;
  }
  function hasDiscount(): ReturnType<OrderTotalsState['hasDiscount']> {
    const total = (props.order as any)?.total;
    return (
      total?.discountType &&
      total.discountType !== OrderDiscountType.N &&
      total.discountValue > 0
    );
  }
  function discountDisplay(): ReturnType<OrderTotalsState['discountDisplay']> {
    const total = (props.order as any)?.total;
    if (!total) return '';
    if (total.discountType === OrderDiscountType.A) {
      return '-' + formatItemPrice(total.discountValue);
    }
    if (total.discountType === OrderDiscountType.P) {
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
    <div className="propeller-order-totals w-full md:w-80 bg-card p-6 rounded-container shadow space-y-3">
      {showSubtotal() ? (
        <div className="propeller-order-totals__row flex justify-between text-muted-foreground" data-row="subtotal">
          <span className="propeller-order-totals__label">{getLabel(props.labels, 'subtotal', 'Subtotal:')}</span>
          <span className="propeller-order-totals__value">{formatItemPrice(subtotal())}</span>
        </div>
      ) : null}
      {showDiscount() && hasDiscount() ? (
        <>
          <div className="propeller-order-totals__row flex justify-between text-secondary" data-row="discount">
            <span className="propeller-order-totals__label">{getLabel(props.labels, 'discount', 'Discount:')}</span>
            <span className="propeller-order-totals__value">{discountDisplay()}</span>
          </div>
          <div className="propeller-order-totals__row flex justify-between text-muted-foreground border-t pt-2 border-dashed" data-row="subtotal-with-discount">
            <span className="propeller-order-totals__label">{getLabel(props.labels, 'subtotalWithDiscount', 'Subtotal with discount:')}</span>
            <span className="propeller-order-totals__value">{formatItemPrice(subtotalWithDiscount())}</span>
          </div>
        </>
      ) : null}
      {hasTransactionCosts() ? (
        <div className="propeller-order-totals__row flex justify-between text-muted-foreground" data-row="transaction-costs">
          <span className="propeller-order-totals__label">{getLabel(props.labels, 'transactionCosts', 'Transaction costs:')}</span>
          <span className="propeller-order-totals__value">{formatItemPrice(transactionCosts())}</span>
        </div>
      ) : null}
      {showShippingCosts() && hasShippingCosts() ? (
        <div className="propeller-order-totals__row flex justify-between text-muted-foreground" data-row="shipping-costs">
          <span className="propeller-order-totals__label">{getLabel(props.labels, 'shippingCosts', 'Shipping costs:')}</span>
          <span className="propeller-order-totals__value">{formatItemPrice(shippingCosts())}</span>
        </div>
      ) : null}
      {showTotalExclVat() ? (
        <div className="propeller-order-totals__row flex justify-between text-muted-foreground pt-2 border-t" data-row="total-excl-vat">
          <span className="propeller-order-totals__label">{getLabel(props.labels, 'totalExclVat', 'Total excl. VAT:')}</span>
          <span className="propeller-order-totals__value">{formatItemPrice(totalExclVat())}</span>
        </div>
      ) : null}
      {showVATs() && taxPercentages().length > 0 ? (
        <>
          {taxPercentages()?.map((tax, index) => (
            <div className="propeller-order-totals__row flex justify-between text-muted-foreground text-sm" key={index} data-row="vat-line">
              <span className="propeller-order-totals__label">
                {tax.percentage}% {getLabel(props.labels, 'vat', 'VAT')}:
              </span>
              <span className="propeller-order-totals__value">{formatItemPrice(Number(tax.total))}</span>
            </div>
          ))}
        </>
      ) : null}
      {showTotalVat() ? (
        <div className="propeller-order-totals__row flex justify-between text-muted-foreground text-sm" data-row="total-vat">
          <span className="propeller-order-totals__label">{getLabel(props.labels, 'totalVat', 'Total VAT:')}</span>
          <span className="propeller-order-totals__value">{formatItemPrice(totalVat())}</span>
        </div>
      ) : null}
      <div className="propeller-order-totals__row propeller-order-totals__row--total flex justify-between text-xl font-bold pt-4 border-t text-foreground mt-2" data-row="total">
        <span className="propeller-order-totals__label">{getLabel(props.labels, 'total', 'Total:')}</span>
        <span className="propeller-order-totals__value">{formatItemPrice(totalInclVat())}</span>
      </div>
    </div>
  );
}

export default OrderTotals;
