# ActionCode

The ActionCode component manages promotional or discount codes applied to the shopping cart. It allows users to enter and apply an action code, displays the currently applied code, and provides an option to remove it. The component supports two modes: self-contained (handles SDK calls internally) and delegation (defers logic to parent callbacks).

## Usage

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

## Props

### Required

| Prop | Type | Description |
|------|------|-------------|
| `graphqlClient` | `GraphQLClient` | GraphQL client instance for Propeller SDK calls |
| `cart` | `Cart` | The current shopping cart object |

### Display

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `'Action code'` | Block heading text |
| `labels` | `Record<string, string>` | `{}` | Override any UI label (see Label Keys below) |
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

## Label Keys

All labels are customizable via the `labels` prop.

| Key | Default | Description |
|-----|---------|-------------|
| `placeholder` | `'Enter action code'` | Input field placeholder text |
| `apply` | `'Apply'` | Apply button label |
| `applying` | `'Applying...'` | Apply button label during loading |
| `remove` | `'Remove'` | Remove button label |
| `errorApply` | `'Failed to apply action code. Please try again.'` | Error shown when apply fails |
| `errorRemove` | `'Failed to remove action code. Please try again.'` | Error shown when remove fails |

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

## Building Your Own

Standalone implementation using `CartService` directly, without the ActionCode component:

```tsx
'use client';

import { useState } from 'react';
import { GraphQLClient, CartService, Cart, CartActionCodeVariables } from 'propeller-sdk-v2';

interface ActionCodeFormProps {
  graphqlClient: GraphQLClient;
  cart: Cart;
  language?: string;
  onCartUpdate: (cart: Cart) => void;
}

export function ActionCodeForm({ graphqlClient, cart, language = 'NL', onCartUpdate }: ActionCodeFormProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasAppliedCode = !!cart?.actionCode;

  async function applyCode() {
    if (!code.trim() || loading) return;
    setLoading(true);
    setError('');

    const cartService = new CartService(graphqlClient);
    const variables: CartActionCodeVariables = {
      id: cart.cartId,
      input: { actionCode: code.trim() },
      language,
    };

    try {
      const updatedCart = await cartService.addActionCodeToCart(variables);
      setCode('');
      onCartUpdate(updatedCart);
    } catch (err) {
      setError('Failed to apply action code.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function removeCode() {
    if (loading || !hasAppliedCode) return;
    setLoading(true);
    setError('');

    const cartService = new CartService(graphqlClient);
    const variables: CartActionCodeVariables = {
      id: cart.cartId,
      input: { actionCode: cart.actionCode },
      language,
    };

    try {
      const updatedCart = await cartService.removeActionCodeFromCart(variables);
      onCartUpdate(updatedCart);
    } catch (err) {
      setError('Failed to remove action code.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (hasAppliedCode) {
    return (
      <div>
        <span>Applied: {cart.actionCode}</span>
        <button onClick={removeCode} disabled={loading}>
          Remove
        </button>
        {error && <p>{error}</p>}
      </div>
    );
  }

  return (
    <div>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && applyCode()}
        placeholder="Enter action code"
        disabled={loading}
      />
      <button onClick={applyCode} disabled={loading || !code.trim()}>
        {loading ? 'Applying...' : 'Apply'}
      </button>
      {error && <p>{error}</p>}
    </div>
  );
}
```
