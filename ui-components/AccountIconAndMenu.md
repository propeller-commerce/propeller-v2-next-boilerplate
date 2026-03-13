# AccountIconAndMenu

A versatile user access control component with two rendering modes: a **dropdown** for the header (icon + popup menu) and a **sidebar** for account page navigation. Adapts based on authentication state.

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `user` | `Contact \| Customer \| null` | No | `null` | The authenticated user. When present, shows account menu; when null, shows login form. |
| `variant` | `'dropdown' \| 'sidebar'` | No | `'dropdown'` | Render mode: `dropdown` for header icon + popup, `sidebar` for always-visible vertical nav. |
| `currentPath` | `string` | No | — | Current route path for active link highlighting in sidebar mode. |
| `icon` | `string` | No | `'default-account-icon'` | Icon identifier for the account icon in header. |
| `showAccountMenuOnClick` | `boolean` | No | `true` | Show account dropdown when icon is clicked. If false, fires `onAccountIconClick`. |
| `accountMenuTitle` | `string` | No | `'My account'` | Title for the account dropdown menu. |
| `accountHeaderLoginForm` | `boolean` | No | `true` | Show inline login form in dropdown when user is not logged in. |
| `onLoginSubmit` | `(email: string, password: string) => void` | No | — | Fires when login form is submitted. Parent handles authentication. |
| `onAccountIconClick` | `() => void` | No | — | Fires when icon is clicked and `showAccountMenuOnClick` is false. |
| `onMenuItemClick` | `(href: string) => void` | No | — | Fires when a menu item is clicked. Receives the href for routing. |
| `onLogoutClick` | `() => void` | No | — | Fires when logout button is clicked. |
| `onForgotPasswordClick` | `() => void` | No | — | Fires when "Forgot Password" link is clicked. |
| `onRegisterClick` | `() => void` | No | — | Fires when "Register" link is clicked. |
| `loginLoading` | `boolean` | No | `false` | Shows loading spinner on login button when true. |
| `menuLinks` | `AccountMenuLink[]` | No | See below | Account navigation links shown when authenticated. |
| `labels` | `Record<string, string>` | No | — | Customizable labels (see Labels section). |
| `iconClassName` | `string` | No | — | Additional class name for the icon button. |
| `menuClassName` | `string` | No | — | Additional class name for the dropdown menu. |

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

| Key | Default | Description |
|---|---|---|
| `accountLabel` | `'Account'` | Icon button label (unauthenticated) |
| `loginTitle` | `'Welcome Back'` | Login form title |
| `loginSubtitle` | `'Login to access your account'` | Login form subtitle |
| `emailLabel` | `'Email'` | Email input label |
| `emailPlaceholder` | `'name@example.com'` | Email input placeholder |
| `passwordLabel` | `'Password'` | Password input label |
| `passwordPlaceholder` | `'••••••••'` | Password input placeholder |
| `loginButton` | `'Log In'` | Login button text |
| `forgotPassword` | `'Forgot Password?'` | Forgot password link text |
| `noAccount` | `"Don't have an account?"` | Registration prompt text |
| `registerLink` | `'Register'` | Register link text |
| `signedInAs` | `'Signed in as'` | Authenticated user header |
| `logoutLabel` | `'Log Out'` | Logout button text |

## Usage

### Dropdown Mode (Header)

```tsx
import AccountIconAndMenu from '@/components/propeller/AccountIconAndMenu';

<AccountIconAndMenu
  user={authState.user}
  loginLoading={loginLoading}
  onLoginSubmit={(email, password) => login(email, password)}
  onMenuItemClick={(href) => router.push(href)}
  onLogoutClick={() => logout()}
  onForgotPasswordClick={() => router.push('/forgot-password')}
  onRegisterClick={() => router.push('/register')}
/>
```

### Sidebar Mode (Account Layout)

```tsx
import AccountIconAndMenu from '@/components/propeller/AccountIconAndMenu';

<AccountIconAndMenu
  variant="sidebar"
  user={state.user}
  currentPath={pathname}
  onMenuItemClick={(href) => router.push(href)}
  onLogoutClick={() => logout()}
  menuLinks={[
    { label: 'Dashboard', href: '/account' },
    { label: 'Addresses', href: '/account/addresses' },
    { label: 'Orders', href: '/account/orders' },
    { label: 'Quotes', href: '/account/quotes' },
    { label: 'Invoices', href: '/account/invoices' },
    { label: 'Favorites', href: '/account/favorites' },
    { label: 'Price Requests', href: '/account/price-requests' },
  ]}
/>
```

## Behavior

### Dropdown Mode (default)
- **Unauthenticated**: Shows "Account" label next to icon. Dropdown contains login form with email/password fields, login button, forgot password link, and register link.
- **Authenticated**: Shows "Hi, {firstName}" next to icon. Dropdown shows user info header, navigation links, and logout button.
- **Click outside**: Dropdown closes automatically when clicking outside the component.
- **Login success**: Dropdown auto-closes and form resets when `user` prop changes from null to a user object.

### Sidebar Mode
- Always-visible vertical navigation with "Signed in as" header, menu links, and logout button.
- Active link highlighting based on `currentPath` prop (exact match for `/account`, prefix match for sub-routes).
- No click-outside listener or dropdown toggle logic.
- Login form and icon button are not rendered.

### Common
- **Hydration safe**: Uses `_isMounted` guard to prevent server/client mismatch on user-dependent content.
- All navigation is callback-based (`onMenuItemClick`, `onLogoutClick`) — parent handles routing and auth.

## Mitosis Source

`ui-components/AccountIconAndMenu.lite.tsx`
