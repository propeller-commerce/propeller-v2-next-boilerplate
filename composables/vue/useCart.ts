/**
 * useCart (Vue) — Cart management composable.
 *
 * Covers: AddToCart, CartItem, CartSummary, ActionCode, CartIconAndSidebar.
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue';
import {
  CartService,
  CrossupsellService,
  Enums,
} from 'propeller-sdk-v2';
import type {
  GraphQLClient,
  Cart,
  CartMainItem,
  Product,
  Cluster,
  Contact,
  Customer,
  MediaImageProductSearchInput,
  TransformationsInput,
  PurchaseAuthorizationConfig,
} from 'propeller-sdk-v2';
import { initCart, type CartInitConfig } from '../shared/utils/cartInit';
import type { AnyUser } from '../shared/utils/userIdentity';

export interface UseCartOptions {
  graphqlClient: GraphQLClient;
  user: Ref<AnyUser>;
  companyId?: Ref<number | undefined>;
  language?: Ref<string>;
  configuration: {
    language?: string;
    imageSearchFiltersGrid: MediaImageProductSearchInput;
    imageVariantFiltersSmall: TransformationsInput;
  };
  onCartCreated?: (cart: Cart) => void;
}

export interface AddItemOptions {
  product: Product;
  cluster?: Cluster;
  childItems?: number[];
  quantity: number;
  notes?: string;
  price?: number;
  onAddToCart?: (product: Product, clusterId?: number, quantity?: number, childItems?: { productId: number; quantity: number }[], notes?: string, price?: number) => Cart;
  afterAddToCart?: (cart: Cart, item: CartMainItem | null) => void;
  enableStockValidation?: boolean;
  cartId?: string;
  createCart?: boolean;
}

export interface UseCartReturn {
  cart: Ref<Cart | null>;
  cartId: Ref<string>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  checkoutAllowed: ComputedRef<boolean>;
  resolveCart: () => Promise<Cart>;
  addItem: (options: AddItemOptions) => Promise<{ success: boolean; cart?: Cart; item?: CartMainItem | null; error?: string }>;
  updateItemQuantity: (cartItemId: string, quantity: number) => Promise<void>;
  updateItemNotes: (cartItemId: string, notes: string, debounceMs?: number) => void;
  deleteItem: (cartItemId: string) => Promise<void>;
  addActionCode: (code: string) => Promise<void>;
  removeActionCode: (code: string) => Promise<void>;
  requestAuthorization: () => Promise<{ success: boolean; error?: string }>;
  getCrossupsells: (productId: number) => Promise<any[]>;
  getMinQuantity: (product: Product) => number;
  getStep: (product: Product) => number;
}

export function useCart(options: UseCartOptions): UseCartReturn {
  const { graphqlClient, user, configuration, onCartCreated } = options;
  const companyIdRef = options.companyId ?? ref<number | undefined>(undefined);
  const languageRef = options.language ?? ref('NL');

  const cart = ref<Cart | null>(null) as Ref<Cart | null>;
  const cartId = ref('');
  const loading = ref(false);
  const error = ref<string | null>(null);
  let notesTimers: Record<string, ReturnType<typeof setTimeout>> = {};

  const checkoutAllowed = computed<boolean>(() => {
    const u = user.value;
    if (!u || !('contactId' in u)) return true;
    if (!companyIdRef.value) return true;
    if (!cart.value) return true;
    const pacData = (u as Contact).purchaseAuthorizationConfigs;
    const items: PurchaseAuthorizationConfig[] = (pacData as any)?.items ?? [];
    const purchaserPac = items.find((pac: PurchaseAuthorizationConfig) =>
      pac.purchaseRole === Enums.PurchaseRole.PURCHASER && (pac as any).company?.companyId === companyIdRef.value
    );
    if (!purchaserPac) return true;
    const limit = purchaserPac.authorizationLimit ?? 0;
    const totalNet = (cart.value as any).total?.totalNet ?? 0;
    return totalNet <= limit;
  });

  function getMinQuantity(product: Product): number {
    const min = product.minimumQuantity;
    return min && min > 0 ? min : 1;
  }

  function getStep(product: Product): number {
    const unit = product.unit;
    return unit && unit > 0 ? unit : 1;
  }

  async function resolveCart(): Promise<Cart> {
    const config: CartInitConfig = {
      graphqlClient, user: user.value, companyId: companyIdRef.value,
      language: languageRef.value || configuration.language || 'NL',
      imageSearchFilters: configuration.imageSearchFiltersGrid,
      imageVariantFilters: configuration.imageVariantFiltersSmall,
      onCartCreated: (c) => { cart.value = c; cartId.value = c.cartId; onCartCreated?.(c); },
    };
    const resolved = await initCart(config);
    cart.value = resolved;
    cartId.value = resolved.cartId;
    return resolved;
  }

  async function addItem(opts: AddItemOptions): Promise<{ success: boolean; cart?: Cart; item?: CartMainItem | null; error?: string }> {
    loading.value = true; error.value = null;
    try {
      if (opts.enableStockValidation) {
        const available = (opts.product as any).inventory?.totalQuantity ?? 0;
        if (available < opts.quantity) return { success: false, error: 'Insufficient stock available' };
      }
      const childItemInputs = opts.childItems?.map((id) => ({ productId: id, quantity: opts.quantity }));

      if (opts.onAddToCart) {
        const resultCart = opts.onAddToCart(opts.product, opts.cluster?.clusterId, opts.quantity, childItemInputs, opts.notes, opts.price);
        cart.value = resultCart; cartId.value = resultCart.cartId;
        const addedItem = (resultCart as any).items?.find((i: any) => i.productId === opts.product.productId) ?? null;
        opts.afterAddToCart?.(resultCart, addedItem);
        return { success: true, cart: resultCart, item: addedItem };
      }

      let resolvedCartId = opts.cartId || cartId.value;
      if (!resolvedCartId) {
        if (opts.createCart) { const c = await resolveCart(); resolvedCartId = c.cartId; }
        else return { success: false, error: 'No cart ID provided' };
      }

      const service = new CartService(graphqlClient);
      const language = languageRef.value || configuration.language || 'NL';
      const resultCart = await service.addItemToCart({
        id: resolvedCartId,
        input: {
          productId: opts.product.productId, quantity: opts.quantity,
          ...(opts.cluster?.clusterId !== undefined && { clusterId: opts.cluster.clusterId }),
          ...(childItemInputs && { childItems: childItemInputs }),
          ...(opts.notes && { notes: opts.notes }),
          ...(opts.price !== undefined && { price: opts.price }),
        },
        language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall,
      });
      cart.value = resultCart; cartId.value = resultCart.cartId;
      const addedItem = (resultCart as any).items?.find((i: any) => i.productId === opts.product.productId) ?? null;
      opts.afterAddToCart?.(resultCart, addedItem);
      return { success: true, cart: resultCart, item: addedItem };
    } catch (e: any) {
      const msg = e?.message || 'Failed to add item to cart';
      error.value = msg; return { success: false, error: msg };
    } finally { loading.value = false; }
  }

  async function updateItemQuantity(cartItemId: string, quantity: number): Promise<void> {
    if (!cartId.value) return; loading.value = true;
    try {
      const service = new CartService(graphqlClient);
      const language = languageRef.value || configuration.language || 'NL';
      const updated = await service.updateCartItem({ id: cartId.value, itemId: cartItemId, input: { quantity }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      cart.value = updated;
    } catch (e: any) { error.value = e?.message || 'Failed to update quantity'; }
    finally { loading.value = false; }
  }

  function updateItemNotes(cartItemId: string, notes: string, debounceMs = 500): void {
    if (notesTimers[cartItemId]) clearTimeout(notesTimers[cartItemId]);
    notesTimers[cartItemId] = setTimeout(async () => {
      if (!cartId.value) return;
      try {
        const service = new CartService(graphqlClient);
        const language = languageRef.value || configuration.language || 'NL';
        const updated = await service.updateCartItem({ id: cartId.value, itemId: cartItemId, input: { notes }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
        cart.value = updated;
      } catch (e: any) { error.value = e?.message || 'Failed to update notes'; }
    }, debounceMs);
  }

  async function deleteItem(cartItemId: string): Promise<void> {
    if (!cartId.value) return; loading.value = true;
    try {
      const service = new CartService(graphqlClient);
      const language = languageRef.value || configuration.language || 'NL';
      const updated = await service.deleteCartItem({ id: cartId.value, itemId: cartItemId, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      cart.value = updated;
    } catch (e: any) { error.value = e?.message || 'Failed to delete item'; }
    finally { loading.value = false; }
  }

  async function addActionCode(code: string): Promise<void> {
    if (!cartId.value) return;
    try {
      const service = new CartService(graphqlClient);
      const language = languageRef.value || configuration.language || 'NL';
      const updated = await service.addActionCodeToCart({ id: cartId.value, input: { actionCode: code }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      cart.value = updated;
    } catch (e: any) { error.value = e?.message || 'Failed to add action code'; }
  }

  async function removeActionCode(code: string): Promise<void> {
    if (!cartId.value) return;
    try {
      const service = new CartService(graphqlClient);
      const language = languageRef.value || configuration.language || 'NL';
      const updated = await service.removeActionCodeFromCart({ id: cartId.value, input: { actionCode: code }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      cart.value = updated;
    } catch (e: any) { error.value = e?.message || 'Failed to remove action code'; }
  }

  async function requestAuthorization(): Promise<{ success: boolean; error?: string }> {
    if (!cartId.value) return { success: false, error: 'No cart' };
    try {
      const service = new CartService(graphqlClient);
      await service.requestPurchaseAuthorization({ id: cartId.value });
      return { success: true };
    } catch (e: any) { return { success: false, error: e?.message || 'Failed to request authorization' }; }
  }

  async function getCrossupsells(productId: number): Promise<any[]> {
    try {
      const service = new CrossupsellService(graphqlClient);
      const language = languageRef.value || configuration.language || 'NL';
      const result = await service.getCrossupsells({ productId, language } as any);
      return (result as any)?.items ?? [];
    } catch { return []; }
  }

  return { cart, cartId, loading, error, checkoutAllowed, resolveCart, addItem, updateItemQuantity, updateItemNotes, deleteItem, addActionCode, removeActionCode, requestAuthorization, getCrossupsells, getMinQuantity, getStep };
}
