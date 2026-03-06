# LoginForm

A modular authentication form component that supports two modes:

1. **Self-contained mode** (recommended): Accepts `graphqlClient` and handles login via `LoginService` + `UserService` internally — stores tokens, updates headers, dispatches `userLoggedIn` event.
2. **Delegation mode**: When `onLoginSubmit` is provided, the component delegates authentication to the parent (backward compatible).

The component can be embedded in standalone login pages, header dropdowns, checkout flows, or modals.

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | No | — | SDK client for self-contained login. Required if `onLoginSubmit` is not provided. |
| `title` | `string` | No | `"Log in"` | Title of the login form. Set to `""` to hide. |
| `subtitle` | `string` | No | `""` | Subtitle shown below the title |
| `onLoginSubmit` | `(email, password) => void` | No | — | Delegation mode: fires on submit, parent handles auth. When provided, `graphqlClient` is ignored. |
| `loginLoading` | `boolean` | No | `false` | Loading state (delegation mode only; self-contained manages its own) |
| `loginError` | `string` | No | — | Error message (delegation mode only; self-contained manages its own) |
| `displayForgotPasswordLink` | `boolean` | No | `true` | Show/hide the password reset link |
| `onForgotPasswordClick` | `() => void` | Conditional | — | Required if `displayForgotPasswordLink` is true |
| `displayRegisterLink` | `boolean` | No | `true` | Show/hide the registration link |
| `onRegisterClick` | `() => void` | Conditional | — | Required if `displayRegisterLink` is true |
| `displayGuestCheckoutLink` | `boolean` | No | `true` | Show/hide the guest checkout link |
| `onGuestCheckoutClick` | `() => void` | Conditional | — | Required if `displayGuestCheckoutLink` is true |
| `buttonText` | `string` | No | `"Login"` | Label for the submit button |
| `labels` | `Record<string, string>` | No | `{}` | Override default labels (see below) |
| `beforeLogin` | `() => void` | No | — | Callback before login process starts |
| `afterLogin` | `(user: Contact \| Customer) => void` | No | — | Callback after successful login with user data |

## Label Keys

| Key | Default | Description |
|---|---|---|
| `email` | `"Email"` | Email field label |
| `password` | `"Password"` | Password field label |
| `emailPlaceholder` | `"name@example.com"` | Email input placeholder |
| `passwordPlaceholder` | `"••••••••"` | Password input placeholder |
| `forgotPassword` | `"Forgot password?"` | Forgot password link text |
| `registerText` | `"Don't have an account?"` | Text above the register button |
| `registerLink` | `"Create an Account"` | Register button text |
| `guestCheckoutLink` | `"Continue as Guest"` | Guest checkout link text |

## Usage

### Self-contained mode (recommended)

```tsx
import LoginForm from '@/components/propeller/LoginForm';
import { graphqlClient } from '@/lib/api';

<LoginForm
  graphqlClient={graphqlClient}
  title=""
  displayGuestCheckoutLink={false}
  onForgotPasswordClick={() => router.push('/forgot-password')}
  onRegisterClick={() => router.push('/register')}
  afterLogin={() => router.push('/account')}
/>
```

The component handles everything: SDK login call, token storage, header updates, `userLoggedIn` event dispatch, loading/error states.

### Delegation mode (backward compatible)

```tsx
<LoginForm
  loginLoading={loginLoading}
  loginError={loginError}
  onForgotPasswordClick={() => router.push('/forgot-password')}
  onRegisterClick={() => router.push('/register')}
  onLoginSubmit={async (email, password) => {
    setLoginLoading(true);
    try {
      await login(email, password);
      router.push('/account');
    } catch (error) {
      setLoginError('Login failed.');
    } finally {
      setLoginLoading(false);
    }
  }}
/>
```

### Checkout Flow

```tsx
<LoginForm
  graphqlClient={graphqlClient}
  title="Log in to continue"
  displayRegisterLink={false}
  onForgotPasswordClick={() => router.push('/forgot-password')}
  onGuestCheckoutClick={() => router.push('/checkout/guest')}
  afterLogin={() => router.push('/checkout')}
/>
```

## Self-contained login flow

When `graphqlClient` is provided and `onLoginSubmit` is absent:

1. `LoginService.login({ email, password })` → gets session with tokens
2. Updates `graphqlClient` headers with `Bearer {accessToken}`
3. `UserService.getViewer({})` → fetches authenticated user profile
4. Stores `accessToken`, `refreshToken`, and user (deep-plain) in `localStorage`
5. Dispatches `window.CustomEvent('userLoggedIn')` for `AuthContext` to pick up
6. Calls `afterLogin(user)` callback
7. Resets form fields

This mirrors the flow in `lib/services/AuthService.ts` and is consistent with `ForgotPassword`'s self-contained pattern.

## Mitosis Source

`ui-components/LoginForm.lite.tsx`
