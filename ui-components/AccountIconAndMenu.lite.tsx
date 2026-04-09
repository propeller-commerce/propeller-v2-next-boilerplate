import {
    useStore,
    Show,
    For,
    onMount,
    onUpdate,
} from '@builder.io/mitosis';
import {
    Contact,
    Customer,
    GraphQLClient,
} from 'propeller-sdk-v2';
import LoginForm from './LoginForm.lite';

export interface AccountMenuLink {
    /** Display label for the link */
    label: string;
    /** URL path for the link */
    href: string;
    /** Optional icon name */
    icon?: string;
}

export interface AccountIconAndMenuProps {
    /**
     * Contact/Customer that this component will operate with.
     * When present, shows account navigation. When null, shows login form.
     */
    user?: Contact | Customer | null;

    /**
     * Icon for the account icon in header.
     * @default 'default-account-icon'
     */
    icon?: string;

    /**
     * Show account dropdown at the bottom of the icon when account icon is clicked.
     * If false, fires onAccountIconClick() instead.
     * @default true
     */
    showAccountMenuOnClick?: boolean;

    /**
     * Title for the account dropdown menu.
     * @default 'My account'
     */
    accountMenuTitle?: string;

    /**
     * Show login form in dropdown for immediate login when user is not logged in.
     * @default true
     */
    accountHeaderLoginForm?: boolean;

    // ── LoginForm pass-through props ────────────────────────────────────────

    /**
     * GraphQL client for self-contained login.
     * When provided (and onLoginSubmit is not), LoginForm handles authentication internally.
     */
    graphqlClient?: GraphQLClient;

    /**
     * Title displayed inside the login form.
     * @default 'Welcome Back'
     */
    loginFormTitle?: string;

    /** Subtitle displayed inside the login form. */
    loginFormSubtitle?: string;

    /**
     * Label for the login submit button.
     * @default 'Log In'
     */
    loginButtonText?: string;

    /**
     * Show/hide the forgot password link inside the login form.
     * @default true
     */
    displayForgotPasswordLink?: boolean;

    /**
     * Show/hide the register link inside the login form.
     * @default true
     */
    displayRegisterLink?: boolean;

    /**
     * Show/hide the guest checkout link inside the login form.
     * @default false
     */
    displayGuestCheckoutLink?: boolean;

    /** Fires when the guest checkout link is clicked. */
    onGuestCheckoutClick?: () => void;

    /**
     * Error message shown inside the login form.
     * Used in delegation mode (when onLoginSubmit is provided).
     */
    loginError?: string;

    /** Callback fired before the login process starts. */
    beforeLogin?: () => void;

    /**
     * Callback fired after successful self-contained login.
     * Not called in delegation mode — the parent handles the result there.
     */
    afterLogin?: (user: Contact | Customer, accessToken?: string, refreshToken?: string, expiresAt?: string) => void;

    // ── Existing callbacks ──────────────────────────────────────────────────

    /**
     * Fires when login form is submitted (delegation mode).
     * Parent should handle actual authentication.
     */
    onLoginSubmit?: (email: string, password: string) => void;

    /**
     * Fires when account icon is clicked and showAccountMenuOnClick is false.
     */
    onAccountIconClick?: () => void;

    /**
     * Fires when a menu item is clicked. Receives the href.
     */
    onMenuItemClick?: (href: string) => void;

    /**
     * Fires when logout is clicked.
     */
    onLogoutClick?: () => void;

    /**
     * Fires when "Forgot Password" link is clicked.
     */
    onForgotPasswordClick?: () => void;

    /**
     * Fires when "Register" link is clicked.
     */
    onRegisterClick?: () => void;

    /**
     * Whether login is currently in progress (shows loading state on button).
     * @default false
     */
    loginLoading?: boolean;

    /**
     * Account navigation links shown when user is authenticated.
     * @default [{ label: 'Dashboard', href: '/account' }, ...]
     */
    menuLinks?: AccountMenuLink[];

    /**
     * Labels for the component.
     * Available keys: accountLabel, loginTitle, loginSubtitle, signedInAs, logoutLabel.
     * LoginForm label keys are also forwarded: email, password, emailPlaceholder,
     * passwordPlaceholder, forgotPassword, registerText, registerLink, guestCheckoutLink.
     */
    labels?: Record<string, string>;

    /** Additional class name for the account icon button. */
    iconClassName?: string;

    /** Additional class name for the dropdown menu. */
    menuClassName?: string;

    /**
     * Component variant.
     * - 'dropdown' (default): Header icon with popup menu
     * - 'sidebar': Always-visible vertical navigation for account layout
     */
    variant?: 'dropdown' | 'sidebar';

    /**
     * Current route path, used in sidebar variant to highlight the active link.
     */
    currentPath?: string;
}

