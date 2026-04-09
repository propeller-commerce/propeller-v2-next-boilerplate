import {
    useStore,
    Show,
} from '@builder.io/mitosis';
import {
    GraphQLClient,
} from 'propeller-sdk-v2';
import {
    UserService,
} from 'propeller-sdk-v2';

export interface ForgotPasswordProps {
    /** GraphQL client for the Propeller SDK */
    graphqlClient: GraphQLClient;

    /** Title of the forgot password form
     * @default "Forgot password?"
     */
    title?: string;

    /** Subtitle of the forgot password form
     * @default ""
     */
    subtitle?: string;

    /** Label for the submit button
     * @default "Reset"
     */
    buttonText?: string;

    /** Message displayed after successful submission
     * @default "If an account exists with this email, you will receive a password reset link shortly."
     */
    responseMessage?: string;

    /**
     * Labels for the forgot password form fields.
     *
     * Available keys:
     * - email: Email field label (default: "Email")
     * - emailPlaceholder: Email input placeholder (default: "name@example.com")
     */
    labels?: Record<string, string>;

    /** Callback before the forgot password process starts */
    beforeForgotPassword?: () => void;

    /** Callback after the user has requested a password reset */
    afterForgotPassword?: (result: boolean) => void;
}

interface ForgotPasswordState {
    email: string;
    loading: boolean;
    submitted: boolean;
    error: string;
    resolvedTitle: string;
    resolvedButtonText: string;
    resolvedResponseMessage: string;
    emailLabel: string;
    emailPlaceholder: string;
    handleSubmit: (e: any) => Promise<void>;
}

export default function ForgotPassword(props: ForgotPasswordProps) {
    const state = useStore<ForgotPasswordState>({
        email: '',
        loading: false,
        submitted: false,
        error: '',

        get resolvedTitle(): string {
            return props.title !== undefined ? props.title : 'Forgot password?';
        },
        get resolvedButtonText(): string {
            return props.buttonText || 'Reset';
        },
        get resolvedResponseMessage(): string {
            return props.responseMessage || 'If an account exists with this email, you will receive a password reset link shortly.';
        },
        get emailLabel(): string {
            return props.labels?.email || 'Email';
        },
        get emailPlaceholder(): string {
            return props.labels?.emailPlaceholder || 'name@example.com';
        },

        async handleSubmit(e: any) {
            e.preventDefault();
            if (state.loading) return;

            if (props.beforeForgotPassword) {
                props.beforeForgotPassword();
            }

            state.loading = true;
            state.error = '';

            try {
                const userService = new UserService(props.graphqlClient as GraphQLClient);
                const result = await userService.sendPasswordResetEmail({
                    email: state.email,
                });
                state.submitted = true;

                if (props.afterForgotPassword) {
                    props.afterForgotPassword(result);
                }
            } catch (err: any) {
                state.error = 'We couldn\'t find an account with that email address. Please double-check and try again. If you don\'t receive an email within a few minutes, please check that you entered the correct email address and try again.';

                if (props.afterForgotPassword) {
                    props.afterForgotPassword(false);
                }
            } finally {
                state.loading = false;
            }
        },
    });

    return (
        <div className="forgot-password-form">
            <Show when={state.resolvedTitle}>
                <div className="space-y-1 text-center mb-6">
                    <h2 className="text-2xl font-bold">{state.resolvedTitle}</h2>
                    <Show when={props.subtitle}>
                        <p className="text-sm text-gray-500">{props.subtitle}</p>
                    </Show>
                </div>
            </Show>

            <Show when={!state.submitted}>
                <form onSubmit={(e) => state.handleSubmit(e)} className="space-y-4">
                    <div className="space-y-2">
                        <label
                            htmlFor="forgot-password-email"
                            className="text-sm font-medium leading-none"
                        >
                            {state.emailLabel}
                        </label>
                        <input
                            type="email"
                            id="forgot-password-email"
                            name="email"
                            value={state.email}
                            onChange={(e) => { state.email = (e.target as HTMLInputElement).value; }}
                            placeholder={state.emailPlaceholder}
                            required
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={state.loading}
                        />
                    </div>

                    <Show when={state.error}>
                        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                            {state.error}
                        </div>
                    </Show>

                    <button
                        type="submit"
                        disabled={state.loading}
                        className="inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Show when={state.loading}>
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
                        {state.loading ? 'Sending...' : state.resolvedButtonText}
                    </button>
                </form>
            </Show>

            <Show when={state.submitted}>
                <div className="text-center space-y-4">
                    <div className="flex justify-center">
                        <svg
                            className="h-12 w-12 text-green-500"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <p className="text-sm text-gray-600">
                        {state.resolvedResponseMessage}
                    </p>
                </div>
            </Show>
        </div>
    );
}
