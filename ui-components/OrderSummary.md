import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# OrderSummary

Displays a complete order overview including order metadata (number, date, status, total), invoice and delivery addresses, payment/carrier/delivery information, and order remarks. Designed for order detail and order confirmation pages.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Full order summary with all sections visible (default)

```tsx
import OrderSummary from '@/components/propeller/OrderSummary';

<OrderSummary order={order} title="Order Summary" />
```

### Minimal view — metadata only, no addresses or delivery info

```tsx
<OrderSummary
  order={order}
  title="Order #12345"
  showInvoiceAddress={false}
  showDeliveryAddress={false}
  showDeliveryInfo={false}
  showRemarks={false}
/>
```

### Custom price and date formatting with Dutch labels

```tsx
<OrderSummary
  order={order}
  formatPrice={(price) => `€ ${price.toFixed(2).replace('.', ',')}`}
  formatDate={(dateStr) =>
    new Date(dateStr).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }
  labels={{
    orderNumber: 'Bestelnummer',
    orderDate: 'Besteldatum',
    status: 'Status',
    total: 'Totaal',
    invoiceAddress: 'Factuuradres',
    deliveryAddress: 'Afleveradres',
    payment: 'Betaling:',
    carrier: 'Vervoerder:',
    deliveryDate: 'Leverdatum:',
    reference: 'Referentie:',
    remarks: 'Opmerkingen:',
  }}
/>
```

### With country code resolution

```tsx
import { countries } from '@/data/countries';

<OrderSummary
  order={order}
  countries={countries}
/>
```

### Quote detail — hide total (shown separately via OrderTotals)

```tsx
<OrderSummary
  order={quote}
  title="Quote Details"
  showOrderTotal={false}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom order summary that fits your design system:

1. **Fetch the order** using `OrderService.getOrder({ id: orderId })` from the Propeller SDK.

2. **Extract addresses** by filtering `order.addresses` on the `type` field:
   ```tsx
   const invoiceAddress = order.addresses?.find(a => a.type === 'invoice');
   const deliveryAddress = order.addresses?.find(a => a.type === 'delivery');
   ```

3. **Read the total** from `order.total.net` (includes VAT). For a full financial breakdown, pair with the `OrderTotals` component.

4. **Read delivery info** from `order.paymentData.method`, `order.postageData.carrier`, and `order.postageData.requestDate`.

5. **Format prices and dates** consistently across your app by passing shared formatter functions.

6. **Resolve country codes** by passing a country list. The `@/data/countries` module provides a ready-made list of `{ code, name }` objects.

### Minimal example

```ts
// Fetch the order (using OrderService documented in SDK Services)
// const order = await orderService.getOrder({ id: orderId });

const invoiceAddress = order.addresses?.find(a => a.type === 'invoice');
const deliveryAddress = order.addresses?.find(a => a.type === 'delivery');

const orderTotal = order.total?.net ?? 0;
const formattedTotal = `€${orderTotal.toFixed(2)}`;

const orderDate = order.createdAt
  ? new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  : '';

const paymentMethod = order.paymentData?.method;
const carrier = order.postageData?.carrier;
const deliveryDate = order.postageData?.requestDate;
const reference = order.reference;
const remarks = order.remarks;

// Render these values in your custom layout
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Core

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `order` | `any` | Yes | -- | The order object from the Propeller SDK |
| `title` | `string` | No | -- | Heading rendered above the summary. Omit to hide. |
| `orderSummaryContainerClass` | `string` | No | `'order-summary'` | CSS class applied to the root container |

### Visibility Toggles

All default to `true`. Set to `false` to hide the corresponding section.

| Prop | Type | Controls |
|---|---|---|
| `showOrderNumber` | `boolean` | Order number in the metadata row |
| `showOrderDate` | `boolean` | Order date in the metadata row |
| `showOrderStatus` | `boolean` | Status badge in the metadata row |
| `showOrderTotal` | `boolean` | Total price in the metadata row |
| `showInvoiceAddress` | `boolean` | Invoice address block |
| `showDeliveryAddress` | `boolean` | Delivery address block |
| `showDeliveryInfo` | `boolean` | Payment method, carrier, and delivery date panel |
| `showRemarks` | `boolean` | Reference and remarks panel |

### Formatting and Localization

