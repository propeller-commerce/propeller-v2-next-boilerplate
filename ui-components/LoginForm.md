import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# LoginForm

A modular authentication form component with two operating modes: self-contained (handles login internally via the SDK) and delegation (parent handles authentication). Supports standalone login pages, header dropdowns, checkout flows, and modals.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Self-contained mode (recommended)

The component handles the entire authentication flow internally -- SDK login call, token extraction, GraphQL client header update, viewer fetch, event dispatch, and loading/error states.

```tsx
import LoginForm from '@/components/propeller/LoginForm';
import { graphqlClient } from '@/lib/api';

<LoginForm
  graphqlClient={graphqlClient}
  onForgotPasswordClick={() => router.push('/forgot-password')}
  onRegisterClick={() => router.push('/register')}
  afterLogin={(user, accessToken, refreshToken) => {
    // Tokens and user data are already available
    router.push('/account');
  }}
/>
```

### Delegation mode

When `onLoginSubmit` is provided, the component does not call the SDK. The parent is responsible for authentication, loading state, and error messages.

```tsx
const [loginLoading, setLoginLoading] = useState(false);
const [loginError, setLoginError] = useState('');

<LoginForm
  loginLoading={loginLoading}
  loginError={loginError}
  onForgotPasswordClick={() => router.push('/forgot-password')}
  onRegisterClick={() => router.push('/register')}
  onLoginSubmit={async (email, password) => {
    setLoginLoading(true);
    setLoginError('');
    try {
      await login(email, password);
      router.push('/account');
    } catch (error) {
      setLoginError('Login failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  }}
/>
```

### Checkout flow

Show a guest checkout option and hide the registration link:

```tsx
<LoginForm
  graphqlClient={graphqlClient}
  title="Log in to continue"
  displayRegisterLink={false}
  displayGuestCheckoutLink={true}
  onForgotPasswordClick={() => router.push('/forgot-password')}
  onGuestCheckoutClick={() => router.push('/checkout/guest')}
  afterLogin={() => router.push('/checkout')}
/>
```

### Header dropdown (compact mode)

When used inside a header dropdown, set `accountHeaderLoginForm` to render a compact layout with inline forgot-password and register links instead of the full-width sections:

```tsx
<LoginForm
  graphqlClient={graphqlClient}
  title=""
  accountHeaderLoginForm={true}
  onForgotPasswordClick={() => router.push('/forgot-password')}
  onRegisterClick={() => router.push('/register')}
  afterLogin={() => router.push('/account')}
/>
```

### Minimal form (no title, no extra links)

```tsx
<LoginForm
  graphqlClient={graphqlClient}
  title=""
  displayForgotPasswordLink={false}
  displayRegisterLink={false}
  displayGuestCheckoutLink={false}
  afterLogin={() => router.push('/account')}
/>
```

### Custom labels

```tsx
<LoginForm
  graphqlClient={graphqlClient}
  buttonText="Sign In"
  labels={{
    email: 'E-mailadres',
    password: 'Wachtwoord',
    emailPlaceholder: 'naam@voorbeeld.nl',
    forgotPassword: 'Wachtwoord vergeten?',
    registerText: 'Nog geen account?',
    registerLink: 'Registreren',
    guestCheckoutLink: 'Ga verder als gast',
  }}
  onForgotPasswordClick={() => router.push('/forgot-password')}
  onRegisterClick={() => router.push('/register')}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

If you need a custom login form with different UI but the same authentication flow, you can use the SDK services directly:

### Self-contained login flow

```ts
import {
  GraphQLClient,
  LoginService,
  UserService,
  LoginInput,
} from 'propeller-sdk-v2';

// pseudo-code: maintain state for email, password, loading, and error in your framework

async function handleLogin(graphqlClient: GraphQLClient, email: string, password: string) {
  // Step 1: Authenticate with credentials
  const loginService = new LoginService(graphqlClient);
  const loginInput: LoginInput = { email, password };
  const loginResponse = await loginService.login(loginInput);

  const session = loginResponse.session;
  if (!session?.accessToken || !session?.refreshToken) {
    throw new Error('Missing authentication tokens');
  }

  // Step 2: Update GraphQL client with auth header
  const currentConfig = graphqlClient.getConfig();
  graphqlClient.updateConfig({
    headers: {
      ...currentConfig.headers,
      Authorization: `Bearer ${session.accessToken}`,
    },
  });

  // Step 3: Fetch authenticated user profile
  const userService = new UserService(graphqlClient);
  const user = await userService.getViewer({});

  // Step 4: Store tokens in localStorage for persistence
  localStorage.setItem('accessToken', session.accessToken);
  localStorage.setItem('refreshToken', session.refreshToken);

  // Step 5: Notify other components via custom event
  window.dispatchEvent(new CustomEvent('userLoggedIn'));

  return { user, session };
  // On success: clear the form fields and navigate or update your app state
  // On failure: display an error message like "Invalid credentials"
}
```

### Delegation mode

```ts
// When you want the parent to handle authentication:
// Collect email and password from your form, then call the parent's handler.

