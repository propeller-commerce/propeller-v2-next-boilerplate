"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCartComposable = createCartComposable;
const propeller_sdk_v2_1 = require("propeller-sdk-v2");
const ComposableStore_1 = require("../core/ComposableStore");
const cartLogic_1 = require("./cartLogic");
const INITIAL_STATE = {
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
function createCartComposable(config) {
    const store = new ComposableStore_1.ComposableStore({ ...INITIAL_STATE });
    const cartService = new propeller_sdk_v2_1.CartService(config.graphqlClient);
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
                const existing = await (0, cartLogic_1.resolveExistingCart)(cartService, config.user, config.companyId, logicConfig);
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
                const newCart = await (0, cartLogic_1.startCartWithAddresses)(cartService, config.user, config.companyId, logicConfig);
                store.setState({
                    cart: newCart,
                    cartId: newCart.cartId,
                    loading: false,
                });
                return newCart;
            }
            throw new Error('No cart available and createCart is not enabled');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to resolve cart';
            store.setState({ loading: false, error: message });
            throw error;
        }
    }
    async function addItem(input) {
        store.setState({ addingItem: true, error: null });
        try {
            let { cartId } = store.getState();
            if (!cartId) {
                const cart = await resolveOrCreateCart();
                cartId = cart.cartId;
            }
            const cart = await (0, cartLogic_1.addItemToCart)(cartService, cartId, input, logicConfig);
            const addedItem = cart.items?.find((item) => item.productId === input.product.productId) ?? null;
            store.setState({
                cart,
                cartId: cart.cartId,
                addingItem: false,
                lastAddedItem: addedItem,
            });
            return cart;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add item';
            store.setState({ addingItem: false, error: message });
            throw error;
        }
    }
    async function updateItemQuantity(itemId, quantity) {
        store.setState({ loading: true, error: null });
        try {
            const { cartId } = store.getState();
            if (!cartId)
                throw new Error('No active cart');
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update item';
            store.setState({ loading: false, error: message });
            throw error;
        }
    }
    async function deleteItem(itemId) {
        store.setState({ loading: true, error: null });
        try {
            const { cartId } = store.getState();
            if (!cartId)
                throw new Error('No active cart');
            const cart = await cartService.deleteCartItem({
                id: cartId,
                itemId,
                language: config.language,
                imageSearchFilters: config.imageSearchFilters,
                imageVariantFilters: config.imageVariantFilters,
            });
            store.setState({ cart, loading: false });
            return cart;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to delete item';
            store.setState({ loading: false, error: message });
            throw error;
        }
    }
    function setCart(cart) {
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
//# sourceMappingURL=CartComposable.js.map