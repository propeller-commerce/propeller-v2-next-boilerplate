import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# QuoteActions

Renders interaction controls for quotation-specific operations. Accepts a quote by calling `OrderService.setOrderStatus` on the Propeller SDK, with an optional terms and conditions checkbox that must be checked before the action is confirmed. Delegates post-acceptance behavior such as navigation and cart cleanup to the parent via callbacks.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic accept with navigation

```tsx
import QuoteActions from '@/components/propeller/QuoteActions';

<QuoteActions
  graphqlClient={graphqlClient}
  quote={quote}
  afterAccept={(quote) => router.push(`/checkout/thank-you/${quote.id}`)}
/>
```

### With terms and conditions

`showTermsAndConditions` defaults to `true`. The user must check the box before the accept button becomes active.

```tsx
<QuoteActions
  graphqlClient={graphqlClient}
  quote={quote}
  showTermsAndConditions={true}
  onTermsAndConditionsClick={() => window.open('/terms-conditions', '_blank')}
  afterAccept={(quote) => router.push(`/checkout/thank-you/${quote.id}`)}
/>
```

### Without terms and conditions

```tsx
<QuoteActions
  graphqlClient={graphqlClient}
  quote={quote}
  showTermsAndConditions={false}
  afterAccept={(quote) => router.push(`/checkout/thank-you/${quote.id}`)}
/>
```

### Custom accept handler (override base implementation)

When `onAccept` is provided it replaces the built-in `setOrderStatus` call entirely. Use this when your acceptance flow requires additional steps such as cart cleanup or custom status transitions.

```tsx
<QuoteActions
  quote={quote}
  onAccept={async (quote) => {
    await myOrderService.acceptQuote(quote.id);
    localStorage.removeItem('cart');
    await getCart();
  }}
  afterAccept={(quote) => router.push(`/checkout/thank-you/${quote.id}`)}
/>
```

### With custom labels

```tsx
<QuoteActions
  graphqlClient={graphqlClient}
  quote={quote}
  afterAccept={(quote) => router.push(`/checkout/thank-you/${quote.id}`)}
  labels={{
    termsPrefix: 'I have read and accept the',
    termsLink: 'General Terms & Conditions',
    acceptButton: 'Confirm Quote',
    processing: 'Submitting...',
  }}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

Standalone implementation using the SDK directly:

```ts
import { OrderService, Order, GraphQLClient, Enums } from 'propeller-sdk-v2';

async function acceptQuote(
  graphqlClient: GraphQLClient,
  quote: Order
): Promise<Order> {
  const orderService = new OrderService(graphqlClient);
  return await orderService.setOrderStatus({
    orderId: quote.id,
    status: 'NEW',
    sendOrderConfirmationEmail: true,
    addPDFAttachment: true,
    deleteCart: true,
  });
}
```

**After acceptance:**

```ts
const accepted = await acceptQuote(graphqlClient, quote);
if (accepted?.id === quote.id) {
  localStorage.removeItem('cart');
  router.push(`/checkout/thank-you/${quote.id}`);
}
```

**Terms and conditions gate:**

```ts
// Manage acceptance state in your framework's state mechanism
let termsAccepted = false;
const canAccept = () => !showTermsAndConditions || termsAccepted;

// Only call acceptQuote() when canAccept() returns true
if (!canAccept()) return;
await acceptQuote(graphqlClient, quote);
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required

| Prop | Type | Description |
|---|---|---|
| `quote` | `Order` | The quotation for which the actions will take place |

### Data

| Prop | Type | Default | Description |
|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | `null` | GraphQL client instance for the Propeller SDK. Required when no `onAccept` override is provided. |

### Callbacks

| Prop | Type | Default | Description |
|---|---|---|---|
| `onAccept` | `(quote: Order) => void` | — | Fired when the accept button is clicked. If not provided, the base implementation calls `OrderService.setOrderStatus`. |
| `afterAccept` | `(quote: Order) => void` | — | Fired after a successful acceptance (base or custom). Use for navigation, cart cleanup, analytics events, etc. |
| `onTermsAndConditionsClick` | `() => void` | — | Fired when the terms and conditions link is clicked. Default link navigation is prevented. |

### Display

