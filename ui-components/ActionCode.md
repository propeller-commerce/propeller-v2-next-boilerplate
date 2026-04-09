import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ActionCode

Manages promotional or discount codes applied to the shopping cart. Allows users to enter and apply an action code, displays the currently applied code, and provides an option to remove it. Supports two modes: self-contained (handles SDK calls internally) and delegation (defers logic to parent callbacks).

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Self-contained mode (recommended)

The component calls `CartService` internally to apply and remove action codes. Use `afterActionCodeApply` and `afterActionCodeRemove` to sync the updated cart back to your app state.

```tsx
import ActionCode from '@/components/propeller/ActionCode';
import { useGraphqlClient } from '@/lib/graphql';
import { useCart } from '@/context/CartContext';

function CartPage() {
  const graphqlClient = useGraphqlClient();
  const { cart, saveCart } = useCart();

  return (
    <ActionCode
      graphqlClient={graphqlClient}
      cart={cart}
      afterActionCodeApply={(updatedCart) => saveCart(updatedCart)}
      afterActionCodeRemove={(updatedCart) => saveCart(updatedCart)}
    />
  );
}
```

### With custom title and labels

```tsx
<ActionCode
  graphqlClient={graphqlClient}
  cart={cart}
  title="Discount code"
  labels={{
    placeholder: 'Enter your discount code',
    apply: 'Redeem',
    applying: 'Redeeming...',
    remove: 'Clear',
    errorApply: 'Invalid code. Please check and try again.',
    errorRemove: 'Could not remove code. Please try again.',
  }}
  afterActionCodeApply={(updatedCart) => saveCart(updatedCart)}
  afterActionCodeRemove={(updatedCart) => saveCart(updatedCart)}
/>
```

### Delegation mode

When you need full control over the apply/remove logic, pass `onActionCodeApply` and/or `onActionCodeRemove`. The component will skip internal SDK calls and invoke your callbacks instead.

```tsx
<ActionCode
  graphqlClient={graphqlClient}
  cart={cart}
  onActionCodeApply={(code, currentCart) => {
    // Custom validation or API call
    console.log(`Applying code "${code}" to cart ${currentCart.cartId}`);
  }}
  onActionCodeRemove={(code, currentCart) => {
    // Custom removal logic
    console.log(`Removing code "${code}" from cart ${currentCart.cartId}`);
  }}
/>
```

### Read-only applied code (removal hidden)

```tsx
<ActionCode
  graphqlClient={graphqlClient}
  cart={cart}
  showRemoveCode={false}
  afterActionCodeApply={(updatedCart) => saveCart(updatedCart)}
/>
```

### With language and configuration

```tsx
import config from '@/data/config';

<ActionCode
  graphqlClient={graphqlClient}
  cart={cart}
  language="EN"
  configuration={config}
  afterActionCodeApply={(updatedCart) => saveCart(updatedCart)}
  afterActionCodeRemove={(updatedCart) => saveCart(updatedCart)}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

Standalone implementation using `CartService` directly, without the ActionCode component:

### Self-contained mode

```ts
import { CartService, CartActionCodeVariables, GraphQLClient, Cart } from 'propeller-sdk-v2';

// Initialize the service
const graphqlClient = new GraphQLClient({
  endpoint: '/api/graphql',
  headers: { 'Content-Type': 'application/json' },
});
const cartService = new CartService(graphqlClient);

// Apply an action code
async function applyCode(cart: Cart, code: string, language: string = 'NL'): Promise<Cart> {
  const variables: CartActionCodeVariables = {
    id: cart.cartId,
    input: { actionCode: code.trim() },
    language,
  };

  const updatedCart = await cartService.addActionCodeToCart(variables);
  return updatedCart;
  // On success: clear the code input and pass updatedCart to your cart state
  // On failure: display an error message to the user
}

// Remove the applied action code
async function removeCode(cart: Cart, language: string = 'NL'): Promise<Cart> {
  const variables: CartActionCodeVariables = {
    id: cart.cartId,
    input: { actionCode: cart.actionCode },
    language,
  };

  const updatedCart = await cartService.removeActionCodeFromCart(variables);
  return updatedCart;
  // On success: pass updatedCart to your cart state
  // On failure: display an error message to the user
}

