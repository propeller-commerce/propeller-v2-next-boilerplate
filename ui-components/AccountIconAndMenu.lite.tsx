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
} from 'propeller-sdk-v2';

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

    /**
     * Fires when login form is submitted.
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
     * @default [{ label: 'Dashboard', href: '/account' }, { label: 'Orders', href: '/account/orders' }, { label: 'Addresses', href: '/account/addresses' }]
     */
    menuLinks?: AccountMenuLink[];

    /**
     * Labels for the component.
     * Available keys: accountLabel, loginTitle, loginSubtitle, emailLabel, emailPlaceholder,
     * passwordLabel, passwordPlaceholder, loginButton, forgotPassword, noAccount, registerLink,
     * signedInAs, logoutLabel
     */
    labels?: Record<string, string>;

    /**
     * Additional class name for the account icon button.
     */
    iconClassName?: string;

    /**
     * Additional class name for the dropdown menu.
     */
    menuClassName?: string;
}

interface AccountIconAndMenuState {
    _isMounted: boolean;
    menuOpen: boolean;
    email: string;
    password: string;
    getUserName: () => string;
    getLabel: (key: string, fallback: string) => string;
    getMenuTitle: () => string;
    getMenuLinks: () => AccountMenuLink[];
    handleIconClick: () => void;
    handleLoginSubmit: (e: Event) => void;
    handleMenuItemClick: (href: string) => void;
    handleLogoutClick: () => void;
    handleForgotPasswordClick: () => void;
    handleRegisterClick: () => void;
    closeMenu: () => void;
    _clickOutsideListener: any;
}

export default function AccountIconAndMenu(props: AccountIconAndMenuProps) {
    const state = useStore<AccountIconAndMenuState>({
        _isMounted: false,
        menuOpen: false,
        email: '',
        password: '',

        getUserName() {
            const user = props.user as any;
            if (!user) return '';
            const parts = [user.firstName, user.lastName].filter(Boolean);
            if (parts.length > 0) return parts.join(' ');
            if (user.name) return user.name;
            if (user.email) return user.email;
            return 'User';
        },

        getLabel(key: string, fallback: string) {
            return (props.labels as any)?.[key] || fallback;
        },

        getMenuTitle() {
            return props.accountMenuTitle || (props.labels as any)?.['accountMenuTitle'] || 'My account';
        },

        getMenuLinks() {
            if (props.menuLinks && (props.menuLinks as any).length > 0) {
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

        handleLoginSubmit(e: Event) {
            e.preventDefault();
            if (props.onLoginSubmit) {
                props.onLoginSubmit(state.email, state.password);
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

        closeMenu() {
            state.menuOpen = false;
        },

        _clickOutsideListener: null as any,
    });

    onMount(() => {
        state._isMounted = true;

        state._clickOutsideListener = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target && !target.closest('[data-account-menu]')) {
                state.menuOpen = false;
            }
        };
        document.addEventListener('mousedown', state._clickOutsideListener);
    });

    onUpdate(() => {
        // Close menu when user logs in (user prop changes from null to truthy)
        if (props.user && state.menuOpen && state.email) {
            state.email = '';
            state.password = '';
            state.menuOpen = false;
        }
    }, [props.user]);

    return (
        <div className="relative" data-account-menu>
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

                <Show when={state._isMounted}>
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
                    <Show when={state._isMounted}>

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
                                    className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                >
                                    {state.getLabel('logoutLabel', 'Log Out')}
                                </button>
                            </div>
                        </Show>

                        {/* Not Authenticated: Login Form or simple message */}
                        <Show when={!props.user}>
                            <Show when={props.accountHeaderLoginForm !== false}>
                                <form onSubmit={(e) => state.handleLoginSubmit(e)}>
                                    <div className="text-center mb-3">
                                        <h4 className="text-lg font-semibold">
                                            {state.getLabel('loginTitle', 'Welcome Back')}
                                        </h4>
                                        <p className="text-sm text-gray-500">
                                            {state.getLabel('loginSubtitle', 'Login to access your account')}
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="space-y-1">
                                            <label htmlFor="account-email" className="text-xs font-medium text-gray-700">
                                                {state.getLabel('emailLabel', 'Email')}
                                            </label>
                                            <input
                                                type="email"
                                                id="account-email"
                                                value={state.email}
                                                onChange={(e) => { state.email = (e.target as HTMLInputElement).value; }}
                                                required
                                                placeholder={state.getLabel('emailPlaceholder', 'name@example.com')}
                                                className="flex h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <label htmlFor="account-password" className="text-xs font-medium text-gray-700">
                                                {state.getLabel('passwordLabel', 'Password')}
                                            </label>
                                            <input
                                                type="password"
                                                id="account-password"
                                                value={state.password}
                                                onChange={(e) => { state.password = (e.target as HTMLInputElement).value; }}
                                                required
                                                placeholder={state.getLabel('passwordPlaceholder', '••••••••')}
                                                className="flex h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-violet-500"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!!props.loginLoading}
                                        className="mt-4 w-full inline-flex justify-center items-center px-4 py-2 rounded-md bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
                                    >
                                        <Show when={!!props.loginLoading}>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                        </Show>
                                        {state.getLabel('loginButton', 'Log In')}
                                    </button>

                                    <div className="flex flex-col gap-2 text-sm pt-3 text-center">
                                        <button
                                            type="button"
                                            onClick={() => state.handleForgotPasswordClick()}
                                            className="text-violet-600 hover:underline text-xs"
                                        >
                                            {state.getLabel('forgotPassword', 'Forgot Password?')}
                                        </button>
                                        <div className="text-xs text-gray-500">
                                            {state.getLabel('noAccount', "Don't have an account?")}{' '}
                                            <button
                                                type="button"
                                                onClick={() => state.handleRegisterClick()}
                                                className="text-violet-600 hover:underline font-medium"
                                            >
                                                {state.getLabel('registerLink', 'Register')}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </Show>

                            <Show when={props.accountHeaderLoginForm === false}>
                                <div className="text-center py-4">
                                    <h4 className="text-lg font-semibold mb-2">
                                        {state.getMenuTitle()}
                                    </h4>
                                    <p className="text-sm text-gray-500 mb-4">
                                        {state.getLabel('loginSubtitle', 'Login to access your account')}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => { state.closeMenu(); if (props.onAccountIconClick) props.onAccountIconClick(); }}
                                        className="w-full inline-flex justify-center items-center px-4 py-2 rounded-md bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
                                    >
                                        {state.getLabel('loginButton', 'Log In')}
                                    </button>
                                </div>
                            </Show>
                        </Show>

                    </Show>
                </div>
            </Show>
        </div>
    );
}
