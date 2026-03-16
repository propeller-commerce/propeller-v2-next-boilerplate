# CartPaymethods

Displays the available payment methods for a shopping cart and manages user selection.

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `cart` | `Cart` | Yes | — | Shopping cart object from which payment methods are displayed |
| `paymentsContainerClass` | `string` | No | `'cart-paymethods'` | CSS class for the payment methods container |
| `showPaymentMethodLogo` | `boolean` | No | `true` | Display the payment method logo |
| `showOnAccountForGuests` | `boolean` | No | `false` | Display the on-account payment method for anonymous users |
| `onPaymethodSelect` | `(paymethod: CartPaymethod) => void` | No | — | Callback when a payment method is selected |
| `formatPrice` | `(price: number) => string` | No | — | Custom price formatting function |
| `labels` | `Record<string, string>` | No | — | Label overrides (`noMethods`) |

## Usage

```tsx
import CartPaymethods from '@/components/propeller/CartPaymethods';

// Basic usage with selection callback
<CartPaymethods
  cart={cart}
  onPaymethodSelect={(method) => setSelectedPayment(method.code)}
/>

// Hide logos, show on-account for guests
<CartPaymethods
  cart={cart}
  showPaymentMethodLogo={false}
  showOnAccountForGuests={true}
  onPaymethodSelect={(method) => handlePaymentSelect(method)}
/>
```

## Behavior

- Filters out payment methods without a `code`
- By default hides "on account" methods (`on_account`, `onaccount`, `on-account`) for guest users (no `user` in localStorage)
- Selected method is highlighted visually
- Methods with a price > 0 show a price badge
- Logo display uses a built-in mapping of common payment method codes to logo URLs

## Files

- **Mitosis source**: `ui-components/CartPaymethods.lite.tsx`
- **Compiled React**: `output/react/ui-components/CartPaymethods.tsx`
- **Active copy**: `components/propeller/CartPaymethods.tsx`
