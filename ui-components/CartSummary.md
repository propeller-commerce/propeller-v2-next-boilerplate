# CartSummary

The CartSummary component displays a structured overview of the shopping cart totals, including subtotal, discounts, shipping costs, VAT breakdowns, and final totals. It is driven by the provided cart object and supports granular control over which totals are displayed.

The component can optionally include a checkout button, with a callback handler to trigger navigation or custom checkout logic. It focuses purely on presenting calculated cart data while leaving checkout flow management to the parent application.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `cart` | `Cart` | Yes | — | The shopping cart used to populate the cart summary data |
| `title` | `string` | No | `'Order summary'` | Cart summary block title |
| `labels` | `Record<string, string>` | No | `{}` | Labels for the component |
| `showSubtotal` | `boolean` | No | `true` | Display the subtotal of the shopping cart |
| `showDiscount` | `boolean` | No | `true` | Display the total discount of the shopping cart |
| `showShippingCosts` | `boolean` | No | `true` | Display the shipping costs of the shopping cart |
| `showVATs` | `boolean` | No | `true` | Display all VATs of the shopping cart |
| `showTotalExclVat` | `boolean` | No | `true` | Display the total of the shopping cart excluding the VAT |
| `showTotalVat` | `boolean` | No | `true` | Display the total VAT of the shopping cart |
| `showCheckoutButton` | `boolean` | No | `true` | Display the checkout button |
| `onCheckoutButtonClick` | `(cart: Cart) => void` | No | — | Action handler when the checkout button is clicked |
| `formatPrice` | `(price: number) => string` | No | `€X.XX` | Custom price formatting function |

## Labels

Available label keys with their defaults:

| Key | Default |
|-----|---------|
| `subtotal` | `Subtotal:` |
| `discount` | `Discount:` |
| `shippingCosts` | `Shipping costs:` |
| `totalExclVat` | `Total excl. VAT:` |
| `vat` | `VAT` |
| `totalVat` | `Total VAT:` |
| `total` | `Total:` |
| `checkoutButton` | `Continue to Checkout` |

## Usage

```tsx
import CartSummary from '@/components/propeller/CartSummary';

// Basic usage with checkout button
<CartSummary
  cart={cart}
  onCheckoutButtonClick={(cart) => router.push('/checkout')}
/>

// Without checkout button (read-only summary)
<CartSummary
  cart={cart}
  showCheckoutButton={false}
/>

// Minimal summary (total only)
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

## Cart Data Mapping

The component reads from the `Cart` object:

- `cart.total.subTotal` — subtotal
- `cart.total.discount` — discount amount
- `cart.total.totalGross` — total excluding VAT
- `cart.total.totalNet` — total including VAT
- `cart.postageData.price` — shipping costs
- `cart.taxLevels[]` — VAT breakdown (each with `taxPercentage` and `price`)
