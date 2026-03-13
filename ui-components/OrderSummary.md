# OrderSummary

Displays a complete order overview including order metadata (number, date, status), invoice and delivery addresses, and payment/carrier/delivery date info. Mirrors the CartOverview layout but reads from an Order object instead of a Cart.

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `order` | `any` | Yes | — | The order object from propeller-sdk-v2 |
| `orderSummaryContainerClass` | `string` | No | `'order-summary'` | CSS class for the container |
| `title` | `string` | No | `''` | Title above the summary |
| `showOrderNumber` | `boolean` | No | `true` | Show the order number |
| `showOrderDate` | `boolean` | No | `true` | Show the order date |
| `showOrderStatus` | `boolean` | No | `true` | Show the order status badge |
| `showInvoiceAddress` | `boolean` | No | `true` | Show the invoice address |
| `showDeliveryAddress` | `boolean` | No | `true` | Show the delivery address |
| `showDeliveryInfo` | `boolean` | No | `true` | Show payment, carrier, and delivery date info |
| `showRemarks` | `boolean` | No | `true` | Show order remarks and reference |
| `formatDate` | `(dateString: string) => string` | No | locale `en-US` | Custom date formatting |
| `labels` | `Record<string, string>` | No | — | Label overrides (see below) |

### Label keys

`orderNumber`, `orderDate`, `status`, `invoiceAddress`, `deliveryAddress`, `payment`, `carrier`, `deliveryDate`, `reference`, `remarks`

## Usage

```tsx
import OrderSummary from '@/components/propeller/OrderSummary';

// Full order summary
<OrderSummary
  order={order}
  title="Order Summary"
/>

// Without addresses (e.g. when shown separately)
<OrderSummary
  order={order}
  showInvoiceAddress={false}
  showDeliveryAddress={false}
/>
```

## Order Data Mapping

The component reads from the Order object (propeller-sdk-v2):

- `order.id` — order number
- `order.createdAt` — order date
- `order.status` — order status
- `order.addresses[]` — finds invoice/delivery by `type` field
- `order.paymentData.method` — payment method
- `order.postageData.carrier` — carrier name
- `order.postageData.requestDate` — delivery date
- `order.reference` — order reference
- `order.remarks` — order remarks/notes

## Files

- **Mitosis source**: `ui-components/OrderSummary.lite.tsx`
- **Compiled React**: `output/react/ui-components/OrderSummary.tsx`
- **Active copy**: `components/propeller/OrderSummary.tsx`
