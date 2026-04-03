import { ComposableStore } from '../core/ComposableStore';
import { loginFlow, clearAuthHeaders, fetchViewer } from './authLogic';
import type {
  AuthComposableConfig,
  AuthState,
  LoginCredentials,
  AuthComposable,
} from './types';

const INITIAL_STATE: AuthState = {
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
export function createAuthComposable(config: AuthComposableConfig): AuthComposable {
  const store = new ComposableStore<AuthState>({ ...INITIAL_STATE });

  async function login(credentials: LoginCredentials) {
    store.setState({ loading: true, error: null });
    try {
      const result = await loginFlow(
        config.graphqlClient,
        credentials.email,
        credentials.password,
      );

      store.setState({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        isAuthenticated: true,
        loading: false,
      });

      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Login failed';
      store.setState({
        loading: false,
        error: message,
        isAuthenticated: false,
      });
      throw error;
    }
  }

  function logout() {
    clearAuthHeaders(config.graphqlClient);
    store.setState({ ...INITIAL_STATE });
  }

  async function refreshUser() {
    const user = await fetchViewer(config.graphqlClient);
    store.setState({ user, isAuthenticated: user !== null });
    return user;
  }

  function setUser(user: Parameters<AuthComposable['setUser']>[0]) {
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
