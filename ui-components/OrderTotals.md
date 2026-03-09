# OrderTotals

The OrderTotals component displays a structured financial summary of an order or quotation, including subtotal, discounts, shipping costs, VAT breakdowns, and totals. It is driven by the provided order data and supports configurable visibility for each summary element along with customizable labels.

The component is responsible solely for presenting calculated totals while leaving payment, checkout, or approval flows to the parent application.

## Source Files

- **Mitosis source**: `ui-components/OrderTotals.lite.tsx`
- **Compiled React**: `output/react/ui-components/OrderTotals.tsx`
- **Active app copy**: `components/propeller/OrderTotals.tsx`
- **Compiled Vue**: `output/vue/ui-components/OrderTotals.vue`

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `order` | `Order` | Yes | — | The order/quote used to populate the summary data |
| `title` | `string` | No | `'Order summary'` | Order summary block title |
| `labels` | `Record<string, string>` | No | `{}` | Labels for the component (see Labels section) |
| `showSubtotal` | `boolean` | No | `true` | Display the subtotal of the order/quote |
| `showDiscount` | `boolean` | No | `true` | Display the total discount of the order/quote |
| `showShippingCosts` | `boolean` | No | `true` | Display the shipping costs of the order/quote |
| `showVATs` | `boolean` | No | `true` | Display all VATs of the order/quote |
| `showTotalExclVat` | `boolean` | No | `true` | Display the total of the order/quote excluding the VAT |
| `showTotalVat` | `boolean` | No | `true` | Display the total VAT of the order/quote |
| `formatPrice` | `(price: number) => string` | No | `€{price.toFixed(2)}` | Custom price formatting function |

## Labels

The `labels` prop accepts a `Record<string, string>` with the following keys:

| Key | Default | Description |
|---|---|---|
| `subtotal` | `Subtotal:` | Subtotal row label |
| `discount` | `Discount:` | Discount row label |
| `subtotalWithDiscount` | `Subtotal with discount:` | Subtotal after discount row label |
| `transactionCosts` | `Transaction costs:` | Transaction/payment costs row label |
| `shippingCosts` | `Shipping costs:` | Shipping/postage costs row label |
| `totalExclVat` | `Total excl. VAT:` | Total excluding VAT row label |
| `vat` | `VAT` | VAT label (used in `{percentage}% VAT:`) |
| `totalVat` | `Total VAT:` | Total VAT row label |
| `total` | `Total:` | Grand total row label |

## Usage

### Basic usage (all defaults)

```tsx
import OrderTotals from '@/components/propeller/OrderTotals';

<OrderTotals order={order} />
```

### With custom labels (Dutch)

```tsx
<OrderTotals
  order={quote}
  labels={{
    subtotal: 'Subtotaal:',
    discount: 'Korting:',
    subtotalWithDiscount: 'Subtotaal met korting:',
    shippingCosts: 'Verzendkosten:',
    totalExclVat: 'Totaal excl. BTW:',
    vat: 'BTW',
    totalVat: 'Totaal BTW:',
    total: 'Totaal:',
  }}
/>
```

### Minimal summary (no VAT breakdown)

```tsx
<OrderTotals
  order={order}
  showVATs={false}
  showTotalVat={false}
  showTotalExclVat={false}
/>
```

## Rendering

The component renders a single `<div>` with the following rows (each conditionally visible):

1. **Subtotal** — `order.total.gross`
2. **Discount** — shown only when `discountType` is not `N` and `discountValue > 0`
   - Amount discount (`A`): `-€{value}`
   - Percentage discount (`P`): `- {value}%`
   - Followed by subtotal with discount row
3. **Transaction costs** — shown when `order.paymentData.gross > 0` (always visible, not toggleable)
4. **Shipping costs** — `order.postageData.gross`
5. **Total excl. VAT** — `order.total.gross`
6. **VAT rows** — one per `taxPercentages` entry with `percentage > 0` and `total > 0`
7. **Total VAT** — sum of all VAT entries
8. **Grand total** — `order.total.net` (always visible)

## Data Resolution

- **Subtotal / Total excl. VAT**: `order.total.gross`
- **Discount type**: `order.total.discountType` (enum: `N` = none, `A` = amount, `P` = percentage)
- **Discount value**: `order.total.discountValue`
- **Transaction costs**: `order.paymentData.gross`
- **Shipping costs**: `order.postageData.gross`
- **VAT breakdown**: `order.total.taxPercentages[]` (each has `percentage` and `total`)
- **Grand total**: `order.total.net`

## Notes

- The grand total row is always visible and cannot be hidden
- Transaction costs are always shown when present (no toggle prop) since they are a mandatory cost
- Discount visibility depends on both the `showDiscount` prop AND the order having an actual discount
- Shipping costs visibility depends on both the `showShippingCosts` prop AND the order having shipping costs
