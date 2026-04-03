"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useProductGrid = useProductGrid;
const react_1 = require("react");
const ProductGridComposable_1 = require("../productGrid/ProductGridComposable");
function useProductGrid(config) {
    const composable = (0, react_1.useMemo)(() => (0, ProductGridComposable_1.createProductGridComposable)(config), 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.graphqlClient, config.user, config.companyId, config.language]);
    const state = (0, react_1.useSyncExternalStore)(composable.subscribe, composable.getState);
    return {
        ...state,
        fetch: composable.fetch,
        goToPage: composable.goToPage,
        setSort: composable.setSort,
    };
}
//# sourceMappingURL=useProductGrid.js.map