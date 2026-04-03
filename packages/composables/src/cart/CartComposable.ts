import { CartService } from 'propeller-sdk-v2';
import { ComposableStore } from '../core/ComposableStore';
import {
  resolveExistingCart,
  startCartWithAddresses,
  addItemToCart,
} from './cartLogic';
import type {
  CartComposableConfig,
  CartState,
  AddItemInput,
  CartComposable,
} from './types';

const INITIAL_STATE: CartState = {
  cart: null,
  cartId: null,
  loading: false,
  error: null,
  addingItem: false,
  lastAddedItem: null,
};

/**
 * Creates a cart composable -- framework-agnostic state + actions for cart operations.
 *
 * Wrap with a React hook (useSyncExternalStore) or Vue composable (shallowRef)
 * to get reactive state in your framework.
 */
export function createCartComposable(config: CartComposableConfig): CartComposable {
  const store = new ComposableStore<CartState>({ ...INITIAL_STATE });
  const cartService = new CartService(config.graphqlClient);

  const logicConfig = {
    language: config.language,
    imageSearchFilters: config.imageSearchFilters,
    imageVariantFilters: config.imageVariantFilters,
  };

  async function resolveOrCreateCart() {
    store.setState({ loading: true, error: null });
    try {
      // 1. Try to find an existing cart
      if (config.user) {
        const existing = await resolveExistingCart(
          cartService,
          config.user,
          config.companyId,
          logicConfig,
        );
        if (existing) {
          store.setState({
            cart: existing,
            cartId: existing.cartId,
            loading: false,
          });
          return existing;
        }
      }

      // 2. Create a new cart if enabled
      if (config.createCart && config.user) {
        const newCart = await startCartWithAddresses(
          cartService,
          config.user,
          config.companyId,
          logicConfig,
        );
        store.setState({
          cart: newCart,
          cartId: newCart.cartId,
          loading: false,
        });
        return newCart;
      }

      throw new Error('No cart available and createCart is not enabled');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resolve cart';
      store.setState({ loading: false, error: message });
      throw error;
    }
  }

  async function addItem(input: AddItemInput) {
    store.setState({ addingItem: true, error: null });
    try {
      let { cartId } = store.getState();

      if (!cartId) {
        const cart = await resolveOrCreateCart();
        cartId = cart.cartId;
      }

      const cart = await addItemToCart(cartService, cartId!, input, logicConfig);
      const addedItem =
        cart.items?.find((item) => item.productId === input.product.productId) ?? null;

      store.setState({
        cart,
        cartId: cart.cartId,
        addingItem: false,
        lastAddedItem: addedItem,
      });

      return cart;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add item';
      store.setState({ addingItem: false, error: message });
      throw error;
    }
  }

  async function updateItemQuantity(itemId: string, quantity: number) {
    store.setState({ loading: true, error: null });
    try {
      const { cartId } = store.getState();
      if (!cartId) throw new Error('No active cart');

      const cart = await cartService.updateCartItem({
        id: cartId,
        itemId,
        input: { quantity },
        language: config.language,
        imageSearchFilters: config.imageSearchFilters,
        imageVariantFilters: config.imageVariantFilters,
      });

      store.setState({ cart, loading: false });
      return cart;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update item';
      store.setState({ loading: false, error: message });
      throw error;
    }
  }

  async function deleteItem(itemId: string) {
    store.setState({ loading: true, error: null });
    try {
      const { cartId } = store.getState();
      if (!cartId) throw new Error('No active cart');

      const cart = await cartService.deleteCartItem({
        id: cartId,
        itemId,
        language: config.language,
        imageSearchFilters: config.imageSearchFilters,
        imageVariantFilters: config.imageVariantFilters,
      });

      store.setState({ cart, loading: false });
      return cart;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete item';
      store.setState({ loading: false, error: message });
      throw error;
    }
  }

  function setCart(cart: Parameters<CartComposable['setCart']>[0]) {
    store.setState({ cart, cartId: cart.cartId });
  }

  function clearCart() {
    store.setState({ ...INITIAL_STATE });
  }

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    resolveOrCreateCart,
    addItem,
    updateItemQuantity,
    deleteItem,
    setCart,
    clearCart,
  };
}
