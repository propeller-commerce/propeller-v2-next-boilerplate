"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useProductGrid = useProductGrid;
const vue_1 = require("vue");
const ProductGridComposable_1 = require("../productGrid/ProductGridComposable");
function useProductGrid(config) {
    const composable = (0, ProductGridComposable_1.createProductGridComposable)(config);
    const state = (0, vue_1.shallowRef)(composable.getState());
    const unsubscribe = composable.subscribe(() => {
        state.value = composable.getState();
    });
    (0, vue_1.onUnmounted)(unsubscribe);
    return {
        state: (0, vue_1.readonly)(state),
        fetch: composable.fetch,
        goToPage: composable.goToPage,
        setSort: composable.setSort,
    };
}
//# sourceMappingURL=useProductGrid.js.map