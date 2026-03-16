# ActionCode

The ActionCode component manages promotional or discount codes applied to the shopping cart. It allows users to add or remove an action code and provides callback hooks for both actions.

The component supports customizable labels, optional removal visibility, and lifecycle callbacks (`afterActionCodeApply`, `afterActionCodeRemove`) for updating cart state, triggering notifications, or refreshing totals. It is designed to integrate seamlessly with the cart summary and overall checkout flow.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `graphqlClient` | `GraphQLClient` | Yes | — | GraphQL client for the Propeller SDK |
| `cart` | `Cart` | Yes | — | The shopping cart used to populate the cart summary data |
| `title` | `string` | No | `'Action code'` | Action code block title |
| `labels` | `Record<string, string>` | No | `{}` | Labels for the component |
| `showRemoveCode` | `boolean` | No | `true` | Display the option to remove the action code |
| `onActionCodeApply` | `(code: string, cart: Cart) => void` | No | — | Action handler when action code is added. When provided, skips internal SDK call (delegation mode). |
| `onActionCodeRemove` | `(code: string, cart: Cart) => void` | No | — | Action handler when action code is removed. When provided, skips internal SDK call (delegation mode). |
| `afterActionCodeApply` | `(cart: Cart) => void` | No | — | Callback after action code is applied (receives updated cart) |
| `afterActionCodeRemove` | `(cart: Cart) => void` | No | — | Callback after action code is removed (receives updated cart) |
| `language` | `string` | No | `'NL'` | Language code for CartService operations |

## Label Keys

| Key | Default | Description |
|-----|---------|-------------|
| `placeholder` | `'Enter action code'` | Input placeholder text |
| `apply` | `'Apply'` | Apply button text |
| `applying` | `'Applying...'` | Apply button text while loading |
| `remove` | `'Remove'` | Remove button text |
| `errorApply` | `'Failed to apply action code. Please try again.'` | Error message on apply failure |
| `errorRemove` | `'Failed to remove action code. Please try again.'` | Error message on remove failure |

## Usage

### Self-contained mode (recommended)

```tsx
<ActionCode
  graphqlClient={graphqlClient}
  cart={cart}
  afterActionCodeApply={(updatedCart) => saveCart(updatedCart)}
  afterActionCodeRemove={(updatedCart) => saveCart(updatedCart)}
/>
```

### Delegation mode

```tsx
<ActionCode
  graphqlClient={graphqlClient}
  cart={cart}
  onActionCodeApply={(code, cart) => {
    // Custom apply logic
  }}
  onActionCodeRemove={(code, cart) => {
    // Custom remove logic
  }}
/>
```

## SDK Integration

Uses `CartService` from `propeller-sdk-v2`:
- `cartService.addActionCodeToCart({ id, input: { actionCode }, language })` — applies code
- `cartService.removeActionCodeFromCart({ id, input: { actionCode }, language })` — removes code

The applied action code is read from `cart.actionCode`.
