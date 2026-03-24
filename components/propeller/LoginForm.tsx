'use client';
import * as React from 'react';

import { useState } from 'react';
import {
  Contact,
  Customer,
  GraphQLClient,
  LoginService,
  UserService,
  LoginInput,
  ViewerResult,
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
}
interface LoginFormState {
  email: string;
  password: string;
  loading: boolean;
  error: string;
  getLabel: (key: string, fallback: string) => string;
  emailLabel: () => string;
  passwordLabel: () => string;
  emailPlaceholder: () => string;
  passwordPlaceholder: () => string;
  forgotPasswordText: () => string;
  registerText: () => string;
  registerLinkText: () => string;
  guestCheckoutLinkText: () => string;
  resolvedTitle: () => string;
  resolvedButtonText: () => string;
  showForgotPassword: () => boolean;
  showRegister: () => boolean;
  showGuestCheckout: () => boolean;
  isLoading: () => boolean;
  errorMessage: () => string;
  handleSubmit: (e: any) => Promise<void>;
}

function LoginForm(props: LoginFormProps) {
  const [email, setEmail] = useState<LoginFormState['email']>(() => '');

  const [password, setPassword] = useState<LoginFormState['password']>(() => '');

  const [loading, setLoading] = useState<LoginFormState['loading']>(() => false);

  const [error, setError] = useState<LoginFormState['error']>(() => '');

  function getLabel(key: string, fallback: string): ReturnType<LoginFormState['getLabel']> {
    return (props.labels as any)?.[key] || fallback;
  }

  function emailLabel(): ReturnType<LoginFormState['emailLabel']> {
    return props.labels?.email || 'Email';
  }

  function passwordLabel(): ReturnType<LoginFormState['passwordLabel']> {
    return props.labels?.password || 'Password';
  }

  function emailPlaceholder(): ReturnType<LoginFormState['emailPlaceholder']> {
    return props.labels?.emailPlaceholder || 'name@example.com';
  }

  function passwordPlaceholder(): ReturnType<LoginFormState['passwordPlaceholder']> {
    return props.labels?.passwordPlaceholder || '••••••••';
  }

  function forgotPasswordText(): ReturnType<LoginFormState['forgotPasswordText']> {
    return props.labels?.forgotPassword || 'Forgot password?';
  }

  function registerText(): ReturnType<LoginFormState['registerText']> {
    return props.labels?.registerText || "Don't have an account?";
  }

  function registerLinkText(): ReturnType<LoginFormState['registerLinkText']> {
    return props.labels?.registerLink || 'Create an Account';
  }

  function guestCheckoutLinkText(): ReturnType<LoginFormState['guestCheckoutLinkText']> {
    return props.labels?.guestCheckoutLink || 'Continue as Guest';
  }

  function resolvedTitle(): ReturnType<LoginFormState['resolvedTitle']> {
    return props.title !== undefined ? props.title : 'Log in';
  }

  function resolvedButtonText(): ReturnType<LoginFormState['resolvedButtonText']> {
    return props.buttonText || 'Login';
  }

  function showForgotPassword(): ReturnType<LoginFormState['showForgotPassword']> {
    return props.displayForgotPasswordLink !== false;
  }

  function showRegister(): ReturnType<LoginFormState['showRegister']> {
    return props.displayRegisterLink !== false;
  }

  function showGuestCheckout(): ReturnType<LoginFormState['showGuestCheckout']> {
    return props.displayGuestCheckoutLink !== false;
  }

  function isLoading(): ReturnType<LoginFormState['isLoading']> {
    // Self-contained mode uses internal state; delegation mode uses prop
    if (props.onLoginSubmit) {
      return props.loginLoading === true;
    }
    return loading;
  }

  function errorMessage(): ReturnType<LoginFormState['errorMessage']> {
    // Self-contained mode uses internal state; delegation mode uses prop
    if (props.onLoginSubmit) {
      return props.loginError || '';
    }
    return error;
  }

  async function handleSubmit(e: any): ReturnType<LoginFormState['handleSubmit']> {
    e.preventDefault();
    if (props.beforeLogin) {
      props.beforeLogin();
    }
    if (props.onLoginSubmit) {
      // Delegation mode: parent handles authentication
      props.onLoginSubmit(email, password);
      return;
    }

    // Self-contained mode: handle login via SDK
    if (!props.graphqlClient) {
      setError('Login is not configured. Please provide graphqlClient or onLoginSubmit.');
      return;
    }
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const loginService = new LoginService(props.graphqlClient as GraphQLClient);
      const userService = new UserService(props.graphqlClient as GraphQLClient);
      const loginInput: LoginInput = {
        email: email,
        password: password,
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
          Authorization: 'Bearer ' + accessToken,
        },
      });

      // Fetch viewer data
      let user: ViewerResult | null = null;
      try {
        user = await userService.getViewer({});
      } catch (viewerError: any) {}

      // Dispatch event for AuthContext to pick up
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userLoggedIn'));
      }

      // Reset form
      setEmail('');
      setPassword('');

      // Notify parent
      if (props.afterLogin) {
        props.afterLogin(
          user as unknown as Contact | Customer,
          accessToken,
          refreshToken,
          session?.expirationTime
        );
      }
    } catch (err: any) {
      setError('The credentials you entered don\'t match our records. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-form">
      {resolvedTitle() ? (
        <div className="space-y-1 text-center mb-6">
          <h2 className="text-2xl font-bold">{resolvedTitle()}</h2>
          {props.subtitle ? <p className="text-sm text-gray-500">{props.subtitle}</p> : null}
        </div>
      ) : null}
      <form className="space-y-4" onSubmit={(e) => handleSubmit(e)}>
        <div className="space-y-2">
          <label htmlFor="login-email" className="text-sm font-medium leading-none">
            {emailLabel()}
          </label>
          <input
            type="email"
            id="login-email"
            name="email"
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
            value={email}
            onChange={(e) => {
              setEmail((e.target as HTMLInputElement).value);
            }}
            placeholder={emailPlaceholder()}
            required
            disabled={isLoading()}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium leading-none">
              {passwordLabel()}
            </label>
            {showForgotPassword() && !props.accountHeaderLoginForm ? (
              <button
                type="button"
                className="text-sm text-primary hover:underline"
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
            className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{errorMessage()}</div>
        ) : null}
        <button
          type="submit"
          className="inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading()}
        >
          {isLoading() ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
        <div className="mt-6 border-t pt-6 space-y-3">
          {showRegister() ? (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-2">{registerText()}</p>
              <button
                type="button"
                className="inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={(event) => {
                  if (props.onRegisterClick) props.onRegisterClick();
                }}
              >
                {registerLinkText()}
              </button>
            </div>
          ) : null}
          {showGuestCheckout() ? (
            <div className="text-center">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
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
        <div className="flex flex-col gap-2 text-sm pt-3 text-center">
          <button
            type="button"
            className="text-violet-600 hover:underline text-xs"
            onClick={(event) => {
              if (props.onForgotPasswordClick) props.onForgotPasswordClick();
            }}
          >
            {getLabel('forgotPassword', 'Forgot Password?')}
          </button>
          <div className="text-xs text-gray-500">
            {getLabel('noAccount', "Don't have an account?")}
            <button
              type="button"
              className="text-violet-600 hover:underline font-medium"
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
