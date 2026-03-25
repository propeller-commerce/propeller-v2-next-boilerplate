# AccountIconAndMenu

A versatile user account component with two rendering modes: a **dropdown** (header icon + popup menu) and a **sidebar** (always-visible account navigation). Adapts its UI based on authentication state — showing a login form for guests and account navigation for authenticated users.

Supports both **B2B** (`Contact`) and **B2C** (`Customer`) user types from the Propeller Commerce platform.

## Usage

### Dropdown Mode (Header)

The default mode renders a user icon in the header. When clicked, it opens a dropdown that shows either a login form (guest) or account navigation (authenticated).

```tsx
import AccountIconAndMenu from '@/components/propeller/AccountIconAndMenu';
import { GraphQLClient } from 'propeller-sdk-v2';

const graphqlClient = new GraphQLClient({
  endpoint: '/api/graphql',
  headers: { 'Content-Type': 'application/json' },
});

function Header() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  return (
    <AccountIconAndMenu
      graphqlClient={graphqlClient}
      user={user}
      afterLogin={(loggedInUser, accessToken, refreshToken) => {
        // Store tokens and update user state
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        setUser(loggedInUser);
      }}
      onMenuItemClick={(href) => router.push(href)}
      onLogoutClick={() => {
        localStorage.removeItem('accessToken');
        setUser(null);
      }}
      onForgotPasswordClick={() => router.push('/forgot-password')}
      onRegisterClick={() => router.push('/register')}
    />
  );
}
```

### Dropdown with Delegation Mode

If you want to handle authentication yourself (e.g., via a custom API route), use `onLoginSubmit` instead of `graphqlClient`. The component will not call any SDK services — it simply forwards the credentials.

```tsx
<AccountIconAndMenu
  user={user}
  loginLoading={isLoading}
  loginError={errorMessage}
  onLoginSubmit={async (email, password) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      setUser(data.user);
    } catch (err) {
      setErrorMessage('Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  }}
  onMenuItemClick={(href) => router.push(href)}
  onLogoutClick={() => setUser(null)}
/>
```

### Sidebar Mode (Account Layout)

Renders as an always-visible vertical navigation panel, intended for use in account page layouts. No dropdown toggle or login form — only navigation for authenticated users.

```tsx
import AccountIconAndMenu from '@/components/propeller/AccountIconAndMenu';
import { usePathname } from 'next/navigation';

function AccountLayout({ children }) {
  const pathname = usePathname();

  return (
    <div className="flex gap-8">
      <aside className="w-64">
        <AccountIconAndMenu
          variant="sidebar"
          user={user}
          currentPath={pathname}
          onMenuItemClick={(href) => router.push(href)}
          onLogoutClick={() => logout()}
          menuLinks={[
            { label: 'Dashboard', href: '/account' },
            { label: 'Orders', href: '/account/orders' },
            { label: 'Addresses', href: '/account/addresses' },
            { label: 'Quotes', href: '/account/quotes' },
            { label: 'Favorites', href: '/account/favorites' },
          ]}
        />
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

### Custom Labels (i18n)

All text in the component can be customized via the `labels` prop, making it suitable for multi-language storefronts.

```tsx
<AccountIconAndMenu
  user={user}
  graphqlClient={graphqlClient}
  labels={{
    accountLabel: 'My Account',
    signedInAs: 'Signed in as',
    logoutLabel: 'Sign Out',
    loginTitle: 'Welcome Back',
    loginButton: 'Sign In',
    email: 'Email Address',
    password: 'Password',
    forgotPassword: 'Forgot your password?',
    registerText: 'No account yet?',
    registerLink: 'Create Account',
  }}
  onMenuItemClick={(href) => router.push(href)}
  onLogoutClick={() => logout()}
/>
```

### Guest Checkout Link

Add a guest checkout option to the login dropdown (useful on cart/checkout pages).

```tsx
<AccountIconAndMenu
  user={null}
  graphqlClient={graphqlClient}
  displayGuestCheckoutLink={true}
  onGuestCheckoutClick={() => router.push('/checkout/guest')}
  labels={{ guestCheckoutLink: 'Continue as Guest' }}
