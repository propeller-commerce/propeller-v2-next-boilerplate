import { LoginService, UserService, LoginInput } from '@propeller-commerce/propeller-sdk-v2';
import { graphqlClient, toPlain } from '../api';
import { pickUserHint } from '../userHint';
import toast from 'react-hot-toast';
import { ViewerVariables, type Contact, type Customer } from '@propeller-commerce/propeller-sdk-v2';
import { config } from '@/data/config';

/**
 * What `login` hands back: the viewer when it resolves, or a thin stand-in
 * built from the session when the viewer call fails.
 */
export type LoginUser = Contact | Customer | { email: string; type: string };

export class AuthService {
    private loginService: LoginService;
    private userService: UserService;

    constructor() {
        this.loginService = new LoginService(graphqlClient);
        this.userService = new UserService(graphqlClient);
    }

    /**
     * Login with email and password
     */
    async login(email: string, password: string): Promise<{ accessToken: string; user: LoginUser | null }> {
        try {
            console.log('🚀 AuthService.login() called with email:', email);

            const loginInput: LoginInput = { email, password };
            const loginResponse = await this.loginService.login(loginInput);

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
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            // Get viewer data
            let user: LoginUser | null = null;
            try {
                const input: ViewerVariables = {
                    companyAttributesInput: {
                        attributeDescription: {
                            names: config.companyTrackAttributes
                        }
                    },
                    customerAttributesInput: {
                        attributeDescription: {
                            names: config.customerTrackAttributes
                        }
                    },
                    // Always paginate the viewer's companies + purchase-auth
                    // configs (see data/config.ts — objects, never `[]`).
                    contactPAConfigInput: config.contactPAConfigInput,
                    contactCompaniesSearchInput: config.contactCompaniesSearchInput
                };
                // `getViewer` resolves to the Contact/Customer itself — the SDK
                // already unwraps the GraphQL envelope. The old `.data` unwrap
                // beneath an `any` annotation was dead legacy.
                user = await this.userService.getViewer(input);
                console.log('Viewer data received:', user);
            } catch (viewerError) {
                console.warn('Failed to fetch viewer data:', viewerError);
                // Create basic user object from session
                user = {
                    email: session.email || email,
                    type: 'ANONYMOUS'
                };
            }

            // Persist the token in an httpOnly cookie (server-side) instead of
            // localStorage — JS can no longer read it, closing the XSS
            // token-theft hole. The in-memory graphqlClient header (set above)
            // keeps this page session working; the cookie keeps auth alive
            // across reloads via the /api/graphql proxy.
            if (typeof window !== 'undefined') {
                await fetch('/api/auth/session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accessToken, refreshToken }),
                });
                // Persist ONLY the thin render hint (id, type, name,
                // companyId) — never the full Contact. The full profile is
                // re-fetched via getViewer() on mount; see lib/userHint.ts.
                // The catch branch above can leave `user` as the thin session
                // stand-in rather than a real Contact/Customer; pickUserHint
                // returns null for anything it doesn't recognise.
                const hint = pickUserHint(toPlain(user) as Contact | Customer | null);
                if (hint) localStorage.setItem('user', JSON.stringify(hint));
                window.dispatchEvent(new CustomEvent('userLoggedIn'));
            }

            toast.success('Successfully logged in!');

            return { accessToken, user };
        } catch (error) {
            console.error('Login failed:', error);
            toast.error('Login failed. Please check your credentials.');
            throw error;
        }
    }

    /**
     * Logout
     */
    async logout(): Promise<void> {
        try {
            // Clear the in-memory SDK token for this page session.
            graphqlClient.clearAccessToken();
            const currentConfig = graphqlClient.getConfig();
            const newHeaders = { ...currentConfig.headers };
            delete newHeaders['Authorization'];
            graphqlClient.updateConfig({ headers: newHeaders });

            if (typeof window !== 'undefined') {
                // Clear the httpOnly auth cookie server-side.
                await fetch('/api/auth/logout', { method: 'POST' });
                // Only the non-sensitive render hints live in localStorage now.
                localStorage.removeItem('user');
                localStorage.removeItem('cart');
                window.dispatchEvent(new CustomEvent('userLoggedOut'));
            }

            toast.success('Successfully logged out');
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    }
}

export const authService = new AuthService();
