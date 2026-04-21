'use client';
import * as React from 'react';

import { useState } from 'react';
import {
  Contact,
  Customer,
  GraphQLClient,
} from 'propeller-sdk-v2';
import { useAuth } from '@/composables/react/useAuth';

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
  afterLogin?: (
    user: Contact | Customer,
    accessToken?: string,
    refreshToken?: string,
    expiresAt?: string
  ) => void;

  /**
   * Show login form in dropdown for immediate login when user is not logged in.
   * @default true
   */
  accountHeaderLoginForm?: boolean;

  /** Config object providing imageSearchFiltersGrid and imageVariantFiltersSmall. */
  configuration?: any;
}

function LoginForm(props: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { loading, error: authError, login } = useAuth({
    graphqlClient: props.graphqlClient as GraphQLClient,
  });

  function getLabel(key: string, fallback: string): string {
    return (props.labels as any)?.[key] || fallback;
  }
  function emailLabel(): string {
    return props.labels?.email || 'Email';
  }
  function passwordLabel(): string {
    return props.labels?.password || 'Password';
  }
  function emailPlaceholder(): string {
    return props.labels?.emailPlaceholder || 'name@example.com';
  }
  function passwordPlaceholder(): string {
    return props.labels?.passwordPlaceholder || '••••••••';
  }
  function forgotPasswordText(): string {
    return props.labels?.forgotPassword || 'Forgot password?';
  }
  function registerText(): string {
    return props.labels?.registerText || "Don't have an account?";
  }
  function registerLinkText(): string {
    return props.labels?.registerLink || 'Create an Account';
  }
  function guestCheckoutLinkText(): string {
    return props.labels?.guestCheckoutLink || 'Continue as Guest';
  }
  function resolvedTitle(): string {
    return props.title !== undefined ? props.title : 'Log in';
  }
  function resolvedButtonText(): string {
    return props.buttonText || 'Login';
  }
  function showForgotPassword(): boolean {
    return props.displayForgotPasswordLink !== false;
  }
  function showRegister(): boolean {
    return props.displayRegisterLink !== false;
  }
  function showGuestCheckout(): boolean {
    return props.displayGuestCheckoutLink !== false;
  }
  function isLoading(): boolean {
    if (props.onLoginSubmit) {
      return props.loginLoading === true;
    }
    return loading;
  }
  function errorMessage(): string {
    if (props.onLoginSubmit) {
      return props.loginError || '';
    }
    return authError || '';
  }
  async function handleSubmit(e: any): Promise<void> {
    e.preventDefault();
    if (props.beforeLogin) {
      props.beforeLogin();
    }
    if (props.onLoginSubmit) {
      // Delegation mode: parent handles authentication
      props.onLoginSubmit(email, password);
      return;
    }

    // Self-contained mode: handle login via composable
    if (!props.graphqlClient) {
      return;
    }
    if (loading) return;

    const result = await login(email, password);
    if (result.success && result.user) {
      setEmail('');
      setPassword('');
      if (props.afterLogin) {
        props.afterLogin(result.user as Contact | Customer, result.accessToken, result.refreshToken, result.expiresAt);
      }
    }
  }
  return (
    <div
      className="propeller-login-form"
      data-loading={isLoading() ? 'true' : 'false'}
      data-variant={props.accountHeaderLoginForm ? 'compact' : 'full'}
    >
      {resolvedTitle() ? (
        <div className="propeller-login-form__header space-y-1 text-center mb-6">
          <h2 className="propeller-login-form__title text-2xl font-bold">{resolvedTitle()}</h2>
          {props.subtitle ? <p className="propeller-login-form__subtitle text-sm text-muted-foreground">{props.subtitle}</p> : null}
        </div>
      ) : null}
      <form className="propeller-login-form__form space-y-4" onSubmit={(e) => handleSubmit(e)}>
        <div className="propeller-login-form__field space-y-2">
          <label htmlFor="login-email" className="propeller-login-form__label text-sm font-medium leading-none">
            {emailLabel()}
          </label>
          <input
            type="email"
            id="login-email"
            name="email"
            className="propeller-login-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            value={email}
            onChange={(e) => {
              setEmail((e.target as HTMLInputElement).value);
            }}
            placeholder={emailPlaceholder()}
            required
            disabled={isLoading()}
          />
        </div>
        <div className="propeller-login-form__field space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="propeller-login-form__label text-sm font-medium leading-none">
              {passwordLabel()}
            </label>
            {showForgotPassword() && !props.accountHeaderLoginForm ? (
              <button
                type="button"
                className="propeller-login-form__forgot-link text-sm text-primary hover:underline"
                onClick={(event) => {
                  if (props.onForgotPasswordClick) props.onForgotPasswordClick();
                }}
              >
                {forgotPasswordText()}
              </button>
            ) : null}
          </div>
          <input
            type="password"
            id="login-password"
            name="password"
            className="propeller-login-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            value={password}
            onChange={(e) => {
              setPassword((e.target as HTMLInputElement).value);
            }}
            placeholder={passwordPlaceholder()}
            required
            disabled={isLoading()}
          />
        </div>
        {errorMessage() ? (
          <div className="propeller-login-form__error text-sm text-destructive bg-destructive/10 p-3 rounded-control">{errorMessage()}</div>
        ) : null}
        <button
          type="submit"
          className="propeller-login-form__submit inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-control hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading()}
        >
          {isLoading() ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="propeller-login-form__spinner animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                className="opacity-25"
              />
              <path
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                className="opacity-75"
              />
            </svg>
          ) : null}
          {isLoading() ? <>Logging in...</> : <>{resolvedButtonText()}</>}
        </button>
      </form>
      {(showRegister() || showGuestCheckout()) && !props.accountHeaderLoginForm ? (
        <div className="propeller-login-form__footer mt-6 border-t border-border pt-6 space-y-3">
          {showRegister() ? (
            <div className="propeller-login-form__register text-center">
              <p className="propeller-login-form__register-prompt text-sm text-muted-foreground mb-2">{registerText()}</p>
              <button
                type="button"
                className="propeller-login-form__register-btn inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium border border-border rounded-control hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={(event) => {
                  if (props.onRegisterClick) props.onRegisterClick();
                }}
              >
                {registerLinkText()}
              </button>
            </div>
          ) : null}
          {showGuestCheckout() ? (
            <div className="propeller-login-form__guest text-center">
              <button
                type="button"
                className="propeller-login-form__guest-btn text-sm text-primary hover:underline"
                onClick={(event) => {
                  if (props.onGuestCheckoutClick) props.onGuestCheckoutClick();
                }}
              >
                {guestCheckoutLinkText()}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {props.accountHeaderLoginForm ? (
        <div className="propeller-login-form__footer flex flex-col gap-2 text-sm pt-3 text-center">
          <button
            type="button"
            className="propeller-login-form__forgot-link text-secondary hover:underline text-xs"
            onClick={(event) => {
              if (props.onForgotPasswordClick) props.onForgotPasswordClick();
            }}
          >
            {getLabel('forgotPassword', 'Forgot Password?')}
          </button>
          <div className="propeller-login-form__register text-xs text-muted-foreground">
            {getLabel('noAccount', "Don't have an account?")}
            <button
              type="button"
              className="propeller-login-form__register-btn text-secondary hover:underline font-medium"
              onClick={(event) => {
                if (props.onRegisterClick) props.onRegisterClick();
              }}
            >
              {getLabel('registerLink', 'Register')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default LoginForm;
