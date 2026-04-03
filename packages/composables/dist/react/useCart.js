"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCart = useCart;
const react_1 = require("react");
const CartComposable_1 = require("../cart/CartComposable");
function useCart(config) {
    const composable = (0, react_1.useMemo)(() => (0, CartComposable_1.createCartComposable)(config), 
    // Re-create when identity-stable config values change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.graphqlClient, config.user, config.companyId, config.language]);
    const state = (0, react_1.useSyncExternalStore)(composable.subscribe, composable.getState);
    return {
        ...state,
        resolveOrCreateCart: composable.resolveOrCreateCart,
        addItem: composable.addItem,
        updateItemQuantity: composable.updateItemQuantity,
        deleteItem: composable.deleteItem,
        setCart: composable.setCart,
        clearCart: composable.clearCart,
    };
}
//# sourceMappingURL=useCart.js.map