// Check whether a code is currently applied
const hasAppliedCode = !!cart?.actionCode;
```

### Delegation mode

```ts
// When handling apply/remove yourself, no SDK calls are needed internally.
// Implement your own validation or API calls:

function onApply(code: string, cart: Cart) {
  // Custom validation or API call
  console.log(`Applying code "${code}" to cart ${cart.cartId}`);
}

function onRemove(code: string, cart: Cart) {
  // Custom removal logic
  console.log(`Removing code "${code}" from cart ${cart.cartId}`);
}
```

### With language and configuration

```ts
import { CartService, CartActionCodeVariables, Cart } from 'propeller-sdk-v2';

const cartService = new CartService(graphqlClient);

async function applyCode(cart: Cart, code: string, language: string, config?: any): Promise<Cart> {
  const variables: CartActionCodeVariables = {
    id: cart.cartId,
    input: { actionCode: code.trim() },
    language,
    imageSearchFilters: config?.imageSearchFiltersGrid,
    imageVariantFilters: config?.imageVariantFiltersSmall,
  };

  return await cartService.addActionCodeToCart(variables);
}
```

Your UI should render:
- When no code is applied: a text input for the code and an "Apply" button. On submit, call `applyCode()`.
- When a code is applied: display `cart.actionCode` as a badge with a "Remove" button. On click, call `removeCode()`.
- Disable inputs and buttons while a request is in flight. Show error messages on failure.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required

| Prop | Type | Description |
|------|------|-------------|
| `graphqlClient` | `GraphQLClient` | GraphQL client instance for Propeller SDK calls |
| `cart` | `Cart` | The current shopping cart object |

### Display

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `'Action code'` | Block heading text |
| `labels` | `Record<string, string>` | `{}` | Override any UI label (see [Labels](#labels) section) |
| `showRemoveCode` | `boolean` | `true` | Whether to show the remove button when a code is applied |

### Callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onActionCodeApply` | `(code: string, cart: Cart) => void` | Delegation callback for apply. When provided, the component skips the internal SDK call. |
| `onActionCodeRemove` | `(code: string, cart: Cart) => void` | Delegation callback for remove. When provided, the component skips the internal SDK call. |
| `afterActionCodeApply` | `(cart: Cart) => void` | Called after a successful internal apply, with the updated cart |
| `afterActionCodeRemove` | `(cart: Cart) => void` | Called after a successful internal remove, with the updated cart |

### Configuration

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `configuration` | `any` | — | App configuration object (provides `imageSearchFiltersGrid` and `imageVariantFiltersSmall` for cart queries) |
| `language` | `string` | `'NL'` | Language code passed to CartService operations |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function Signature

```ts
import { CartService, CartActionCodeVariables, Cart } from 'propeller-sdk-v2';

const cartService = new CartService(graphqlClient);

async function addActionCodeToCart(variables: CartActionCodeVariables): Promise<Cart>;
async function removeActionCodeFromCart(variables: CartActionCodeVariables): Promise<Cart>;
```

### Options Table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `id` | `number` | — | `cart.cartId` |
| `input.actionCode` | `string` | — | The action code string to apply or remove |
| `language` | `string` | `'NL'` | Language code for cart operations |
| `imageSearchFilters` | `object` | — | `configuration.imageSearchFiltersGrid` |
| `imageVariantFilters` | `object` | — | `configuration.imageVariantFiltersSmall` |

### Callbacks Table

| Callback | When it fires | What to implement |
|---|---|---|
| `afterActionCodeApply` | After a successful internal apply | Save the updated cart to your app state. |
| `afterActionCodeRemove` | After a successful internal remove | Save the updated cart to your app state. |
| `onActionCodeApply` | User submits a code (delegation mode) | Handle apply logic yourself. SDK call is skipped. |
| `onActionCodeRemove` | User clicks remove (delegation mode) | Handle remove logic yourself. SDK call is skipped. |

