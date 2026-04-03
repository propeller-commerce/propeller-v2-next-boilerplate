"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuthComposable = createAuthComposable;
const ComposableStore_1 = require("../core/ComposableStore");
const authLogic_1 = require("./authLogic");
const INITIAL_STATE = {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    loading: false,
    error: null,
};
/**
 * Creates an auth composable -- framework-agnostic state + actions for authentication.
 *
 * Wrap with a React hook (useSyncExternalStore) or Vue composable (shallowRef)
 * to get reactive state in your framework.
 */
function createAuthComposable(config) {
    const store = new ComposableStore_1.ComposableStore({ ...INITIAL_STATE });
    async function login(credentials) {
        store.setState({ loading: true, error: null });
        try {
            const result = await (0, authLogic_1.loginFlow)(config.graphqlClient, credentials.email, credentials.password);
            store.setState({
                user: result.user,
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                isAuthenticated: true,
                loading: false,
            });
            return result;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Login failed';
            store.setState({
                loading: false,
                error: message,
                isAuthenticated: false,
            });
            throw error;
        }
    }
    function logout() {
        (0, authLogic_1.clearAuthHeaders)(config.graphqlClient);
        store.setState({ ...INITIAL_STATE });
    }
    async function refreshUser() {
        const user = await (0, authLogic_1.fetchViewer)(config.graphqlClient);
        store.setState({ user, isAuthenticated: user !== null });
        return user;
    }
    function setUser(user) {
        store.setState({ user, isAuthenticated: user !== null });
    }
    return {
        getState: store.getState,
        subscribe: store.subscribe,
        login,
        logout,
        refreshUser,
        setUser,
    };
}
//# sourceMappingURL=AuthComposable.js.map