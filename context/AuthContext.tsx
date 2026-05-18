'use client';

// 'use client' is already at the top of the file, this replacement starts after line 1.
import { Contact, Customer, PurchaseRole, UserService } from 'propeller-sdk-v2';
import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/services/AuthService';
import { graphqlClient } from '@/lib/api';
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

// Helper to remove leading underscores from object keys
const sanitizeUser = (data: any): User => {
  if (!data || typeof data !== 'object') return data;

  const cleanData: any = {};
  Object.keys(data).forEach(key => {
    const cleanKey = key.startsWith('_') ? key.substring(1) : key;
    cleanData[cleanKey] = data[key];
  });

  return cleanData as User;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize auth state on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        if (typeof window !== 'undefined') {
          const storedToken = localStorage.getItem('accessToken');
          const storedUser = localStorage.getItem('user');

          if (storedToken && storedUser) {
            const rawUser = JSON.parse(storedUser);
            const user = sanitizeUser(rawUser);

            // Restore auth header
            const currentConfig = graphqlClient.getConfig();
            graphqlClient.updateConfig({
              headers: {
                ...currentConfig.headers,
                'Authorization': `Bearer ${storedToken}`
              }
            });

            dispatch({
              type: 'AUTH_SUCCESS',
              payload: {
                user,
                accessToken: storedToken,
              },
            });
          } else {
            dispatch({ type: 'SET_LOADING', payload: false });
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
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

    // Read language before clearing localStorage
    const lang = typeof window !== 'undefined'
      ? localStorage.getItem('preferred_language') || 'NL'
      : 'NL';

    // Clear local storage except 'menuData'
    if (typeof window !== 'undefined') {
      const menuData = localStorage.getItem('menuData');
      localStorage.clear();
      if (menuData) {
        localStorage.setItem('menuData', menuData);
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

  // Helper to remove leading underscores from object keys
  const sanitizeUser = (data: any): User => {
    if (!data || typeof data !== 'object') return data;

    const cleanData: any = {};
    Object.keys(data).forEach(key => {
      const cleanKey = key.startsWith('_') ? key.substring(1) : key;
      cleanData[cleanKey] = data[key];
    });

    return cleanData as User;
  };

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
        const strip = (obj: any): any => {
          if (obj === null || obj === undefined) return obj;
          if (Array.isArray(obj)) return obj.map(strip);
          if (typeof obj === 'object') {
            const r: any = {};
            for (const [k, val] of Object.entries(obj)) {
              r[k.startsWith('_') ? k.slice(1) : k] = strip(val);
            }
            return r;
          }
          return obj;
        };
        const plain = strip(JSON.parse(JSON.stringify(viewerData, (_k, v) => v)));
        const storedToken = localStorage.getItem('accessToken');
        localStorage.setItem('user', JSON.stringify(plain));
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: { user: plain as User, accessToken: storedToken || '' },
        });
      }
    } catch (e) {
      console.error('Error refreshing user data:', e);
    }
  }, []);

  const isAuthManagerForCompany = (user: Contact | Customer | null, companyId: number | undefined): boolean => {
    if (!user || !companyId || !('contactId' in user)) return false;
    const pacData = (user as any).purchaseAuthorizationConfigs;
    const items: any[] = pacData?.items ?? pacData?._items ?? [];
    return items.some((pac: any) => {
      const role = pac.purchaseRole ?? pac._purchaseRole;
      const pacCompanyId = pac.company?.companyId ?? pac.company?._companyId ?? pac._company?.companyId ?? pac._company?._companyId;
      return role === PurchaseRole.AUTHORIZATION_MANAGER && pacCompanyId === companyId;
    });
  };

  // Listen for external auth events (e.g. from other tabs)
  useEffect(() => {
    const handleUserLoggedIn = () => {
      const storedToken = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('user');
      if (storedToken && storedUser) {
        try {
          const user = sanitizeUser(JSON.parse(storedUser));
          dispatch({
            type: 'AUTH_SUCCESS',
            payload: { user, accessToken: storedToken },
          });
        } catch (e) {
          console.error('Failed to parse stored user on userLoggedIn event:', e);
        }
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
