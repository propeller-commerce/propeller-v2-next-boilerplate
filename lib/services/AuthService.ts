import { LoginService, UserService, LoginInput } from 'propeller-sdk-v2';
import { graphqlClient } from '../api';
import toast from 'react-hot-toast';
import { ViewerInput } from 'propeller-sdk-v2/dist/service/UserService';

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
    async login(email: string, password: string): Promise<{ accessToken: string; user: any }> {
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
            let user = null;
            try {
                const input: ViewerInput = {};
                // Pass empty object as argument if required by the SDK
                const viewerResponse: any = await this.userService.getViewer({});
                console.log('Viewer data received:', viewerResponse);

                if (viewerResponse?.data) {
                    user = viewerResponse.data;
                } else {
                    user = viewerResponse;
                }
            } catch (viewerError) {
                console.warn('Failed to fetch viewer data:', viewerError);
                // Create basic user object from session
                user = {
                    email: session.email || email,
                    type: 'ANONYMOUS'
                };
            }

            // Store tokens and user data
            if (typeof window !== 'undefined') {
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', refreshToken);
                localStorage.setItem('user', JSON.stringify(user));
            }

            // Dispatch event for AuthContext
            if (typeof window !== 'undefined') {
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
            // Clear auth header
            const currentConfig = graphqlClient.getConfig();
            const newHeaders = { ...currentConfig.headers };
            delete newHeaders['Authorization'];

            graphqlClient.updateConfig({
                headers: newHeaders
            });

            // Clear localStorage
            if (typeof window !== 'undefined') {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                localStorage.removeItem('cart');
            }

            // Dispatch event for AuthContext
            if (typeof window !== 'undefined') {
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