### UI-Only Props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `title` — block heading text
- `labels` — customizable UI strings
- `showRemoveCode` — show/hide the remove button

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default | Description |
|-----|---------|-------------|
| `placeholder` | `'Enter action code'` | Input field placeholder text |
| `apply` | `'Apply'` | Apply button label |
| `applying` | `'Applying...'` | Apply button label during loading |
| `remove` | `'Remove'` | Remove button label |
| `errorApply` | `'Failed to apply action code. Please try again.'` | Error shown when apply fails |
| `errorRemove` | `'Failed to remove action code. Please try again.'` | Error shown when remove fails |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const labels = {
  placeholder: 'Enter action code',
  apply: 'Apply',
  applying: 'Applying...',
  remove: 'Remove',
  errorApply: 'Failed to apply action code. Please try again.',
  errorRemove: 'Failed to remove action code. Please try again.',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Apply flow

1. User enters a code in the text input and clicks "Apply" (or presses Enter).
2. If the input is empty or the component is already loading, the action is ignored.
3. **Delegation mode**: If `onActionCodeApply` is provided, it is called with the code and current cart. No SDK call is made.
4. **Self-contained mode**: A `CartService` instance is created and `addActionCodeToCart()` is called.
5. On success, the input is cleared and `afterActionCodeApply` is called with the updated cart.
6. On failure, an error message is displayed below the input.

### Remove flow

1. User clicks the "Remove" button next to the applied code.
2. If the component is loading or no code is applied, the action is ignored.
3. **Delegation mode**: If `onActionCodeRemove` is provided, it is called with the applied code and current cart. No SDK call is made.
4. **Self-contained mode**: `removeActionCodeFromCart()` is called via `CartService`.
5. On success, `afterActionCodeRemove` is called with the updated cart. The input form reappears.
6. On failure, an error message is displayed.

### State transitions

- **No code applied**: Shows text input + "Apply" button.
- **Code applied**: Shows a badge with the applied code and a "Remove" button (unless `showRemoveCode={false}`).
- **Loading**: Both the input and buttons are disabled. The apply button text changes to the `applying` label.
- **Error**: A red error message appears below the input/badge area. It is cleared on the next apply or remove attempt.

### Hydration

The component uses an `isMounted` guard to prevent hydration mismatches. The interactive content (input, buttons, applied code badge) only renders after the component has mounted on the client.

## GraphQL Mutations

Under the hood, `CartService` executes these GraphQL mutations:

### Apply action code

```graphql
mutation CartAddActionCode($id: Int!, $input: CartActionCodeInput!, $language: String) {
  cartAddActionCode(id: $id, input: $input) {
    cartId
    actionCode
    total {
      subTotal
      discount
      totalNet
      totalGross
    }
    # ... other cart fields
  }
}
```

### Remove action code

```graphql
mutation CartRemoveActionCode($id: Int!, $input: CartActionCodeInput!, $language: String) {
  cartRemoveActionCode(id: $id, input: $input) {
    cartId
    actionCode
    total {
      subTotal
      discount
      totalNet
      totalGross
    }
    # ... other cart fields
  }
}
```

Both mutations accept a `CartActionCodeInput` with a single field:

```graphql
input CartActionCodeInput {
  actionCode: String!
}
```

## SDK Services

The component uses **`CartService`** from `propeller-sdk-v2` with the following methods:

### `CartService.addActionCodeToCart(variables)`

Applies an action code to the cart. Accepts `CartActionCodeVariables`:

```ts
import { CartService, CartActionCodeVariables } from 'propeller-sdk-v2';

const cartService = new CartService(graphqlClient);
const variables: CartActionCodeVariables = {
  id: cart.cartId,
  input: {
    actionCode: 'SUMMER20',
  },
  language: 'NL',
  imageSearchFilters: config?.imageSearchFiltersGrid,
  imageVariantFilters: config?.imageVariantFiltersSmall,
};

const updatedCart = await cartService.addActionCodeToCart(variables);
```

### `CartService.removeActionCodeFromCart(variables)`

Removes an action code from the cart. Uses the same `CartActionCodeVariables` shape:

```ts
const variables: CartActionCodeVariables = {
  id: cart.cartId,
  input: {
    actionCode: cart.actionCode, // currently applied code
  },
  language: 'NL',
};

const updatedCart = await cartService.removeActionCodeFromCart(variables);
```

### Reading the applied code

The currently applied action code is available on `cart.actionCode`. The component checks this field to determine whether to show the input form or the applied-code badge.