async function handleDelegatedLogin(
  email: string,
  password: string,
  onLoginSubmit: (email: string, password: string) => void
) {
  onLoginSubmit(email, password);
  // Parent controls loading state and error messages
}
```

### Checkout flow

```ts
// Same as self-contained login, but after successful login navigate to checkout:
const { user, session } = await handleLogin(graphqlClient, email, password);
// Navigate to /checkout
```

### Header dropdown (compact mode)

```ts
// Same login flow as self-contained mode.
// The only difference is the UI layout (compact inline links).
// Use the same handleLogin function above.
```

### Minimal form

```ts
// Same login flow as self-contained mode.
// Omit forgot-password, register, and guest checkout links from your UI.
```

Your UI should render an email input, a password input, an error message area, and a submit button. Disable inputs while `loading` is true. On form submission, call `handleLogin()` and handle the result.

### Key integration points

- **`userLoggedIn` event**: Dispatch `new CustomEvent('userLoggedIn')` on `window` after storing tokens. The app's `AuthContext` listens for this event to update global auth state.
- **Token refresh**: Use `LoginService.exchangeRefreshToken(refreshToken)` to obtain a new access token when the current one expires.
- **Logout**: Use `UserService.logout()` and dispatch `new CustomEvent('userLoggedOut')` to clear auth state.
- **User type detection**: The `viewer` query returns either a `Contact` (B2B user with company) or `Customer` (B2C user). Check `__typename` or look for the `company` property to distinguish them.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Core props

| Prop | Type | Default | Description |
|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | -- | SDK client for self-contained login. Required when `onLoginSubmit` is not provided. |
| `onLoginSubmit` | `(email: string, password: string) => void` | -- | Delegation mode: fires on submit, parent handles auth. When provided, `graphqlClient` is ignored. |

### Display props

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `"Log in"` | Form title. Set to `""` to hide. |
| `subtitle` | `string` | `""` | Subtitle shown below the title. |
| `buttonText` | `string` | `"Login"` | Label for the submit button. |
| `accountHeaderLoginForm` | `boolean` | `true` | When `true`, renders a compact layout suitable for header dropdowns (inline links instead of full-width sections). |
| `displayForgotPasswordLink` | `boolean` | `true` | Show/hide the forgot password link. |
| `displayRegisterLink` | `boolean` | `true` | Show/hide the registration link/button. |
| `displayGuestCheckoutLink` | `boolean` | `true` | Show/hide the guest checkout link. |
| `labels` | `Record<string, string>` | `{}` | Override default label text (see Labels section). |

### Callback props

| Prop | Type | Description |
|---|---|---|
| `onForgotPasswordClick` | `(event?: any) => void` | Fires when the forgot password link is clicked. |
| `onRegisterClick` | `(event?: any) => void` | Fires when the register button/link is clicked. |
| `onGuestCheckoutClick` | `(event?: any) => void` | Fires when the guest checkout link is clicked. |
| `beforeLogin` | `() => void` | Called before the login process starts (both modes). |
| `afterLogin` | `(user: Contact \| Customer, accessToken?: string, refreshToken?: string, expiresAt?: string) => void` | Called after successful login with user data and tokens (self-contained mode). |

### Delegation mode props

These props are only used when `onLoginSubmit` is provided. In self-contained mode, the component manages its own loading and error states.

| Prop | Type | Default | Description |
|---|---|---|---|
| `loginLoading` | `boolean` | `false` | Shows loading spinner on the submit button. |
| `loginError` | `string` | -- | Error message displayed in the form. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
import { LoginService, UserService, LoginInput, GraphQLClient } from 'propeller-sdk-v2';

const loginService = new LoginService(graphqlClient);
const userService = new UserService(graphqlClient);

// Authenticate
async function login(input: LoginInput): Promise<Login>

// Fetch user profile after login
async function getViewer(params: {}): Promise<Contact | Customer>

// Refresh token
async function exchangeRefreshToken(refreshToken: string): Promise<Login>

// Logout
async function logout(): Promise<void>
```

### Options table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | -- | Client instance passed to `LoginService` and `UserService` constructors |
| `email` | `string` | -- | `LoginInput.email` in `loginService.login()` |
| `password` | `string` | -- | `LoginInput.password` in `loginService.login()` |

### Callbacks table

| Callback | When it fires | What to implement |
|---|---|---|
| `onLoginSubmit` | Form submitted (delegation mode) | Handle authentication externally, manage loading/error state |
| `beforeLogin` | Before login process starts (both modes) | Any pre-login logic (e.g., analytics, form validation) |
| `afterLogin` | After successful login (self-contained mode) | Navigate to account/checkout, update app state with user and tokens |
| `onForgotPasswordClick` | Forgot password link clicked | Navigate to forgot password page |
| `onRegisterClick` | Register link/button clicked | Navigate to registration page |
| `onGuestCheckoutClick` | Guest checkout link clicked | Navigate to guest checkout flow |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `title` -- form title text
- `subtitle` -- subtitle text below title
- `buttonText` -- submit button label
- `accountHeaderLoginForm` -- compact layout toggle for header dropdowns
- `displayForgotPasswordLink` -- show/hide forgot password link
- `displayRegisterLink` -- show/hide registration link
- `displayGuestCheckoutLink` -- show/hide guest checkout link
- `loginLoading` -- loading state for delegation mode
- `loginError` -- error message for delegation mode
- `labels` -- UI string overrides

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

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
| `noAccount` | `"Don't have an account?"` | Text before register link (compact/header mode only) |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  email: 'Email',
  password: 'Password',
  emailPlaceholder: 'name@example.com',
  passwordPlaceholder: '••••••••',
  forgotPassword: 'Forgot password?',
  registerText: "Don't have an account?",
  registerLink: 'Create an Account',
  guestCheckoutLink: 'Continue as Guest',
  noAccount: "Don't have an account?",
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Self-contained authentication flow

