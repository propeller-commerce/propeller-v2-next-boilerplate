"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = useAuth;
const react_1 = require("react");
const AuthComposable_1 = require("../auth/AuthComposable");
function useAuth(config) {
    const composable = (0, react_1.useMemo)(() => (0, AuthComposable_1.createAuthComposable)(config), 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.graphqlClient]);
    const state = (0, react_1.useSyncExternalStore)(composable.subscribe, composable.getState);
    return {
        ...state,
        login: composable.login,
        logout: composable.logout,
        refreshUser: composable.refreshUser,
        setUser: composable.setUser,
    };
}
//# sourceMappingURL=useAuth.js.map