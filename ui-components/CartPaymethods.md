import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# CartPaymethods

Displays available payment methods for a shopping cart and lets the user select one. Filters out invalid methods and hides "on account" options for guest users by default.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

```tsx
import CartPaymethods from '@/components/propeller/CartPaymethods';

// Minimal — render payment methods from the cart
<CartPaymethods
  cart={cart}
  user={user}
  onPaymethodSelect={(method) => setSelectedPayment(method)}
/>
```

```tsx
// Custom price formatting and labels
<CartPaymethods
  cart={cart}
  user={user}
  onPaymethodSelect={(method) => handlePaymentSelect(method)}
  formatPrice={(price) => `USD ${price.toFixed(2)}`}
  labels={{ noMethods: 'No payment options found for your order.' }}
/>
```

```tsx
// Allow guest users to see "on account" payment methods
<CartPaymethods
  cart={cart}
  user={null}
  showOnAccountForGuests={true}
  onPaymethodSelect={(method) => handlePaymentSelect(method)}
/>
```

```tsx
// Custom container class for styling
<CartPaymethods
  cart={cart}
  user={user}
  paymentsContainerClass="my-custom-payments"
  onPaymethodSelect={(method) => handlePaymentSelect(method)}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom payment method selector, you need:

1. **Read `cart.payMethods`** — an array of `CartPaymethod` objects, each with `code`, `name`, `price`, `externalCode`, and `type`.

2. **Filter methods** — remove entries without a `code`. Optionally hide "on account" methods (codes: `on_account`, `onaccount`, `on-account`) for guest users.

3. **Track selection** — store the selected `code` in local state and highlight the active card.

4. **Display surcharges** — when `method.price > 0`, show the cost next to the method name.

5. **Persist selection** — call `CartService.updateCart()` with `paymentData.method` set to the selected code so the backend records the choice before order placement.

```ts
import { CartService } from 'propeller-sdk-v2';
import type { Cart, CartPaymethod, Contact, Customer } from 'propeller-sdk-v2';

// pseudo-code

// Filter payment methods
function getFilteredMethods(cart: Cart, user: Contact | Customer | null): CartPaymethod[] {
  const isGuest = !user;
  return (cart?.payMethods || []).filter((m) => {
    if (!m?.code) return false;
    const code = m.code.toLowerCase();
    if (isGuest && ['on_account', 'onaccount', 'on-account'].includes(code)) return false;
    return true;
  });
}

// Persist the selection to the API
async function selectPaymethod(cartId: string, method: CartPaymethod): Promise<void> {
  const cartService = new CartService(graphqlClient);
  await cartService.updateCart({
    cartId,
    paymentData: { method: method.code },
  });
}

const methods = getFilteredMethods(cart, user);

// Track the selected method code in your framework's state mechanism.
// Render a list of `methods`. For each method, display `method.name || method.code`.
// When `method.price > 0`, show a surcharge badge (e.g., "+EUR X.XX").
// On click, store the selected code and call `selectPaymethod(cart.cartId, method)`.
// If `methods` is empty, show a "No payment methods available." message.
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required

| Prop | Type | Description |
|---|---|---|
| `cart` | `Cart` | Shopping cart object. Payment methods are read from `cart.payMethods`. |
| `user` | `Contact \| Customer \| null` | Authenticated user. Pass `null` for guest checkout. Used to determine guest vs. logged-in filtering. |

### Display

| Prop | Type | Default | Description |
|---|---|---|---|
| `paymentsContainerClass` | `string` | `'cart-paymethods'` | CSS class applied to the outer container. |
| `showOnAccountForGuests` | `boolean` | `false` | When `true`, "on account" methods remain visible for unauthenticated users. |

### Callbacks

| Prop | Type | Description |
|---|---|---|
| `onPaymethodSelect` | `(paymethod: CartPaymethod) => void` | Fired when the user clicks a payment method card. Receives the full `CartPaymethod` object. |

