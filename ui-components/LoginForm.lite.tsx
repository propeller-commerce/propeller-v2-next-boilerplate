import {
    useStore,
    Show,
} from '@builder.io/mitosis';
import {
    Contact,
    Customer,
    GraphQLClient,
    LoginService,
    UserService,
    LoginInput,
} from 'propeller-sdk-v2';

export interface LoginFormProps {
    /**
     * GraphQL client for self-contained login.
     * When provided (and onLoginSubmit is not), the component handles
     * authentication internally via LoginService + UserService.
     */
    graphqlClient?: GraphQLClient;

    /** Title of the login form
     * @default "Log in"
     */
    title?: string;

    /** Subtitle of the login form
     * @default ""
     */
    subtitle?: string;

    /** Show/hide the password reset link
     * @default true
     */
    displayForgotPasswordLink?: boolean;

    /** Action for the password reset link click */
    onForgotPasswordClick?: () => void;

    /** Show/hide the registration link
     * @default true
     */
    displayRegisterLink?: boolean;

    /** Action for the registration link click */
    onRegisterClick?: () => void;

    /** Show/hide the guest checkout link
     * @default true
     */
    displayGuestCheckoutLink?: boolean;

    /** Action for the guest checkout link click */
    onGuestCheckoutClick?: () => void;

    /** Label for the submit button
     * @default "Login"
     */
    buttonText?: string;

    /**
     * Labels for the login form fields.
     *
     * Available keys:
     * - email: Email field label (default: "Email")
     * - password: Password field label (default: "Password")
     * - emailPlaceholder: Email input placeholder (default: "name@example.com")
     * - passwordPlaceholder: Password input placeholder (default: "••••••••")
     * - forgotPassword: Forgot password link text (default: "Forgot password?")
     * - registerText: Text before register link (default: "Don't have an account?")
     * - registerLink: Register link text (default: "Create an Account")
     * - guestCheckoutLink: Guest checkout link text (default: "Continue as Guest")
     */
    labels?: Record<string, string>;

    /**
     * Fires when login form is submitted (delegation mode).
     * When provided, the component does NOT call the SDK — the parent handles authentication.
     * When absent and graphqlClient is provided, the component handles login internally.
     */
    onLoginSubmit?: (email: string, password: string) => void;

    /** Whether login is currently in progress (shows loading state on button).
     * Used in delegation mode. Ignored in self-contained mode.
     * @default false
     */
    loginLoading?: boolean;

    /** Error message to display in the form.
     * Used in delegation mode. In self-contained mode the component manages its own error.
     */
    loginError?: string;

    /** Callback before the login process starts */
    beforeLogin?: () => void;

    /** Callback after successful login with user data */
    afterLogin?: (user: Contact | Customer) => void;
}

