'use client';
import * as React from 'react';

import { useState } from 'react';
import {
  GraphQLClient,
  OrderService,
  CartService,
  Order,
  OrderItem,
  Cart,
  Contact,
  Customer,
  Address,
  Enums,
  Base64File,
  CartChildItemInput,
  CartSearchInput,
  CartStartInput,
  CartStartVariables,
  CartAddItemVariables,
  MediaImageProductSearchInput,
  TransformationsInput,
} from 'propeller-sdk-v2';

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
interface OrderActionsState {
  reordering: boolean;
  downloading: boolean;
  toastMessage: string;
  toastType: string;
  toastVisible: boolean;
  activeCartId: string;
  showToast: (message: string, type: string) => void;
  dismissToast: () => void;
  getLabel: (key: string, fallback: string) => string;
  handleDownloadPDF: () => Promise<void>;
  initCart: () => Promise<string>;
  handleReorder: () => Promise<void>;
}
function OrderActions(props: OrderActionsProps) {
  const [reordering, setReordering] = useState<OrderActionsState['reordering']>(() => false);
  const [downloading, setDownloading] = useState<OrderActionsState['downloading']>(() => false);
  const [toastMessage, setToastMessage] = useState<OrderActionsState['toastMessage']>(() => '');
  const [toastType, setToastType] = useState<OrderActionsState['toastType']>(() => '');
  const [toastVisible, setToastVisible] = useState<OrderActionsState['toastVisible']>(() => false);
  const [activeCartId, setActiveCartId] = useState<OrderActionsState['activeCartId']>(() => '');
  function showToast(message: string, type: string): ReturnType<OrderActionsState['showToast']> {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  }
  function dismissToast(): ReturnType<OrderActionsState['dismissToast']> {
    setToastVisible(false);
  }
  function getLabel(key: string, fallback: string): ReturnType<OrderActionsState['getLabel']> {
    return (props.labels as any)?.[key] || fallback;
  }
  async function handleDownloadPDF(): ReturnType<OrderActionsState['handleDownloadPDF']> {
    if (!props.order?.id) return;
    setDownloading(true);
    try {
      const orderService = new OrderService(props.graphqlClient);
      const pdfResponse = await orderService.getOrderPDF(props.order.id);
      if (!pdfResponse) {
        showToast(getLabel('pdfError', 'Failed to download PDF'), 'error');
        return;
      }
      let byteArray: Uint8Array;
      let contentType = 'application/pdf';
      let fileName = `order-${props.order.id}-confirmation.pdf`;
      if (typeof pdfResponse === 'object' && (pdfResponse as Base64File).base64) {
        const response = pdfResponse as Base64File;
        const byteCharacters = atob(response.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        byteArray = new Uint8Array(byteNumbers);
        contentType = response.contentType || contentType;
        fileName = response.fileName || fileName;
      } else if (typeof pdfResponse === 'string') {
        const byteCharacters = atob(pdfResponse);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        byteArray = new Uint8Array(byteNumbers);
      } else {
        showToast(getLabel('pdfError', 'Failed to download PDF'), 'error');
        return;
      }
      const blob = new Blob([byteArray as any], {
        type: contentType,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showToast(getLabel('pdfSuccess', 'PDF downloaded successfully'), 'success');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showToast(getLabel('pdfError', 'Failed to download PDF'), 'error');
    } finally {
      setDownloading(false);
    }
  }
  async function initCart(): ReturnType<OrderActionsState['initCart']> {
    const cartService = new CartService(props.graphqlClient);

    /* 1. Check for existing carts for this user */
    if (props.user) {
      try {
        const searchInput: CartSearchInput = {
          offset: 100,
        };
        if ('contactId' in props.user && props.user.contactId) {
          searchInput.contactIds = [props.user.contactId];
          const resolvedCompanyId =
            (props.companyId as number) || (props.user.company && props.user.company.companyId);
          if (resolvedCompanyId) {
            searchInput.companyIds = [resolvedCompanyId];
          }
        } else if ('customerId' in props.user && props.user.customerId) {
          searchInput.customerIds = [props.user.customerId];
        }
        const carts = await cartService.getCarts(searchInput);
        if (carts && carts.items && carts.items.length > 0) {
          const existingCartId = carts.items[carts.items.length - 1].cartId;
          const cartVariables: CartQueryVariables = {
            cartId: existingCartId,
            imageSearchFilters: props.configuration.imageSearchFiltersGrid,
            imageVariantFilters: props.configuration.imageVariantFiltersSmall,
            language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL',
          };
          const cart = await cartService.getCart(cartVariables);
          setActiveCartId(cart.cartId);
          if (props.onCartCreated) {
            props.onCartCreated(cart);
          }
          return cart.cartId;
        }
      } catch (e) {
        console.error('Failed to check existing carts', e);
      }
    }

    /* 2. Start a new cart */
    const language = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL';
    const startCartInput: CartStartInput = {
      language,
    };
    if (props.user) {
      if ('contactId' in props.user && props.user.contactId) {
        startCartInput.contactId = props.user.contactId;
        const resolvedCompanyId = (props.companyId as number) || (props.user as any).companyId;
        if (resolvedCompanyId) {
          startCartInput.companyId = resolvedCompanyId as number;
        }
      } else if ('customerId' in props.user && props.user.customerId) {
        startCartInput.customerId = props.user.customerId;
      }
    }
    const cartStartVars: CartStartVariables = {
      input: startCartInput,
      imageSearchFilters: props.configuration.imageSearchFiltersGrid,
      imageVariantFilters: props.configuration.imageVariantFiltersSmall,
      language: language,
    };
    let newCart = await cartService.startCart(cartStartVars);

    /* 3. Assign default addresses */
    if (newCart && props.user) {
      const addresses =
        'company' in props.user
          ? props.user.company?.addresses
          : (props.user as Customer).addresses;
      if (addresses && Array.isArray(addresses)) {
        const defaultInvoice = addresses.find(
          (addr: Address) => addr.isDefault === 'Y' && addr.type === 'invoice'
        );
        const defaultDelivery = addresses.find(
          (addr: Address) => addr.isDefault === 'Y' && addr.type === 'delivery'
        );
        if (defaultInvoice) {
          newCart = await cartService.updateCartAddress({
            id: newCart.cartId,
            input: {
              type: Enums.CartAddressType.INVOICE,
              firstName: defaultInvoice.firstName || '',
              lastName: defaultInvoice.lastName || '',
              street: defaultInvoice.street || '',
              postalCode: defaultInvoice.postalCode || '',
              city: defaultInvoice.city || '',
              country: defaultInvoice.country || 'NL',
              company: defaultInvoice.company || '',
              gender: defaultInvoice.gender || Enums.Gender.U,
              middleName: defaultInvoice.middleName || '',
              number: defaultInvoice.number || '',
              numberExtension: defaultInvoice.numberExtension || '',
              email: defaultInvoice.email || '',
              mobile: defaultInvoice.mobile || '',
              phone: defaultInvoice.phone || '',
              notes: defaultInvoice.notes || '',
            },
            imageSearchFilters: props.configuration.imageSearchFiltersGrid,
            imageVariantFilters: props.configuration.imageVariantFiltersSmall,
            language: language,
          });
        }
        if (defaultDelivery) {
          newCart = await cartService.updateCartAddress({
            id: newCart.cartId,
            input: {
              type: Enums.CartAddressType.DELIVERY,
              firstName: defaultDelivery.firstName || '',
              lastName: defaultDelivery.lastName || '',
              street: defaultDelivery.street || '',
              postalCode: defaultDelivery.postalCode || '',
              city: defaultDelivery.city || '',
              country: defaultDelivery.country || 'NL',
              company: defaultDelivery.company || '',
              gender: defaultDelivery.gender || Enums.Gender.U,
              middleName: defaultDelivery.middleName || '',
              number: defaultDelivery.number || '',
              numberExtension: defaultDelivery.numberExtension || '',
              email: defaultDelivery.email || '',
              mobile: defaultDelivery.mobile || '',
              phone: defaultDelivery.phone || '',
              notes: defaultDelivery.notes || '',
            },
            imageSearchFilters: props.configuration.imageSearchFiltersGrid,
            imageVariantFilters: props.configuration.imageVariantFiltersSmall,
            language: language,
          });
        }
      }
    }
    setActiveCartId(newCart.cartId);
    if (props.onCartCreated) {
      props.onCartCreated(newCart);
    }
    return newCart.cartId;
  }
  async function handleReorder(): ReturnType<OrderActionsState['handleReorder']> {
    if (!props.order?.items) return;
    setReordering(true);
    try {
      /* Resolve cart ID */
      let cartId = props.cartId || activeCartId;
      if (!cartId) {
        cartId = await initCart();
        if (!cartId) {
          showToast(getLabel('noCartId', 'Could not create or find a cart'), 'error');
          return;
        }
      }
      const cartService = new CartService(props.graphqlClient);
      const language = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL';

      /* Filter to product items that are not bonuses and not children */
      const allProducts = props.order.items.filter(
        (item: OrderItem) => item.class === 'product' && item.isBonus === 'N'
      );
      const parentItems = allProducts.filter((item: OrderItem) => !item.parentOrderItemId);

      /* Build a map of child items by parentOrderItemId */
      const childMap = new Map<number, OrderItem[]>();
      allProducts
        .filter((item: OrderItem) => item.parentOrderItemId)
        .forEach((item: OrderItem) => {
          const children = childMap.get(item.parentOrderItemId!) || [];
          children.push(item);
          childMap.set(item.parentOrderItemId!, children);
        });
      let lastCart: Cart | null = null;
      for (let i = 0; i < parentItems.length; i++) {
        const item = parentItems[i];
        if (!item.productId) continue;
        const isCluster =
          item.product && item.product.cluster && typeof item.product.cluster === 'object';
        const children = childMap.get(item.id) || [];
        let childItems: CartChildItemInput[] | undefined = undefined;
        let clusterId: number | undefined = undefined;
        if (isCluster && item.product!.cluster) {
          clusterId = item.product!.cluster.clusterId;
          if (children.length > 0) {
            childItems = children
              .filter((child: OrderItem) => child.productId)
              .map((child: OrderItem) => ({
                productId: child.productId!,
                quantity: child.quantity || item.quantity || 1,
              }));
          }
        }
        const addVars: CartAddItemVariables = {
          id: cartId,
          input: {
            productId: item.productId,
            quantity: item.quantity || 1,
            ...(clusterId !== undefined && {
              clusterId,
            }),
            ...(childItems && {
              childItems,
            }),
          },
          language: language,
          imageSearchFilters: props.configuration.imageSearchFiltersGrid,
          imageVariantFilters: props.configuration.imageVariantFiltersSmall,
        };
        lastCart = await cartService.addItemToCart(addVars);
      }
      if (lastCart && props.afterReorder) {
        props.afterReorder(lastCart);
      }
      showToast(getLabel('reorderSuccess', 'All items added to cart'), 'success');
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
