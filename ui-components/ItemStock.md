# ItemStock

The ItemStock component displays product stock status and availability as color-coded badges. It reads from a `ProductInventory` object and renders up to two inline badges: an availability indicator (available / not available) and a stock level indicator (in stock / low stock / out of stock) with the exact quantity.

## Usage

### Default (both badges visible)

```tsx
import ItemStock from '@/components/propeller/ItemStock';

<ItemStock inventory={product.inventory} />
```

### Availability badge only (hide stock quantity)

```tsx
<ItemStock
  inventory={product.inventory}
  showStock={false}
/>
```

### Stock quantity only (hide availability badge)

```tsx
<ItemStock
  inventory={product.inventory}
  showAvailability={false}
/>
```

### With custom labels (localization)

```tsx
<ItemStock
  inventory={product.inventory}
  labels={{
    inStock: 'Op voorraad',
    outOfStock: 'Niet op voorraad',
    lowStock: 'Beperkte voorraad',
    available: 'Beschikbaar',
    notAvailable: 'Niet beschikbaar',
    pieces: 'stuks',
  }}
/>
```

### Inside a product card with extra styling

```tsx
<ItemStock
  inventory={product.inventory}
  className="mt-2"
/>
```

## Props

### Data

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `inventory` | `ProductInventory` | Yes | -- | Product inventory object that drives all stock calculations and display logic |

### Display toggles

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showAvailability` | `boolean` | `true` | Show the availability badge (Available / Not available) |
| `showStock` | `boolean` | `true` | Show the stock level badge with quantity |

### Customization

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `labels` | `Record<string, string>` | See labels table below | Override any display label |
| `className` | `string` | `''` | Extra CSS class applied to the root wrapper element |

## Labels

All text labels can be overridden via the `labels` prop. Pass a `Record<string, string>` with any of these keys:

| Key | Default value | Used in |
|-----|---------------|---------|
| `inStock` | `In stock` | Stock badge when quantity > 5 |
| `outOfStock` | `Out of stock` | Stock badge when quantity is 0 |
| `lowStock` | `Low stock` | Stock badge when quantity is 1--5 |
| `available` | `Available` | Availability badge when quantity > 0 |
| `notAvailable` | `Not available` | Availability badge when quantity is 0 |
| `pieces` | `pcs` | Unit label shown in parentheses after the stock quantity |

## SDK Services

ItemStock is a display-only component -- it does not call any SDK services itself. It receives a `ProductInventory` object as a prop and reads the following field:

### ProductInventory fields used

| Field | Type | Purpose |
|-------|------|---------|
| `inventory.totalQuantity` | `number` | The total available stock quantity across all warehouses. Drives both the availability check and the stock level classification. |

The `ProductInventory` type is imported from `propeller-sdk-v2`. When fetching product data, ensure the `inventory` field with `totalQuantity` is included in your query.

### GraphQL query example

To fetch inventory data alongside a product:

```graphql
query Product($productId: Int!) {
  product(id: $productId) {
    productId
    name {
      value
    }
    inventory {
      totalQuantity
    }
  }
}
```

Or when fetching products within a category:

```graphql
query Products($categoryId: Int!, $offset: Int, $limit: Int) {
  products(categoryId: $categoryId, offset: $offset, limit: $limit) {
    items {
      productId
      name {
        value
      }
      inventory {
        totalQuantity
      }
    }
  }
}
```

## Behavior

### Rendering guard

The component renders nothing when:
- The `inventory` prop is falsy (null or undefined)
- `totalQuantity` is undefined or null (interpreted as "no inventory data available")

When `totalQuantity` is 0 or a positive number, the component renders.

### Stock level classification

The stock quantity determines the status label and color coding:

| Quantity | Status label | Badge colors |
|----------|-------------|--------------|
| > 5 | In stock | Green text, green background, green border |
| 1 -- 5 | Low stock | Amber text, amber background, amber border |
| 0 | Out of stock | Red text, red background, red border |

When the quantity is greater than 0, the exact count is shown in parentheses after the status label (e.g., "In stock (42 pcs)"). When the quantity is 0, only the "Out of stock" label is shown without a count.

### Availability display

The availability badge shows a simple binary state:

| Condition | Label | Dot color | Badge colors |
|-----------|-------|-----------|--------------|
| Quantity > 0 | Available | Green dot | Green text, green background, green border |
| Quantity = 0 | Not available | Red dot | Red text, red background, red border |

The availability dot is a small circular indicator rendered inline before the label text.

### Layout

The component renders as a horizontal flex container with `flex-wrap` enabled. The two badges (availability and stock) sit side by side and wrap to the next line on narrow containers. Each badge is a rounded pill (`rounded-full`) with a small border, compact padding, and 11px font size.

## Building Your Own

A standalone implementation that reads from the same `ProductInventory` shape:

```tsx
import { ProductInventory } from 'propeller-sdk-v2';

function SimpleItemStock({ inventory }: { inventory: ProductInventory }) {
  const qty = inventory?.totalQuantity;

  if (qty === undefined || qty === null) return null;

  const isAvailable = qty > 0;
  const statusLabel =
    qty === 0 ? 'Out of stock' : qty <= 5 ? 'Low stock' : 'In stock';
  const statusColor =
    qty === 0 ? 'red' : qty <= 5 ? 'orange' : 'green';

  return (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      {/* Availability */}
      <span style={{ color: isAvailable ? 'green' : 'red' }}>
        {isAvailable ? 'Available' : 'Not available'}
      </span>

      {/* Stock level */}
      <span style={{ color: statusColor }}>
        {statusLabel}
        {qty > 0 && ` (${qty} pcs)`}
      </span>
    </div>
  );
}
```
