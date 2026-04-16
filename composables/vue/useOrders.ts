/**
 * useOrders (Vue) — Order list, search, PDF download and reorder flow.
 *
 * Covers: OrderList, OrderActions, QuoteActions components.
 *
 * Responsibilities:
 * - Paginated order fetch with search/filter
 * - PDF download (base64/Uint8Array → blob → browser download)
 * - Reorder: parent-item filtering, cluster detection, sequential addItemToCart
 * - Quote status update (QuoteActions)
 */

import { ref, watch, type Ref } from 'vue';
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
} from 'propeller-sdk-v2';
import { usePagination } from './shared/usePagination';
import { initCart } from '../shared/utils/cartInit';
import type { AnyUser } from '../shared/utils/userIdentity';
import { isContact, isCustomer } from '../shared/utils/userIdentity';

// ── Types ────────────────────────────────────────────────────────────────────

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
  user: Ref<AnyUser>;
  companyId?: Ref<number | undefined>;
  language?: Ref<string>;
  itemsPerPage?: number;
  /** Default statuses to filter by */
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
  // Order list
  orders: Ref<Order[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  searchForm: Ref<OrderSearchForm>;

  // Pagination (from usePagination)
  currentPage: Ref<number>;
  totalPages: Ref<number>;
  totalItems: Ref<number>;
  itemsPerPage: Ref<number>;

  // Actions
  fetchOrders: (page?: number) => Promise<void>;
  goToPage: (page: number) => void;
  resetSearch: () => void;
  downloadPdf: (order: Order) => Promise<{ success: boolean; error?: string }>;
  reorder: (order: Order, cartId?: string) => Promise<{ success: boolean; cart?: Cart; error?: string }>;
  setQuoteStatus: (
    orderId: number,
    flags: {
      isQuoteAccepted?: boolean;
      isCancelled?: boolean;
      isRejected?: boolean;
      isValidated?: boolean;
      isConfirmed?: boolean;
    }
  ) => Promise<{ success: boolean; error?: string }>;
}

export function useOrders(options: UseOrdersOptions): UseOrdersReturn {
  const {
    graphqlClient,
    user,
    orderStatuses = ['NEW', 'CONFIRMED', 'VALIDATED', 'ORDER'],
    configuration = {},
    onCartCreated,
    afterReorder,
  } = options;

  const companyIdRef = options.companyId ?? ref<number | undefined>(undefined);
  const languageRef = options.language ?? ref('NL');

  const orders = ref<Order[]>([]) as Ref<Order[]>;
  const loading = ref(false);
  const error = ref<string | null>(null);
  const searchForm = ref<OrderSearchForm>({});

  const termFields = options.termFields ?? [
    Enums.OrderSearchFields.REFERENCE,
    Enums.OrderSearchFields.ITEM_SKU,
    Enums.OrderSearchFields.ID,
    Enums.OrderSearchFields.ITEM_NAME,
    Enums.OrderSearchFields.REMARKS,
  ];

  const pagination = usePagination(options.itemsPerPage ?? 10);

  // ── Fetch orders ──────────────────────────────────────────────────────────

  async function fetchOrders(page = 1): Promise<void> {
    const u = user.value;
    if (!u) return;

    loading.value = true;
    error.value = null;

    try {
      const service = new OrderService(graphqlClient);

      const userId: number = isContact(u) ? u.contactId : isCustomer(u) ? u.customerId : 0;
      const companyId = companyIdRef.value ?? (isContact(u) ? u.company?.companyId : null);

      const searchArgs: OrderSearchArguments = {
        status: orderStatuses,
        userId: [userId!],
        ...(companyId && { companyIds: [companyId] }),
        page,
        offset: pagination.itemsPerPage.value,
        term: searchForm.value.term || '',
        termFields,
        ...(searchForm.value.createdAt && { createdAt: searchForm.value.createdAt }),
        ...(searchForm.value.lastModifiedAt && { lastModifiedAt: searchForm.value.lastModifiedAt }),
        ...(searchForm.value.price && { price: searchForm.value.price }),
        ...(searchForm.value.sortInput && { sortInputs: [searchForm.value.sortInput as OrderSortInput] }),
        ...(searchForm.value.type && { type: [searchForm.value.type] }),
        ...(options.channelIds?.length && { channelIds: options.channelIds }),
      };

      const response = await service.getOrders(searchArgs);
      orders.value = response.items || [];
      pagination.setFromResponse(response);
      pagination.currentPage.value = page;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch orders';
      orders.value = [];
    } finally {
      loading.value = false;
    }
  }

  function resetSearch(): void {
    searchForm.value = {};
    fetchOrders(1);
  }

  // ── Watch user + companyId for re-fetch ───────────────────────────────────

  watch(
    [user, companyIdRef, pagination.currentPage],
    ([u]: [AnyUser, number | undefined, number]) => { if (u) fetchOrders(pagination.currentPage.value); },
    { immediate: true }
  );

  // ── PDF download ──────────────────────────────────────────────────────────

  async function downloadPdf(order: Order): Promise<{ success: boolean; error?: string }> {
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
  }

  // ── Reorder ───────────────────────────────────────────────────────────────

  async function reorder(
    order: Order,
    existingCartId?: string
  ): Promise<{ success: boolean; cart?: Cart; error?: string }> {
    if (!order?.items) return { success: false, error: 'No order items' };

    try {
      // Resolve cart
      let resolvedCartId = existingCartId;
      if (!resolvedCartId) {
        const lang = languageRef.value || 'NL';
        const c = await initCart({
          graphqlClient,
          user: user.value,
          companyId: companyIdRef.value,
          language: lang,
          imageSearchFilters: configuration.imageSearchFiltersGrid!,
          imageVariantFilters: configuration.imageVariantFiltersSmall!,
          onCartCreated,
        });
        resolvedCartId = c.cartId;
      }

      const cartService = new CartService(graphqlClient);
      const language = languageRef.value || 'NL';

      // Filter to product parent items (exclude bonuses and children)
      const allProducts = order.items.filter(
        (item: OrderItem) => item.class === Enums.OrderItemClass.product && item.isBonus === Enums.YesNo.N
      );
      const parentItems = allProducts.filter((item: OrderItem) => !item.parentOrderItemId);

      // Build child map
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

        const isCluster =
          item.product?.cluster && typeof item.product.cluster === 'object';
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
  }

  // ── Quote status ──────────────────────────────────────────────────────────

  async function setQuoteStatus(
    orderId: number,
    flags: {
      isQuoteAccepted?: boolean;
      isCancelled?: boolean;
      isRejected?: boolean;
      isValidated?: boolean;
      isConfirmed?: boolean;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const service = new OrderService(graphqlClient);
      await service.setOrderStatus({ orderId, ...flags });
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to update status' };
    }
  }

  return {
    orders,
    loading,
    error,
    searchForm,
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
  };
}
