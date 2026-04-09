import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ItemsOverview

A read-only cart items display component that renders each line item as a compact row with optional image, SKU, quantity, availability, and price. Supports normal products, cluster items with child variants, and bundle items with leader/non-leader breakdown.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

```tsx
import ItemsOverview from '@/components/propeller/ItemsOverview';

// Minimal — show all cart items with default settings (all columns visible)
<ItemsOverview cart={cart} />

// Checkout sidebar — read-only, no clicking, no availability
<ItemsOverview
  cart={cart}
  title="Order Summary"
  showAvailability={false}
  itemNameClickable={false}
/>

// Clickable items with navigation to product pages
<ItemsOverview
  cart={cart}
  onCartItemNameClick={(item) => router.push(`/product/${item.product?.slug}`)}
/>

// Minimal display — images and prices only, no SKU or stock info
<ItemsOverview
  cart={cart}
  showSku={false}
  showAvailability={false}
  showQuantity={false}
/>

// Custom price formatting and labels (e.g., for a non-EUR store)
<ItemsOverview
  cart={cart}
  formatPrice={(price) => `$${price.toFixed(2)}`}
  labels={{
    quantity: 'Amount:',
    inStock: 'Available',
    outOfStock: 'Unavailable',
    noItems: 'Your cart is empty.',
  }}
/>

// Styled container with custom CSS class
<ItemsOverview
  cart={cart}
  itemsOverviewContainerClass="bg-white rounded-lg p-4 shadow-sm"
  title="Your Items"
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To create a custom items overview component, you need a `Cart` object and access to its `items` array. Here is the minimal structure:

```tsx
interface CustomItemsOverviewProps {
  cart: Cart;
}

