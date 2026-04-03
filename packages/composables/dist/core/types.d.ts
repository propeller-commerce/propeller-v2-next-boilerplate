import type { GraphQLClient } from 'propeller-sdk-v2';
export interface ComposableConfig {
    graphqlClient: GraphQLClient;
    language?: string;
}
export interface AsyncState {
    loading: boolean;
    error: string | null;
}
//# sourceMappingURL=types.d.ts.map