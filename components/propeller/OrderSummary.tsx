/**
 * @rsc-safe — Pure display component. No React hooks, no event handlers, no
 * browser APIs, no context reads. Renders directly from props and can be
 * imported into a React Server Component without a 'use client' boundary.
 * Verified C0.2 (2026-05-20).
 */
import * as React from 'react';
import { getLabel } from '@/composables/shared/utils/labelHelpers';
import { getCountryName as _getCountryName } from '@/composables/shared/utils/countries';
import { formatPrice } from '@/composables/shared/utils/formatting';
import { config } from '@/data/config';

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

function OrderSummary(props: OrderSummaryProps) {
  const order = props.order;

  const containerClass = props.orderSummaryContainerClass || 'order-summary';
  const showOrderNumber = props.showOrderNumber !== undefined ? props.showOrderNumber : true;
  const showOrderDate = props.showOrderDate !== undefined ? props.showOrderDate : true;
  const showOrderStatus = props.showOrderStatus !== undefined ? props.showOrderStatus : true;
  const showInvoiceAddress =
    props.showInvoiceAddress !== undefined ? props.showInvoiceAddress : true;
  const showDeliveryAddress =
    props.showDeliveryAddress !== undefined ? props.showDeliveryAddress : true;
  const showOrderTotal = props.showOrderTotal !== undefined ? props.showOrderTotal : true;
  const showDeliveryInfo = props.showDeliveryInfo !== undefined ? props.showDeliveryInfo : true;
  const showRemarks = props.showRemarks !== undefined ? props.showRemarks : true;

  // Order field accessors — computed once per render (previously each was a
  // function redefined every render; addresses.find() ran on every JSX read).
  const orderNumber = order?.id || '';
  const orderDate = order?.createdAt || '';
  const orderStatus = order?.status || '';
  const orderTotal = Number(order?.total?.net || 0);
  const orderReference = order?.reference || '';
  const orderRemarks = order?.remarks || '';
  const paymentMethod = order?.paymentData?.method || '';
  const carrierName = order?.postageData?.carrier || '';
  const addresses = order?.addresses || [];
  const invoiceAddress = addresses.find((a: any) => a.type === 'invoice') || null;
  const deliveryAddress = addresses.find((a: any) => a.type === 'delivery') || null;

  function formatItemPrice(price: number): string {
    if (props.formatPrice) {
      return props.formatPrice(price);
    }
    return formatPrice(price || 0, { symbol: config.currency });
  }

  function formatOrderDate(dateString: string): string {
    if (props.formatDate) {
      return props.formatDate(dateString);
    }
    try {
      // Short locale format (e.g. 4/27/2026 in en-US) for visual consistency
      // with the delivery-date row directly above. Override via `formatDate`.
      return new Date(dateString).toLocaleDateString('en-US');
    } catch {
      return dateString;
    }
  }

  const requestDateRaw = order?.postageData?.requestDate;
  let requestDate = '';
  if (requestDateRaw) {
    if (props.formatDate) {
      requestDate = props.formatDate(requestDateRaw);
    } else {
      try {
        // Short locale format — matches CartOverview's delivery-date rendering
        // so checkout review and order confirmation stay consistent.
        requestDate = new Date(requestDateRaw).toLocaleDateString('en-US');
      } catch {
        requestDate = requestDateRaw;
      }
    }
  }

  const getCountryName = (code: string): string => _getCountryName(code, props.countries);

  return (
    <div className={`propeller-order-summary ${containerClass}`}>
      {props.title ? (
        <h2 className="propeller-order-summary__title text-xl font-bold mb-4">{props.title}</h2>
      ) : null}
      <div className="propeller-order-summary__meta grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-5 border-b border-border mb-5">
        {showOrderNumber && orderNumber ? (
          <div className="propeller-order-summary__meta-item" data-meta="order-number">
            <p className="propeller-order-summary__meta-label text-sm text-muted-foreground mb-1">
              {getLabel(props.labels, 'orderNumber', 'Order Number')}
            </p>
            <p className="propeller-order-summary__meta-value font-semibold">{orderNumber}</p>
          </div>
        ) : null}
        {showOrderDate && orderDate ? (
          <div className="propeller-order-summary__meta-item" data-meta="order-date">
            <p className="propeller-order-summary__meta-label text-sm text-muted-foreground mb-1">
              {getLabel(props.labels, 'orderDate', 'Order Date')}
            </p>
            <p className="propeller-order-summary__meta-value font-semibold">
              {formatOrderDate(orderDate)}
            </p>
          </div>
        ) : null}
        {showOrderStatus && orderStatus ? (
          <div className="propeller-order-summary__meta-item" data-meta="status">
            <p className="propeller-order-summary__meta-label text-sm text-muted-foreground mb-1">
              {getLabel(props.labels, 'status', 'Status')}
            </p>
            <span className="propeller-order-summary__status inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
              {orderStatus}
            </span>
          </div>
        ) : null}
        {showOrderTotal ? (
          <div className="propeller-order-summary__meta-item" data-meta="total">
            <p className="propeller-order-summary__meta-label text-sm text-muted-foreground mb-1">
              {getLabel(props.labels, 'total', 'Total')}
            </p>
            <p className="propeller-order-summary__total font-bold text-lg">
              {formatItemPrice(orderTotal)}
            </p>
          </div>
        ) : null}
      </div>
      <div className="propeller-order-summary__addresses grid grid-cols-1 md:grid-cols-2 gap-6 pb-5">
        {showInvoiceAddress ? (
          <div className="propeller-order-summary__address space-y-2" data-address="invoice">
            <h3 className="propeller-order-summary__address-title text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {getLabel(props.labels, 'invoiceAddress', 'Invoice Address')}
            </h3>
            {invoiceAddress && invoiceAddress.street ? (
              <div className="text-sm space-y-1">
                {invoiceAddress.company ? (
                  <p className="font-medium">{invoiceAddress.company}</p>
                ) : null}
                <p>
                  {[invoiceAddress.firstName, invoiceAddress.middleName, invoiceAddress.lastName]
                    .filter(Boolean)
                    .join(' ')}
                </p>
                <p>
                  {[invoiceAddress.street, invoiceAddress.number, invoiceAddress.numberExtension]
                    .filter(Boolean)
                    .join(' ')}
                </p>
                <p>{[invoiceAddress.postalCode, invoiceAddress.city].filter(Boolean).join(' ')}</p>
                {invoiceAddress.country ? <p>{getCountryName(invoiceAddress.country)}</p> : null}
                {invoiceAddress.email ? (
                  <p className="propeller-order-summary__address-email text-muted-foreground">
                    {invoiceAddress.email}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
        {showDeliveryAddress ? (
          <div className="propeller-order-summary__address space-y-2" data-address="delivery">
            <h3 className="propeller-order-summary__address-title text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {getLabel(props.labels, 'deliveryAddress', 'Delivery Address')}
            </h3>
            {deliveryAddress && deliveryAddress.street ? (
              <div className="text-sm space-y-1">
                {deliveryAddress.company ? (
                  <p className="font-medium">{deliveryAddress.company}</p>
                ) : null}
                <p>
                  {[deliveryAddress.firstName, deliveryAddress.middleName, deliveryAddress.lastName]
                    .filter(Boolean)
                    .join(' ')}
                </p>
                <p>
                  {[deliveryAddress.street, deliveryAddress.number, deliveryAddress.numberExtension]
                    .filter(Boolean)
                    .join(' ')}
                </p>
                <p>{[deliveryAddress.postalCode, deliveryAddress.city].filter(Boolean).join(' ')}</p>
                {deliveryAddress.country ? <p>{getCountryName(deliveryAddress.country)}</p> : null}
                {deliveryAddress.email ? (
                  <p className="propeller-order-summary__address-email text-muted-foreground">
                    {deliveryAddress.email}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {showDeliveryInfo && (paymentMethod || carrierName || requestDate) ? (
        <div className="propeller-order-summary__info-panel bg-surface-hover p-4 rounded-control border border-border space-y-2 text-sm">
          {paymentMethod ? (
            <div className="flex justify-between">
              <span className="font-medium">{getLabel(props.labels, 'payment', 'Payment:')}</span>
              <span>{paymentMethod}</span>
            </div>
          ) : null}
          {carrierName ? (
            <div className="flex justify-between">
              <span className="font-medium">{getLabel(props.labels, 'carrier', 'Carrier:')}</span>
              <span>{carrierName}</span>
            </div>
          ) : null}
          {requestDate ? (
            <div className="flex justify-between">
              <span className="font-medium">
                {getLabel(props.labels, 'deliveryDate', 'Delivery Date:')}
              </span>
              <span>{requestDate}</span>
            </div>
          ) : null}
        </div>
      ) : null}
      {showRemarks && (orderReference || orderRemarks) ? (
        <div className="propeller-order-summary__remarks-panel bg-surface-hover p-4 rounded-control border border-border space-y-2 text-sm mt-4">
          {orderReference ? (
            <div className="flex justify-between">
              <span className="font-medium">
                {getLabel(props.labels, 'reference', 'Reference:')}
              </span>
              <span>{orderReference}</span>
            </div>
          ) : null}
          {orderRemarks ? (
            <div className="flex justify-between">
              <span className="font-medium">{getLabel(props.labels, 'remarks', 'Remarks:')}</span>
              <span>{orderRemarks}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default OrderSummary;