function CustomItemsOverview({ cart }: CustomItemsOverviewProps) {
  const items = (cart as any)?.items || [];

  return (
    <div>
      {items.map((item: CartMainItem) => {
        const name = item.product?.names?.[0]?.value || 'Product';
        const price = (item.price || 0) * (item.quantity || 1);
        const imageUrl = item.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
        const isBundle = !!item.bundle;

        return (
          <div key={item.itemId}>
            {isBundle ? (
              <BundleRow item={item} />
            ) : (
              <div>
                <span>{name}</span>
                <span>{price.toFixed(2)}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

Key considerations:

- **Cast `cart` to `any`** to access `items` — the SDK `Cart` type may not expose it directly.
- **Check `item.bundle`** to distinguish bundle items from normal/cluster items.
- **Check `item.childItems`** (array length > 0) to distinguish cluster items from simple products.
- **Bundle leader identification** uses `Enums.YesNo.Y` from `propeller-sdk-v2`: `bundle.items.find(bi => bi.isLeader === Enums.YesNo.Y)`.
- **Image URLs** should be validated (check they start with "http") before rendering in an `<img>` tag.
- **Stock availability** comes from `item.product.inventory.totalQuantity` — a value of `0`, `null`, or `undefined` means out of stock.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required

| Prop | Type | Description |
|---|---|---|
| `cart` | `Cart` | Shopping cart object. Items are read from `cart.items`. |

### Display Toggles

All default to `true`. Set to `false` to hide the corresponding column.

| Prop | Type | Default | Description |
|---|---|---|---|
| `showImage` | `boolean` | `true` | Show a 64x64 product thumbnail. Falls back to an SVG placeholder when no image URL is available. |
| `showSku` | `boolean` | `true` | Show the product SKU below the item name. |
| `showQuantity` | `boolean` | `true` | Show the item quantity (e.g., "Qty: 3"). |
| `showAvailability` | `boolean` | `true` | Show stock status text. Green for in-stock, red for out-of-stock. |
| `showPrice` | `boolean` | `true` | Show the line total price (unit price multiplied by quantity). |

### Interaction

| Prop | Type | Default | Description |
|---|---|---|---|
| `itemNameClickable` | `boolean` | `true` | When `true`, item names render as clickable text with hover styling. |
| `onCartItemNameClick` | `(item: CartMainItem) => void` | `undefined` | Callback fired when a clickable item name is clicked. Receives the full `CartMainItem`. Only fires when `itemNameClickable` is `true`. |

### Customization

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | `string` | `undefined` | Optional heading rendered above the items list as an `<h2>`. |
| `itemsOverviewContainerClass` | `string` | `'cart-items-overview'` | CSS class applied to the outermost container `<div>`. |
| `formatPrice` | `(price: number) => string` | Internal formatter | Custom price formatting function. The default formats as EUR with two decimals (e.g., "EUR 12.50"). |
| `labels` | `Record<string, string>` | `{}` | Override default label strings. Supported keys: `quantity` (default "Qty:"), `inStock` (default "In stock"), `outOfStock` (default "Out of stock"), `noItems` (default "No items in cart."). |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function itemsOverview(cart: Cart): void
```

### Options

| Field | Type | Default | Maps to |
|---|---|---|---|
| `cart` | `Cart` | **required** | Shopping cart object |
| `showImage` | `boolean` | `true` | Show product thumbnail |
| `showSku` | `boolean` | `true` | Show product SKU |
| `showQuantity` | `boolean` | `true` | Show item quantity |
| `showAvailability` | `boolean` | `true` | Show stock status |
| `showPrice` | `boolean` | `true` | Show line total price |

### Cart resolution

The component reads items from `cart.items`. Each `CartMainItem` provides:

| Field | Purpose |
|---|---|
| `item.itemId` | Unique key for each row |
| `item.product.names[0].value` | Item name (fallback: "Product") |
| `item.product.sku` | Product SKU |
| `item.product.media.images.items[0].imageVariants[0].url` | Thumbnail URL |
| `item.product.inventory.totalQuantity` | Stock status |
| `item.price` | Unit price |
| `item.quantity` | Quantity |
| `item.childItems` | Cluster variant children |
| `item.bundle` | Bundle data (when present, item is a bundle) |

### Callbacks

| Callback | Signature | Description |
|---|---|---|
| `onCartItemNameClick` | `(item: CartMainItem) => void` | Fired when a clickable item name is clicked |

### UI-only props

The following props control display only: `title`, `itemsOverviewContainerClass`, `formatPrice`, `labels`, `itemNameClickable`, `className`.

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default | Description |
|---|---|---|
| `quantity` | `"Qty:"` | Quantity label prefix |
| `inStock` | `"In stock"` | Stock status for available items |
| `outOfStock` | `"Out of stock"` | Stock status for unavailable items |
| `noItems` | `"No items in cart."` | Empty state message |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  quantity: 'Qty:',
  inStock: 'In stock',
  outOfStock: 'Out of stock',
  noItems: 'No items in cart.',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

- **Three item types**: The component handles three item shapes transparently. If `item.bundle` is present, it renders as a bundle with leader/non-leader breakdown. If `item.childItems` has entries, it renders as a cluster item with nested children. Otherwise, it renders as a standard line item.
- **Image fallback**: When no valid image URL is found (missing, empty, or not starting with "http"), an inline SVG placeholder icon is shown instead.
- **Price calculation**: Line total is computed as `item.price * item.quantity`. For bundles, `bundle.price.net` and each `bundleItem.price.net` are displayed directly without multiplication.
- **Stock status**: Availability text is color-coded: green (`text-green-600`) for in-stock items, red (`text-red-500`) for out-of-stock. Only shown for non-bundle items.
- **Empty state**: When `cart.items` is empty, a styled italic message is displayed using the `noItems` label.
- **Clickable names**: When `itemNameClickable` is `true` and `onCartItemNameClick` is provided, item names get `cursor-pointer` styling with a hover color transition. Bundle names are never clickable.
- **Bundle layout**: Bundles display the bundle name and total price at the top, followed by an indented list (left-bordered) showing the leader item (styled slightly bolder) and all non-leader items below it.
- **Cluster layout**: Cluster items display the parent product name and price, followed by an indented list of child variant items showing their names and individual `totalSum` values.

## SDK Services and Cart Fields

This component is read-only and does not call any SDK services. It receives a `Cart` object via props and reads the following fields:

### From `Cart`

| Field | Usage |
|---|---|
| `cart.items` | Array of `CartMainItem` objects to iterate over. |

### From each `CartMainItem`

| Field | Usage |
|---|---|
| `item.itemId` | Used as the React `key` for each row. |
| `item.product.names[0].value` | Displayed as the item name. Falls back to "Product". |
| `item.product.sku` | Displayed when `showSku` is enabled. |
| `item.product.media.images.items[0].imageVariants[0].url` | Product thumbnail URL. Must start with "http" to be used. |
| `item.product.inventory.totalQuantity` | Determines stock status text and color. `> 0` = in stock, `0` or missing = out of stock. |
| `item.price` | Unit price. Multiplied by `item.quantity` for the line total. |
| `item.quantity` | Displayed in the quantity label and used for price calculation. |
| `item.childItems` | Array of `CartBaseItem` for cluster variant children. Each child displays its `product.names[0].value` and `totalSum`. |
| `item.bundle` | When present, the item renders as a bundle instead of a normal product. |

### From `item.bundle` (Bundle Items)

| Field | Usage |
|---|---|
| `bundle.name` | Displayed as the bundle title. Falls back to "Bundle". |
| `bundle.price.net` | Bundle-level price, shown next to the bundle name. |
| `bundle.items` | Array of `BundleItem` objects. Split into leader and non-leaders. |
| `bundle.items[].isLeader` | Compared against `Enums.YesNo.Y` to identify the bundle leader. |
| `bundle.items[].product.names[0].value` | Name of each bundle component product. |
| `bundle.items[].price.net` | Price of each bundle component. |
