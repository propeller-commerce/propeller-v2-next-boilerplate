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
    ViewerResult,
    ViewerInput,
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
    onForgotPasswordClick?: (event?: any) => void;

    /** Show/hide the registration link
     * @default true
     */
    displayRegisterLink?: boolean;

    /** Action for the registration link click */
    onRegisterClick?: (event?: any) => void;

    /** Show/hide the guest checkout link
     * @default true
     */
    displayGuestCheckoutLink?: boolean;

    /** Action for the guest checkout link click */
    onGuestCheckoutClick?: (event?: any) => void;

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
    afterLogin?: (user: Contact | Customer, accessToken?: string, refreshToken?: string, expiresAt?: string) => void;

    /**
     * Show login form in dropdown for immediate login when user is not logged in.
     * @default true
     */
    accountHeaderLoginForm?: boolean;

    /** Config object providing imageSearchFiltersGrid and imageVariantFiltersSmall. */
    configuration?: any;
}

interface LoginFormState {
    email: string;
    password: string;
    loading: boolean;
    error: string;
    getLabel: (key: string, fallback: string) => string;
    emailLabel: string;
    passwordLabel: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    forgotPasswordText: string;
    registerText: string;
    registerLinkText: string;
    guestCheckoutLinkText: string;
    resolvedTitle: string;
    resolvedButtonText: string;
    showForgotPassword: boolean;
    showRegister: boolean;
    showGuestCheckout: boolean;
    isLoading: boolean;
    errorMessage: string;
    handleSubmit: (e: any) => Promise<void>;
}

export default function LoginForm(props: LoginFormProps) {
    const state = useStore<LoginFormState>({
        email: '',
        password: '',
        loading: false,
        error: '',

        getLabel(key: string, fallback: string) {
            return (props.labels as any)?.[key] || fallback;
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
            return state.loading;
        },
        get errorMessage(): string {
            // Self-contained mode uses internal state; delegation mode uses prop
            if (props.onLoginSubmit) {
                return props.loginError || '';
            }
            return state.error;
        },

        async handleSubmit(e: any) {
            e.preventDefault();

            if (props.beforeLogin) {
                props.beforeLogin();
            }

            if (props.onLoginSubmit) {
                // Delegation mode: parent handles authentication
                props.onLoginSubmit(state.email, state.password);
                return;
            }

            // Self-contained mode: handle login via SDK
            if (!props.graphqlClient) {
                state.error = 'Login is not configured. Please provide graphqlClient or onLoginSubmit.';
                return;
            }

            if (state.loading) return;

            state.loading = true;
            state.error = '';

            try {
                const loginService = new LoginService(props.graphqlClient as GraphQLClient);
                const userService = new UserService(props.graphqlClient as GraphQLClient);

                const loginInput: LoginInput = {
                    email: state.email,
                    password: state.password,
                };
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
                const currentConfig = props.graphqlClient.getConfig();
                props.graphqlClient.updateConfig({
                    headers: {
                        ...currentConfig.headers,
                        'Authorization': 'Bearer ' + accessToken,
                    },
                });

                // Fetch viewer data
                let user: ViewerResult | null = null;
                try {
                    const viewerInput: ViewerInput = {
                        ...(props.configuration?.contactTrackAttributes.length && {
                            contactAttributesInput: {
                                attributeDescription: {
                                    names: props.configuration?.contactTrackAttributes
                                }
                            }
                        }),
                        ...(props.configuration?.customerTrackAttributes.length && {
                            customerAttributesInput: {
                                attributeDescription: {
                                    names: props.configuration?.customerTrackAttributes
                                }
                            }
                        }),
                        ...(props.configuration?.companyTrackAttributes.length && {
                            companyAttributesInput: {
                                attributeDescription: {
                                    names: props.configuration?.companyTrackAttributes
                                }
                            }
                        }),
                        ...(props.configuration?.contactPAConfigInput && {
                            contactPAConfigInput: props.configuration?.contactPAConfigInput
                        })
                    };
                    user = await userService.getViewer(viewerInput);
                } catch (viewerError: any) { }

                // Dispatch event for AuthContext to pick up
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('userLoggedIn'));
                }

                // Reset form
                state.email = '';
                state.password = '';

                // Notify parent
                if (props.afterLogin) {
                    props.afterLogin(user as unknown as Contact | Customer, accessToken, refreshToken, session?.expirationTime);
                }
            } catch (err: any) {
                state.error = 'The credentials you entered don\'t match our records. Please try again.';
            } finally {
                state.loading = false;
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
                        value={state.email}
                        onChange={(e) => { state.email = (e.target as HTMLInputElement).value; }}
                        placeholder={state.emailPlaceholder}
                        required
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
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
                        <Show when={state.showForgotPassword && !props.accountHeaderLoginForm}>
                            <button
                                type="button"
                                onClick={() => { if (props.onForgotPasswordClick) props.onForgotPasswordClick(); }}
                                className="text-sm text-primary hover:underline"
                            >
                                {state.forgotPasswordText}
                            </button>
                        </Show>
                    </div>
                    <input
                        type="password"
                        id="login-password"
                        name="password"
                        value={state.password}
                        onChange={(e) => { state.password = (e.target as HTMLInputElement).value; }}
                        placeholder={state.passwordPlaceholder}
                        required
                        className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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

            <Show when={(state.showRegister || state.showGuestCheckout) && !props.accountHeaderLoginForm}>
                <div className="mt-6 border-t pt-6 space-y-3">
                    <Show when={state.showRegister}>
                        <div className="text-center">
                            <p className="text-sm text-gray-500 mb-2">{state.registerText}</p>
                            <button
                                type="button"
                                onClick={() => { if (props.onRegisterClick) props.onRegisterClick(); }}
                                className="inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
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
                                className="text-sm text-primary hover:underline"
                            >
                                {state.guestCheckoutLinkText}
                            </button>
                        </div>
                    </Show>
                </div>
            </Show>

            <Show when={props.accountHeaderLoginForm}>
                <div className="flex flex-col gap-2 text-sm pt-3 text-center">
                    <button
                        type="button"
                        onClick={() => { if (props.onForgotPasswordClick) props.onForgotPasswordClick(); }}
                        className="text-secondary hover:underline text-xs"
                    >
                        {state.getLabel('forgotPassword', 'Forgot Password?')}
                    </button>
                    <div className="text-xs text-gray-500">
                        {state.getLabel('noAccount', "Don't have an account?")}{' '}
                        <button
                            type="button"
                            onClick={() => { if (props.onRegisterClick) props.onRegisterClick(); }}
                            className="text-secondary hover:underline font-medium"
                        >
                            {state.getLabel('registerLink', 'Register')}
                        </button>
                    </div>
                </div>
            </Show>
        </div>
    );
}
