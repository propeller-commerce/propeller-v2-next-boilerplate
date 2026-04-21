'use client';
import * as React from 'react';

import { Contact, Customer, GraphQLClient, Cart } from 'propeller-sdk-v2';
import { usePurchaseAuthorizationRequests } from '@/composables/react/usePurchaseAuthorization';

export interface PurchaseAuthorizationRequestsProps {
  /** GraphQL client for the Propeller SDK */
  graphqlClient: GraphQLClient;

  /** The logged-in user */
  user: Contact | Customer;

  /** The companyId of the current selected company */
  companyId: number;

  /**
   * Override: fires instead of the default CartService.acceptPurchaseAuthorizationRequest() call.
   * Receives the cartId string.
   */
  onAcceptRequest?: (cartId: string) => void;

  /**
   * Fires after a purchase authorization request has been accepted.
   * Receives the full accepted Cart object (or the selectedCart if onAcceptRequest override was used).
   */
  afterAcceptRequest?: (cart: Cart) => void;

  /** Format date */
  formatDate?: (dateString: string) => string;

  /** Format price */
  formatPrice?: (price: number) => string;

  /** Labels for the component */
  labels?: Record<string, string>;

  /** Additional CSS class for the root element */
  className?: string;

  /**
   * App configuration passthrough.
   * Used for imageSearchFiltersGrid, imageVariantFiltersSmall when fetching cart detail.
   */
  configuration?: Record<string, any>;

