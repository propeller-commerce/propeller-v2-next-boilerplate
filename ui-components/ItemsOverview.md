# ItemsOverview

Displays a list of items in the shopping cart with optional image, SKU, quantity, availability, and price.

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `cart` | `Cart` | Yes | — | Shopping cart object |
| `itemsOverviewContainerClass` | `string` | No | `'cart-items-overview'` | CSS class for the container |
| `title` | `string` | No | `''` | Title above the items list |
| `itemNameClickable` | `boolean` | No | `true` | Make item names clickable |
| `onCartItemNameClick` | `(item: CartMainItem) => void` | No | — | Callback when an item name is clicked |
| `showQuantity` | `boolean` | No | `true` | Show item quantity |
| `showAvailability` | `boolean` | No | `true` | Show stock availability |
| `showSku` | `boolean` | No | `true` | Show product SKU |
| `showImage` | `boolean` | No | `true` | Show product thumbnail |
| `showPrice` | `boolean` | No | `true` | Show line total price |
| `formatPrice` | `(price: number) => string` | No | — | Custom price formatting |
| `labels` | `Record<string, string>` | No | — | Label overrides (`quantity`, `inStock`, `outOfStock`, `noItems`) |

## Usage

```tsx
import ItemsOverview from '@/components/propeller/ItemsOverview';

// Read-only checkout sidebar
<ItemsOverview
  cart={cart}
  showAvailability={false}
  itemNameClickable={false}
/>

// Clickable items with navigation
<ItemsOverview
  cart={cart}
  onCartItemNameClick={(item) => router.push(`/product/${item.product?.slug}`)}
/>
```

## Behavior

- Reads `cart.items` and renders each as a compact row
- Image uses first image variant URL; falls back to SVG placeholder
- Availability reads from `product.inventory.totalQuantity`
- Price shows `item.price * item.quantity`
- Clickable names get hover styling and fire `onCartItemNameClick`

## Files

- **Mitosis source**: `ui-components/ItemsOverview.lite.tsx`
- **Compiled React**: `output/react/ui-components/ItemsOverview.tsx`
- **Active copy**: `components/propeller/ItemsOverview.tsx`
