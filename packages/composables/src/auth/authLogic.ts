import {
  LoginService,
  UserService,
  LoginInput,
  GraphQLClient,
  Contact,
  Customer,
} from 'propeller-sdk-v2';
import type { LoginResult } from './types';

/**
 * Execute the login flow: authenticate, update GraphQL client headers, fetch viewer data.
 * Returns the authenticated user and tokens.
 */
export async function loginFlow(
  graphqlClient: GraphQLClient,
  email: string,
  password: string,
): Promise<LoginResult> {
  const loginService = new LoginService(graphqlClient);
  const userService = new UserService(graphqlClient);

  const loginInput: LoginInput = { email, password };
  const loginResponse = await loginService.login(loginInput);

  if (!loginResponse?.session) {
    throw new Error('Invalid response: No session data received');
  }

  const session = loginResponse.session;
  const accessToken = session.accessToken;
  const refreshToken = session.refreshToken;

  if (!accessToken || !refreshToken) {
    throw new Error('Invalid response: Missing authentication tokens');
  }

  // Update GraphQL client with auth header
  const currentConfig = graphqlClient.getConfig();
  graphqlClient.updateConfig({
    headers: {
      ...currentConfig.headers,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // Fetch viewer data
  let user: Contact | Customer | null = null;
  try {
    user = (await userService.getViewer({})) as unknown as Contact | Customer;
  } catch {
    // Viewer fetch failed -- proceed without user data
  }

  if (!user) {
    throw new Error('Failed to fetch user data after login');
  }

  return {
    user,
    accessToken,
    refreshToken,
    expiresAt: session.expirationTime,
  };
}

/**
 * Clear authentication headers from the GraphQL client.
 */
export function clearAuthHeaders(graphqlClient: GraphQLClient): void {
  const currentConfig = graphqlClient.getConfig();
  const newHeaders = { ...currentConfig.headers };
  delete (newHeaders as Record<string, string>)['Authorization'];

  graphqlClient.updateConfig({
    headers: newHeaders,
  });
}

/**
 * Fetch the current viewer/user from the API.
 */
export async function fetchViewer(
  graphqlClient: GraphQLClient,
): Promise<Contact | Customer | null> {
  const userService = new UserService(graphqlClient);
  try {
    return (await userService.getViewer({})) as unknown as Contact | Customer;
  } catch {
    return null;
  }
}
