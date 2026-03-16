# CartOverview

Renders a structured checkout summary with addresses, payment/carrier/delivery info, reference, notes, terms acceptance, and a purchase button.

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | Yes | — | GraphQL client for the Propeller SDK |
| `cart` | `Cart` | Yes | — | Shopping cart object |
| `overviewContainerClass` | `string` | No | `'cart-overview'` | CSS class for the container |
| `title` | `string` | No | `''` | Title of the cart overview |
| `labels` | `Record<string, string>` | No | — | Label overrides (see below) |
| `showNotes` | `boolean` | No | `true` | Show the notes field |
| `showReference` | `boolean` | No | `true` | Show the reference field |
| `showTermsAndConditions` | `boolean` | No | `true` | Show terms & conditions checkbox |
| `onTermsAndConditionsClick` | `() => void` | No | — | Callback when terms link is clicked |
| `showPurchaseButton` | `boolean` | No | `true` | Show the purchase button |
| `onPurchaseButtonClick` | `(cart: Cart, reference: string, notes: string) => void` | No | — | Callback when purchase button is clicked |

### Label keys

`invoiceAddress`, `deliveryAddress`, `payment`, `carrier`, `deliveryDate`, `referenceLabel`, `referencePlaceholder`, `notesLabel`, `notesPlaceholder`, `termsPrefix`, `termsLink`, `purchaseButton`

## Usage

```tsx
import CartOverview from '@/components/propeller/CartOverview';

<CartOverview
  graphqlClient={graphqlClient}
  cart={cart}
  onTermsAndConditionsClick={() => window.open('/terms-conditions', '_blank')}
  onPurchaseButtonClick={(cart, reference, notes) => handlePlaceOrder(reference, notes)}
/>
```

## Behavior

- Displays invoice and delivery addresses from `cart.invoiceAddress` / `cart.deliveryAddress`
- Shows payment method, carrier, and delivery date from `cart.paymentData` / `cart.postageData`
- Reference and notes fields are managed internally, passed to `onPurchaseButtonClick`
- Purchase button is disabled until terms are accepted (when `showTermsAndConditions` is true)
- Terms link fires `onTermsAndConditionsClick` with `preventDefault`

## Files

- **Mitosis source**: `ui-components/CartOverview.lite.tsx`
- **Compiled React**: `output/react/ui-components/CartOverview.tsx`
- **Active copy**: `components/propeller/CartOverview.tsx`
