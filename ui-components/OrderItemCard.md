import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# OrderItemCard

A display-only component that renders a single line item within an order or quotation table. It shows product details (image, name, SKU), quantity, pricing, discounts, and optional notes. Supports parent/child item grouping for bundled products.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic order detail table

```tsx
import OrderItemCard from '@/components/propeller/OrderItemCard';

<table className="w-full">
  <thead>
    <tr>
      <th>Product</th>
      <th>Quantity</th>
      <th>Price</th>
    </tr>
  </thead>
  {items.map((item) => (
    <OrderItemCard key={item.id} orderItem={item} />
  ))}
</table>
```

### With parent/child grouping and discounts (quotes page)

```tsx
import OrderItemCard from '@/components/propeller/OrderItemCard';

// Separate parent items from child items
const parentItems = allProducts.filter((item) => !item.parentOrderItemId);
const childMap = new Map();
allProducts
  .filter((item) => item.parentOrderItemId)
  .forEach((item) => {
    const children = childMap.get(item.parentOrderItemId) || [];
    children.push(item);
    childMap.set(item.parentOrderItemId, children);
  });

<table className="w-full">
  <thead>
    <tr>
      <th>Products</th>
      <th>Quantity</th>
      <th>Discount</th>
      <th>Price</th>
    </tr>
  </thead>
  {parentItems.map((item) => (
    <OrderItemCard
      key={item.id}
      orderItem={item}
      showDiscount={true}
      childItems={childMap.get(item.id) || []}
    />
  ))}
</table>
```

### Minimal display for surcharges or fee lines

```tsx
<OrderItemCard
  orderItem={feeItem}
  titleLinkable={false}
  showImage={false}
  showSku={false}
/>
```

### With custom price formatting

```tsx
<OrderItemCard
  orderItem={item}
  formatPrice={(price) => `$ ${price.toFixed(2)}`}
/>
```

### Non-linkable items (bonus items, promotions)

```tsx
<OrderItemCard orderItem={item} titleLinkable={false} />
```

### With notes and stock info visible

```tsx
<OrderItemCard
  orderItem={item}
  showItemNotes={true}
  showStockComponent={true}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To create a custom order item display:

1. Wrap your component in a `<tbody>` so it integrates with the parent `<table>`.
2. Read product details from `orderItem.product` with fallbacks to top-level `orderItem` fields (the product association may not always be populated).
3. Build the product URL from `productId` and `slug`: `/product/{productId}/{slug}`.
4. Handle child items by accepting a `childItems` array and rendering them as indented sub-rows.
5. Calculate discount percentage from `discount / originalPrice * 100` when both values are present.
6. Accept a `formatPrice` callback so consumers can control currency formatting.

### Basic order item rendering

```tsx
function CustomOrderItem({ orderItem, childItems = [] }) {
  const name = orderItem?.product?.names?.[0]?.value || orderItem?.name || 'Unknown';
  const sku = orderItem?.product?.sku || orderItem?.sku || '';
  const imageUrl = orderItem?.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
  const productId = orderItem?.product?.productId;
  const slug = orderItem?.product?.slugs?.[0]?.value;
  const productUrl = productId && slug ? `/product/${productId}/${slug}` : '';

  return (
    <tbody>
      <tr>
        <td>
          {productUrl ? <a href={productUrl}>{name}</a> : <span>{name}</span>}
          {sku && <p>SKU: {sku}</p>}
        </td>
        <td>{orderItem?.quantity}</td>
        <td>{orderItem?.priceTotal}</td>
      </tr>
      {childItems.map((child) => (
        <tr key={child.id || child.uuid}>
          <td style={{ paddingLeft: '2rem' }}>
            {child.product?.names?.[0]?.value || child.name}
          </td>
          <td>{child.quantity}</td>
          <td>{child.priceTotal}</td>
        </tr>
      ))}
    </tbody>
  );
}
```

### With discount display

```tsx
function CustomOrderItemWithDiscount({ orderItem, childItems = [], formatPrice }) {
  const name = orderItem?.product?.names?.[0]?.value || orderItem?.name || 'Unknown';
  const format = formatPrice || ((price: number) => `€${price.toFixed(2)}`);

  const discountAmount = orderItem?.discount;
  const originalPrice = orderItem?.originalPrice;
  const discountPercentage = discountAmount && originalPrice
    ? ((discountAmount / originalPrice) * 100).toFixed(2).replace('.', ',')
    : null;

  return (
    <tbody>
      <tr>
        <td>{name}</td>
        <td>{orderItem?.quantity}</td>
        <td>
          {discountAmount > 0 && (
            <span>{format(discountAmount)} ({discountPercentage}%)</span>
          )}
        </td>
        <td>{format(orderItem?.priceTotal)}</td>
      </tr>
      {childItems.map((child) => (
        <tr key={child.id || child.uuid}>
          <td style={{ paddingLeft: '2rem' }}>
            {child.product?.names?.[0]?.value || child.name}
          </td>
          <td>{child.quantity}</td>
          <td></td>
          <td>{format(child.priceTotal)}</td>
        </tr>
      ))}
    </tbody>
  );
}
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Core Data

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `orderItem` | `any` | Yes | -- | The order item object to display. See "Order Item Fields" below for expected shape. |
| `childItems` | `any[]` | No | `[]` | Child/bundled items rendered as indented sub-rows beneath the parent row. |

### Display Toggles

