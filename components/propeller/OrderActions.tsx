'use client';
import * as React from 'react';

import { useState } from 'react';
import {
  GraphQLClient,
  Order,
  Cart,
  Contact,
  Customer,
  MediaImageProductSearchInput,
  TransformationsInput,
  Company,
} from 'propeller-sdk-v2';
import { useOrders } from '@/composables/react/useOrders';

export interface OrderActionsProps {
  /** GraphQL client for the Propeller SDK */
  graphqlClient: GraphQLClient;
  /** The order to act upon */
  order: Order;
  /** The authenticated user */
  user: Contact | Customer | null;
  /** Cart ID — if provided, re-order adds items to this cart */
  cartId?: string;
  /** Active company ID from the company switcher */
  companyId?: number;
  /** Configuration object (imageSearchFiltersGrid, imageVariantFiltersSmall, etc.) */
  configuration?: any;
  /** Label overrides for UI strings */
  labels?: Record<string, string>;
  /** Additional CSS class for the root element */
  className?: string;
  /** Callback when a new cart is created during re-order */
  onCartCreated?: (cart: Cart) => void;
  /** Callback fired after all re-order items have been added */
  afterReorder?: (cart: Cart) => void;
}
export interface CartQueryVariables {
  cartId: string;
  language: string;
  imageSearchFilters: MediaImageProductSearchInput;
  imageVariantFilters: TransformationsInput;
}

function OrderActions(props: OrderActionsProps) {
  const [reordering, setReordering] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const { downloadPdf, reorder } = useOrders({
    graphqlClient: props.graphqlClient,
    user: props.user as any,
    companyId: props.companyId,
    configuration: props.configuration,
    onCartCreated: props.onCartCreated,
    afterReorder: props.afterReorder,
  });

  function showToast(message: string, type: string) {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  }

  function dismissToast() {
    setToastVisible(false);
  }

  function getLabel(key: string, fallback: string): string {
    return (props.labels as any)?.[key] || fallback;
  }

  async function handleDownloadPDF() {
    if (!props.order?.id) return;
    setDownloading(true);
    try {
      const result = await downloadPdf(props.order);
      if (result.success) {
        showToast(getLabel('pdfSuccess', 'PDF downloaded successfully'), 'success');
      } else {
        showToast(getLabel('pdfError', 'Failed to download PDF'), 'error');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showToast(getLabel('pdfError', 'Failed to download PDF'), 'error');
    } finally {
      setDownloading(false);
    }
  }

  async function handleReorder() {
    if (!props.order?.items) return;
    setReordering(true);
    try {
      const result = await reorder(props.order, props.cartId);
      if (result.success) {
        showToast(getLabel('reorderSuccess', 'All items added to cart'), 'success');
      } else {
        showToast(getLabel('reorderError', 'Failed to add items to cart'), 'error');
      }
    } catch (error) {
      console.error('Error during re-order:', error);
      showToast(getLabel('reorderError', 'Failed to add items to cart'), 'error');
    } finally {
      setReordering(false);
    }
  }

  return (
    <div className={props.className}>
      <div className="flex flex-row items-center gap-3 flex-shrink-0">
        <button
          type="button"
          className="text-primary hover:text-primary/80 text-sm font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={(event) => handleDownloadPDF()}
          disabled={downloading}
        >
          {downloading ? <>{getLabel('downloadingPdf', 'Downloading...')}</> : null}
          {!downloading ? <>{getLabel('downloadPdf', 'Order confirmation (PDF)')}</> : null}
        </button>
        <button
          type="button"
          className="text-primary hover:text-primary/80 text-sm font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={(event) => handleReorder()}
          disabled={reordering}
        >
          {reordering ? <>{getLabel('reordering', 'Adding items...')}</> : null}
          {!reordering ? <>{getLabel('reorder', 'Order again')}</> : null}
        </button>
      </div>
      {toastVisible ? (
        <div
          className={`fixed top-4 right-4 z-50 flex items-start gap-3 w-80 rounded-lg shadow-lg p-4 ${toastType === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}
        >
          <div
            className={`flex-shrink-0 w-5 h-5 mt-0.5 ${toastType === 'success' ? 'text-green-500' : 'text-red-500'}`}
          >
            {toastType === 'success' ? (
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : null}
            {toastType === 'error' ? (
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
            ) : null}
          </div>
          <p
            className={`flex-1 text-sm font-medium ${toastType === 'success' ? 'text-green-800' : 'text-red-800'}`}
          >
            {toastMessage}
          </p>
          <button
            type="button"
            onClick={(event) => dismissToast()}
            className={`flex-shrink-0 rounded focus:outline-none ${toastType === 'success' ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'}`}
          >
            <svg
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              className="h-4 w-4"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default OrderActions;
