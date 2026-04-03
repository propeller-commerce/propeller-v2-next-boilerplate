import { GraphQLClient, Contact, Customer } from 'propeller-sdk-v2';
import type { LoginResult } from './types';
/**
 * Execute the login flow: authenticate, update GraphQL client headers, fetch viewer data.
 * Returns the authenticated user and tokens.
 */
export declare function loginFlow(graphqlClient: GraphQLClient, email: string, password: string): Promise<LoginResult>;
/**
 * Clear authentication headers from the GraphQL client.
 */
export declare function clearAuthHeaders(graphqlClient: GraphQLClient): void;
/**
 * Fetch the current viewer/user from the API.
 */
export declare function fetchViewer(graphqlClient: GraphQLClient): Promise<Contact | Customer | null>;
//# sourceMappingURL=authLogic.d.ts.map