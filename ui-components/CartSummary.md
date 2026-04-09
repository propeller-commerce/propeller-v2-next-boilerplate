import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# CartSummary

Displays a structured overview of shopping cart totals: subtotal, discounts, shipping costs, VAT breakdowns, and the final total. Receives a `Cart` object as a prop and renders each line item with granular visibility controls. An optional checkout button can trigger navigation or custom checkout logic.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic summary with checkout button

```tsx
import CartSummary from '@/components/propeller/CartSummary';

<CartSummary
  cart={cart}
  onCheckoutButtonClick={(cart) => router.push('/checkout')}
/>
```

### With checkout button and custom title

```tsx
<CartSummary
  cart={cart}
  title="Your Order"
  onCheckoutButtonClick={(cart) => router.push('/checkout')}
/>
```

### Read-only summary (no checkout button)

```tsx
<CartSummary
  cart={cart}
  showCheckoutButton={false}
/>
```

### Minimal summary (total only)

```tsx
<CartSummary
  cart={cart}
  showSubtotal={false}
  showDiscount={false}
  showShippingCosts={false}
  showVATs={false}
  showTotalExclVat={false}
  showTotalVat={false}
  showCheckoutButton={false}
/>
```

### Custom labels and price formatting

```tsx
<CartSummary
  cart={cart}
  labels={{
    subtotal: 'Subtotaal:',
    discount: 'Korting:',
    shippingCosts: 'Verzendkosten:',
    totalExclVat: 'Totaal excl. BTW:',
    vat: 'BTW',
    totalVat: 'Totaal BTW:',
    total: 'Totaal:',
    checkoutButton: 'Afrekenen',
  }}
  formatPrice={(price) => `$ ${price.toFixed(2)}`}
  onCheckoutButtonClick={(cart) => router.push('/checkout')}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

A standalone implementation that reads from the same `Cart` shape:

```tsx
import { Cart } from 'propeller-sdk-v2';

function SimpleCartSummary({ cart }: { cart: Cart }) {
  const fmt = (n: number) => `€${(n || 0).toFixed(2)}`;

  const subtotal = cart?.total?.subTotal || 0;
  const discount = cart?.total?.discount || 0;
  const shipping = Number(cart?.postageData?.price || 0);
  const totalExclVat = cart?.total?.totalGross || 0;
  const totalInclVat = cart?.total?.totalNet || 0;
  const totalVat = totalInclVat - totalExclVat;
  const taxLevels = (cart?.taxLevels || []).filter(
    (t) => t.taxPercentage > 0 && t.price > 0
  );

  return (
    <div>
      <h2>Order Summary</h2>

      <div>Subtotal: {fmt(subtotal)}</div>

      {discount > 0 && <div>Discount: -{fmt(discount)}</div>}

      {shipping > 0 && <div>Shipping: {fmt(shipping)}</div>}

      <div>Total excl. VAT: {fmt(totalExclVat)}</div>

      {taxLevels.map((tax, i) => (
        <div key={i}>
          {tax.taxPercentage}% VAT: {fmt(Number(tax.price))}
        </div>
      ))}

      {totalVat > 0 && <div>Total VAT: {fmt(totalVat)}</div>}

      <div><strong>Total: {fmt(totalInclVat)}</strong></div>
    </div>
  );
}
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Data

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `cart` | `Cart` | Yes | -- | The shopping cart object used to populate all summary data |