interface AccountIconAndMenuState {
    isMounted: boolean;
    menuOpen: boolean;
    isSidebar: boolean;
    getUserName: () => string;
    getLabel: (key: string, fallback: string) => string;
    getMenuTitle: () => string;
    getMenuLinks: () => AccountMenuLink[];
    isActiveLink: (href: string) => boolean;
    handleIconClick: () => void;
    handleMenuItemClick: (href: string) => void;
    handleLogoutClick: () => void;
    handleForgotPasswordClick: () => void;
    handleRegisterClick: () => void;
    handleGuestCheckoutClick: () => void;
    closeMenu: () => void;
    clickOutsideListener: { handler: ((e: MouseEvent) => void) | null };
}

export default function AccountIconAndMenu(props: AccountIconAndMenuProps) {
    const state = useStore<AccountIconAndMenuState>({
        isMounted: false,
        menuOpen: false,

        get isSidebar(): boolean {
            return props.variant === 'sidebar';
        },

        getUserName() {
            const user = props.user as Contact | Customer;
            if (!user) return '';
            const parts = [user.firstName, user.lastName].filter(Boolean);
            if (parts.length > 0) return parts.join(' ');
            if (user.firstName) return user.firstName;
            if (user.email) return user.email;
            return 'User';
        },

        getLabel(key: string, fallback: string) {
            return (props.labels as Record<string, string>)?.[key] || fallback;
        },

        getMenuTitle() {
            return props.accountMenuTitle || (props.labels as Record<string, string>)?.['accountMenuTitle'] || 'My account';
        },

        isActiveLink(href: string): boolean {
            if (!props.currentPath) return false;
            if (href.endsWith('/account')) return props.currentPath === href;
            return props.currentPath.startsWith(href);
        },

        getMenuLinks() {
            if (props.menuLinks && (props.menuLinks as AccountMenuLink[]).length > 0) {
                return props.menuLinks as AccountMenuLink[];
            }
            return [
                { label: 'Dashboard', href: '/account' },
                { label: 'Orders', href: '/account/orders' },
                { label: 'Addresses', href: '/account/addresses' },
                { label: 'Quotes', href: '/account/quotes' },
                { label: 'Invoices', href: '/account/invoices' },
                { label: 'Favorites', href: '/account/favorites' },
            ] as AccountMenuLink[];
        },

        handleIconClick() {
            if (props.showAccountMenuOnClick !== false) {
                state.menuOpen = !state.menuOpen;
            } else {
                if (props.onAccountIconClick) props.onAccountIconClick();
            }
        },

        handleMenuItemClick(href: string) {
            state.menuOpen = false;
            if (props.onMenuItemClick) props.onMenuItemClick(href);
        },

        handleLogoutClick() {
            state.menuOpen = false;
            if (props.onLogoutClick) props.onLogoutClick();
        },

        handleForgotPasswordClick() {
            state.menuOpen = false;
            if (props.onForgotPasswordClick) props.onForgotPasswordClick();
        },

        handleRegisterClick() {
            state.menuOpen = false;
            if (props.onRegisterClick) props.onRegisterClick();
        },

        handleGuestCheckoutClick() {
            state.menuOpen = false;
            if (props.onGuestCheckoutClick) props.onGuestCheckoutClick();
        },

        closeMenu() {
            state.menuOpen = false;
        },

        clickOutsideListener: { handler: null as ((e: MouseEvent) => void) | null },
    });

    onMount(() => {
        state.isMounted = true;

        const listener = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target && !target.closest('[data-account-menu]')) {
                state.menuOpen = false;
            }
        };
        state.clickOutsideListener = { handler: listener };
        document.addEventListener('mousedown', listener);
    });

    onUpdate(() => {
        // Close menu when user logs in (user prop changes from null to truthy)
        if (props.user && state.menuOpen) {
            state.menuOpen = false;
        }
    }, [props.user]);

    return (
        <div className="relative" data-account-menu>
            {/* ── Sidebar variant ──────────────────────────────── */}
            <Show when={state.isSidebar}>
                <div className="flex flex-col">
                    <Show when={!!props.user}>
                        <div className="px-4 py-3 border-b border-gray-200">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                                {state.getLabel('signedInAs', 'Signed in as')}
                            </p>
                            <p className="font-medium text-gray-900 truncate">
                                {state.getUserName()}
                            </p>
                        </div>

                        <nav className="py-2">
                            <ul className="space-y-0.5">
                                <For each={state.getMenuLinks()}>
                                    {(link: AccountMenuLink) => (
                                        <li key={link.href}>
                                            <button
                                                type="button"
                                                onClick={() => state.handleMenuItemClick(link.href)}
                                                className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${state.isActiveLink(link.href) ? 'bg-secondary/5 text-secondary border-l-2 border-secondary' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                                            >
                                                {link.label}
                                            </button>
                                        </li>
                                    )}
                                </For>
                            </ul>
                        </nav>

                        <div className="px-4 py-3 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={() => state.handleLogoutClick()}
                                className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-primary hover:bg-secondary/5 rounded-md transition-colors"
                            >
                                {state.getLabel('logoutLabel', 'Log Out')}
                            </button>
                        </div>
                    </Show>
                </div>
            </Show>

            {/* ── Dropdown variant ─────────────────────────────── */}
            <Show when={!state.isSidebar}>
            {/* Account Icon Button */}
            <button
                type="button"
                onClick={() => state.handleIconClick()}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-white hover:bg-white/10${props.iconClassName ? ' ' + props.iconClassName : ''}`}
                aria-label={state.getLabel('accountLabel', 'Account')}
            >
                {/* User icon SVG */}
                <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                </svg>

                <Show when={state.isMounted}>
                    <Show when={props.user}>
                        <span className="hidden md:block font-normal">
                            Hi, {state.getUserName()}
                        </span>
                    </Show>
                    <Show when={!props.user}>
                        <span className="hidden md:block font-normal">
                            {state.getLabel('accountLabel', 'Account')}
                        </span>
                    </Show>
                </Show>
            </button>

            {/* Dropdown Menu */}
            <Show when={state.menuOpen}>
                <div className={`absolute right-0 mt-2 w-80 bg-white text-gray-900 rounded-lg shadow-lg border border-gray-200 py-4 px-5 z-50${props.menuClassName ? ' ' + props.menuClassName : ''}`}>
                    <Show when={state.isMounted}>

                        {/* Authenticated: Account Menu */}
                        <Show when={!!props.user}>
                            <div className="pb-3 mb-3 border-b border-gray-200">
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">
                                    {state.getLabel('signedInAs', 'Signed in as')}
                                </p>
                                <p className="font-medium text-gray-900 truncate">
                                    {state.getUserName()}
                                </p>
                            </div>

                            <nav>
                                <ul className="space-y-0.5">
                                    <For each={state.getMenuLinks()}>
                                        {(link: AccountMenuLink) => (
                                            <li key={link.href}>
                                                <button
                                                    type="button"
                                                    onClick={() => state.handleMenuItemClick(link.href)}
                                                    className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                                >
                                                    {link.label}
                                                </button>
                                            </li>
                                        )}
                                    </For>
                                </ul>
                            </nav>

                            <div className="mt-3 pt-3 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => state.handleLogoutClick()}
                                    className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-primary hover:bg-secondary/5 rounded-md transition-colors"
                                >
                                    {state.getLabel('logoutLabel', 'Log Out')}
                                </button>
                            </div>
                        </Show>

                        {/* Not Authenticated */}
                        <Show when={!props.user}>
                            {/* Login form mode */}
                            <Show when={props.accountHeaderLoginForm !== false}>
                                <LoginForm
                                    graphqlClient={props.graphqlClient}
                                    title={props.loginFormTitle ?? state.getLabel('loginTitle', 'Welcome Back')}
                                    subtitle={props.loginFormSubtitle ?? state.getLabel('loginSubtitle', '')}
                                    buttonText={props.loginButtonText ?? state.getLabel('loginButton', 'Log In')}
                                    displayForgotPasswordLink={props.displayForgotPasswordLink}
                                    displayRegisterLink={props.displayRegisterLink}
                                    displayGuestCheckoutLink={props.displayGuestCheckoutLink}
                                    labels={props.labels}
                                    onLoginSubmit={props.onLoginSubmit}
                                    loginLoading={props.loginLoading}
                                    loginError={props.loginError}
                                    beforeLogin={props.beforeLogin}
                                    afterLogin={props.afterLogin}
                                    onForgotPasswordClick={() => state.handleForgotPasswordClick()}
                                    onRegisterClick={() => state.handleRegisterClick()}
                                    onGuestCheckoutClick={() => state.handleGuestCheckoutClick()}
                                    accountHeaderLoginForm={props.accountHeaderLoginForm}
                                />
                            </Show>

                            {/* Icon-only mode: show title + redirect button */}
                            <Show when={props.accountHeaderLoginForm === false}>
                                <div className="text-center py-4">
                                    <h4 className="text-lg font-semibold mb-2">{state.getMenuTitle()}</h4>
                                    <p className="text-sm text-gray-500 mb-4">
                                        {state.getLabel('loginSubtitle', 'Login to access your account')}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { state.closeMenu(); if (props.onAccountIconClick) props.onAccountIconClick(); }}
                                        className="w-full inline-flex justify-center items-center px-4 py-2 rounded-md bg-secondary text-white text-sm font-medium hover:bg-secondary/90 transition-colors"
                                    >
                                        {state.getLabel('loginButton', 'Log In')}
                                    </button>
                                </div>
                            </Show>
                        </Show>

                    </Show>
                </div>
            </Show>
            </Show>
        </div>
    );
}