  /** Called when an SDK operation fails; receives the normalized error */
  onError?: (err: Error) => void;
}
function PurchaseAuthorizationRequests(props: PurchaseAuthorizationRequestsProps) {
  const {
    carts, loading, selectedCart, modalLoading, acceptLoading, isAuthManager,
    getTotalQuantity, getContactName, getModalItems,
    handleViewCart, handleAcceptRequest, closeModal,
  } = usePurchaseAuthorizationRequests({
    graphqlClient: props.graphqlClient,
    user: props.user,
    companyId: props.companyId,
    configuration: props.configuration,
    onAcceptRequest: props.onAcceptRequest,
    afterAcceptRequest: props.afterAcceptRequest,
    onError: props.onError,
  });

  function getLabel(key: string, fallback: string): string {
    return props.labels?.[key] || fallback;
  }

  function formatDate(dateStr: string): string {
    if (props.formatDate) return props.formatDate(dateStr);
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  }

  function formatPrice(price: number): string {
    if (props.formatPrice) return props.formatPrice(price);
    if (!price) return '-';
    return `€${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <div className={`propeller-purchase-authorization-requests ${props.className || ''}`}>
      {isAuthManager ? (
        <div className="propeller-purchase-authorization-requests__content space-y-4">
          <h2 className="propeller-purchase-authorization-requests__title text-xl font-semibold">{getLabel('title', 'Authorization Requests')}</h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : null}
          {!loading ? (
            <>
              {carts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {getLabel('empty', 'No pending authorization requests')}
                </div>
              ) : null}
              {carts.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {getLabel('colDate', 'Date')}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {getLabel('colQuantity', 'Quantity')}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {getLabel('colTotal', 'Total')}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {getLabel('colRequestedBy', 'Requested by')}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {getLabel('colActions', 'Actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {carts.map((cart, index) => (
                        <tr className="hover:bg-muted/30 transition-colors" key={index}>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(cart.lastModifiedAt ?? '')}
                          </td>
                          <td className="px-4 py-3">{getTotalQuantity(cart)}</td>
                          <td className="px-4 py-3 font-medium">
                            {formatPrice(cart.total?.totalNet ?? 0)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {getContactName(cart.contact)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {cart.contact?.email}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="px-3 py-1.5 text-sm border border-input rounded-md bg-background hover:bg-muted/50 transition-colors"
                              onClick={() => handleViewCart(cart)}
                            >
                              {getLabel('view', 'View')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </>
          ) : null}
          {selectedCart ? (
            <div className="propeller-purchase-authorization-requests__modal fixed inset-0 z-50 flex items-center justify-center px-4">
              <div className="propeller-purchase-authorization-requests__modal-backdrop fixed inset-0 bg-foreground/20" onClick={() => closeModal()} />
              <div className="propeller-purchase-authorization-requests__modal-content relative w-full max-w-2xl bg-card rounded-container shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="propeller-purchase-authorization-requests__modal-header flex items-center justify-between px-6 py-4 border-b border-border-subtle flex-shrink-0">
                  <h3 className="propeller-purchase-authorization-requests__modal-title text-base font-semibold text-foreground">
                    {getLabel('modalTitle', 'Authorization Request')}
                  </h3>
                  <button
                    type="button"
                    className="propeller-purchase-authorization-requests__modal-close text-foreground-subtle hover:text-foreground focus:outline-none"
                    onClick={() => closeModal()}
                  >
                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-5 w-5" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {modalLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : null}
                {!modalLoading ? (
                  <>
                    <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
                      <div>
                        <h4 className="propeller-purchase-authorization-requests__modal-section-title text-sm font-semibold text-muted-foreground mb-2">
                          {getLabel('requesterInfo', 'Requester')}
                        </h4>
                        <p className="text-sm font-medium">
                          {getContactName(selectedCart?.contact as Contact)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedCart?.contact?.email}
                        </p>
                      </div>
                      <div>
                        <h4 className="propeller-purchase-authorization-requests__modal-section-title text-sm font-semibold text-muted-foreground mb-2">
                          {getLabel('itemsTitle', 'Items')}
                        </h4>
                        <div className="overflow-x-auto rounded border border-border">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b border-border">
                              <tr>
                                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                  {getLabel('itemProduct', 'Product')}
                                </th>
                                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                                  {getLabel('itemQty', 'Qty')}
                                </th>
                                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                                  {getLabel('itemUnitPrice', 'Unit price')}
                                </th>
                                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                                  {getLabel('itemTotal', 'Total')}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {getModalItems().map((item, idx) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2">{item.product?.names?.[0]?.value ?? ''}</td>
                                  <td className="px-3 py-2 text-right">{item.quantity ?? 0}</td>
                                  <td className="px-3 py-2 text-right">
                                    {formatPrice(
                                      (item.quantity ?? 0) > 0
                                        ? (item.totalSum ?? 0) / (item.quantity ?? 1)
                                        : 0
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium">
                                    {formatPrice(item.totalSumNet ?? 0)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div className="border-t border-border pt-4 space-y-2 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>{getLabel('totalExclVat', 'Total excl. VAT:')}</span>
                          <span>{formatPrice(selectedCart?.total?.totalGross ?? 0)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{getLabel('totalVat', 'VAT:')}</span>
                          <span>
                            {formatPrice((selectedCart?.total?.totalNet ?? 0) - (selectedCart?.total?.totalGross ?? 0))}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                          <span>{getLabel('total', 'Total:')}</span>
                          <span>{formatPrice(selectedCart?.total?.totalNet ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="propeller-purchase-authorization-requests__modal-actions flex gap-3 px-6 py-4 border-t border-border-subtle flex-shrink-0">
                      <button
                        type="button"
                        className="propeller-purchase-authorization-requests__modal-cancel flex-1 inline-flex justify-center rounded-control border border-input bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        onClick={() => closeModal()}
                      >
                        {getLabel('cancel', 'Cancel')}
                      </button>
                      <button
                        type="button"
                        className="propeller-purchase-authorization-requests__modal-accept flex-1 inline-flex justify-center rounded-control border border-transparent bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleAcceptRequest()}
                        disabled={acceptLoading}
                      >
                        {acceptLoading ? <>{getLabel('accepting', 'Accepting...')}</> : null}
                        {!acceptLoading ? <>{getLabel('acceptRequest', 'Accept request')}</> : null}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default PurchaseAuthorizationRequests;