### Display toggles

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showSubtotal` | `boolean` | `true` | Show the subtotal row |
| `showDiscount` | `boolean` | `true` | Show the discount row (only visible when a discount exists) |
| `showShippingCosts` | `boolean` | `true` | Show the shipping costs row (only visible when shipping costs exist) |
| `showVATs` | `boolean` | `true` | Show individual VAT level rows |
| `showTotalExclVat` | `boolean` | `true` | Show the total excluding VAT row |
| `showTotalVat` | `boolean` | `true` | Show the combined total VAT row |
| `showCheckoutButton` | `boolean` | `true` | Show the checkout button |

### Customization

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | `'Order summary'` | Heading text above the summary |
| `labels` | `Record<string, string>` | See labels table below | Override any display label |
| `formatPrice` | `(price: number) => string` | Formats as `€X.XX` | Custom price formatting function |

### Callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onCheckoutButtonClick` | `(cart: Cart) => void` | Called when the checkout button is clicked. Receives the current cart object. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function cartSummary(cart: Cart): void
```

### Options

| Field | Type | Default | Maps to |
|---|---|---|---|
| `cart` | `Cart` | — | `cart` prop |
| `title` | `string` | `'Order summary'` | `title` prop |
| `showSubtotal` | `boolean` | `true` | `showSubtotal` prop |
| `showDiscount` | `boolean` | `true` | `showDiscount` prop |
| `showShippingCosts` | `boolean` | `true` | `showShippingCosts` prop |
| `showVATs` | `boolean` | `true` | `showVATs` prop |
| `showTotalExclVat` | `boolean` | `true` | `showTotalExclVat` prop |
| `showTotalVat` | `boolean` | `true` | `showTotalVat` prop |
| `showCheckoutButton` | `boolean` | `true` | `showCheckoutButton` prop |
| `formatPrice` | `(price: number) => string` | `€X.XX` | `formatPrice` prop |

### Cart resolution

| Field | Type | Purpose |
|-------|------|---------|
| `cart.total.subTotal` | `number` | Line items subtotal before discounts |
| `cart.total.discount` | `number` | Total discount amount applied to the cart |
| `cart.total.totalGross` | `number` | Cart total excluding VAT |
| `cart.total.totalNet` | `number` | Cart total including VAT (the final price) |
| `cart.postageData.price` | `number` | Shipping / postage costs |
| `cart.taxLevels` | `Array<{ taxPercentage: number; price: number }>` | Individual VAT rates and their amounts |

The total VAT amount is computed as `totalNet - totalGross` (not read from a single field).

### Callbacks

| Callback | Signature | Description |
|---|---|---|
| `onCheckoutButtonClick` | `(cart: Cart) => void` | Called when the checkout button is clicked |

### UI-only props

The following props only affect visual presentation and have no BYO equivalent: `title`.

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

All text labels can be overridden via the `labels` prop. Pass a `Record<string, string>` with any of these keys:

| Key | Default value |
|-----|---------------|
| `subtotal` | `Subtotal:` |
| `discount` | `Discount:` |
| `shippingCosts` | `Shipping costs:` |
| `totalExclVat` | `Total excl. VAT:` |
| `vat` | `VAT` |
| `totalVat` | `Total VAT:` |
| `total` | `Total:` |
| `checkoutButton` | `Continue to Checkout` |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const labels = {
  subtotal: "Subtotal:",
  discount: "Discount:",
  shippingCosts: "Shipping costs:",
  totalExclVat: "Total excl. VAT:",
  vat: "VAT",
  totalVat: "Total VAT:",
  total: "Total:",
  checkoutButton: "Continue to Checkout",
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Row visibility

Each summary row is controlled by its corresponding `show*` prop. All default to `true`.

- **Subtotal** -- always rendered when `showSubtotal` is `true`.
- **Discount** -- only rendered when `showDiscount` is `true` AND `cart.total.discount > 0`. The value is displayed with a leading minus sign.
- **Shipping costs** -- only rendered when `showShippingCosts` is `true` AND `cart.postageData.price > 0`.
- **Total excl. VAT** -- rendered when `showTotalExclVat` is `true`. Displayed with a top border to visually separate it from the rows above.
- **VAT breakdown** -- rendered when `showVATs` is `true` AND there are tax levels with both `taxPercentage > 0` and `price > 0`. Each level is shown as a separate row (e.g., "21% VAT: ...").
- **Total VAT** -- rendered when `showTotalVat` is `true` AND the computed total VAT is greater than zero.
- **Total (incl. VAT)** -- always rendered. This row cannot be hidden; it is the primary output of the component.
- **Checkout button** -- rendered when `showCheckoutButton` is `true`. Clicking it calls `onCheckoutButtonClick` with the current cart.

### Price formatting

By default, prices are formatted as `€X.XX` (euro sign followed by the number with two decimal places). Pass a `formatPrice` function to override this for any currency or locale.

### Layout

The component renders as a vertical stack of rows. Each row is a flex container with the label on the left and the formatted price on the right. The total row and the total-excl-VAT row include top borders for visual separation. The checkout button spans the full width below the total.

## SDK Services

CartSummary is a display-only component -- it does not call any SDK services itself. It receives a `Cart` object (from `propeller-sdk-v2`) as a prop and reads the following fields:

### Cart fields used

| Field | Type | Purpose |
|-------|------|---------|
| `cart.total.subTotal` | `number` | Line items subtotal before discounts |
| `cart.total.discount` | `number` | Total discount amount applied to the cart |
| `cart.total.totalGross` | `number` | Cart total excluding VAT |
| `cart.total.totalNet` | `number` | Cart total including VAT (the final price) |
| `cart.postageData.price` | `number` | Shipping / postage costs |
| `cart.taxLevels` | `Array<{ taxPercentage: number; price: number }>` | Individual VAT rates and their amounts |

The total VAT amount is computed as `totalNet - totalGross` (not read from a single field).
