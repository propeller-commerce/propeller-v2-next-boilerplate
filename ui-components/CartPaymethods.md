# CartPaymethods

Displays available payment methods for a shopping cart and lets the user select one. Filters out invalid methods and hides "on account" options for guest users by default.

## Usage

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

## Props

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

## GraphQL

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

## Building Your Own

To build a custom payment method selector, you need:

1. **Read `cart.payMethods`** — an array of `CartPaymethod` objects, each with `code`, `name`, `price`, `externalCode`, and `type`.

2. **Filter methods** — remove entries without a `code`. Optionally hide "on account" methods (codes: `on_account`, `onaccount`, `on-account`) for guest users.

3. **Track selection** — store the selected `code` in local state and highlight the active card.

4. **Display surcharges** — when `method.price > 0`, show the cost next to the method name.

5. **Persist selection** — call `CartService.updateCart()` with `paymentData.method` set to the selected code so the backend records the choice before order placement.

```tsx
function CustomPaymethods({ cart, user }: { cart: Cart; user: Contact | Customer | null }) {
  const [selected, setSelected] = useState<string>('');
  const isGuest = !user;

  const methods = (cart?.payMethods || []).filter((m) => {
    if (!m?.code) return false;
    const code = m.code.toLowerCase();
    if (isGuest && ['on_account', 'onaccount', 'on-account'].includes(code)) return false;
    return true;
  });

  const handleSelect = async (method: CartPaymethod) => {
    setSelected(method.code);
    await cartService.updateCart({
      cartId: cart.cartId,
      paymentData: { method: method.code },
    });
  };

  return (
    <div>
      {methods.map((m) => (
        <button
          key={m.code}
          onClick={() => handleSelect(m)}
          className={selected === m.code ? 'selected' : ''}
        >
          {m.name || m.code}
          {m.price > 0 && <span>+€{m.price.toFixed(2)}</span>}
        </button>
      ))}
      {methods.length === 0 && <p>No payment methods available.</p>}
    </div>
  );
}
```

## Behavior

- **Filtering**: Methods without a `code` are excluded. "On account" variants (`on_account`, `onaccount`, `on-account`) are hidden for guest users unless `showOnAccountForGuests` is `true`.
- **Guest detection**: A user is considered a guest when `user` is `null`.
- **Selection highlight**: The selected method card receives a `border-secondary` border and a light background tint. Only one method can be selected at a time.
- **Price badge**: Methods with `price > 0` display a formatted surcharge badge. The default format is `€X.XX`; override with `formatPrice`.
- **Empty state**: When no methods pass filtering, a configurable message is shown (label key: `noMethods`).
- **Layout**: Methods render in a responsive grid — 1 column on mobile, 2 on `sm`, 3 on `lg`.
