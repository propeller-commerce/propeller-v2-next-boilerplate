'use client';
import * as React from 'react';

import { useState } from 'react';
import { Contact, Customer, GraphQLClient, Cart } from 'propeller-sdk-v2';
import { usePurchaseAuthorizationRequests } from '@/composables/react/usePurchaseAuthorization';
import { getLabel } from '@/composables/shared/utils/labelHelpers';
import { getLanguageString } from '@/composables/shared/utils/languageResolver';
import { formatPrice as _formatPrice } from '@/composables/shared/utils/formatting';

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

  /**
   * Override: fires instead of the default CartService.deleteCart() call.
   * Receives the cartId string.
   */
  onDeleteRequest?: (cartId: string) => void;

  /**
   * Fires after a purchase authorization request has been deleted (cart removed).
   * Receives the deleted cart's id.
   */
  afterDeleteRequest?: (cartId: string) => void;

  /** Format date */
  formatDate?: (dateString: string) => string;

  /** Format price */
  formatPrice?: (price: number) => string;

  /** Labels for the component */
  labels?: Record<string, string>;

  /** Language used to resolve localized product names in the items table. Defaults to 'NL'. */
  language?: string;

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
    carts, loading, selectedCart, modalLoading, acceptLoading, deleteLoading, isAuthManager,
    getTotalQuantity, getContactName, getModalItems,
    handleViewCart, handleAcceptRequest, handleDeleteRequest, closeModal,
  } = usePurchaseAuthorizationRequests({
    graphqlClient: props.graphqlClient,
    user: props.user,
    companyId: props.companyId,
    configuration: props.configuration,
    onAcceptRequest: props.onAcceptRequest,
    afterAcceptRequest: props.afterAcceptRequest,
    onDeleteRequest: props.onDeleteRequest,
    afterDeleteRequest: props.afterDeleteRequest,
    onError: props.onError,
  });

  // Two-step delete UX: clicking Delete in the preview modal opens a small
  // confirmation overlay. Mirrors playground-v2's `delete_purchase_authorization`
  // modal so the destructive action requires explicit user confirmation.
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const openDeleteConfirm = () => setShowDeleteConfirm(true);
  const closeDeleteConfirm = () => setShowDeleteConfirm(false);
  const confirmDelete = async () => {
    await handleDeleteRequest();
    setShowDeleteConfirm(false);
  };

  

  function formatDate(dateStr: string): string {
    if (props.formatDate) return props.formatDate(dateStr);
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  }

  function formatPrice(price: number): string {
    if (props.formatPrice) return props.formatPrice(price);
    return _formatPrice(price, { symbol: '€' });
  }

  function getProductName(item: any): string {
    // First-class lookup: localized names array on the line item's product.
    // Falls back to bundle name (bundle items) and finally to the SKU so the
    // cell never renders empty for an item that does have data.
    const lang = props.language || 'NL';
    const fromNames = getLanguageString(item?.product?.names, lang, '');
    if (fromNames) return fromNames;
    const fromBundle = getLanguageString(item?.bundle?.names, lang, '');
    if (fromBundle) return fromBundle;
    return item?.product?.sku || '';
  }

  return (
    <div className={`propeller-purchase-authorization-requests ${props.className || ''}`}>
      {isAuthManager ? (
        <div className="propeller-purchase-authorization-requests__content space-y-4">
          <h2 className="propeller-purchase-authorization-requests__title text-xl font-semibold">{getLabel(props.labels, 'title', 'Authorization Requests')}</h2>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : null}
          {!loading ? (
            <>
              {carts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {getLabel(props.labels, 'empty', 'No pending authorization requests')}
                </div>
              ) : null}
              {carts.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {getLabel(props.labels, 'colDate', 'Date')}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {getLabel(props.labels, 'colQuantity', 'Quantity')}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {getLabel(props.labels, 'colTotal', 'Total')}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {getLabel(props.labels, 'colRequestedBy', 'Requested by')}
                        </th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                          {getLabel(props.labels, 'colActions', 'Actions')}
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
                              {getLabel(props.labels, 'view', 'View')}
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
                    {getLabel(props.labels, 'modalTitle', 'Authorization Request')}
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
                          {getLabel(props.labels, 'requesterInfo', 'Requester')}
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
                          {getLabel(props.labels, 'itemsTitle', 'Items')}
                        </h4>
                        <div className="overflow-x-auto rounded border border-border">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b border-border">
                              <tr>
                                <th className="text-left px-3 py-2 font-medium text-muted-foreground">
                                  {getLabel(props.labels, 'itemProduct', 'Product')}
                                </th>
                                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                                  {getLabel(props.labels, 'itemQty', 'Qty')}
                                </th>
                                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                                  {getLabel(props.labels, 'itemUnitPrice', 'Unit price')}
                                </th>
                                <th className="text-right px-3 py-2 font-medium text-muted-foreground">
                                  {getLabel(props.labels, 'itemTotal', 'Total')}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {getModalItems().map((item, idx) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2">{getProductName(item)}</td>
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
                          <span>{getLabel(props.labels, 'totalExclVat', 'Total excl. VAT:')}</span>
                          <span>{formatPrice(selectedCart?.total?.totalGross ?? 0)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{getLabel(props.labels, 'totalVat', 'VAT:')}</span>
                          <span>
                            {formatPrice((selectedCart?.total?.totalNet ?? 0) - (selectedCart?.total?.totalGross ?? 0))}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                          <span>{getLabel(props.labels, 'total', 'Total:')}</span>
                          <span>{formatPrice(selectedCart?.total?.totalNet ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="propeller-purchase-authorization-requests__modal-actions flex gap-3 px-6 py-4 border-t border-border-subtle flex-shrink-0">
                      <button
                        type="button"
                        className="propeller-purchase-authorization-requests__modal-delete flex-1 inline-flex justify-center rounded-control border border-input bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        onClick={() => openDeleteConfirm()}
                        disabled={deleteLoading || acceptLoading}
                      >
                        {getLabel(props.labels, 'delete', 'Delete')}
                      </button>
                      <button
                        type="button"
                        className="propeller-purchase-authorization-requests__modal-accept flex-1 inline-flex justify-center rounded-control border border-transparent bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleAcceptRequest()}
                        disabled={acceptLoading || deleteLoading}
                      >
                        {acceptLoading ? <>{getLabel(props.labels, 'accepting', 'Accepting...')}</> : null}
                        {!acceptLoading ? <>{getLabel(props.labels, 'acceptRequest', 'Accept request')}</> : null}
                      </button>
                    </div>

                    {/*
                      Delete confirmation overlay. Shown on top of the preview
                      modal when the user clicks Delete; matches the two-step
                      flow in playground-v2's `delete_purchase_authorization`
                      Bootstrap modal so destructive action requires explicit
                      consent before the cart is removed.
                    */}
                    {showDeleteConfirm ? (
                      <div className="propeller-purchase-authorization-requests__delete-confirm fixed inset-0 z-[60] flex items-center justify-center px-4">
                        <div
                          className="propeller-purchase-authorization-requests__delete-confirm-backdrop fixed inset-0 bg-foreground/40"
                          onClick={() => closeDeleteConfirm()}
                        />
                        <div className="propeller-purchase-authorization-requests__delete-confirm-content relative w-full max-w-md bg-card rounded-container shadow-2xl overflow-hidden">
                          <div className="px-6 py-4 border-b border-border-subtle">
                            <h4 className="propeller-purchase-authorization-requests__delete-confirm-title text-base font-semibold text-foreground">
                              {getLabel(props.labels, 'deleteConfirmTitle', 'Delete authorization request?')}
                            </h4>
                          </div>
                          <div className="px-6 py-4">
                            <p className="text-sm text-muted-foreground">
                              {getLabel(
                                props.labels,
                                'deleteConfirmBody',
                                'Are you sure you want to delete this authorization request? The cart will be permanently removed.',
                              )}
                            </p>
                          </div>
                          <div className="flex gap-3 px-6 py-4 border-t border-border-subtle">
                            <button
                              type="button"
                              className="flex-1 inline-flex justify-center rounded-control border border-input bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                              onClick={() => closeDeleteConfirm()}
                              disabled={deleteLoading}
                            >
                              {getLabel(props.labels, 'deleteConfirmNo', 'No')}
                            </button>
                            <button
                              type="button"
                              className="flex-1 inline-flex justify-center rounded-control border border-transparent bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={() => confirmDelete()}
                              disabled={deleteLoading}
                            >
                              {deleteLoading
                                ? getLabel(props.labels, 'deleting', 'Deleting...')
                                : getLabel(props.labels, 'deleteConfirmYes', 'Yes, delete')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
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
