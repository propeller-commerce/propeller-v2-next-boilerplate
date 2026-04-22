import * as React from 'react';
import { getLabel } from '@/composables/shared/utils/labelHelpers';

export interface OrderSummaryProps {
  /** The order object from propeller-sdk-v2 */
  order: any;

  /** The CSS class for the order summary container */
  orderSummaryContainerClass?: string;

  /** Title of the order summary */
  title?: string;

  /** Show the order number */
  showOrderNumber?: boolean;

  /** Show the order date */
  showOrderDate?: boolean;

  /** Show the order status */
  showOrderStatus?: boolean;

  /** Show the order total */
  showOrderTotal?: boolean;

  /** Custom price formatting function */
  formatPrice?: (price: number) => string;

  /** Show the invoice address */
  showInvoiceAddress?: boolean;

  /** Show the delivery address */
  showDeliveryAddress?: boolean;

  /** Show payment, carrier, and delivery date info */
  showDeliveryInfo?: boolean;

  /** Show order remarks and reference */
  showRemarks?: boolean;

  /** Custom date formatting function */
  formatDate?: (dateString: string) => string;

  /** Labels for the component */
  labels?: Record<string, string>;

  /** List of countries for resolving codes to names [{code: 'NL', name: 'Netherlands'}, ...] */
  countries?: {
    code: string;
    name: string;
  }[];
}
interface OrderSummaryState {
  containerClass: () => string;
  showOrderNumber: () => boolean;
  showOrderDate: () => boolean;
  showOrderStatus: () => boolean;
  showInvoiceAddress: () => boolean;
  showDeliveryAddress: () => boolean;
  showOrderTotal: () => boolean;
  formatItemPrice: (price: number) => string;
  showDeliveryInfo: () => boolean;
  showRemarks: () => boolean;
  orderReference: () => string;
  orderRemarks: () => string;
  getLabel: (key: string, fallback: string) => string;
  getCountryName: (code: string) => string;
  formatOrderDate: (dateString: string) => string;
  orderNumber: () => string;
  orderDate: () => string;
  orderStatus: () => string;
  orderTotal: () => number;
  invoiceAddress: () => any;
  deliveryAddress: () => any;
  paymentMethod: () => string;
  carrierName: () => string;
  requestDate: () => string;
}
function OrderSummary(props: OrderSummaryProps) {
  function containerClass(): ReturnType<OrderSummaryState['containerClass']> {
    return props.orderSummaryContainerClass || 'order-summary';
  }
  function showOrderNumber(): ReturnType<OrderSummaryState['showOrderNumber']> {
    return props.showOrderNumber !== undefined ? props.showOrderNumber : true;
  }
  function showOrderDate(): ReturnType<OrderSummaryState['showOrderDate']> {
    return props.showOrderDate !== undefined ? props.showOrderDate : true;
  }
  function showOrderStatus(): ReturnType<OrderSummaryState['showOrderStatus']> {
    return props.showOrderStatus !== undefined ? props.showOrderStatus : true;
  }
  function showInvoiceAddress(): ReturnType<OrderSummaryState['showInvoiceAddress']> {
    return props.showInvoiceAddress !== undefined ? props.showInvoiceAddress : true;
  }
  function showDeliveryAddress(): ReturnType<OrderSummaryState['showDeliveryAddress']> {
    return props.showDeliveryAddress !== undefined ? props.showDeliveryAddress : true;
  }
  function showOrderTotal(): ReturnType<OrderSummaryState['showOrderTotal']> {
    return props.showOrderTotal !== undefined ? props.showOrderTotal : true;
  }
  function formatItemPrice(price: number): ReturnType<OrderSummaryState['formatItemPrice']> {
    if (props.formatPrice) {
      return props.formatPrice(price);
    }
    return '\u20AC' + Number(price || 0).toFixed(2);
  }
  function showDeliveryInfo(): ReturnType<OrderSummaryState['showDeliveryInfo']> {
    return props.showDeliveryInfo !== undefined ? props.showDeliveryInfo : true;
  }
  function showRemarks(): ReturnType<OrderSummaryState['showRemarks']> {
    return props.showRemarks !== undefined ? props.showRemarks : true;
  }
  function orderReference(): ReturnType<OrderSummaryState['orderReference']> {
    return props.order?.reference || '';
  }
  function orderRemarks(): ReturnType<OrderSummaryState['orderRemarks']> {
    return props.order?.remarks || '';
  }
  function getCountryName(code: string): ReturnType<OrderSummaryState['getCountryName']> {
    if (!code) return '';
    const list = props.countries || [];
    for (let i = 0; i < list.length; i++) {
      if (list[i].code === code) return list[i].name;
    }
    return code;
  }
  function formatOrderDate(dateString: string): ReturnType<OrderSummaryState['formatOrderDate']> {
    if (props.formatDate) {
      return props.formatDate(dateString);
    }
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }
  function orderNumber(): ReturnType<OrderSummaryState['orderNumber']> {
    return props.order?.id || '';
  }
  function orderDate(): ReturnType<OrderSummaryState['orderDate']> {
    return props.order?.createdAt || '';
  }
  function orderStatus(): ReturnType<OrderSummaryState['orderStatus']> {
    return props.order?.status || '';
  }
  function orderTotal(): ReturnType<OrderSummaryState['orderTotal']> {
    return Number(props.order?.total?.net || 0);
  }
  function invoiceAddress(): ReturnType<OrderSummaryState['invoiceAddress']> {
    const addresses = props.order?.addresses || [];
    return addresses.find((a: any) => a.type === 'invoice') || null;
  }
  function deliveryAddress(): ReturnType<OrderSummaryState['deliveryAddress']> {
    const addresses = props.order?.addresses || [];
    return addresses.find((a: any) => a.type === 'delivery') || null;
  }
  function paymentMethod(): ReturnType<OrderSummaryState['paymentMethod']> {
    return props.order?.paymentData?.method || '';
  }
  function carrierName(): ReturnType<OrderSummaryState['carrierName']> {
    return props.order?.postageData?.carrier || '';
  }
  function requestDate(): ReturnType<OrderSummaryState['requestDate']> {
    const date = props.order?.postageData?.requestDate;
    if (!date) return '';
    if (props.formatDate) {
      return props.formatDate(date);
    }
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  }
  return (
    <div className={`propeller-order-summary ${containerClass()}`}>
      {props.title ? <h2 className="propeller-order-summary__title text-xl font-bold mb-4">{props.title}</h2> : null}
      <div className="propeller-order-summary__meta grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-5 border-b border-border mb-5">
        {showOrderNumber() && orderNumber() ? (
          <div className="propeller-order-summary__meta-item" data-meta="order-number">
            <p className="propeller-order-summary__meta-label text-sm text-muted-foreground mb-1">{getLabel(props.labels, 'orderNumber', 'Order Number')}</p>
            <p className="propeller-order-summary__meta-value font-semibold">{orderNumber()}</p>
          </div>
        ) : null}
        {showOrderDate() && orderDate() ? (
          <div className="propeller-order-summary__meta-item" data-meta="order-date">
            <p className="propeller-order-summary__meta-label text-sm text-muted-foreground mb-1">{getLabel(props.labels, 'orderDate', 'Order Date')}</p>
            <p className="propeller-order-summary__meta-value font-semibold">{formatOrderDate(orderDate())}</p>
          </div>
        ) : null}
        {showOrderStatus() && orderStatus() ? (
          <div className="propeller-order-summary__meta-item" data-meta="status">
            <p className="propeller-order-summary__meta-label text-sm text-muted-foreground mb-1">{getLabel(props.labels, 'status', 'Status')}</p>
            <span className="propeller-order-summary__status inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
              {orderStatus()}
            </span>
          </div>
        ) : null}
        {showOrderTotal() ? (
          <div className="propeller-order-summary__meta-item" data-meta="total">
            <p className="propeller-order-summary__meta-label text-sm text-muted-foreground mb-1">{getLabel(props.labels, 'total', 'Total')}</p>
            <p className="propeller-order-summary__total font-bold text-lg">{formatItemPrice(orderTotal())}</p>
          </div>
        ) : null}
      </div>
      <div className="propeller-order-summary__addresses grid grid-cols-1 md:grid-cols-2 gap-6 pb-5">
        {showInvoiceAddress() ? (
          <div className="propeller-order-summary__address space-y-2" data-address="invoice">
            <h3 className="propeller-order-summary__address-title text-sm font-semibold text-muted-foreground uppercase tracking-wide">
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
                {invoiceAddress().country ? (
                  <p>{getCountryName(invoiceAddress().country)}</p>
                ) : null}
                {invoiceAddress().email ? (
                  <p className="propeller-order-summary__address-email text-muted-foreground">{invoiceAddress().email}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {showDeliveryAddress() ? (
          <div className="propeller-order-summary__address space-y-2" data-address="delivery">
            <h3 className="propeller-order-summary__address-title text-sm font-semibold text-muted-foreground uppercase tracking-wide">
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
                {deliveryAddress().country ? (
                  <p>{getCountryName(deliveryAddress().country)}</p>
                ) : null}
                {deliveryAddress().email ? (
                  <p className="propeller-order-summary__address-email text-muted-foreground">{deliveryAddress().email}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {showDeliveryInfo() && (paymentMethod() || carrierName() || requestDate()) ? (
        <div className="propeller-order-summary__info-panel bg-surface-hover p-4 rounded-control border border-border space-y-2 text-sm">
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
      ) : null}
      {showRemarks() && (orderReference() || orderRemarks()) ? (
        <div className="propeller-order-summary__remarks-panel bg-surface-hover p-4 rounded-control border border-border space-y-2 text-sm mt-4">
          {orderReference() ? (
            <div className="flex justify-between">
              <span className="font-medium">{getLabel(props.labels, 'reference', 'Reference:')}</span>
              <span>{orderReference()}</span>
            </div>
          ) : null}
          {orderRemarks() ? (
            <div className="flex justify-between">
              <span className="font-medium">{getLabel(props.labels, 'remarks', 'Remarks:')}</span>
              <span>{orderRemarks()}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default OrderSummary;
