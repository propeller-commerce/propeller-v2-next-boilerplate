"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCart = useCart;
const vue_1 = require("vue");
const CartComposable_1 = require("../cart/CartComposable");
function useCart(config) {
    const composable = (0, CartComposable_1.createCartComposable)(config);
    const state = (0, vue_1.shallowRef)(composable.getState());
    const unsubscribe = composable.subscribe(() => {
        state.value = composable.getState();
    });
    (0, vue_1.onUnmounted)(unsubscribe);
    return {
        state: (0, vue_1.readonly)(state),
        resolveOrCreateCart: composable.resolveOrCreateCart,
        addItem: composable.addItem,
        updateItemQuantity: composable.updateItemQuantity,
        deleteItem: composable.deleteItem,
        setCart: composable.setCart,
        clearCart: composable.clearCart,
    };
}
//# sourceMappingURL=useCart.js.map