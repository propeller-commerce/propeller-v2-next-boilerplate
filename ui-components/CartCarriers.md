# CartCarriers

Displays the available delivery carriers for a shopping cart and manages user selection.

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `cart` | `Cart` | Yes | — | Shopping cart object from which carriers are displayed |
| `carriersContainerClass` | `string` | No | `'cart-carriers'` | CSS class for the carriers container |
| `showCarrierLogo` | `boolean` | No | `true` | Display the carrier logo |
| `onCarrierSelect` | `(carrier: CartCarrier) => void` | No | — | Callback when a carrier is selected |
| `formatPrice` | `(price: number) => string` | No | — | Custom price formatting function |
| `labels` | `Record<string, string>` | No | — | Label overrides (`noCarriers`, `deliveryDeadline`) |

## Usage

```tsx
import CartCarriers from '@/components/propeller/CartCarriers';

// Basic usage with selection callback
<CartCarriers
  cart={cart}
  onCarrierSelect={(carrier) => setSelectedCarrier(carrier.name)}
/>
```

## Behavior

- Reads `carriers` array from the cart object
- Selected carrier is highlighted visually
- Each carrier shows its name and price
- If a carrier has a `deliveryDeadline`, it is displayed below the name
- If a carrier has a `logo` property, it is shown when `showCarrierLogo` is true

## Files

- **Mitosis source**: `ui-components/CartCarriers.lite.tsx`
- **Compiled React**: `output/react/ui-components/CartCarriers.tsx`
- **Active copy**: `components/propeller/CartCarriers.tsx`
