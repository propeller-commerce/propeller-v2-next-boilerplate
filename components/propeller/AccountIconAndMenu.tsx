'use client';
import * as React from 'react';

import { useState, useEffect } from 'react'
  import  { Contact, Customer, GraphQLClient } from 'propeller-sdk-v2';
import  LoginForm from './LoginForm';



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
}
interface AccountIconAndMenuState {
_isMounted: boolean;
menuOpen: boolean;
getUserName: () => string;
getLabel: (key: string, fallback: string) => string;
getMenuTitle: () => string;
getMenuLinks: () => AccountMenuLink[];
handleIconClick: () => void;
handleMenuItemClick: (href: string) => void;
handleLogoutClick: () => void;
handleForgotPasswordClick: () => void;
handleRegisterClick: () => void;
handleGuestCheckoutClick: () => void;
closeMenu: () => void;
_clickOutsideListener: {
  handler: any;
};
}




  function AccountIconAndMenu(props:AccountIconAndMenuProps) {

  const [_isMounted, set_isMounted] = useState<AccountIconAndMenuState["_isMounted"]>(() => (false))


const [menuOpen, setMenuOpen] = useState<AccountIconAndMenuState["menuOpen"]>(() => (false))


function getUserName(): ReturnType<AccountIconAndMenuState["getUserName"]>{
const user = props.user as Contact | Customer;
if (!user) return '';
const parts = [user.firstName, user.lastName].filter(Boolean);
if (parts.length > 0) return parts.join(' ');
if (user.firstName) return user.firstName;
if (user.email) return user.email;
return 'User';
}


function getLabel(key: string, fallback: string): ReturnType<AccountIconAndMenuState["getLabel"]>{
return (props.labels as Record<string, string>)?.[key] || fallback;
}


function getMenuTitle(): ReturnType<AccountIconAndMenuState["getMenuTitle"]>{
return props.accountMenuTitle || (props.labels as Record<string, string>)?.['accountMenuTitle'] || 'My account';
}


function getMenuLinks(): ReturnType<AccountIconAndMenuState["getMenuLinks"]>{
if (props.menuLinks && (props.menuLinks as AccountMenuLink[]).length > 0) {
return props.menuLinks as AccountMenuLink[];
}
return [{
label: 'Dashboard',
href: '/account'
}, {
label: 'Orders',
href: '/account/orders'
}, {
label: 'Addresses',
href: '/account/addresses'
}, {
label: 'Quotes',
href: '/account/quotes'
}, {
label: 'Invoices',
href: '/account/invoices'
}, {
label: 'Favorites',
href: '/account/favorites'
}] as AccountMenuLink[];
}


function handleIconClick(): ReturnType<AccountIconAndMenuState["handleIconClick"]>{
if (props.showAccountMenuOnClick !== false) {
setMenuOpen(!menuOpen);
} else {
if (props.onAccountIconClick) props.onAccountIconClick();
}
}


function handleMenuItemClick(href: string): ReturnType<AccountIconAndMenuState["handleMenuItemClick"]>{
setMenuOpen(false);
if (props.onMenuItemClick) props.onMenuItemClick(href);
}


function handleLogoutClick(): ReturnType<AccountIconAndMenuState["handleLogoutClick"]>{
setMenuOpen(false);
if (props.onLogoutClick) props.onLogoutClick();
}


function handleForgotPasswordClick(): ReturnType<AccountIconAndMenuState["handleForgotPasswordClick"]>{
setMenuOpen(false);
if (props.onForgotPasswordClick) props.onForgotPasswordClick();
}


function handleRegisterClick(): ReturnType<AccountIconAndMenuState["handleRegisterClick"]>{
setMenuOpen(false);
if (props.onRegisterClick) props.onRegisterClick();
}


function handleGuestCheckoutClick(): ReturnType<AccountIconAndMenuState["handleGuestCheckoutClick"]>{
setMenuOpen(false);
if (props.onGuestCheckoutClick) props.onGuestCheckoutClick();
}


function closeMenu(): ReturnType<AccountIconAndMenuState["closeMenu"]>{
setMenuOpen(false);
}


const [_clickOutsideListener, set_clickOutsideListener] = useState<AccountIconAndMenuState["_clickOutsideListener"]>(() => ({
handler: null as any
}))







useEffect(() => {
      set_isMounted(true);
const listener = (e: MouseEvent) => {
const target = e.target as HTMLElement;
if (target && !target.closest('[data-account-menu]')) {
setMenuOpen(false);
}
};
set_clickOutsideListener({
handler: listener
});
document.addEventListener('mousedown', listener)
    }, [])
useEffect(() => {
      // Close menu when user logs in (user prop changes from null to truthy)
if (props.user && menuOpen) {
setMenuOpen(false);
}
    },
    [props.user])


return (


  <div className="relative"  data-account-menu><button  type="button"  onClick={(event) => handleIconClick() }  aria-label={getLabel('accountLabel', 'Account')}  className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-white hover:bg-white/10${props.iconClassName ? ' ' + props.iconClassName : ''}`}><svg  fill="none"  stroke="currentColor"  viewBox="0 0 24 24" className="w-5 h-5"  strokeWidth={1.5}><path  strokeLinecap="round"  strokeLinejoin="round"  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"  /></svg>{_isMounted ? (
  <>{props.user ? (
  <span className="hidden md:block font-normal">
                        Hi, {getUserName()}</span>
) : null}
{!props.user ? (
  <span className="hidden md:block font-normal">{getLabel('accountLabel', 'Account')}</span>
) : null}</>
) : null}</button>{menuOpen ? (
  <div  className={`absolute right-0 mt-2 w-80 bg-white text-gray-900 rounded-lg shadow-lg border border-gray-200 py-4 px-5 z-50${props.menuClassName ? ' ' + props.menuClassName : ''}`}>{_isMounted ? (
  <>{!!props.user ? (
  <><div className="pb-3 mb-3 border-b border-gray-200"><p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">{getLabel('signedInAs', 'Signed in as')}</p><p className="font-medium text-gray-900 truncate">{getUserName()}</p></div>
<nav><ul className="space-y-0.5">{getMenuLinks()?.map((link) => (
  <li  key={link.href}><button  type="button" className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"  onClick={(event) => handleMenuItemClick(link.href) }>{link.label}</button></li>
))}</ul></nav>
<div className="mt-3 pt-3 border-t border-gray-200"><button  type="button" className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"  onClick={(event) => handleLogoutClick() }>{getLabel('logoutLabel', 'Log Out')}</button></div></>
) : null}
{!props.user ? (
  <>{props.accountHeaderLoginForm !== false ? (
  <LoginForm  graphqlClient={props.graphqlClient}  title={props.loginFormTitle ?? getLabel('loginTitle', 'Welcome Back')}  subtitle={props.loginFormSubtitle ?? getLabel('loginSubtitle', '')}  buttonText={props.loginButtonText ?? getLabel('loginButton', 'Log In')}  displayForgotPasswordLink={props.displayForgotPasswordLink}  displayRegisterLink={props.displayRegisterLink}  displayGuestCheckoutLink={props.displayGuestCheckoutLink}  labels={props.labels}  onLoginSubmit={props.onLoginSubmit}  loginLoading={props.loginLoading}  loginError={props.loginError}  beforeLogin={props.beforeLogin}  afterLogin={props.afterLogin}  onForgotPasswordClick={(event) => handleForgotPasswordClick() }  onRegisterClick={(event) => handleRegisterClick() }  onGuestCheckoutClick={(event) => handleGuestCheckoutClick() }  accountHeaderLoginForm={props.accountHeaderLoginForm}  />
) : null}
{props.accountHeaderLoginForm === false ? (
  <div className="text-center py-4"><h4 className="text-lg font-semibold mb-2">{getMenuTitle()}</h4><p className="text-sm text-gray-500 mb-4">{getLabel('loginSubtitle', 'Login to access your account')}</p><button  type="button" className="w-full inline-flex justify-center items-center px-4 py-2 rounded-md bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"  onClick={(event) => {
closeMenu();
if (props.onAccountIconClick) props.onAccountIconClick();
} }>{getLabel('loginButton', 'Log In')}</button></div>
) : null}</>
) : null}</>
) : null}</div>
) : null}</div>


);
}




  export default AccountIconAndMenu;


