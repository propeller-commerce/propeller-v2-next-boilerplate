# CartCarriers

Displays the available shipping carriers for a shopping cart, letting the user pick one. Each carrier card shows the carrier name, optional logo, price, and delivery deadline.

## Usage

### Basic

```tsx
import CartCarriers from '@/components/propeller/CartCarriers';

<CartCarriers
  cart={cart}
  onCarrierSelect={(carrier) => console.log('Selected:', carrier.name)}
/>
```

### With custom price formatting and labels

```tsx
<CartCarriers
  cart={cart}
  onCarrierSelect={handleCarrierSelect}
  formatPrice={(price) => `$ ${price.toFixed(2)}`}
  labels={{
    noCarriers: 'No shipping options available for your order.',
    deliveryDeadline: 'Estimated delivery:',
  }}
/>
```

### Hide logos and prices (name-only cards)

```tsx
<CartCarriers
  cart={cart}
  showCarrierLogo={false}
  showPrice={false}
  onCarrierSelect={handleCarrierSelect}
/>
```

### Inside a checkout flow with carrier persistence

```tsx
const handleCarrierSelect = async (carrier: CartCarrier) => {
  // Update the cart with the selected carrier via CartService
  await cartService.setCarrier(cart.cartId, carrier.name);
  // Refresh local cart state
  const updatedCart = await cartService.getCart(cart.cartId);
  saveCart(updatedCart);
};

<CartCarriers
  cart={cart}
  onCarrierSelect={handleCarrierSelect}
  carriersContainerClass="checkout-carriers mt-4"
/>
```

## Props

### Required

| Prop | Type | Description |
|---|---|---|
| `cart` | `Cart` | Shopping cart object. The component reads `cart.carriers` to render the list. |

### Display

| Prop | Type | Default | Description |
|---|---|---|---|
| `showCarrierLogo` | `boolean` | `true` | Show the carrier logo image when the carrier has a `logo` URL. |
| `showPrice` | `boolean` | `true` | Show the carrier shipping price next to the name. |
| `carriersContainerClass` | `string` | `'cart-carriers'` | CSS class applied to the outermost wrapper `div`. |

### Callbacks

| Prop | Type | Description |
|---|---|---|
| `onCarrierSelect` | `(carrier: CartCarrier) => void` | Fired when the user clicks a carrier card. Receives the full `CartCarrier` object. |

### Formatting and labels

| Prop | Type | Default | Description |
|---|---|---|---|
| `formatPrice` | `(price: number) => string` | Formats as `EUR X.XX` | Override the default price formatter. |
| `labels` | `Record<string, string>` | — | Override UI strings. Supported keys: `noCarriers` (empty-state message), `deliveryDeadline` (prefix before the deadline value). |

## SDK Services

CartCarriers is a presentation-only component. It reads carriers from the `Cart` object but does not call the SDK itself. The parent is responsible for fetching the cart (which includes carriers) and for persisting the user's selection.

### Fetching a cart with carriers

Use `CartService.getCart()` to retrieve a cart. The response includes the `carriers` array when the backend has shipping options configured for the cart's contents and delivery address.

```ts
import { CartService } from 'propeller-sdk-v2';

const cartService = new CartService(graphqlClient);
const cart = await cartService.getCart(cartId);
// cart.carriers -> CartCarrier[]
```

### Setting the selected carrier

After the user selects a carrier via `onCarrierSelect`, persist the choice back to the API:

```ts
await cartService.setCarrier(cartId, carrier.name);
```

This updates the cart server-side so that `cart.postageData` reflects the selected carrier's shipping cost.

## GraphQL

### Query: cart with carriers

```graphql
query CartWithCarriers($cartId: String!) {
  cart(cartId: $cartId) {
    cartId
    carriers {
      name
      price
      logo
      deliveryDeadline
    }
    postageData {
      price
      carrier
    }
  }
}
```

### Mutation: set carrier on cart

```graphql
mutation SetCartCarrier($cartId: String!, $carrier: String!) {
  cartSetCarrier(input: { cartId: $cartId, carrier: $carrier }) {
    cartId
    postageData {
      price
      carrier
    }
  }
}
```

## Building Your Own

To build a custom carrier selector without this component, you need:

1. **Read `cart.carriers`** -- an array of `CartCarrier` objects, each with `name`, `price`, `logo` (optional URL), and `deliveryDeadline` (optional string).

2. **Track selection state** -- store the selected carrier name locally. There is no "selected" flag on `CartCarrier` itself.

3. **Persist the selection** -- call `CartService.setCarrier(cartId, carrierName)` (or the `cartSetCarrier` mutation directly) when the user picks a carrier. This updates `cart.postageData` so totals reflect the shipping cost.

4. **Format prices** -- `carrier.price` is a raw number. Format it with your locale-aware formatter or fall back to a simple `toFixed(2)`.

5. **Handle the empty state** -- when `cart.carriers` is empty or undefined, no shipping options are available (usually because no delivery address has been set yet, or the backend has no rules matching the cart).

### Minimal custom implementation

```ts
import { CartService } from 'propeller-sdk-v2';
import type { Cart, CartCarrier } from 'propeller-sdk-v2';

// pseudo-code

const carriers = cart?.carriers || [];
// If `carriers` is empty, show an empty-state message.

// Track the selected carrier name in your framework's state mechanism.
let selectedCarrierName: string = '';

function selectCarrier(carrier: CartCarrier, cartId: string) {
  selectedCarrierName = carrier.name;

  // Persist the selection to the API
  const cartService = new CartService(graphqlClient);
  cartService.setCarrier(cartId, carrier.name);
}

// Render a list of carriers. For each carrier, display `carrier.name` and
// `carrier.price.toFixed(2)`. Highlight the carrier whose name matches
// `selectedCarrierName`. On click, call `selectCarrier(carrier, cart.cartId)`.
```

## Behavior

- Renders a responsive grid of carrier cards (1 column on mobile, 2 on small screens, 3 on large).
- Clicking a card selects it visually (highlighted border and background) and fires `onCarrierSelect`.
- Only one carrier can be selected at a time; selecting a new one deselects the previous.
- Selection is local UI state only. The component does not call the API -- the parent must handle persistence via `onCarrierSelect`.
- When `cart.carriers` is empty or missing, an empty-state message is shown (customizable via `labels.noCarriers`).
- Carrier logos are displayed as small images (`h-6`) when `showCarrierLogo` is true and the carrier has a `logo` URL.
- The `deliveryDeadline` line only appears for carriers that have that field set.
- Prices default to EUR formatting (`EUR X.XX`) and can be overridden with `formatPrice`.