/>
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `user` | `Contact \| Customer \| null` | `null` | Authenticated user object. Shows account menu when present; login form when `null`. |
| `variant` | `'dropdown' \| 'sidebar'` | `'dropdown'` | Render mode. |
| `graphqlClient` | `GraphQLClient` | — | SDK client for self-contained login. When provided (without `onLoginSubmit`), the component handles authentication internally. |
| `currentPath` | `string` | — | Current route path for active link highlighting (sidebar mode). |
| `showAccountMenuOnClick` | `boolean` | `true` | Show dropdown on icon click. If `false`, fires `onAccountIconClick` instead. |
| `accountMenuTitle` | `string` | `'My account'` | Title displayed in the dropdown. |
| `accountHeaderLoginForm` | `boolean` | `true` | Show inline login form in dropdown for unauthenticated users. When `false`, shows a redirect button instead. |
| `menuLinks` | `AccountMenuLink[]` | See below | Account navigation links shown when authenticated. |
| `labels` | `Record<string, string>` | — | Customizable labels (see [Labels](#labels) section). |
| `iconClassName` | `string` | — | Additional CSS class for the icon button. |
| `menuClassName` | `string` | — | Additional CSS class for the dropdown panel. |

### Login Form Props

These props are forwarded to the embedded `LoginForm` component (dropdown mode only).

| Prop | Type | Default | Description |
|---|---|---|---|
| `onLoginSubmit` | `(email: string, password: string) => void` | — | Delegation mode: parent handles authentication. When set, SDK login is disabled. |
| `loginLoading` | `boolean` | `false` | Show loading spinner on login button (delegation mode). |
| `loginError` | `string` | — | Error message to display in the form (delegation mode). |
| `loginFormTitle` | `string` | `'Welcome Back'` | Title inside the login form. |
| `loginFormSubtitle` | `string` | — | Subtitle inside the login form. |
| `loginButtonText` | `string` | `'Log In'` | Login button text. |
| `displayForgotPasswordLink` | `boolean` | `true` | Show forgot password link. |
| `displayRegisterLink` | `boolean` | `true` | Show register link. |
| `displayGuestCheckoutLink` | `boolean` | `false` | Show guest checkout link. |
| `beforeLogin` | `() => void` | — | Called before the login process starts. |
| `afterLogin` | `(user, accessToken?, refreshToken?, expiresAt?) => void` | — | Called after successful self-contained login with user data and tokens. |

### Callback Props

| Prop | Type | Description |
|---|---|---|
| `onAccountIconClick` | `() => void` | Fires when icon is clicked and `showAccountMenuOnClick` is `false`. |
| `onMenuItemClick` | `(href: string) => void` | Fires when a navigation link is clicked. Receives the target path. |
| `onLogoutClick` | `() => void` | Fires when logout button is clicked. |
| `onForgotPasswordClick` | `() => void` | Fires when "Forgot Password" is clicked. |
| `onRegisterClick` | `() => void` | Fires when "Register" is clicked. |
| `onGuestCheckoutClick` | `() => void` | Fires when "Guest Checkout" is clicked. |

### AccountMenuLink

```ts
interface AccountMenuLink {
  label: string;   // Display text
  href: string;    // URL path
  icon?: string;   // Optional icon identifier
}
```

### Default Menu Links

```ts
[
  { label: 'Dashboard', href: '/account' },
  { label: 'Orders', href: '/account/orders' },
  { label: 'Addresses', href: '/account/addresses' },
  { label: 'Quotes', href: '/account/quotes' },
  { label: 'Invoices', href: '/account/invoices' },
  { label: 'Favorites', href: '/account/favorites' },
]
```

### Labels

| Key | Default | Used in |
|---|---|---|
| `accountLabel` | `'Account'` | Icon button label (unauthenticated) |
| `signedInAs` | `'Signed in as'` | Authenticated user header |
| `logoutLabel` | `'Log Out'` | Logout button text |
| `loginTitle` | `'Welcome Back'` | Login form title |
| `loginSubtitle` | — | Login form subtitle |
| `loginButton` | `'Log In'` | Login button text |
| `email` | `'Email'` | Email input label |
| `emailPlaceholder` | `'name@example.com'` | Email input placeholder |
| `password` | `'Password'` | Password input label |
| `passwordPlaceholder` | `'••••••••'` | Password input placeholder |
| `forgotPassword` | `'Forgot password?'` | Forgot password link |
| `registerText` | `"Don't have an account?"` | Registration prompt |
| `registerLink` | `'Create an Account'` | Register link text |
| `guestCheckoutLink` | `'Continue as Guest'` | Guest checkout link text |

## Propeller SDK Services

In **self-contained mode** (when `graphqlClient` is provided without `onLoginSubmit`), the component uses the following SDK services internally to handle authentication:

### LoginService

Authenticates the user with email and password credentials.

```ts
import { LoginService, LoginInput } from 'propeller-sdk-v2';

const loginService = new LoginService(graphqlClient);

const loginInput: LoginInput = {
  email: 'user@example.com',
  password: 'password123',
};

const response = await loginService.login(loginInput);

// Response contains session data:
// response.session.accessToken  — JWT access token
// response.session.refreshToken — refresh token for token renewal
// response.session.expirationTime — token expiry timestamp
```

**GraphQL mutation executed internally:**

```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    session {
      accessToken
      refreshToken
      expirationTime
    }
  }
}
```

### UserService

Fetches the authenticated user's profile after login.

```ts
import { UserService } from 'propeller-sdk-v2';

const userService = new UserService(graphqlClient);

// Fetch current viewer (requires valid Authorization header)
const viewer = await userService.getViewer({});

// Returns Contact (B2B) or Customer (B2C) with:
// viewer.firstName, viewer.lastName, viewer.email
// viewer.company (Contact only — B2B company data)
```

**GraphQL query executed internally:**

```graphql
query Viewer {
  viewer {
    ... on Contact {
      contactId
      firstName
      lastName
      email
      company {
        companyId
        name
      }
    }
    ... on Customer {
      customerId
      firstName
      lastName
      email
    }
  }
}
```

### Authentication Flow

When the user submits the login form in self-contained mode, the following sequence occurs:

1. `LoginService.login()` is called with the email and password
2. The returned `accessToken` is injected into the `GraphQLClient` headers as `Authorization: Bearer <token>`
3. `UserService.getViewer()` fetches the full user profile
4. A `userLoggedIn` custom event is dispatched on `window` (for other components to react)
5. The `afterLogin` callback is called with the user object and tokens

```
User submits form
  → LoginService.login({ email, password })
  → graphqlClient.updateConfig({ headers: { Authorization: 'Bearer <token>' } })
  → UserService.getViewer({})
  → window.dispatchEvent(new CustomEvent('userLoggedIn'))
  → afterLogin(user, accessToken, refreshToken, expiresAt)
```

### Building Your Own Component

If you're building a custom account menu instead of using this component, you'll need:

```ts
import {
  GraphQLClient,
  LoginService,
  UserService,
  LoginInput,
  Contact,
  Customer,
} from 'propeller-sdk-v2';

// 1. Initialize the GraphQL client
const graphqlClient = new GraphQLClient({
  endpoint: '/api/graphql',
  headers: { 'Content-Type': 'application/json' },
});

// 2. Login
const loginService = new LoginService(graphqlClient);
const { session } = await loginService.login({
  email: 'user@example.com',
  password: 'password123',
});

// 3. Store tokens
localStorage.setItem('accessToken', session.accessToken);
localStorage.setItem('refreshToken', session.refreshToken);

// 4. Update client with auth header
graphqlClient.updateConfig({
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.accessToken}`,
  },
});

// 5. Fetch user profile
const userService = new UserService(graphqlClient);
const user = await userService.getViewer({});

// 6. Determine user type
if ('company' in user) {
  // B2B Contact — has company association
  console.log(user.company.name);
} else {
  // B2C Customer
  console.log(user.firstName);
}
```

## Behavior

### Dropdown Mode (default)

- **Unauthenticated**: Shows "Account" label next to a user icon. Clicking opens a dropdown with a login form (email/password fields, login button, forgot password link, register link).
- **Authenticated**: Shows "Hi, {firstName}" next to the icon. Dropdown displays user info, navigation links, and a logout button.
- **Click outside**: Dropdown closes automatically when clicking outside the component.
- **Login success**: Dropdown auto-closes and form resets when `user` prop changes from `null` to a user object.

### Sidebar Mode

- Always-visible vertical navigation with "Signed in as" header, menu links, and logout button.
- Active link highlighting based on `currentPath`: exact match for `/account`, prefix match for sub-routes like `/account/orders`.
- No dropdown toggle, click-outside listener, or login form.

### Hydration

Uses an internal mounted guard to prevent server/client rendering mismatches when user data comes from `localStorage`. User-dependent content (name, auth state) only renders after the component has mounted on the client.

