import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# CartOverview

Renders a structured checkout summary displaying invoice and delivery addresses, payment and shipping details, optional reference and notes fields, terms and conditions acceptance, and a purchase button.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic checkout overview

```tsx
import CartOverview from '@/components/propeller/CartOverview';

<CartOverview
  graphqlClient={graphqlClient}
  cart={cart}
  onPurchaseButtonClick={(cart, reference, notes) => handlePlaceOrder(reference, notes)}
/>
```

### With custom labels and terms link

```tsx
<CartOverview
  graphqlClient={graphqlClient}
  cart={cart}
  title="Order Summary"
  labels={{
    invoiceAddress: 'Billing Address',
    deliveryAddress: 'Shipping Address',
    payment: 'Payment Method:',
    carrier: 'Shipping Provider:',
    deliveryDate: 'Expected Delivery:',
    referenceLabel: 'PO Number (Optional)',
    referencePlaceholder: 'Enter your PO number',
    notesLabel: 'Comments (Optional)',
    notesPlaceholder: 'Any special delivery instructions?',
    termsPrefix: 'I accept the',
    termsLink: 'General Terms & Conditions',
    purchaseButton: 'Confirm Order',
    processing: 'Placing order...',
  }}
  onTermsAndConditionsClick={() => window.open('/terms-conditions', '_blank')}
  onPurchaseButtonClick={(cart, reference, notes) => handlePlaceOrder(reference, notes)}
/>
```

### Minimal read-only summary (no inputs, no purchase button)

```tsx
<CartOverview
  graphqlClient={graphqlClient}
  cart={cart}
  title="Your Order"
  showNotes={false}
  showReference={false}
  showTermsAndConditions={false}
  showPurchaseButton={false}
/>
```

### B2B checkout with reference required

```tsx
<CartOverview
  graphqlClient={graphqlClient}
  cart={cart}
  title="Place B2B Order"
  showNotes={true}
  showReference={true}
  labels={{
    referenceLabel: 'Purchase Order Number',
    referencePlaceholder: 'PO-00000',
  }}
  onPurchaseButtonClick={(cart, reference, notes) => {
    if (!reference) {
      toast.error('Please enter a PO number');
      return;
    }
    submitOrder(cart, reference, notes);
  }}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom checkout overview that replaces this component:

1. **Read the Cart object** — all data comes from the `Cart` type in `propeller-sdk-v2`. No additional API calls are needed for the overview itself.

2. **Address formatting** — access `cart.invoiceAddress` and `cart.deliveryAddress`. Both are `CartAddress` objects with the fields listed above. Render them in whatever layout suits your design.

3. **Payment and shipping info** — read `cart.paymentData.method`, `cart.postageData.carrier`, and `cart.postageData.requestDate`. These are set during earlier checkout steps.

4. **Order submission** — collect any user inputs (reference, notes, terms acceptance) and pass them along with the cart to your order placement logic. The component itself does not call any order API; that responsibility belongs to the parent.

5. **Loading state** — manage your own loading indicator. This component sets loading internally on button click but has no way to reset it. If you need retry or error recovery, manage loading state in the parent.

6. **Labels** — if you need i18n, pass translated strings through the `labels` prop or implement your own translation layer in a custom component.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required

| Prop | Type | Description |
|---|---|---|
| `graphqlClient` | `GraphQLClient` | GraphQL client instance for the Propeller SDK |
| `cart` | `Cart` | The shopping cart object containing addresses, payment data, and postage data |

### Display toggles

| Prop | Type | Default | Description |
|---|---|---|---|
| `showNotes` | `boolean` | `true` | Show the order notes textarea |
| `showReference` | `boolean` | `true` | Show the reference/PO number input |
| `showTermsAndConditions` | `boolean` | `true` | Show the terms and conditions checkbox |
| `showPurchaseButton` | `boolean` | `true` | Show the "Place Order" button |

### Appearance

| Prop | Type | Default | Description |
|---|---|---|---|
| `overviewContainerClass` | `string` | `'cart-overview'` | CSS class applied to the root container |
| `title` | `string` | — | Optional heading displayed above the overview |
| `labels` | `Record<string, string>` | — | Override any default label text (see label keys below) |

### Callbacks

| Prop | Type | Description |
|---|---|---|
| `onTermsAndConditionsClick` | `() => void` | Fires when the terms and conditions link is clicked (default click is prevented) |
| `onPurchaseButtonClick` | `(cart: Cart, reference: string, notes: string) => void` | Fires when the purchase button is clicked; receives the cart, reference text, and notes text |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function cartOverview(cart: Cart): void
```

### Options

