# ForgotPassword Component

A framework-agnostic Mitosis component that handles the password reset request flow using the Propeller SDK. It enables users to request a password reset by submitting their email address and triggers the backend reset process via `UserService.sendPasswordResetEmail()`.

The component manages its own loading, error, and success states internally. After successful submission, it displays a configurable confirmation message. Lifecycle hooks (`beforeForgotPassword`, `afterForgotPassword`) provide integration points for analytics, notifications, or conditional UI behavior.

## States

The component transitions through three visual states:

1. **Form** — Email input + submit button (initial state)
2. **Loading** — Submit button disabled with spinner while API call is in progress
3. **Success** — Confirmation message with checkmark icon after successful submission
4. **Error** — Red error banner displayed above the submit button on failure

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | Yes | — | Propeller SDK GraphQL client instance |
| `title` | `string` | No | `"Forgot password?"` | Form title |
| `subtitle` | `string` | No | `""` | Subtitle below the title |
| `buttonText` | `string` | No | `"Reset"` | Submit button label |
| `responseMessage` | `string` | No | `"If an account exists with this email, you will receive a password reset link shortly."` | Message shown after successful submission |
| `labels` | `Record<string, string>` | No | `{}` | Custom labels for form fields (see below) |
| `beforeForgotPassword` | `() => void` | No | — | Callback fired before the reset request starts |
| `afterForgotPassword` | `(result: boolean) => void` | No | — | Callback fired after the reset request completes |

### Labels

| Key | Default | Description |
|---|---|---|
| `email` | `"Email"` | Email field label |
| `emailPlaceholder` | `"name@example.com"` | Email input placeholder |

## Usage

### Basic (standalone page)

```tsx
import ForgotPassword from '@/components/propeller/ForgotPassword';
import { graphqlClient } from '@/lib/api';

<ForgotPassword graphqlClient={graphqlClient} />
```

### With custom labels and callbacks

```tsx
<ForgotPassword
  graphqlClient={graphqlClient}
  title="Reset your password"
  subtitle="Enter your email and we'll send you a reset link."
  buttonText="Send Reset Link"
  responseMessage="Check your inbox for a reset link."
  labels={{ email: 'Email address', emailPlaceholder: 'you@company.com' }}
  beforeForgotPassword={() => console.log('Requesting reset...')}
  afterForgotPassword={(result) => {
    if (result) {
      analytics.track('password_reset_requested');
    }
  }}
/>
```

### In a modal or dropdown

```tsx
<Dialog>
  <ForgotPassword
    graphqlClient={graphqlClient}
    title="Forgot password?"
    afterForgotPassword={(result) => {
      if (result) closeDialog();
    }}
  />
</Dialog>
```

## Mitosis Source

- Source: `ui-components/ForgotPassword.lite.tsx`
- Compiled React: `output/react/ui-components/ForgotPassword.tsx`
- Active copy: `components/propeller/ForgotPassword.tsx`

## SDK Integration

Uses `UserService.sendPasswordResetEmail(input: PasswordResetInput)` from `propeller-sdk-v2`:

```ts
interface PasswordResetInput {
  email: string;
  redirectUrl?: string;
  linkText?: string;
  subject?: string;
  language?: string;
  siteId?: number;
}
```

The component currently passes only `email`. Additional fields (`redirectUrl`, `language`, etc.) can be exposed as props if needed.
