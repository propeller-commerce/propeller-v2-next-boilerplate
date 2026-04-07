/**
 * useCart (React) — Cart management hook.
 *
 * React mirror of vue/useCart.ts.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { CartService, CrossupsellService, Enums } from 'propeller-sdk-v2';
import type { GraphQLClient, Cart, CartMainItem, Product, Cluster, Contact, MediaImageProductSearchInput, TransformationsInput, PurchaseAuthorizationConfig } from 'propeller-sdk-v2';
import { initCart, type CartInitConfig } from '../shared/utils/cartInit';
import type { AnyUser } from '../shared/utils/userIdentity';

export interface UseCartOptions {
  graphqlClient: GraphQLClient;
  user: AnyUser;
  companyId?: number;
  language?: string;
  configuration: { language?: string; imageSearchFiltersGrid: MediaImageProductSearchInput; imageVariantFiltersSmall: TransformationsInput };
  onCartCreated?: (cart: Cart) => void;
}

export interface AddItemOptions {
  product: Product; cluster?: Cluster; childItems?: number[]; quantity: number; notes?: string; price?: number;
  onAddToCart?: (product: Product, clusterId?: number, quantity?: number, childItems?: { productId: number; quantity: number }[], notes?: string, price?: number) => Cart;
  afterAddToCart?: (cart: Cart, item: CartMainItem | null) => void;
  enableStockValidation?: boolean; cartId?: string; createCart?: boolean;
}

export interface UseCartReturn {
  cart: Cart | null; cartId: string; loading: boolean; error: string | null; checkoutAllowed: boolean;
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
  const { graphqlClient, user, companyId, configuration, onCartCreated } = options;
  const language = options.language || configuration.language || 'NL';

  const [cart, setCart] = useState<Cart | null>(null);
  const [cartId, setCartId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notesTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const checkoutAllowed = useMemo<boolean>(() => {
    if (!user || !('contactId' in user)) return true;
    if (!companyId) return true;
    if (!cart) return true;
    const pacData = (user as Contact).purchaseAuthorizationConfigs;
    const items: PurchaseAuthorizationConfig[] = (pacData as any)?.items ?? [];
    const purchaserPac = items.find((pac: PurchaseAuthorizationConfig) =>
      pac.purchaseRole === Enums.PurchaseRole.PURCHASER && (pac as any).company?.companyId === companyId
    );
    if (!purchaserPac) return true;
    const limit = purchaserPac.authorizationLimit ?? 0;
    const totalNet = (cart as any).total?.totalNet ?? 0;
    return totalNet <= limit;
  }, [user, companyId, cart]);

  function getMinQuantity(product: Product): number { const min = product.minimumQuantity; return min && min > 0 ? min : 1; }
  function getStep(product: Product): number { const unit = product.unit; return unit && unit > 0 ? unit : 1; }

  const resolveCart = useCallback(async (): Promise<Cart> => {
    const config: CartInitConfig = {
      graphqlClient, user, companyId, language,
      imageSearchFilters: configuration.imageSearchFiltersGrid,
      imageVariantFilters: configuration.imageVariantFiltersSmall,
      onCartCreated: (c) => { setCart(c); setCartId(c.cartId); onCartCreated?.(c); },
    };
    const resolved = await initCart(config);
    setCart(resolved); setCartId(resolved.cartId);
    return resolved;
  }, [graphqlClient, user, companyId, language, configuration, onCartCreated]);

  const addItem = useCallback(async (opts: AddItemOptions): Promise<{ success: boolean; cart?: Cart; item?: CartMainItem | null; error?: string }> => {
    setLoading(true); setError(null);
    try {
      if (opts.enableStockValidation) {
        const available = (opts.product as any).inventory?.totalQuantity ?? 0;
        if (available < opts.quantity) return { success: false, error: 'Insufficient stock available' };
      }
      const childItemInputs = opts.childItems?.map((id) => ({ productId: id, quantity: opts.quantity }));
      if (opts.onAddToCart) {
        const resultCart = opts.onAddToCart(opts.product, opts.cluster?.clusterId, opts.quantity, childItemInputs, opts.notes, opts.price);
        setCart(resultCart); setCartId(resultCart.cartId);
        const addedItem = (resultCart as any).items?.find((i: any) => i.productId === opts.product.productId) ?? null;
        opts.afterAddToCart?.(resultCart, addedItem);
        return { success: true, cart: resultCart, item: addedItem };
      }
      let resolvedCartId = opts.cartId || cartId;
      if (!resolvedCartId) {
        if (opts.createCart) { const c = await resolveCart(); resolvedCartId = c.cartId; }
        else return { success: false, error: 'No cart ID provided' };
      }
      const service = new CartService(graphqlClient);
      const resultCart = await service.addItemToCart({
        id: resolvedCartId,
        input: { productId: opts.product.productId, quantity: opts.quantity, ...(opts.cluster?.clusterId !== undefined && { clusterId: opts.cluster.clusterId }), ...(childItemInputs && { childItems: childItemInputs }), ...(opts.notes && { notes: opts.notes }), ...(opts.price !== undefined && { price: opts.price }) },
        language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall,
      });
      setCart(resultCart); setCartId(resultCart.cartId);
      const addedItem = (resultCart as any).items?.find((i: any) => i.productId === opts.product.productId) ?? null;
      opts.afterAddToCart?.(resultCart, addedItem);
      return { success: true, cart: resultCart, item: addedItem };
    } catch (e: any) { const msg = e?.message || 'Failed to add item to cart'; setError(msg); return { success: false, error: msg }; }
    finally { setLoading(false); }
  }, [graphqlClient, cartId, language, configuration, resolveCart]);

  const updateItemQuantity = useCallback(async (cartItemId: string, quantity: number): Promise<void> => {
    if (!cartId) return; setLoading(true);
    try {
      const service = new CartService(graphqlClient);
      const updated = await service.updateCartItem({ id: cartId, itemId: cartItemId, input: { quantity }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      setCart(updated);
    } catch (e: any) { setError(e?.message || 'Failed to update quantity'); }
    finally { setLoading(false); }
  }, [graphqlClient, cartId, language, configuration]);

  const updateItemNotes = useCallback((cartItemId: string, notes: string, debounceMs = 500): void => {
    if (notesTimers.current[cartItemId]) clearTimeout(notesTimers.current[cartItemId]);
    notesTimers.current[cartItemId] = setTimeout(async () => {
      if (!cartId) return;
      try {
        const service = new CartService(graphqlClient);
        const updated = await service.updateCartItem({ id: cartId, itemId: cartItemId, input: { notes }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
        setCart(updated);
      } catch (e: any) { setError(e?.message || 'Failed to update notes'); }
    }, debounceMs);
  }, [graphqlClient, cartId, language, configuration]);

  const deleteItem = useCallback(async (cartItemId: string): Promise<void> => {
    if (!cartId) return; setLoading(true);
    try {
      const service = new CartService(graphqlClient);
      const updated = await service.deleteCartItem({ id: cartId, itemId: cartItemId, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      setCart(updated);
    } catch (e: any) { setError(e?.message || 'Failed to delete item'); }
    finally { setLoading(false); }
  }, [graphqlClient, cartId, language, configuration]);

  const addActionCode = useCallback(async (code: string): Promise<void> => {
    if (!cartId) return;
    try {
      const service = new CartService(graphqlClient);
      const updated = await service.addActionCodeToCart({ id: cartId, input: { actionCode: code }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      setCart(updated);
    } catch (e: any) { setError(e?.message || 'Failed to add action code'); }
  }, [graphqlClient, cartId, language, configuration]);

  const removeActionCode = useCallback(async (code: string): Promise<void> => {
    if (!cartId) return;
    try {
      const service = new CartService(graphqlClient);
      const updated = await service.removeActionCodeFromCart({ id: cartId, input: { actionCode: code }, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      setCart(updated);
    } catch (e: any) { setError(e?.message || 'Failed to remove action code'); }
  }, [graphqlClient, cartId, language, configuration]);

  const requestAuthorization = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!cartId) return { success: false, error: 'No cart' };
    try { const service = new CartService(graphqlClient); await service.requestPurchaseAuthorization({ id: cartId }); return { success: true }; }
    catch (e: any) { return { success: false, error: e?.message || 'Failed to request authorization' }; }
  }, [graphqlClient, cartId]);

  const getCrossupsells = useCallback(async (productId: number): Promise<any[]> => {
    try {
      const service = new CrossupsellService(graphqlClient);
      const result = await service.getCrossupsells({ productId, language } as any);
      return (result as any)?.items ?? [];
    } catch { return []; }
  }, [graphqlClient, language]);

  return { cart, cartId, loading, error, checkoutAllowed, resolveCart, addItem, updateItemQuantity, updateItemNotes, deleteItem, addActionCode, removeActionCode, requestAuthorization, getCrossupsells, getMinQuantity, getStep };
}
