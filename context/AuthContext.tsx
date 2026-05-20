'use client';

// 'use client' is already at the top of the file, this replacement starts after line 1.
import { Contact, Customer, PurchaseRole, UserService } from 'propeller-sdk-v2';
import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/services/AuthService';
import { graphqlClient, toPlain } from '@/lib/api';
import { localizeHref } from '@/data/config';

type User = Contact | Customer;

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;
}

interface AuthContextType {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  isAuthManagerForCompany: (user: Contact | Customer | null, companyId: number | undefined) => boolean;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; accessToken: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  accessToken: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } as User : null,
      };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Strip SDK underscore prefixes off the cached user payload.
//
// Until this commit there were three copies of this helper (here, inside
// AuthProvider, and inside AuthService) and they only walked one level deep —
// which is why every consumer that touched `user.companies.items` or
// `user.purchaseAuthorizationConfigs._items` had to write `?? _items` fallbacks
// (see CartSummary, CompanySwitcher, useCheckout). `toPlain` from lib/api
// walks the full tree, so the cached `user` shape now matches the SDK's
// public Contact/Customer types end-to-end and the underscore fallbacks
// can go away.
const sanitizeUser = (data: unknown): User => toPlain(data) as User;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize auth state on mount.
  //
  // The JWT now lives only in an httpOnly cookie that JS cannot read. We ask
  // the server (/api/auth/me) whether that cookie is present, and if so hydrate
  // the UI from the non-sensitive `user` render hint in localStorage. No token
  // is read or injected client-side — the /api/graphql proxy attaches it from
  // the cookie, and the real GraphQL API validates it on the next data call.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    const initializeAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const { authenticated } = (await res.json()) as { authenticated: boolean };
        if (cancelled) return;

        const storedUser = localStorage.getItem('user');
        if (authenticated && storedUser) {
          const user = sanitizeUser(JSON.parse(storedUser));
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user, accessToken: '' },
          });
        } else {
          // No session cookie (or no cached profile) — stale hint, clear it.
          if (!authenticated) localStorage.removeItem('user');
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error initializing auth:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const { accessToken, user: rawUser } = await authService.login(email, password);
      const user = sanitizeUser(rawUser);

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: {
          user,
          accessToken,
        },
      });

      // Dispatch custom event for other components
      window.dispatchEvent(new CustomEvent('userLoggedIn'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      throw error;
    }
  }, []);

  // Logout function
  const logout = useCallback(async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }

    const lang = typeof window !== 'undefined'
      ? localStorage.getItem('preferred_language') || 'NL'
      : 'NL';

    // Remove only auth-related keys. `authService.logout()` already cleared the
    // httpOnly cookie + `user`/`cart`; a blanket `localStorage.clear()` would
    // also wipe unrelated keys (menuData, preferred_language, host-app data).
    if (typeof window !== 'undefined') {
      // `access_token` is the SDK's own DEFAULT_TOKEN_STORAGE_KEY; clear it too
      // so any legacy/stale token left by an older build is removed on logout.
      for (const key of ['user', 'cart', 'selected_company', 'accessToken', 'access_token', 'refreshToken', 'refresh_token', 'expiresAt']) {
        localStorage.removeItem(key);
      }
    }

    dispatch({ type: 'AUTH_LOGOUT' });

    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('userLoggedOut'));

    // Redirect to home
    router.push(localizeHref('/', lang));
  }, [router]);

  // Session timeout logic
  const resetSessionTimer = useCallback(() => {
    if (!state.isAuthenticated) return;

    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }

    // Set 30 minute timeout
    logoutTimerRef.current = setTimeout(() => {
      console.log('Session expired due to inactivity');
      logout();
    }, 30 * 60 * 1000);
  }, [state.isAuthenticated, logout]);

  // Setup activity listeners
  useEffect(() => {
    if (state.isAuthenticated) {
      // Create event handler
      const handleActivity = () => resetSessionTimer();

      // Events to track
      const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

      // Add listeners
      events.forEach(event => {
        window.addEventListener(event, handleActivity);
      });

      // Initial timer start
      resetSessionTimer();

      // Cleanup
      return () => {
        if (logoutTimerRef.current) {
          clearTimeout(logoutTimerRef.current);
        }
        events.forEach(event => {
          window.removeEventListener(event, handleActivity);
        });
      };
    }
  }, [state.isAuthenticated, resetSessionTimer]);

  const clearError = useCallback((): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const updateUser = useCallback((userData: Partial<User>): void => {
    dispatch({ type: 'UPDATE_USER', payload: userData });

    if (typeof window !== 'undefined' && state.user) {
      const updatedUser = { ...state.user, ...userData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  }, [state.user]);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const userService = new UserService(graphqlClient);
      const viewerData = await userService.getViewer({});
      if (viewerData) {
        const plain = toPlain(viewerData) as User;
        localStorage.setItem('user', JSON.stringify(plain));
        // accessToken in reducer state is vestigial — the JWT lives only in the
        // httpOnly cookie and is injected by the /api/graphql proxy.
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user: plain, accessToken: '' },
        });
      }
    } catch (e) {
      console.error('Error refreshing user data:', e);
    }
  }, []);

  const isAuthManagerForCompany = (user: Contact | Customer | null, companyId: number | undefined): boolean => {
    if (!user || !companyId || !('contactId' in user)) return false;
    // The cached user has been through toPlain(), so .items / .purchaseRole /
    // .company are the canonical (non-underscored) fields.
    const items = user.purchaseAuthorizationConfigs?.items ?? [];
    return items.some((pac) => {
      return pac.purchaseRole === PurchaseRole.AUTHORIZATION_MANAGER
        && pac.company?.companyId === companyId;
    });
  };

  // Listen for external auth events (e.g. from other tabs)
  useEffect(() => {
    const handleUserLoggedIn = async () => {
      // Cross-tab / post-login signal. The token is in the httpOnly cookie, so
      // confirm the session server-side and hydrate from the user hint.
      try {
        const res = await fetch('/api/auth/me');
        const { authenticated } = (await res.json()) as { authenticated: boolean };
        const storedUser = localStorage.getItem('user');
        if (authenticated && storedUser) {
          const user = sanitizeUser(JSON.parse(storedUser));
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user, accessToken: '' },
          });
        }
      } catch (e) {
        console.error('Failed to resolve session on userLoggedIn event:', e);
      }
    };

    const handleUserLoggedOut = () => {
      dispatch({ type: 'AUTH_LOGOUT' });
    };

    window.addEventListener('userLoggedIn', handleUserLoggedIn);
    window.addEventListener('userLoggedOut', handleUserLoggedOut);

    return () => {
      window.removeEventListener('userLoggedIn', handleUserLoggedIn);
      window.removeEventListener('userLoggedOut', handleUserLoggedOut);
    };
  }, []);

  const contextValue: AuthContextType = {
    state,
    login,
    logout,
    clearError,
    updateUser,
    refreshUser,
    isAuthManagerForCompany
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
