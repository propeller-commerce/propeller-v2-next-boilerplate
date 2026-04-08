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
  Crossupsell,
  CrossupsellsQueryVariables,
  CrossupsellSearchInput,
} from 'propeller-sdk-v2';
import { initCart, type CartInitConfig } from '../shared/utils/cartInit';
import type { AnyUser } from '../shared/utils/userIdentity';

export interface UseCartOptions {
  graphqlClient: GraphQLClient;
  user: Ref<AnyUser>;
  cartId?: string;
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

export interface GetCrossupsellsOptions {
  productId?: number;
  clusterId?: number;
  types?: string[];
  taxZone?: string;
  imageVariantFilters?: TransformationsInput;
}

export interface UseCartReturn {
  cart: Ref<Cart | null>;
  cartId: Ref<string>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  checkoutAllowed: ComputedRef<boolean>;
  resolveCart: () => Promise<Cart>;
  addItem: (options: AddItemOptions) => Promise<{ success: boolean; cart?: Cart; item?: CartMainItem | null; error?: string }>;
  updateItemQuantity: (cartItemId: string, quantity: number) => Promise<Cart | undefined>;
  updateItemNotes: (cartItemId: string, notes: string, debounceMs?: number) => void;
  deleteItem: (cartItemId: string) => Promise<Cart | undefined>;
  addActionCode: (code: string) => Promise<Cart | undefined>;
  removeActionCode: (code: string) => Promise<Cart | undefined>;
  requestAuthorization: () => Promise<{ success: boolean; error?: string }>;
  getCrossupsells: (options: GetCrossupsellsOptions) => Promise<Crossupsell[]>;
  getMinQuantity: (product: Product | null | undefined) => number;
  getStep: (product: Product | null | undefined) => number;
}

export function useCart(options: UseCartOptions): UseCartReturn {
  const { graphqlClient, user, configuration, onCartCreated } = options;
  const companyIdRef = options.companyId ?? ref<number | undefined>(undefined);
  const languageRef = options.language ?? ref('NL');

  const cart = ref<Cart | null>(null) as Ref<Cart | null>;
  const cartId = ref(options.cartId || '');
  const loading = ref(false);
  const error = ref<string | null>(null);
  let notesTimers: Record<string, ReturnType<typeof setTimeout>> = {};

  const checkoutAllowed = computed<boolean>(() => {
    const u = user.value;
    if (!u || !('contactId' in u)) return true;
    if (!companyIdRef.value) return true;
    if (!cart.value) return true;
    const pacData = (u as Contact).purchaseAuthorizationConfigs;
    const items: PurchaseAuthorizationConfig[] = pacData?.items ?? [];
    const purchaserPac = items.find((pac: PurchaseAuthorizationConfig) =>
      pac.purchaseRole === Enums.PurchaseRole.PURCHASER && pac.company?.companyId === companyIdRef.value
    );
    if (!purchaserPac) return true;
    const limit = purchaserPac.authorizationLimit ?? 0;
    const totalGross = cart.value.total?.totalGross ?? 0;
    return totalGross <= limit;
  });

  function getMinQuantity(product: Product | null | undefined): number {
    const min = product?.minimumQuantity;
    return min && min > 0 ? min : 1;
  }

  function getStep(product: Product | null | undefined): number {
    const unit = product?.unit;
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
        const available = opts.product.inventory?.totalQuantity ?? 0;
        if (available < opts.quantity) return { success: false, error: 'Insufficient stock available' };
      }
      const childItemInputs = opts.childItems?.map((id) => ({ productId: id, quantity: opts.quantity }));

      if (opts.onAddToCart) {
        const resultCart = opts.onAddToCart(opts.product, opts.cluster?.clusterId, opts.quantity, childItemInputs, opts.notes, opts.price);
        cart.value = resultCart; cartId.value = resultCart.cartId;
        const addedItem = resultCart.items?.find((i: CartMainItem) => i.productId === opts.product.productId) ?? null;
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to add item to cart';
      error.value = msg; return { success: false, error: msg };
    } finally { loading.value = false; }
  }