### Formatting and Labels

| Prop | Type | Default | Description |
|---|---|---|---|
| `formatPrice` | `(price: number) => string` | Formats as `€X.XX` | Override the default price formatter for method surcharges. |
| `labels` | `Record<string, string>` | — | Label overrides. Supported keys: `noMethods` (empty-state message, default: `"No payment methods available."`). |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function cartPaymethods(cart: Cart, user: Contact | Customer | null): void
```

### Options

| Field | Type | Default | Maps to |
|---|---|---|---|
| `cart` | `Cart` | — | `cart` prop |
| `user` | `Contact \| Customer \| null` | — | `user` prop |
| `showOnAccountForGuests` | `boolean` | `false` | `showOnAccountForGuests` prop |
| `formatPrice` | `(price: number) => string` | `€X.XX` | `formatPrice` prop |

### Cart resolution

Payment methods are read from `cart.payMethods`, an array of `CartPaymethod` objects:

| Field | Type | Purpose |
|---|---|---|
| `code` | `string` | Payment method identifier |
| `name` | `string` | Display name |
| `price` | `number` | Surcharge amount |
| `externalCode` | `string` | External system code |
| `type` | `string` | Payment type |

### Callbacks

| Callback | Signature | Description |
|---|---|---|
| `onPaymethodSelect` | `(paymethod: CartPaymethod) => void` | Fired when the user selects a payment method |

### UI-only props

The following props only affect visual presentation and have no BYO equivalent: `paymentsContainerClass`.

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default value |
|---|---|
| `noMethods` | `"No payment methods available."` |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const labels = {
  noMethods: "No payment methods available.",
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

- **Filtering**: Methods without a `code` are excluded. "On account" variants (`on_account`, `onaccount`, `on-account`) are hidden for guest users unless `showOnAccountForGuests` is `true`.
- **Guest detection**: A user is considered a guest when `user` is `null`.
- **Selection highlight**: The selected method card receives a `border-secondary` border and a light background tint. Only one method can be selected at a time.
- **Price badge**: Methods with `price > 0` display a formatted surcharge badge. The default format is `€X.XX`; override with `formatPrice`.
- **Empty state**: When no methods pass filtering, a configurable message is shown (label key: `noMethods`).
- **Layout**: Methods render in a responsive grid — 1 column on mobile, 2 on `sm`, 3 on `lg`.

## SDK Services

CartPaymethods reads payment methods from the `Cart` object, which is populated by the Propeller SDK. The relevant services are:

### Fetching payment methods

Payment methods are included in the cart response when you fetch or start a cart via `CartService`:

```ts
import { CartService } from 'propeller-sdk-v2';

const cartService = new CartService(graphqlClient);
const cart = await cartService.getCart({ cartId: 'abc-123' });

// cart.payMethods contains CartPaymethod[]
// Each CartPaymethod has: code, name, price, externalCode, type
```

### Setting the selected payment method

After the user selects a method (via `onPaymethodSelect`), persist it to the cart:

```ts
import { CartService } from 'propeller-sdk-v2';

const cartService = new CartService(graphqlClient);
await cartService.updateCart({
  cartId: 'abc-123',
  paymentData: {
    method: selectedMethod.code,
  },
});
```

## GraphQL Queries and Mutations

### Query — cart with payment methods

```graphql
query Cart($cartId: String!) {
  cart(cartId: $cartId) {
    cartId
    payMethods {
      code
      name
      price
      externalCode
      type
    }
  }
}
```

### Mutation — set payment method on cart

```graphql
mutation CartUpdate($cartId: String!, $input: CartUpdateInput!) {
  cartUpdate(cartId: $cartId, input: $input) {
    cartId
    payMethods {
      code
      name
      price
    }
  }
}
```

Variables:

```json
{
  "cartId": "abc-123",
  "input": {
    "paymentData": {
      "method": "ideal"
    }
  }
}
```
