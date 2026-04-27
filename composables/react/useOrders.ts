/**
 * useOrders (React) — Order list, search, PDF download and reorder flow.
 *
 * React mirror of vue/useOrders.ts.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  OrderService,
  CartService,
  Enums,
} from 'propeller-sdk-v2';
import type {
  GraphQLClient,
  Order,
  OrderItem,
  Cart,
  OrderSearchArguments,
  DateSearchInput,
  DecimalSearchInput,
  OrderSortInput,
  Base64File,
  CartAddItemVariables,
  MediaImageProductSearchInput,
  TransformationsInput,
  OrderQueryVariables,
} from 'propeller-sdk-v2';
import { usePagination } from './shared/usePagination';
import { initCart } from '../shared/utils/cartInit';
import type { AnyUser } from '../shared/utils/userIdentity';
import { isContact, isCustomer } from '../shared/utils/userIdentity';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrderSearchForm {
  term?: string;
  createdAt?: DateSearchInput;
  lastModifiedAt?: DateSearchInput;
  price?: DecimalSearchInput;
  sortInput?: Partial<OrderSortInput>;
  type?: Enums.OrderType;
}

export interface UseOrdersOptions {
  graphqlClient: GraphQLClient;
  user: AnyUser;
  companyId?: number;
  language?: string;
  itemsPerPage?: number;
  orderStatuses?: string[];
  termFields?: Enums.OrderSearchFields[];
  configuration?: {
    imageSearchFiltersGrid?: MediaImageProductSearchInput;
    imageVariantFiltersSmall?: TransformationsInput;
  };
  channelIds?: number[];
  onCartCreated?: (cart: Cart) => void;
  afterReorder?: (cart: Cart) => void;
}

export interface UseOrdersReturn {
  orders: Order[];
  loading: boolean;
  error: string | null;
  searchForm: OrderSearchForm;
  setSearchForm: (form: OrderSearchForm) => void;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  fetchOrders: (page?: number) => Promise<void>;
  goToPage: (page: number) => void;
  resetSearch: () => void;
  downloadPdf: (order: Order) => Promise<{ success: boolean; error?: string }>;
  reorder: (order: Order, cartId?: string) => Promise<{ success: boolean; cart?: Cart; error?: string }>;
  setQuoteStatus: (
    orderId: number,
    flags: { status?: string }
  ) => Promise<{ success: boolean; error?: string }>;
  getOrderById: (orderId: number) => Promise<{ success: boolean; order?: Order; error?: string }>;
  downloadQuotePdf: (orderId: number) => Promise<{ success: boolean; error?: string }>;
}

export function useOrders(options: UseOrdersOptions): UseOrdersReturn {
  const {
    graphqlClient,
    user,
    companyId,
    orderStatuses = ['NEW', 'CONFIRMED', 'VALIDATED', 'ORDER'],
    configuration = {},
    onCartCreated,
    afterReorder,
  } = options;

  const language = options.language || 'NL';
  const termFields = options.termFields ?? [
    Enums.OrderSearchFields.REFERENCE,
    Enums.OrderSearchFields.ITEM_SKU,
    Enums.OrderSearchFields.ID,
    Enums.OrderSearchFields.ITEM_NAME,
    Enums.OrderSearchFields.REMARKS,
  ];

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchForm, setSearchForm] = useState<OrderSearchForm>({});
  const pagination = usePagination(options.itemsPerPage ?? 10);

  // ── Fetch orders ──────────────────────────────────────────────────────────

  const fetchOrders = useCallback(
    async (page = 1): Promise<void> => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        const service = new OrderService(graphqlClient);
        const userId: number = isContact(user) ? user.contactId : isCustomer(user) ? user.customerId : 0;
        const resolvedCompanyId = companyId ?? (isContact(user) ? user.company?.companyId : null);

        const searchArgs: OrderSearchArguments = {
          status: orderStatuses,
          userId: [userId!],
          ...(resolvedCompanyId && { companyIds: [resolvedCompanyId] }),
          page,
          offset: pagination.itemsPerPage,
          term: searchForm.term || '',
          termFields,
          ...(searchForm.createdAt && { createdAt: searchForm.createdAt }),
          ...(searchForm.lastModifiedAt && { lastModifiedAt: searchForm.lastModifiedAt }),
          ...(searchForm.price && { price: searchForm.price }),
          ...(searchForm.sortInput && { sortInputs: [searchForm.sortInput as OrderSortInput] }),
          ...(searchForm.type && { type: [searchForm.type] }),
          ...(options.channelIds?.length && { channelIds: options.channelIds }),
        };

        const response = await service.getOrders(searchArgs);
        setOrders(response.items || []);
        pagination.setFromResponse(response);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to fetch orders');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    },
    [graphqlClient, user, companyId, orderStatuses, searchForm, pagination.itemsPerPage]
  );

  useEffect(() => {
    if (user) fetchOrders(pagination.currentPage);
  }, [user, companyId, pagination.currentPage]);

  const resetSearch = useCallback(() => {
    setSearchForm({});
    fetchOrders(1);
  }, [fetchOrders]);

  // ── PDF download ──────────────────────────────────────────────────────────

  const downloadPdf = useCallback(
    async (order: Order): Promise<{ success: boolean; error?: string }> => {
      if (!order?.id) return { success: false, error: 'No order ID' };
      try {
        const service = new OrderService(graphqlClient);
        const pdfResponse = await service.getOrderPDF(order.id);
        if (!pdfResponse) return { success: false, error: 'No PDF response' };

        let byteArray: Uint8Array;
        let contentType = 'application/pdf';
        let fileName = `order-${order.id}-confirmation.pdf`;

        if (typeof pdfResponse === 'object' && (pdfResponse as Base64File).base64) {
          const r = pdfResponse as Base64File;
          const chars = atob(r.base64);
          byteArray = new Uint8Array(chars.length);
          for (let i = 0; i < chars.length; i++) byteArray[i] = chars.charCodeAt(i);
          contentType = r.contentType || contentType;
          fileName = r.fileName || fileName;
        } else if (typeof pdfResponse === 'string') {
          const chars = atob(pdfResponse);
          byteArray = new Uint8Array(chars.length);
          for (let i = 0; i < chars.length; i++) byteArray[i] = chars.charCodeAt(i);
        } else {
          return { success: false, error: 'Unrecognised PDF format' };
        }

        const blob = new Blob([byteArray.buffer as ArrayBuffer], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return { success: true };
      } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : 'Failed to download PDF' };
      }
    },
    [graphqlClient]
  );

  // ── Reorder ───────────────────────────────────────────────────────────────

  const reorder = useCallback(
    async (order: Order, existingCartId?: string): Promise<{ success: boolean; cart?: Cart; error?: string }> => {
      if (!order?.items) return { success: false, error: 'No order items' };
      try {
        let resolvedCartId = existingCartId;
        if (!resolvedCartId) {
          const c = await initCart({
            graphqlClient,
            user,
            companyId,
            language,
            imageSearchFilters: configuration.imageSearchFiltersGrid!,
            imageVariantFilters: configuration.imageVariantFiltersSmall!,
            onCartCreated,
          });
          resolvedCartId = c.cartId;
        }

        const cartService = new CartService(graphqlClient);
        const allProducts = order.items.filter(
          (item: OrderItem) => item.class === Enums.OrderItemClass.product && item.isBonus === Enums.YesNo.N
        );
        const parentItems = allProducts.filter((item: OrderItem) => !item.parentOrderItemId);
        const childMap = new Map<number, OrderItem[]>();
        allProducts
          .filter((item: OrderItem) => item.parentOrderItemId)
          .forEach((item: OrderItem) => {
            const arr = childMap.get(item.parentOrderItemId!) || [];
            arr.push(item);
            childMap.set(item.parentOrderItemId!, arr);
          });

        let lastCart: Cart | null = null;
        for (const item of parentItems) {
          if (!item.productId) continue;
          const isCluster = item.product?.cluster && typeof item.product.cluster === 'object';
          const children = childMap.get(item.id) || [];
          let clusterId: number | undefined;
          let childItems: { productId: number; quantity: number }[] | undefined;

          if (isCluster && item.product!.cluster) {
            clusterId = item.product!.cluster.clusterId;
            if (children.length > 0) {
              childItems = children
                .filter((c) => c.productId)
                .map((c) => ({ productId: c.productId!, quantity: c.quantity || item.quantity || 1 }));
            }
          }

          const addVars: CartAddItemVariables = {
            id: resolvedCartId,
            input: {
              productId: item.productId,
              quantity: item.quantity || 1,
              ...(clusterId !== undefined && { clusterId }),
              ...(childItems && { childItems }),
            },
            language,
            imageSearchFilters: configuration.imageSearchFiltersGrid!,
            imageVariantFilters: configuration.imageVariantFiltersSmall!,
          };

          lastCart = await cartService.addItemToCart(addVars);
        }

        if (lastCart) {
          afterReorder?.(lastCart);
          return { success: true, cart: lastCart };
        }
        return { success: false, error: 'No items were added' };
      } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : 'Reorder failed' };
      }
    },
    [graphqlClient, user, companyId, language, configuration, onCartCreated, afterReorder]
  );

  // ── Quote status ──────────────────────────────────────────────────────────

  const setQuoteStatus = useCallback(
    async (
      orderId: number,
      flags: { status?: string }
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const service = new OrderService(graphqlClient);
        await service.setOrderStatus({ orderId, ...flags });
        return { success: true };
      } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : 'Failed to update status' };
      }
    },
    [graphqlClient]
  );

  // ── Get single order by ID ────────────────────────────────────────────────

  const getOrderById = useCallback(
    async (orderId: number): Promise<{ success: boolean; order?: Order; error?: string }> => {
      try {
        const service = new OrderService(graphqlClient);
        const variables: OrderQueryVariables = {
          orderId,
          imageSearchFilters: configuration.imageSearchFiltersGrid,
          imageVariantFilters: configuration.imageVariantFiltersSmall,
          language,
        };
        const order = await service.getOrder(variables);
        if (!order) return { success: false, error: 'Order not found' };
        return { success: true, order };
      } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : 'Failed to fetch order' };
      }
    },
    [graphqlClient, language, configuration]
  );

  // ── Download quote PDF ────────────────────────────────────────────────────

  const downloadQuotePdf = useCallback(
    async (orderId: number): Promise<{ success: boolean; error?: string }> => {
      try {
        const service = new OrderService(graphqlClient);
        const pdfResponse = await service.getQuotePDF(orderId);
        if (!pdfResponse) return { success: false, error: 'No PDF response' };

        let byteArray: Uint8Array;
        let contentType = 'application/pdf';
        let fileName = `quote-${orderId}.pdf`;

        if (typeof pdfResponse === 'object' && (pdfResponse as Base64File).base64) {
          const r = pdfResponse as Base64File;
          const chars = atob(r.base64);
          byteArray = new Uint8Array(chars.length);
          for (let i = 0; i < chars.length; i++) byteArray[i] = chars.charCodeAt(i);
          contentType = r.contentType || contentType;
          fileName = r.fileName || fileName;
        } else if (typeof pdfResponse === 'string') {
          const chars = atob(pdfResponse);
          byteArray = new Uint8Array(chars.length);
          for (let i = 0; i < chars.length; i++) byteArray[i] = chars.charCodeAt(i);
        } else {
          return { success: false, error: 'Unrecognised PDF format' };
        }

        const blob = new Blob([byteArray.buffer as ArrayBuffer], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        return { success: true };
      } catch (e: unknown) {
        return { success: false, error: e instanceof Error ? e.message : 'Failed to download quote PDF' };
      }
    },
    [graphqlClient]
  );

  return {
    orders,
    loading,
    error,
    searchForm,
    setSearchForm,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    totalItems: pagination.totalItems,
    itemsPerPage: pagination.itemsPerPage,
    fetchOrders,
    goToPage: pagination.goToPage,
    resetSearch,
    downloadPdf,
    reorder,
    setQuoteStatus,
    getOrderById,
    downloadQuotePdf,
  };
}
