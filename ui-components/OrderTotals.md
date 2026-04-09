import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# OrderTotals

A display-only financial summary for orders and quotations. Renders subtotal, discounts, shipping costs, transaction costs, VAT breakdowns, and the grand total. Each row can be toggled on or off, and all labels and price formatting are fully customizable.

The component handles presentation only -- it does not perform any API calls, mutations, or side effects.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### All defaults

```tsx
import OrderTotals from '@/components/propeller/OrderTotals';

<OrderTotals order={order} />
```

### Minimal summary (hide VAT details)

```tsx
<OrderTotals
  order={order}
  showVATs={false}
  showTotalVat={false}
  showTotalExclVat={false}
/>
```

### Custom labels (Dutch)

```tsx
<OrderTotals
  order={quote}
  labels={{
    subtotal: 'Subtotaal:',
    discount: 'Korting:',
    subtotalWithDiscount: 'Subtotaal met korting:',
    transactionCosts: 'Transactiekosten:',
    shippingCosts: 'Verzendkosten:',
    totalExclVat: 'Totaal excl. BTW:',
    vat: 'BTW',
    totalVat: 'Totaal BTW:',
    total: 'Totaal:',
  }}
/>
```

### Custom price formatting

```tsx
<OrderTotals
  order={order}
  formatPrice={(price) => `$ ${price.toFixed(2)}`}
/>
```

### Quote detail page (real-world example)