| Prop | Type | Default | Description |
|---|---|---|---|
| `titleLinkable` | `boolean` | `true` | Render the product name as a link to the product detail page. Falls back to plain text if the product has no `productId` or `slug`. |
| `showImage` | `boolean` | `true` | Show a 64x64 product thumbnail. Forced to `false` when `isChildItem` is `true`. |
| `showSku` | `boolean` | `true` | Show the SKU beneath the product name. Forced to `false` when `isChildItem` is `true`. |
| `showQuantity` | `boolean` | `true` | Show the quantity column. |
| `showPrice` | `boolean` | `true` | Show the total price column. |
| `showDiscount` | `boolean` | `false` | Show the discount column with amount and percentage. |
| `showItemNotes` | `boolean` | `false` | Show the item notes text beneath the product name. |
| `showStockComponent` | `boolean` | `false` | Show a stock info placeholder beneath the product name. |

### Rendering Mode

| Prop | Type | Default | Description |
|---|---|---|---|
| `isChildItem` | `boolean` | `false` | Render as an indented sub-item with smaller text, no image, and no SKU. Used internally when rendering child items, but can be set manually. |

### Formatting

| Prop | Type | Default | Description |
|---|---|---|---|
| `formatPrice` | `(price: number) => string` | Formats as `€{price.toFixed(2)}` | Custom price formatting function applied to all price values in the component. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function CustomOrderItem(options: {
  orderItem: any;
  childItems?: any[];
  formatPrice?: (price: number) => string;
}): void
```

The component is display-only and does not call any SDK services.

### Options table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `orderItem` | `any` | required | `orderItem` prop |
| `childItems` | `any[]` | `[]` | `childItems` prop |
| `formatPrice` | `(price: number) => string` | `€{price.toFixed(2)}` | `formatPrice` prop |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `titleLinkable` — whether the product name renders as a link
- `showImage` — show/hide the product thumbnail
- `showSku` — show/hide the SKU
- `showQuantity` — show/hide the quantity column
- `showPrice` — show/hide the price column
- `showDiscount` — show/hide the discount column
- `showItemNotes` — show/hide item notes
- `showStockComponent` — show/hide stock info placeholder
- `isChildItem` — render as an indented sub-item

  </TabItem>
</Tabs>

---

## Order Item Fields

This component is display-only and does not call any SDK services. It reads the following fields from the `orderItem` object (typically an `OrderItem` from the Propeller SDK):

### Product Information

| Field Path | Purpose |
|---|---|
| `orderItem.product.names[0].value` | Product display name (primary source) |
| `orderItem.name` | Product display name (fallback) |
| `orderItem.product.sku` | Product SKU (primary source) |
| `orderItem.sku` | Product SKU (fallback) |
| `orderItem.product.productId` | Used to build the product detail page URL |
| `orderItem.product.slugs[0].value` | Used to build the product detail page URL |
| `orderItem.product.media.images.items[0].imageVariants[0].url` | Product thumbnail URL |

### Pricing and Quantity

| Field Path | Purpose |
|---|---|
| `orderItem.quantity` | Item quantity |
| `orderItem.price` | Unit price |
| `orderItem.priceTotal` | Total price for the line (displayed in the price column) |
| `orderItem.discount` | Discount amount |
| `orderItem.originalPrice` | Original price before discount (used to calculate discount percentage) |

### Other

| Field Path | Purpose |
|---|---|
| `orderItem.notes` | Item-level notes (shown when `showItemNotes` is enabled) |
| `orderItem.parentOrderItemId` | Identifies child items -- items with this field set belong to a parent item |
| `orderItem.id` | Used as the React key when rendering |

Child items read a subset: `product.names[0].value`, `name`, `quantity`, `priceTotal`, `id`, and `uuid`.

---

## Behavior

### HTML Structure

The component renders a `<tbody>` element containing one or more `<tr>` rows. Because of this, it must be placed directly inside a `<table>` -- do not wrap it in another `<tbody>`.

### Child Items

Items with a `parentOrderItemId` are children belonging to a parent item. The parent page is responsible for:

1. Filtering parent items (those without `parentOrderItemId`)
2. Building a lookup of `parentId -> childItems[]`
3. Passing the children via the `childItems` prop on the parent's `OrderItemCard`

Child rows render with left indentation (`pl-28`), smaller text, no border, no image, and no discount. They share the parent's column visibility settings for quantity and price.

### Price Display

- The price column shows `priceTotal` (the line total), not the unit price.
- Default formatting is `€` followed by two decimal places (e.g., `€127.50`).
- Pass `formatPrice` to override formatting for all prices in the component (unit prices, totals, and discount amounts).

### Discount Display

When `showDiscount` is `true`:

- Shows the discount amount formatted by `formatPrice`, followed by the percentage in parentheses: e.g., `€127.50 (15,00%)`
- Percentage is calculated as `(discount / originalPrice) * 100`
- The percentage uses comma as decimal separator
- Rendered in orange text
- Empty cell when the item has no discount
- Child items never show discount values

### Image Handling

- Displays a 64x64 thumbnail from the first image variant of the first media image
- When no image URL is available, shows a gray placeholder with "No Img" text
- Images are hidden entirely when `showImage` is `false` or when rendering a child item
- The compiled React version uses Next.js `Image` and `Link` components instead of plain HTML tags

### Title Linking

- When `titleLinkable` is `true` (default), the product name links to `/product/{productId}/{slug}`
- If the product lacks a `productId` or `slug`, the title falls back to plain text automatically
- Child items never render as links, regardless of the `titleLinkable` setting

### Stock Info

The `showStockComponent` prop renders a placeholder text. Replace it with an actual stock display component as needed for your application.
