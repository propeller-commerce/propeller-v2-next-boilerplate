'use client';

// 'use client' is already at the top of the file, this replacement starts after line 1.
import { Contact, Customer, PurchaseRole, UserService } from '@propeller-commerce/propeller-sdk-v2';
import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/services/AuthService';
import { graphqlClient } from '@/lib/api';
import { toPlain } from '@propeller-commerce/propeller-v2-react-ui';
import { localizeHref } from '@/data/config';
import { pickUserHint, isUserHint, type UserHint } from '@/lib/userHint';

type User = Contact | Customer;

interface AuthState {
  /**
   * The full Contact/Customer. Populated by a fresh `getViewer()` call —
   * on mount, on login, on refresh. NOT restored from localStorage; the
   * only thing cached there is the thin `UserHint`. So between a page
   * mount and the getViewer() round-trip completing, `user` is `null`
   * even for an authenticated visitor — consumers that need deep fields
   * (addresses, company tree, PA configs) must tolerate that gap.
   */
  user: User | null;
  /**
   * The thin render hint — `{userId,type,firstName,lastName,companyId}`.
   * Restored synchronously from localStorage so the UI can paint the
   * header greeting / authenticated state instantly, before `user`
   * arrives. Carries no PII beyond a name. See lib/userHint.ts.
   */
  userHint: UserHint | null;
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
  | { type: 'UPDATE_USER'; payload: Partial<User> }
  // Instant-paint hydration from the localStorage hint — sets the thin
  // `userHint` + `isAuthenticated`, but leaves `user` null until the
  // companion getViewer() call resolves.
  | { type: 'AUTH_HINT'; payload: { userHint: UserHint } };

const initialState: AuthState = {
  user: null,
  userHint: null,
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
    case 'AUTH_HINT':
      // Instant paint from the localStorage hint. `user` stays null — the
      // full profile arrives via the companion getViewer() / AUTH_SUCCESS.
      return {
        ...state,
        userHint: action.payload.userHint,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        // Keep the thin hint in step with the full user.
        userHint: pickUserHint(action.payload.user),
        accessToken: action.payload.accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        userHint: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        userHint: null,
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
  // The JWT lives only in an httpOnly cookie that JS cannot read. We ask the
  // server (/api/auth/me) whether that cookie is present. If so:
  //
  //  1. Paint immediately from the thin `UserHint` in localStorage — enough
  //     for the header greeting and the authenticated UI state, no PII.
  //  2. Fetch the full Contact/Customer with getViewer() (refreshUser). It
  //     replaces `state.user` when it lands. The full profile is NEVER
  //     restored from localStorage — only ever fetched fresh — so an XSS
  //     reading localStorage gets the thin hint, not the whole profile.
  //
  // Between step 1 and step 2 resolving, `state.user` is null for an
  // authenticated visitor; `state.userHint` carries the paint data.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let cancelled = false;
    const initializeAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const { authenticated } = (await res.json()) as { authenticated: boolean };
        if (cancelled) return;

        if (!authenticated) {
          // No session cookie — drop any stale hint and finish loading.
          localStorage.removeItem('user');
          dispatch({ type: 'SET_LOADING', payload: false });
          return;
        }

        // Step 1 — instant paint from the thin hint, if present and valid.
        const stored = localStorage.getItem('user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (isUserHint(parsed)) {
              dispatch({ type: 'AUTH_HINT', payload: { userHint: parsed } });
            } else {
              // Stale full-Contact shape from before Phase A-bis — discard.
              localStorage.removeItem('user');
            }
          } catch {
            localStorage.removeItem('user');
          }
        }

        // Step 2 — fetch the full profile. refreshUser dispatches
        // AUTH_SUCCESS (and rewrites the thin hint) when it resolves.
        await refreshUser();
        if (cancelled) return;

        // If we had no valid hint AND getViewer() returned nothing, settle
        // the loading flag so the UI doesn't spin forever.
        dispatch({ type: 'SET_LOADING', payload: false });
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
    // refreshUser is a stable useCallback (empty deps) — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Persist only the thin hint — never the full (PII-bearing) Contact.
      const updatedUser = { ...state.user, ...userData } as User;
      const hint = pickUserHint(updatedUser);
      if (hint) localStorage.setItem('user', JSON.stringify(hint));
    }
  }, [state.user]);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const userService = new UserService(graphqlClient);
      const viewerData = await userService.getViewer({});
      if (viewerData) {
        const plain = toPlain(viewerData) as User;
        // localStorage gets ONLY the thin hint. The full profile lives in
        // React state for this page session and is never serialized.
        const hint = pickUserHint(plain);
        if (hint) localStorage.setItem('user', JSON.stringify(hint));
        // accessToken in reducer state is vestigial — the JWT lives only in the
        // httpOnly cookie and is injected by the /api/graphql proxy.
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user: plain, accessToken: '' },
        });
        // Let CompanyContext re-point its `selectedCompany` at the fresh
        // company copy. That context holds a SEPARATE snapshot of the company
        // (the dashboard reads addresses + company info off it, not off
        // `user.company`), so after an address mutation + refreshUser it would
        // otherwise stay stale — old addresses on the dashboard. Decoupled via
        // a window event, like the existing `companySwitched`/`userLoggedIn`.
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('userRefreshed', { detail: { user: plain } }));
        }
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
      // Cross-tab / post-login signal. The token is in the httpOnly cookie,
      // so confirm the session server-side, paint from the thin hint, then
      // fetch the full profile — same two-step as the mount path.
      try {
        const res = await fetch('/api/auth/me');
        const { authenticated } = (await res.json()) as { authenticated: boolean };
        if (!authenticated) return;

        const stored = localStorage.getItem('user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (isUserHint(parsed)) {
              dispatch({ type: 'AUTH_HINT', payload: { userHint: parsed } });
            }
          } catch {
            /* malformed hint — refreshUser below still repopulates */
          }
        }
        await refreshUser();
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