```tsx
<OrderTotals
  order={quote}
  title="Quote summary"
  showShippingCosts={false}
  labels={{
    subtotal: 'Subtotal:',
    discount: 'Discount:',
    total: 'Quote total:',
  }}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom order totals component, you need:

1. **Accept an `Order` prop** -- the component is stateless; all data comes from the order object.

2. **Read totals from `order.total`** -- `gross` for the pre-VAT amount, `net` for the final amount including VAT, `taxPercentages` for the VAT breakdown.

3. **Check discount presence** -- only show the discount row when `discountType !== 'N'` and `discountValue > 0`. Format the display value based on whether the type is `A` (format as currency) or `P` (append `%`).

4. **Check costs presence** -- shipping (`order.postageData.gross > 0`) and transaction costs (`order.paymentData.gross > 0`) should only appear when they have a value.

5. **Compute total VAT** -- sum up `total` from each entry in `order.total.taxPercentages` that has both `percentage > 0` and `total > 0`.

6. **Format prices consistently** -- use a single formatting function for all monetary values so currency symbol and decimal handling are uniform.

### Example skeleton

```tsx
function CustomOrderTotals({ order }: { order: Order }) {
  const total = order.total;
  const hasDiscount = total.discountType !== 'N' && total.discountValue > 0;

  return (
    <div>
      <Row label="Subtotal" value={total.gross} />
      {hasDiscount && <DiscountRow type={total.discountType} value={total.discountValue} />}
      {order.postageData?.gross > 0 && <Row label="Shipping" value={order.postageData.gross} />}
      {order.paymentData?.gross > 0 && <Row label="Transaction" value={order.paymentData.gross} />}
      <Row label="Total excl. VAT" value={total.gross} />
      {total.taxPercentages?.map((tax) => (
        <Row key={tax.percentage} label={`${tax.percentage}% VAT`} value={tax.total} />
      ))}
      <Row label="Total" value={total.net} bold />
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
|---|---|---|---|---|
| `order` | `Order` | Yes | -- | The order or quote object to display totals for |

### Display toggles

All toggles default to `true`. The grand total row is always visible and cannot be hidden.

| Prop | Type | Default | Description |
|---|---|---|---|
| `showSubtotal` | `boolean` | `true` | Show the subtotal row |
| `showDiscount` | `boolean` | `true` | Show discount row (only renders when the order actually has a discount) |
| `showShippingCosts` | `boolean` | `true` | Show shipping costs (only renders when shipping costs are present) |
| `showVATs` | `boolean` | `true` | Show individual VAT rate rows |
| `showTotalExclVat` | `boolean` | `true` | Show total excluding VAT |
| `showTotalVat` | `boolean` | `true` | Show total VAT amount |

### Customization

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `'Order summary'` | Block title (not currently rendered in the template but available for wrapper use) |
| `labels` | `Record<string, string>` | See table below | Override any row label |
| `formatPrice` | `(price: number) => string` | ``(p) => `€${p.toFixed(2)}` `` | Custom price formatter applied to every monetary value |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function renderOrderTotals(options: {
  order: Order;
  formatPrice?: (price: number) => string;
}): void
```

The component is display-only. It reads from the `Order` object that the parent fetches (typically via `OrderService`).

### Options table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `order` | `Order` | required | `order` prop |
| `formatPrice` | `(price: number) => string` | ``€${p.toFixed(2)}`` | `formatPrice` prop |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `title` — block title
- `showSubtotal` — toggle subtotal row
- `showDiscount` — toggle discount row
- `showShippingCosts` — toggle shipping costs row
- `showVATs` — toggle individual VAT rate rows
- `showTotalExclVat` — toggle total excluding VAT row
- `showTotalVat` — toggle total VAT row
- `labels` — UI string overrides

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default value | Where it appears |
|---|---|---|
| `subtotal` | `Subtotal:` | Subtotal row |
| `discount` | `Discount:` | Discount row |
| `subtotalWithDiscount` | `Subtotal with discount:` | Subtotal-after-discount row |
| `transactionCosts` | `Transaction costs:` | Transaction/payment costs row |
| `shippingCosts` | `Shipping costs:` | Shipping/postage costs row |
| `totalExclVat` | `Total excl. VAT:` | Total excluding VAT row |
| `vat` | `VAT` | Each VAT rate row (rendered as `{percentage}% VAT:`) |
| `totalVat` | `Total VAT:` | Summed VAT row |
| `total` | `Total:` | Grand total row |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  subtotal: 'Subtotal:',
  discount: 'Discount:',
  subtotalWithDiscount: 'Subtotal with discount:',
  transactionCosts: 'Transaction costs:',
  shippingCosts: 'Shipping costs:',
  totalExclVat: 'Total excl. VAT:',
  vat: 'VAT',
  totalVat: 'Total VAT:',
  total: 'Total:',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## SDK Services

OrderTotals is a pure display component -- it does not call any SDK service. It reads from the `Order` object that the parent fetches (typically via `OrderService`).

### Order type fields used

| Field | Type | Description |
|---|---|---|
| `order.total.gross` | `number` | Subtotal and total excluding VAT |
| `order.total.net` | `number` | Grand total including VAT |
| `order.total.discountType` | `OrderDiscountType` | Discount kind: `A` = absolute amount, `P` = percentage, `N` = none |
| `order.total.discountValue` | `number` | The raw discount value (currency amount for `A`, percentage number for `P`) |
| `order.total.taxPercentages` | `Array<{ percentage: number; total: number }>` | Per-rate VAT breakdown |
| `order.postageData.gross` | `number` | Shipping costs (excl. VAT) |
| `order.paymentData.gross` | `number` | Transaction/payment costs (excl. VAT) |

### OrderDiscountType enum

Accessed via `Enums.OrderDiscountType`:

| Value | Meaning | Display format |
|---|---|---|
| `A` | Absolute amount | `-€{discountValue}` (formatted through `formatPrice`) |
| `P` | Percentage | `- {discountValue}%` |
| `N` | No discount | Row is hidden entirely |

---

## Behavior

### Discount display

- The discount row only appears when **both** `showDiscount` is `true` **and** the order has an active discount (`discountType` is not `N` and `discountValue > 0`).
- When a discount is present, an additional "subtotal with discount" row appears directly below it, showing `gross - discountValue`.
- Absolute discounts (`A`) are formatted through `formatPrice` with a leading `-` sign.
- Percentage discounts (`P`) display as `- {value}%` without currency formatting.

### VAT breakdown

- Each entry in `order.total.taxPercentages` with a non-zero `percentage` and `total` renders as its own row (e.g., "21% VAT: ...").
- The "Total VAT" row sums all qualifying tax entries.
- Zero-rate or zero-total tax entries are filtered out automatically.

### Price formatting

- The default formatter outputs prices as `€{value}` with two decimal places (e.g., `€12.50`).
- Passing a `formatPrice` function overrides formatting for every monetary value in the component -- subtotal, discount amounts, shipping, transaction costs, VAT, and totals.
- Null or undefined prices are treated as `0`.

### Transaction costs

- Transaction costs always render when `order.paymentData.gross > 0`. There is no toggle prop for this row because transaction costs are considered a mandatory line item.

### Grand total

- The grand total row (`order.total.net`) is always visible and cannot be hidden by any prop. It renders with bold styling and a top border to visually separate it from the other rows.