| Field | Type | Default | Maps to |
|---|---|---|---|
| `cart` | `Cart` | — | `cart` prop |
| `title` | `string` | `undefined` | `title` prop |
| `showNotes` | `boolean` | `true` | `showNotes` prop |
| `showReference` | `boolean` | `true` | `showReference` prop |
| `showTermsAndConditions` | `boolean` | `true` | `showTermsAndConditions` prop |
| `showPurchaseButton` | `boolean` | `true` | `showPurchaseButton` prop |

### Cart resolution

All data comes from the `Cart` object:

| Cart field | Used for |
|---|---|
| `cart.invoiceAddress` | Displays the billing address (company, name, street, postal code, city, country, email) |
| `cart.deliveryAddress` | Displays the shipping address (same fields as invoice address) |
| `cart.paymentData.method` | Shows the selected payment method name |
| `cart.postageData.carrier` | Shows the selected shipping carrier name |
| `cart.postageData.requestDate` | Shows the requested delivery date, formatted via `toLocaleDateString()` |

### Callbacks

| Callback | Signature | Description |
|---|---|---|
| `onTermsAndConditionsClick` | `() => void` | Fires when the terms link is clicked |
| `onPurchaseButtonClick` | `(cart: Cart, reference: string, notes: string) => void` | Fires when the purchase button is clicked |

### UI-only props

The following props only affect visual presentation and have no BYO equivalent: `overviewContainerClass`.

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

All labels can be overridden through the `labels` prop using these keys:

| Key | Default value |
|---|---|
| `invoiceAddress` | `"Invoice Address"` |
| `deliveryAddress` | `"Delivery Address"` |
| `payment` | `"Payment:"` |
| `carrier` | `"Carrier:"` |
| `deliveryDate` | `"Delivery Date:"` |
| `referenceLabel` | `"Reference (Optional)"` |
| `referencePlaceholder` | `"Your reference number"` |
| `notesLabel` | `"Order Notes (Optional)"` |
| `notesPlaceholder` | `"Special instructions or comments"` |
| `termsPrefix` | `"I agree to the"` |
| `termsLink` | `"Terms and Conditions"` |
| `purchaseButton` | `"Place Order"` |
| `processing` | `"Processing..."` |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const labels = {
  invoiceAddress: "Invoice Address",
  deliveryAddress: "Delivery Address",
  payment: "Payment:",
  carrier: "Carrier:",
  deliveryDate: "Delivery Date:",
  referenceLabel: "Reference (Optional)",
  referencePlaceholder: "Your reference number",
  notesLabel: "Order Notes (Optional)",
  notesPlaceholder: "Special instructions or comments",
  termsPrefix: "I agree to the",
  termsLink: "Terms and Conditions",
  purchaseButton: "Place Order",
  processing: "Processing...",
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Address display
- Invoice and delivery addresses are rendered in a two-column grid (single column on mobile).
- Each address shows company name, full name, street line, postal code + city, country, and email when available.
- If an address has no `street` value, the entire address block is hidden.

### Payment, carrier, and delivery date
- Displayed in a summary card below the addresses.
- Each row only appears when the corresponding cart field has a value.

### Reference and notes
- Both fields are managed as internal component state.
- Values are passed to `onPurchaseButtonClick` when the user submits the order.
- Either field can be hidden independently via `showReference` and `showNotes`.

### Terms and conditions
- When `showTermsAndConditions` is `true`, a checkbox must be checked before the purchase button becomes active.
- Clicking the "Terms and Conditions" link calls `onTermsAndConditionsClick` and prevents default navigation.

### Purchase button
- Disabled when terms are required but not yet accepted, or when `loading` is active.
- Clicking it sets an internal `loading` flag (shows a spinner and "Processing..." text) and fires `onPurchaseButtonClick`.
- The parent is responsible for resetting the component (e.g., navigating away on success or re-rendering on error).

## SDK Services and Cart Fields

CartOverview does not call any SDK services directly. It reads the following fields from the `Cart` object passed via props:

| Cart field | Used for |
|---|---|
| `cart.invoiceAddress` | Displays the billing address (company, name, street, postal code, city, country, email) |
| `cart.deliveryAddress` | Displays the shipping address (same fields as invoice address) |
| `cart.paymentData.method` | Shows the selected payment method name |
| `cart.postageData.carrier` | Shows the selected shipping carrier name |
| `cart.postageData.requestDate` | Shows the requested delivery date, formatted via `toLocaleDateString()` |

The `graphqlClient` prop is accepted for interface consistency with other components but is not used internally by CartOverview itself. The parent page is responsible for populating the `Cart` object with address and payment/postage data before passing it in.

### Related Cart types

```ts
import { Cart, CartAddress, GraphQLClient } from 'propeller-sdk-v2';
```

- **`CartAddress`** — Contains `company`, `firstName`, `middleName`, `lastName`, `street`, `number`, `numberExtension`, `postalCode`, `city`, `country`, `email`
- **`cart.paymentData`** — Contains `method` (string)
- **`cart.postageData`** — Contains `carrier` (string), `requestDate` (date string)