When `graphqlClient` is provided and `onLoginSubmit` is absent, the component executes this sequence on form submit:

1. Calls `beforeLogin()` callback if provided.
2. Sets internal loading state to `true` and clears any previous error.
3. Creates `LoginService` and `UserService` instances from the provided `graphqlClient`.
4. Calls `loginService.login({ email, password })` which executes the `login` GraphQL mutation.
5. Extracts `accessToken` and `refreshToken` from the response session.
6. Updates the `graphqlClient` headers with `Authorization: Bearer {accessToken}` so subsequent requests are authenticated.
7. Calls `userService.getViewer({})` to fetch the authenticated user profile (Contact or Customer).
8. Dispatches a `userLoggedIn` custom event on `window` -- this is picked up by `AuthContext` to update global auth state.
9. Resets the email and password form fields.
10. Calls `afterLogin(user, accessToken, refreshToken, expirationTime)` callback if provided.

If any step fails, the component displays a generic error message: "The credentials you entered don't match our records. Please try again."

### Delegation flow

When `onLoginSubmit` is provided:

1. Calls `beforeLogin()` callback if provided.
2. Calls `onLoginSubmit(email, password)` -- the parent handles authentication.
3. Loading state is controlled via `loginLoading` prop.
4. Error messages are controlled via `loginError` prop.

### Compact header mode

When `accountHeaderLoginForm` is `true`:
- The forgot password link and register section below the form are hidden.
- Instead, compact inline links for forgot password and register appear below the submit button.
- The full-width register button and guest checkout link are not rendered.

### Form states

- **Idle**: Form fields enabled, submit button shows `buttonText`.
- **Loading**: Form fields disabled, submit button shows a spinner and "Logging in..." text.
- **Error**: Red error banner appears between the password field and the submit button.

---

## GraphQL Queries and Mutations

### `login` mutation

The SDK executes this mutation internally via `LoginService.login()`:

```graphql
mutation login($input: LoginInput!) {
  login(input: $input) {
    session {
      accessToken
      refreshToken
      expirationTime
      email
      uid
      displayName
    }
  }
}
```

**Variables:**

```json
{
  "input": {
    "email": "user@example.com",
    "password": "password123"
  }
}
```

**Response:**

```json
{
  "data": {
    "login": {
      "session": {
        "accessToken": "eyJhbGciOiJSUzI1NiIs...",
        "refreshToken": "AMf-vBxG3...",
        "expirationTime": "2026-03-25T14:30:00Z",
        "email": "user@example.com",
        "uid": "abc123",
        "displayName": "John Doe"
      }
    }
  }
}
```

### `viewer` query

The SDK executes this query internally via `UserService.getViewer()`:

```graphql
query viewer {
  viewer {
    __typename
    ... on Contact {
      contactId
      firstName
      lastName
      email
      phone
      mobile
      company {
        companyId
        name
        taxNumber
        cocNumber
      }
      addresses {
        id
        firstName
        lastName
        street
        number
        postalCode
        city
        country
        type
        isDefault
      }
    }
    ... on Customer {
      customerId
      firstName
      lastName
      email
      phone
      mobile
      addresses {
        id
        firstName
        lastName
        street
        number
        postalCode
        city
        country
        type
        isDefault
      }
    }
  }
}
```

---

## SDK Services

The component uses two services from `propeller-sdk-v2` in self-contained mode:

### LoginService

Handles user authentication via the `login` GraphQL mutation.

```tsx
import { LoginService, LoginInput, GraphQLClient } from 'propeller-sdk-v2';

const loginService = new LoginService(graphqlClient);

const loginInput: LoginInput = {
  email: 'user@example.com',
  password: 'password123',
};

const loginResponse = await loginService.login(loginInput);

// loginResponse is a Login object with:
// - loginResponse.session.accessToken  (string)
// - loginResponse.session.refreshToken (string)
// - loginResponse.session.expirationTime (string | undefined)
```

### UserService

Fetches the authenticated user's profile after login via the `viewer` GraphQL query.

```tsx
import { UserService, GraphQLClient } from 'propeller-sdk-v2';

const userService = new UserService(graphqlClient);

// After setting the Authorization header on graphqlClient:
const user = await userService.getViewer({});

// user is either a Contact (B2B) or Customer (B2C) based on __typename
// Contact has: company, addresses, firstName, lastName, email, etc.
// Customer has: addresses, firstName, lastName, email, etc.
```
