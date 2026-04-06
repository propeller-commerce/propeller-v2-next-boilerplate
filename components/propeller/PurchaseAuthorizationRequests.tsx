'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import {
  Contact,
  Customer,
  GraphQLClient,
  Cart,
  CartService,
  CartSearchInput,
  Enums,
  CartAddress,
  CartMainItem,
  CartQueryVariables,
  CartAcceptPurchaseAuthorizationVariables,
} from 'propeller-sdk-v2';

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
interface PurchaseAuthorizationRequestsState {
  carts: Cart[];
  loading: boolean;
  selectedCart: Cart | null;
  modalLoading: boolean;
  acceptLoading: boolean;
  isAuthManager: () => boolean;
  getLabel: (key: string, fallback: string) => string;
  formatDate: (dateStr: string) => string;
  formatPrice: (price: number) => string;
  getTotalQuantity: (cart: Cart) => number;
  getContactName: (deliveryAddress: CartAddress) => string;
  getModalItems: () => any[];
  loadCarts: () => Promise<void>;
  handleViewCart: (cart: Cart) => Promise<void>;
  handleAcceptRequest: () => Promise<void>;
  closeModal: () => void;
}
function PurchaseAuthorizationRequests(props: PurchaseAuthorizationRequestsProps) {
  const [carts, setCarts] = useState<PurchaseAuthorizationRequestsState['carts']>(() => []);
  const [loading, setLoading] = useState<PurchaseAuthorizationRequestsState['loading']>(() => true);
  const [selectedCart, setSelectedCart] = useState<
    PurchaseAuthorizationRequestsState['selectedCart']
  >(() => null);
  const [modalLoading, setModalLoading] = useState<
    PurchaseAuthorizationRequestsState['modalLoading']
  >(() => false);
  const [acceptLoading, setAcceptLoading] = useState<
    PurchaseAuthorizationRequestsState['acceptLoading']
  >(() => false);
  function isAuthManager(): ReturnType<PurchaseAuthorizationRequestsState['isAuthManager']> {
    if (!props.user || !('contactId' in props.user)) return false;
    const pacData = (props.user as any).purchaseAuthorizationConfigs;
    const items: any[] = pacData?.items ?? pacData?._items ?? [];
    return items.some((pac: any) => {
      const role = pac.purchaseRole ?? pac._purchaseRole;
      const pacCompanyId =
        pac.company?.companyId ??
        pac.company?._companyId ??
        pac._company?.companyId ??
        pac._company?._companyId;
      return role === Enums.PurchaseRole.AUTHORIZATION_MANAGER && pacCompanyId === props.companyId;
    });
  }
  function getLabel(
    key: string,
    fallback: string
  ): ReturnType<PurchaseAuthorizationRequestsState['getLabel']> {
    return (props.labels as any)?.[key] || fallback;
  }
  function formatDate(
    dateStr: string
  ): ReturnType<PurchaseAuthorizationRequestsState['formatDate']> {
    if (props.formatDate) return props.formatDate(dateStr);
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
  }
  function formatPrice(
    price: number
  ): ReturnType<PurchaseAuthorizationRequestsState['formatPrice']> {
    if (props.formatPrice) return props.formatPrice(price);
    if (!price) return '-';
    return `€${Number(price).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  function getTotalQuantity(
    cart: Cart
  ): ReturnType<PurchaseAuthorizationRequestsState['getTotalQuantity']> {
    const items = cart?.items || [];
    return items.reduce((sum: number, item: CartMainItem) => sum + (item.quantity || 0), 0);
  }
  function getContactName(
    deliveryAddress: CartAddress
  ): ReturnType<PurchaseAuthorizationRequestsState['getContactName']> {
    if (!deliveryAddress) return '';
    const firstName = deliveryAddress.firstName ?? '';
    const middleName = deliveryAddress.middleName ?? '';
    const lastName = deliveryAddress.lastName ?? '';
    return [firstName, middleName, lastName].filter(Boolean).join(' ');
  }
  function getModalItems(): ReturnType<PurchaseAuthorizationRequestsState['getModalItems']> {
    if (!selectedCart) return [];
    return (selectedCart as Cart).items || [];
  }
  async function loadCarts(): ReturnType<PurchaseAuthorizationRequestsState['loadCarts']> {
    if (!props.graphqlClient || !props.companyId) return;
    setLoading(true);
    try {
      const cartService = new CartService(props.graphqlClient);
      const searchInput: CartSearchInput = {
        statuses: [Enums.CartStatus.PENDING_PURCHASE_AUTHORIZATION as any],
        companyIds: [props.companyId],
      };
      const response = await cartService.getCarts(searchInput);
      setCarts(response?.items || []);
    } catch (err: any) {
      if (props.onError) {
        props.onError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setLoading(false);
    }
  }
  async function handleViewCart(
    cart: Cart
  ): ReturnType<PurchaseAuthorizationRequestsState['handleViewCart']> {
    setSelectedCart(cart);
    setModalLoading(true);
    try {
      const cartService = new CartService(props.graphqlClient);
      const fullCart = await cartService.getCart({
        cartId: cart.cartId,
        language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
        imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
        imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
      });
      setSelectedCart(fullCart);
    } catch (err: any) {
      if (props.onError) {
        props.onError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setModalLoading(false);
    }
  }
  async function handleAcceptRequest(): ReturnType<
    PurchaseAuthorizationRequestsState['handleAcceptRequest']
  > {
    if (!selectedCart) return;
    setAcceptLoading(true);
    const cartId = selectedCart.cartId;
    try {
      let cartForCallback: any = selectedCart;
      if (props.onAcceptRequest) {
        props.onAcceptRequest(cartId);
      } else {
        const cartService = new CartService(props.graphqlClient);
        const cartVars: CartAcceptPurchaseAuthorizationVariables = {
          id: selectedCart.cartId,
          input: {
            contactId: (props.user as Contact).contactId,
          },
          imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
          imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
          language: props.configuration?.language || 'NL',
        };
        cartForCallback = await cartService.acceptPurchaseAuthorizationRequest(cartVars);
      }
      if (props.afterAcceptRequest) {
        props.afterAcceptRequest(cartForCallback as Cart);
      }
      setSelectedCart(null);
      await loadCarts();
    } catch (err: any) {
      if (props.onError) {
        props.onError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setAcceptLoading(false);
    }
  }
  function closeModal(): ReturnType<PurchaseAuthorizationRequestsState['closeModal']> {
    setSelectedCart(null);
  }
  useEffect(() => {
    if (props.graphqlClient && props.companyId) {
      loadCarts();
    }
  }, [props.companyId]);
  return (
    <div className={`purchase-authorization-requests ${props.className || ''}`}>
      {isAuthManager() ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{getLabel('title', 'Authorization Requests')}</h2>
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
                          {getLabel('colId', '#')}
                        </th>
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
                      {carts?.map((cart, index) => (
                        <tr className="hover:bg-muted/30 transition-colors" key={index}>
                          <td className="px-4 py-3 text-muted-foreground" />
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(cart.lastModifiedAt ?? cart._lastModifiedAt ?? '')}
                          </td>
                          <td className="px-4 py-3">{getTotalQuantity(cart)}</td>
                          <td className="px-4 py-3 font-medium">
                            {formatPrice(cart.total?.totalNet ?? 0)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium">
                              {getContactName(cart.deliveryAddress)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {cart.deliveryAddress?.email}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="px-3 py-1.5 text-sm border border-input rounded-md bg-background hover:bg-muted/50 transition-colors"
                              onClick={(event) => handleViewCart(cart)}
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
          {!!selectedCart ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
              <div className="fixed inset-0 bg-gray-500/20" onClick={(event) => closeModal()} />
              <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                  <h3 className="text-base font-semibold text-gray-900">
                    {getLabel('modalTitle', 'Authorization Request')}
                  </h3>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                    onClick={(event) => closeModal()}
                  >
                    <svg
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="h-5 w-5"
                      strokeWidth={2}
                    >
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
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          {getLabel('requesterInfo', 'Requester')}
                        </h4>
                        <p className="text-sm font-medium">
                          {getContactName(selectedCart?.deliveryAddress as CartAddress)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedCart?.deliveryAddress?.email}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
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
                              {getModalItems()?.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="px-3 py-2">
                                    {item.product?.names?.[0]?.value ??
                                      item._product?.names?.[0]?.value ??
                                      ''}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {item.quantity ?? item._quantity ?? 0}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {formatPrice(
                                      (item.quantity ?? item._quantity ?? 0) > 0
                                        ? (item.totalSum ?? item._totalSum ?? 0) /
                                            (item.quantity ?? item._quantity ?? 1)
                                        : 0
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-right font-medium">
                                    {formatPrice(item.totalSumNet ?? item._totalSumNet ?? 0)}
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
                          <span>
                            {formatPrice(
                              (selectedCart as any)?.total?.totalGross ??
                                (selectedCart as any)?._total?.totalGross ??
                                (selectedCart as any)?._total?._totalGross ??
                                0
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>{getLabel('totalVat', 'VAT:')}</span>
                          <span>
                            {formatPrice(
                              ((selectedCart as any)?.total?.totalNet ??
                                (selectedCart as any)?._total?.totalNet ??
                                (selectedCart as any)?._total?._totalNet ??
                                0) -
                                ((selectedCart as any)?.total?.totalGross ??
                                  (selectedCart as any)?._total?.totalGross ??
                                  (selectedCart as any)?._total?._totalGross ??
                                  0)
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                          <span>{getLabel('total', 'Total:')}</span>
                          <span>
                            {formatPrice(
                              (selectedCart as any)?.total?.totalNet ??
                                (selectedCart as any)?._total?.totalNet ??
                                (selectedCart as any)?._total?._totalNet ??
                                0
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                      <button
                        type="button"
                        className="flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        onClick={(event) => closeModal()}
                      >
                        {getLabel('cancel', 'Cancel')}
                      </button>
                      <button
                        type="button"
                        className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={(event) => handleAcceptRequest()}
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