  async function updateItemQuantity(cartItemId: string, quantity: number): Promise<Cart | undefined> {
    if (!cartId.value) return undefined; loading.value = true;
    try {
      const service = new CartService(graphqlClient);
      const language = languageRef.value || configuration.language || 'NL';
      const updated = await service.updateCartItem({ id: cartId.value, itemId: cartItemId, input: { quantity }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      cart.value = updated;
      return updated;
    } catch (e: unknown) { error.value = e instanceof Error ? e.message : 'Failed to update quantity'; }
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
      } catch (e: unknown) { error.value = e instanceof Error ? e.message : 'Failed to update notes'; }
    }, debounceMs);
  }

  async function deleteItem(cartItemId: string): Promise<Cart | undefined> {
    if (!cartId.value) return undefined; loading.value = true;
    try {
      const service = new CartService(graphqlClient);
      const language = languageRef.value || configuration.language || 'NL';
      const updated = await service.deleteCartItem({ id: cartId.value, itemId: cartItemId, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      cart.value = updated;
      return updated;
    } catch (e: unknown) { error.value = e instanceof Error ? e.message : 'Failed to delete item'; }
    finally { loading.value = false; }
  }

  async function addActionCode(code: string): Promise<Cart | undefined> {
    if (!cartId.value) return undefined;
    try {
      const service = new CartService(graphqlClient);
      const language = languageRef.value || configuration.language || 'NL';
      const updated = await service.addActionCodeToCart({ id: cartId.value, input: { actionCode: code }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      cart.value = updated;
      return updated;
    } catch (e: unknown) { error.value = e instanceof Error ? e.message : 'Failed to add action code'; }
  }

  async function removeActionCode(code: string): Promise<Cart | undefined> {
    if (!cartId.value) return undefined;
    try {
      const service = new CartService(graphqlClient);
      const language = languageRef.value || configuration.language || 'NL';
      const updated = await service.removeActionCodeFromCart({ id: cartId.value, input: { actionCode: code }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      cart.value = updated;
      return updated;
    } catch (e: unknown) { error.value = e instanceof Error ? e.message : 'Failed to remove action code'; }
  }

  async function requestAuthorization(): Promise<{ success: boolean; error?: string }> {
    if (!cartId.value) return { success: false, error: 'No cart' };
    try {
      const service = new CartService(graphqlClient);
      await service.requestPurchaseAuthorization({ id: cartId.value });
      return { success: true };
    } catch (e: unknown) { return { success: false, error: e instanceof Error ? e.message : 'Failed to request authorization' }; }
  }

  async function getCrossupsells(opts: GetCrossupsellsOptions): Promise<Crossupsell[]> {
    const { productId, clusterId, types, taxZone, imageVariantFilters } = opts;
    if (!productId && !clusterId) return [];
    try {
      const service = new CrossupsellService(graphqlClient);
      const language = languageRef.value || configuration.language || 'NL';
      const u = user.value;
      const variables: CrossupsellsQueryVariables = {
        input: {
          types: (types ?? [Enums.CrossupsellType.ACCESSORIES]) as CrossupsellSearchInput['types'],
          page: 1,
          offset: 50,
          ...(productId && !clusterId && { productIdsFrom: [productId] }),
          ...(clusterId && { clusterIdsFrom: [clusterId] }),
        },
        language,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        imageVariantFilters: imageVariantFilters ?? configuration.imageVariantFiltersSmall,
        priceCalculateProductInput: {
          taxZone: taxZone || 'NL',
          ...(u && 'company' in u && { companyId: (u as Contact)?.company?.companyId }),
          ...(u && 'contactId' in u && { contactId: (u as Contact)?.contactId }),
          ...(u && 'customerId' in u && { customerId: (u as Customer)?.customerId }),
        },
      };
      const result = await service.getCrossupsells(variables);
      return result?.items ?? [];
    } catch { return []; }
  }

  return { cart, cartId, loading, error, checkoutAllowed, resolveCart, addItem, updateItemQuantity, updateItemNotes, deleteItem, addActionCode, removeActionCode, requestAuthorization, getCrossupsells, getMinQuantity, getStep };
}