export default function LoginForm(props: LoginFormProps) {
    const state = useStore({
        _email: '',
        _password: '',
        _loading: false,
        _error: '',

        /**
         * Recursively converts an SDK class instance to a plain object,
         * stripping the leading underscore the SDK uses for private backing fields.
         */
        deepPlain(value: unknown): unknown {
            if (value === null || value === undefined) return value;
            if (Array.isArray(value)) return (value as unknown[]).map((v) => state.deepPlain(v));
            if (typeof value === 'object') {
                const result: Record<string, unknown> = {};
                for (const key of Object.keys(value as object)) {
                    const cleanKey = key.startsWith('_') ? key.slice(1) : key;
                    result[cleanKey] = state.deepPlain((value as Record<string, unknown>)[key]);
                }
                return result;
            }
            return value;
        },

        get emailLabel(): string {
            return props.labels?.email || 'Email';
        },
        get passwordLabel(): string {
            return props.labels?.password || 'Password';
        },
        get emailPlaceholder(): string {
            return props.labels?.emailPlaceholder || 'name@example.com';
        },
        get passwordPlaceholder(): string {
            return props.labels?.passwordPlaceholder || '••••••••';
        },
        get forgotPasswordText(): string {
            return props.labels?.forgotPassword || 'Forgot password?';
        },
        get registerText(): string {
            return props.labels?.registerText || "Don't have an account?";
        },
        get registerLinkText(): string {
            return props.labels?.registerLink || 'Create an Account';
        },
        get guestCheckoutLinkText(): string {
            return props.labels?.guestCheckoutLink || 'Continue as Guest';
        },
        get resolvedTitle(): string {
            return props.title !== undefined ? props.title : 'Log in';
        },
        get resolvedButtonText(): string {
            return props.buttonText || 'Login';
        },
        get showForgotPassword(): boolean {
            return props.displayForgotPasswordLink !== false;
        },
        get showRegister(): boolean {
            return props.displayRegisterLink !== false;
        },
        get showGuestCheckout(): boolean {
            return props.displayGuestCheckoutLink !== false;
        },
        get isLoading(): boolean {
            // Self-contained mode uses internal state; delegation mode uses prop
            if (props.onLoginSubmit) {
                return props.loginLoading === true;
            }
            return state._loading;
        },
        get errorMessage(): string {
            // Self-contained mode uses internal state; delegation mode uses prop
            if (props.onLoginSubmit) {
                return props.loginError || '';
            }
            return state._error;
        },

        async handleSubmit(e: Event) {
            e.preventDefault();

            if (props.beforeLogin) {
                props.beforeLogin();
            }

            if (props.onLoginSubmit) {
                // Delegation mode: parent handles authentication
                props.onLoginSubmit(state._email, state._password);
                return;
            }

            // Self-contained mode: handle login via SDK
            if (!props.graphqlClient) {
                state._error = 'Login is not configured. Please provide graphqlClient or onLoginSubmit.';
                return;
            }

            if (state._loading) return;

            state._loading = true;
            state._error = '';

            try {
                const loginService = new LoginService(props.graphqlClient as GraphQLClient);
                const userService = new UserService(props.graphqlClient as GraphQLClient);

                const loginInput: LoginInput = {
                    email: state._email,
                    password: state._password,
                };
                const loginResponse = await loginService.login(loginInput);

                if (!(loginResponse as any)?.session) {
                    throw new Error('Invalid response: No session data received');
                }

                const session = (loginResponse as any).session;
                const accessToken = session.accessToken;
                const refreshToken = session.refreshToken;

                if (!accessToken || !refreshToken) {
                    throw new Error('Invalid response: Missing authentication tokens');
                }

                // Update GraphQL client with auth header
                const currentConfig = (props.graphqlClient as any).getConfig();
                (props.graphqlClient as any).updateConfig({
                    headers: {
                        ...currentConfig.headers,
                        'Authorization': 'Bearer ' + accessToken,
                    },
                });

                // Fetch viewer data
                let user: any = null;
                try {
                    const viewerResponse: any = await userService.getViewer({});
                    if (viewerResponse?.data) {
                        user = viewerResponse.data;
                    } else {
                        user = viewerResponse;
                    }
                } catch (viewerError: any) {
                    user = { email: session.email || state._email, type: 'ANONYMOUS' };
                }

                // Store tokens and user data in localStorage
                if (typeof window !== 'undefined') {
                    localStorage.setItem('accessToken', accessToken);
                    localStorage.setItem('refreshToken', refreshToken);
                    localStorage.setItem('user', JSON.stringify(state.deepPlain(user)));
                }

                // Dispatch event for AuthContext to pick up
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('userLoggedIn'));
                }

                // Reset form
                state._email = '';
                state._password = '';

                // Notify parent
                if (props.afterLogin) {
                    props.afterLogin(user as Contact);
                }
            } catch (err: any) {
                state._error = err?.message || 'Login failed. Please check your credentials.';
            } finally {
                state._loading = false;
            }
        },
    });

    return (
        <div className="login-form">
            <Show when={state.resolvedTitle}>
                <div className="space-y-1 text-center mb-6">
                    <h2 className="text-2xl font-bold">{state.resolvedTitle}</h2>
                    <Show when={props.subtitle}>
                        <p className="text-sm text-gray-500">{props.subtitle}</p>
                    </Show>
                </div>
            </Show>

            <form onSubmit={(e) => state.handleSubmit(e)} className="space-y-4">
                <div className="space-y-2">
                    <label
                        htmlFor="login-email"
                        className="text-sm font-medium leading-none"
                    >
                        {state.emailLabel}
                    </label>
                    <input
                        type="email"
                        id="login-email"
                        name="email"
                        value={state._email}
                        onChange={(e) => { state._email = (e.target as HTMLInputElement).value; }}
                        placeholder={state.emailPlaceholder}
                        required
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={state.isLoading}
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label
                            htmlFor="login-password"
                            className="text-sm font-medium leading-none"
                        >
                            {state.passwordLabel}
                        </label>
                        <Show when={state.showForgotPassword}>
                            <button
                                type="button"
                                onClick={() => { if (props.onForgotPasswordClick) props.onForgotPasswordClick(); }}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                {state.forgotPasswordText}
                            </button>
                        </Show>
                    </div>
                    <input
                        type="password"
                        id="login-password"
                        name="password"
                        value={state._password}
                        onChange={(e) => { state._password = (e.target as HTMLInputElement).value; }}
                        placeholder={state.passwordPlaceholder}
                        required
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={state.isLoading}
                    />
                </div>

                <Show when={state.errorMessage}>
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                        {state.errorMessage}
                    </div>
                </Show>

                <button
                    type="submit"
                    disabled={state.isLoading}
                    className="inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Show when={state.isLoading}>
                        <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                    </Show>
                    {state.isLoading ? 'Logging in...' : state.resolvedButtonText}
                </button>
            </form>

            <Show when={state.showRegister || state.showGuestCheckout}>
                <div className="mt-6 border-t pt-6 space-y-3">
                    <Show when={state.showRegister}>
                        <div className="text-center">
                            <p className="text-sm text-gray-500 mb-2">{state.registerText}</p>
                            <button
                                type="button"
                                onClick={() => { if (props.onRegisterClick) props.onRegisterClick(); }}
                                className="inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                {state.registerLinkText}
                            </button>
                        </div>
                    </Show>
                    <Show when={state.showGuestCheckout}>
                        <div className="text-center">
                            <button
                                type="button"
                                onClick={() => { if (props.onGuestCheckoutClick) props.onGuestCheckoutClick(); }}
                                className="text-sm text-blue-600 hover:underline"
                            >
                                {state.guestCheckoutLinkText}
                            </button>
                        </div>
                    </Show>
                </div>
            </Show>
        </div>
    );
}
