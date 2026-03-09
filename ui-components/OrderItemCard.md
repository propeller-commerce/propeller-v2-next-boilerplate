# OrderItemCard

The OrderItemCard component renders a single item within an order or quotation, displaying product details such as image, SKU, quantity, price, discount, and optional notes. It supports configurable visibility for each data element, optional linking of the item title to the product detail page, and parent/child item grouping for bundled products.

The component focuses on item-level presentation and formatting while allowing the parent application to control pricing display and related behaviors through callback functions.

## Source Files

- **Mitosis source**: `ui-components/OrderItemCard.lite.tsx`
- **Compiled React**: `output/react/ui-components/OrderItemCard.tsx`
- **Active app copy**: `components/propeller/OrderItemCard.tsx`
- **Compiled Vue**: `output/vue/ui-components/OrderItemCard.vue`

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `orderItem` | `OrderItem` | Yes | — | The order item to display |
| `childItems` | `OrderItem[]` | No | `[]` | Child order items rendered as indented sub-rows beneath the parent |
| `titleLinkable` | `boolean` | No | `true` | Should the item title be a link to the PDP |
| `showImage` | `boolean` | No | `true` | Display a small thumbnail of the order item |
| `showStockComponent` | `boolean` | No | `false` | Should stock info be displayed in the order item |
| `showSku` | `boolean` | No | `true` | Display the SKU of the order item beneath the item name |
| `showQuantity` | `boolean` | No | `true` | Display the quantity of the order item |
| `showPrice` | `boolean` | No | `true` | Display the price of the order item |
| `showDiscount` | `boolean` | No | `false` | Display the discount column (amount + percentage) |
| `showItemNotes` | `boolean` | No | `false` | Should the order item notes field be displayed |
| `isChildItem` | `boolean` | No | `false` | Render as a child/sub-item (indented, no image, smaller text) |
| `formatPrice` | `(price: number) => string` | No | `€{price.toFixed(2)}` | Custom price formatting function |

## Usage

### Inside an order detail table

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

### With parent/child grouping and discount (quotes)

```tsx
// Group items: parents have no parentOrderItemId, children reference their parent
const parentItems = allProducts.filter((item) => !item.parentOrderItemId);
const childMap = new Map();
allProducts.filter((item) => item.parentOrderItemId).forEach((item) => {
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

### Non-linkable items (e.g., bonus items)

```tsx
<OrderItemCard orderItem={item} titleLinkable={false} />
```

### Surcharges (no image, no SKU)

```tsx
<OrderItemCard
  orderItem={item}
  titleLinkable={false}
  showImage={false}
  showSku={false}
/>
```

## Rendering

The component renders a `<tbody>` element containing:

1. **Parent row** (`<tr>`) — image thumbnail, product name (linked or plain), SKU, notes, stock info, quantity, discount, price
2. **Child rows** (`<tr>` per child) — indented name, quantity, price (no image, no SKU, no discount)

Since the component renders `<tbody>`, it must be placed directly inside a `<table>` (not wrapped in another `<tbody>`).

## Discount Display

When `showDiscount={true}`, the discount column shows:
- `€{discount} ({percentage}%)` — e.g., "€127.50 (15,00%)"
- Percentage is calculated from `originalPrice` and `discount` fields
- Orange text color for the discount value
- Empty cell for items with no discount

## Parent/Child Grouping

Items with `parentOrderItemId` are child items belonging to a parent. The parent page is responsible for:
1. Filtering parent items (no `parentOrderItemId`)
2. Building a `Map<parentId, OrderItem[]>` of children
3. Passing `childItems` prop to each parent's `OrderItemCard`

Child items are rendered as indented sub-rows with smaller text, no image, and no discount.

## Data Resolution

- **Name**: `orderItem.product.names[0].value` → fallback to `orderItem.name`
- **SKU**: `orderItem.product.sku` → fallback to `orderItem.sku`
- **Image**: `orderItem.product.media.images.items[0].imageVariants[0].url`
- **PDP URL**: `/product/{productId}/{slug}`
- **Discount**: `orderItem.discount` (amount), percentage from `discount / originalPrice * 100`
- **Notes**: `orderItem.notes`

## Notes

- The React compiled version uses Next.js `Image` and `Link` components instead of plain `<img>` and `<a>` tags
- When `isChildItem` is true, `showImage` and `showSku` default to `false` regardless of prop values
- When `titleLinkable` is true but the product has no `productId` or `slug`, the title falls back to plain text
- The `showStockComponent` prop renders a placeholder — implement actual stock display as needed
