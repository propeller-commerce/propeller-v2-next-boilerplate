"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useAuth = useAuth;
const vue_1 = require("vue");
const AuthComposable_1 = require("../auth/AuthComposable");
function useAuth(config) {
    const composable = (0, AuthComposable_1.createAuthComposable)(config);
    const state = (0, vue_1.shallowRef)(composable.getState());
    const unsubscribe = composable.subscribe(() => {
        state.value = composable.getState();
    });
    (0, vue_1.onUnmounted)(unsubscribe);
    return {
        state: (0, vue_1.readonly)(state),
        login: composable.login,
        logout: composable.logout,
        refreshUser: composable.refreshUser,
        setUser: composable.setUser,
    };
}
//# sourceMappingURL=useAuth.js.map