import { type DeepReadonly, type ShallowRef } from 'vue';
import type { AuthComposableConfig, AuthState, AuthComposable } from '../auth/types';
type UseAuthReturn = Omit<AuthComposable, 'getState' | 'subscribe'> & {
    state: DeepReadonly<ShallowRef<AuthState>>;
};
export declare function useAuth(config: AuthComposableConfig): UseAuthReturn;
export {};
//# sourceMappingURL=useAuth.d.ts.map