| Prop | Type | Default | Description |
|---|---|---|---|
| `showTermsAndConditions` | `boolean` | `true` | Show a terms and conditions checkbox. The accept button is disabled until it is checked. |
| `labels` | `Record<string, string>` | — | Override any default label text (see Labels section). |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
async function acceptQuote(
  graphqlClient: GraphQLClient,
  quote: Order
): Promise<Order>
```

### Options

| Field | Type | Default | Maps to |
|---|---|---|---|
| `orderId` | `number` | — | `quote.id` |
| `status` | `string` | `'NEW'` | Status to set on acceptance |
| `sendOrderConfirmationEmail` | `boolean` | `true` | Send a confirmation email when status changes |
| `addPDFAttachment` | `boolean` | `true` | Attach the order overview PDF to the confirmation email |
| `deleteCart` | `boolean` | `true` | Delete the cart that created this order if it is still available |

> **Important:** Do not include `payStatus` or `triggerOrderSendConfirmEvent` in the input. These fields cause the Propeller API to record "System" instead of the authenticated contact in the version history.

### Callbacks

| Callback | When it fires | What to implement |
|---|---|---|
| `onAccept` | When the accept button is clicked | Custom acceptance logic. Replaces the base `setOrderStatus` call entirely when provided. |
| `afterAccept` | After acceptance completes (base or custom) | Navigation (e.g. to thank-you page), cart cleanup, analytics events. |
| `onTermsAndConditionsClick` | When the terms link is clicked | Open a modal or navigate to the T&C page. |

### UI-only props

The following props only affect visual presentation and have no SDK equivalent: `showTermsAndConditions`, `labels`.

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

All labels can be overridden through the `labels` prop using these keys:

| Key | Default value |
|---|---|
| `termsPrefix` | `"I agree to the"` |
| `termsLink` | `"Terms and Conditions"` |
| `acceptButton` | `"Accept Quotation"` |
| `processing` | `"Processing..."` |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const labels = {
  termsPrefix: "I agree to the",
  termsLink: "Terms and Conditions",
  acceptButton: "Accept Quotation",
  processing: "Processing...",
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Accept button state

- Disabled when `showTermsAndConditions` is `true` and the checkbox has not been checked.
- Disabled while `loading` is active (a request is in flight).
- Clicking a disabled button has no effect.

### Accept flow

1. The accept button click sets an internal `loading` flag — the button is disabled, the label switches to "Processing...", and a spinner is shown.
2. If `onAccept` is provided, it is called with the `quote` object. The base SDK call is skipped entirely.
3. If `onAccept` is not provided and `graphqlClient` is available, `OrderService.setOrderStatus` is called with: `status: 'NEW'`, `sendOrderConfirmationEmail: true`, `addPDFAttachment: true`, `deleteCart: true`. Note: `payStatus` and `triggerOrderSendConfirmEvent` must NOT be included (see SDK Services section).
4. After the accept logic completes, `afterAccept` is called with the `quote` object if provided.
5. The `loading` flag is reset in a `finally` block regardless of success or failure.

### Terms and conditions

- When `showTermsAndConditions` is `true`, a checkbox is shown above the accept button. The accept button remains disabled until the checkbox is checked.
- The checkbox label is composed of `termsPrefix` text followed by a `termsLink` anchor.
- Clicking the anchor fires `onTermsAndConditionsClick` and prevents default link navigation.

## SDK Services

```ts
import { OrderService, Order, GraphQLClient, Enums } from 'propeller-sdk-v2';
```

| Service | Method | Description |
|---|---|---|
| `OrderService` | `setOrderStatus(input: OrderSetStatusInput): Promise<Order>` | Sets the status of an order. Used by the base accept implementation when no `onAccept` override is provided. |

`OrderSetStatusInput` fields:

| Field | Type | Description |
|---|---|---|
| `orderId` | `number` | The ID of the order to update |
| `status` | `string` | The new order status |
| `sendOrderConfirmationEmail` | `boolean` | Send a confirmation email on status change |
| `addPDFAttachment` | `boolean` | Attach an order overview PDF to the confirmation email |
| `deleteCart` | `boolean` | Delete the originating cart if still available |

> **Do not include `payStatus` or `triggerOrderSendConfirmEvent`** in the `setOrderStatus` input for quote acceptance. These fields cause the Propeller API to attribute the change to "System" instead of the authenticated contact in the order version history.
