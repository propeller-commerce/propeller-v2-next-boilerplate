import type { AuthComposableConfig } from '../auth/types';
export declare function useAuth(config: AuthComposableConfig): {
    login: (credentials: import("../auth/types").LoginCredentials) => Promise<import("../auth/types").LoginResult>;
    logout: () => void;
    refreshUser: () => Promise<import("propeller-sdk-v2").Contact | import("propeller-sdk-v2").Customer | null>;
    setUser: (user: import("propeller-sdk-v2").Contact | import("propeller-sdk-v2").Customer | null) => void;
    user: import("propeller-sdk-v2").Contact | import("propeller-sdk-v2").Customer | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
};
//# sourceMappingURL=useAuth.d.ts.map