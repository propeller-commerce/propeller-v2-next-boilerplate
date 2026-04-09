import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ForgotPassword

A self-contained password reset request component. It renders an email form, calls the Propeller API to trigger a password reset email, and displays a confirmation message on success. The component manages its own loading, error, and success states internally.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic

```tsx
import ForgotPassword from '@/components/propeller/ForgotPassword';
import { graphqlClient } from '@/lib/api';

export default function ForgotPasswordPage() {
  return (
    <div className="max-w-md mx-auto mt-12">
      <ForgotPassword graphqlClient={graphqlClient} />
    </div>
  );
}
```

### Custom labels and callbacks

```tsx
import ForgotPassword from '@/components/propeller/ForgotPassword';
import { graphqlClient } from '@/lib/api';

<ForgotPassword
  graphqlClient={graphqlClient}
  title="Reset your password"
  subtitle="Enter your email and we'll send you a reset link."
  buttonText="Send Reset Link"
  responseMessage="Check your inbox for a reset link."
  labels={{
    email: 'Email address',
    emailPlaceholder: 'you@company.com',
  }}
  beforeForgotPassword={() => console.log('Requesting reset...')}
  afterForgotPassword={(result) => {
    if (result) {
      analytics.track('password_reset_requested');
    }
  }}
/>
```

### Inside a modal or dialog

```tsx
import ForgotPassword from '@/components/propeller/ForgotPassword';
import { graphqlClient } from '@/lib/api';

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

### Localized (Dutch)

```tsx
<ForgotPassword
  graphqlClient={graphqlClient}
  title="Wachtwoord vergeten?"
  subtitle="Vul je e-mailadres in om een resetlink te ontvangen."
  buttonText="Verstuur"
  responseMessage="Als er een account bestaat met dit e-mailadres, ontvang je binnenkort een link om je wachtwoord te resetten."
  labels={{
    email: 'E-mailadres',
    emailPlaceholder: 'naam@voorbeeld.nl',
  }}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

If you need full control over the password reset flow, you can build your own using the same SDK service:

```ts
import { UserService, GraphQLClient } from 'propeller-sdk-v2';

// pseudo-code: maintain state for email, loading, submitted, and error in your framework

async function handlePasswordReset(
  graphqlClient: GraphQLClient,
  email: string,
  redirectUrl?: string,
  language?: string,
) {
  const userService = new UserService(graphqlClient);
  await userService.sendPasswordResetEmail({
    email,
    redirectUrl,
    language,
  });
  // On success: transition to a "submitted" state showing a confirmation message
  // On failure: display an error message to the user
}
```

The state flow for this feature is:

1. **Form** -- Render an email input and a submit button. On submit, call `handlePasswordReset()`.
2. **Loading** -- Disable the input and button while the API call is in flight.
3. **Success** -- Replace the form with a confirmation message (e.g., "If an account exists with this email, you will receive a reset link shortly."). This state is final.
4. **Error** -- Show an error message. Keep the form interactive so the user can retry.

This custom approach allows you to pass `redirectUrl` and `language` to the SDK (the built-in component only sends `email`) and gives you full control over markup, styling, and behavior.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Core

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | Yes | -- | Propeller SDK GraphQL client instance used to execute the password reset mutation. |

### Display

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | `string` | No | `"Forgot password?"` | Heading displayed above the form. Set to empty string to hide. |
| `subtitle` | `string` | No | `""` | Secondary text below the title. Hidden when empty. |
| `buttonText` | `string` | No | `"Reset"` | Label for the submit button. |
| `responseMessage` | `string` | No | `"If an account exists with this email, you will receive a password reset link shortly."` | Confirmation message shown after successful submission. |

### Labels

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `labels` | `Record<string, string>` | No | `{}` | Custom labels for form fields. |

### Callbacks

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `beforeForgotPassword` | `() => void` | No | -- | Fired before the API call starts. Use for analytics, loading indicators, or validation. |
| `afterForgotPassword` | `(result: boolean) => void` | No | -- | Fired after the API call completes. Receives `true` on success, `false` on error. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
async function handlePasswordReset(
  graphqlClient: GraphQLClient,
  email: string,
  redirectUrl?: string,
  language?: string,
): Promise<boolean>
```

### Options

| Field | Type | Default | Maps to |
|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | **required** | SDK client instance |
| `email` | `string` | **required** | Email address for password reset |
| `redirectUrl` | `string` | `undefined` | URL the user is redirected to after resetting their password |
| `language` | `string` | `undefined` | Language code for the email template |

### Callbacks

| Callback | When it fires | What to implement |
|---|---|---|
| `beforeForgotPassword` | Before the API call starts | Analytics tracking, loading indicators, or validation |
| `afterForgotPassword` | After the API call completes | Handle success (show confirmation) or failure (show error). Receives `true` on success, `false` on error. |

### UI-only props

The following props are purely presentational and are not part of the SDK layer: `title`, `subtitle`, `buttonText`, `responseMessage`, `labels`. These are the developer's responsibility to implement.

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

Available label keys:

| Key | Default | Description |
|---|---|---|
| `email` | `"Email"` | Label above the email input field. |
| `emailPlaceholder` | `"name@example.com"` | Placeholder text inside the email input. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  email: 'Email',
  emailPlaceholder: 'name@example.com',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

The component transitions through four visual states:

1. **Form** -- Initial state. Renders an email input and a submit button.
2. **Loading** -- The submit button is disabled and displays a spinner while the API call is in progress. The email input is also disabled to prevent edits.
3. **Success** -- After a successful submission, the form is replaced with a green checkmark icon and the `responseMessage` text. This state is final; the form does not revert.
4. **Error** -- On API failure, a red error banner appears above the submit button with a descriptive message. The form remains interactive so the user can correct the email and retry.

Key details:
- The component always shows the success message after a successful call, regardless of whether the email actually exists in the system. This is a security best practice to prevent email enumeration.
- Multiple rapid submissions are prevented: `handleSubmit` returns early if `loading` is already `true`.
- The `beforeForgotPassword` callback fires before the loading state is set. The `afterForgotPassword` callback fires after the API response is received, with the result.

## GraphQL Mutation

Internally, `UserService.sendPasswordResetEmail()` executes the following GraphQL mutation:

```graphql
mutation triggerPasswordSendResetEmailEvent($input: PasswordRecoveryLinkInput!) {
  triggerPasswordSendResetEmailEvent(input: $input)
}
```

The `PasswordRecoveryLinkInput` accepted by the API:

```graphql
input PasswordRecoveryLinkInput {
  email: String!
  redirectUrl: String
  language: String
}
```

## SDK Services

The component uses `UserService` from `propeller-sdk-v2` to trigger the password reset email.

### UserService.sendPasswordResetEmail()

```ts
import { UserService, GraphQLClient } from 'propeller-sdk-v2';

const userService = new UserService(graphqlClient);
const result = await userService.sendPasswordResetEmail({
  email: 'user@example.com',
});
// result: boolean (true on success)
```

The method accepts a `PasswordResetInput` object:

```ts
interface PasswordResetInput {
  /** The email address of the user */
  email: string;
  /** URL the user is redirected to after resetting their password */
  redirectUrl?: string;
  /** Text for the clickable reset link in the email */
  linkText?: string;
  /** Custom email subject line */
  subject?: string;
  /** Language code for the email template */
  language?: string;
}
```

The component currently only passes `email`. The optional fields (`redirectUrl`, `language`, etc.) can be exposed as additional props if needed.