| Prop | Type | Default | Description |
|---|---|---|---|
| `formatPrice` | `(price: number) => string` | Formats as `€X.XX` | Custom price formatter for the order total |
| `formatDate` | `(dateString: string) => string` | `en-US` long date (e.g., "March 25, 2026") | Custom date formatter for order date and delivery date |
| `labels` | `Record<string, string>` | English defaults | Override any UI label (see Label Keys below) |
| `countries` | `{ code: string; name: string }[]` | `[]` | Country list for resolving ISO codes to display names. When omitted, raw country codes are shown. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function renderOrderSummary(options: {
  order: any;
  formatPrice?: (price: number) => string;
  formatDate?: (dateString: string) => string;
  countries?: { code: string; name: string }[];
}): void
```

The component is read-only. It receives an `Order` object (typically fetched via `OrderService.getOrder()`) and reads fields directly.

### Options table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `order` | `any` | required | `order` prop |
| `formatPrice` | `(price: number) => string` | `€X.XX` | `formatPrice` prop |
| `formatDate` | `(dateString: string) => string` | `en-US` long date | `formatDate` prop |
| `countries` | `{ code: string; name: string }[]` | `[]` | `countries` prop |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `title` — heading text above the summary
- `orderSummaryContainerClass` — CSS class on the root container
- `showOrderNumber` — toggle order number display
- `showOrderDate` — toggle order date display
- `showOrderStatus` — toggle status badge display
- `showOrderTotal` — toggle total price display
- `showInvoiceAddress` — toggle invoice address block
- `showDeliveryAddress` — toggle delivery address block
- `showDeliveryInfo` — toggle payment/carrier/delivery panel
- `showRemarks` — toggle reference and remarks panel
- `labels` — UI string overrides

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default Value |
|---|---|
| `orderNumber` | `"Order Number"` |
| `orderDate` | `"Order Date"` |
| `status` | `"Status"` |
| `total` | `"Total"` |
| `invoiceAddress` | `"Invoice Address"` |
| `deliveryAddress` | `"Delivery Address"` |
| `payment` | `"Payment:"` |
| `carrier` | `"Carrier:"` |
| `deliveryDate` | `"Delivery Date:"` |
| `reference` | `"Reference:"` |
| `remarks` | `"Remarks:"` |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  orderNumber: 'Order Number',
  orderDate: 'Order Date',
  status: 'Status',
  total: 'Total',
  invoiceAddress: 'Invoice Address',
  deliveryAddress: 'Delivery Address',
  payment: 'Payment:',
  carrier: 'Carrier:',
  deliveryDate: 'Delivery Date:',
  reference: 'Reference:',
  remarks: 'Remarks:',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## SDK Services

OrderSummary is a **read-only** component. It does not call any SDK services directly. It receives an `Order` object (typically fetched via `OrderService.getOrder()`) and reads the following fields:

### Order Fields

| Field Path | Type | Used For |
|---|---|---|
| `order.id` | `number` | Order number display |
| `order.createdAt` | `string` | Order date, formatted via `formatDate` |
| `order.status` | `string` | Status badge (e.g., `"NEW"`, `"CONFIRMED"`, `"QUOTATION"`) |
| `order.total.net` | `number` | Order total, formatted via `formatPrice` |
| `order.reference` | `string` | Customer-provided reference |
| `order.remarks` | `string` | Customer-provided remarks/notes |

### Address Fields (from `order.addresses[]`)

The component filters `order.addresses` by `type` to find the invoice (`type === 'invoice'`) and delivery (`type === 'delivery'`) addresses. Each address object is expected to have:

| Field | Type | Notes |
|---|---|---|
| `company` | `string` | Shown first when present |
| `firstName` | `string` | Combined into a full name line |
| `middleName` | `string` | Combined into a full name line |
| `lastName` | `string` | Combined into a full name line |
| `street` | `string` | Combined with number into a street line |
| `number` | `string` | House/building number |
| `numberExtension` | `string` | Optional number suffix |
| `postalCode` | `string` | Combined with city |
| `city` | `string` | Combined with postal code |
| `country` | `string` | ISO country code, resolved via `countries` prop |
| `email` | `string` | Shown in muted text below the address |

### Payment and Delivery Fields

| Field Path | Type | Used For |
|---|---|---|
| `order.paymentData.method` | `string` | Payment method name |
| `order.postageData.carrier` | `string` | Carrier/shipping provider name |
| `order.postageData.requestDate` | `string` | Requested delivery date, formatted via `formatDate` |

---

## Behavior

- **Layout**: The component renders in four visual sections stacked vertically:
  1. **Metadata row** -- a responsive grid (1 column on mobile, up to 4 on desktop) showing order number, date, status badge, and total.
  2. **Addresses** -- a two-column grid with invoice and delivery addresses side by side.
  3. **Delivery info panel** -- a bordered card showing payment method, carrier, and delivery date as key-value rows. Only rendered when at least one of the three values is present.
  4. **Remarks panel** -- a bordered card showing reference and remarks as key-value rows. Only rendered when at least one of the two values is present.

- **Conditional rendering**: Each section is independently controlled by its visibility prop. Within sections, individual fields are hidden when their data is empty or missing from the order object. The delivery info and remarks panels are fully hidden when all their child values are empty, even if the visibility prop is `true`.

- **Date formatting**: Falls back to `en-US` long format (`toLocaleDateString`) when no `formatDate` prop is provided. If parsing fails, the raw date string is returned as-is.

- **Price formatting**: Falls back to `€` prefix with two decimal places when no `formatPrice` prop is provided. Treats `null`/`undefined` prices as `0`.

- **Country resolution**: When the `countries` prop is provided, ISO country codes in addresses are resolved to full country names. When omitted or when no match is found, the raw code is displayed.

- **Status badge**: The order status is rendered as a pill-shaped badge with `bg-secondary/10` and `text-secondary` styling.
