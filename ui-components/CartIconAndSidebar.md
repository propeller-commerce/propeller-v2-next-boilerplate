import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# CartIconAndSidebar

A shopping cart icon with item count badge, hover totals tooltip, and a slide-in sidebar that displays cart contents. Designed for use in site headers.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Header icon with sidebar and totals tooltip

```tsx
import CartIconAndSidebar from '@/components/propeller/CartIconAndSidebar';

function Header() {
  const { cart } = useCart();
  const router = useRouter();

  return (
    <CartIconAndSidebar
      cart={cart}
      showTotals={true}
      showBadge={true}
      cartCheckoutButton={true}
      cartPageButton={true}
      onCheckoutButtonClick={() => router.push('/checkout')}
      onCartPageButtonClick={() => router.push('/cart')}
    />
  );
}
```

### Header icon with sidebar, no hover totals

```tsx
<CartIconAndSidebar
  cart={cart}
  showTotals={false}
  onCheckoutButtonClick={() => router.push('/checkout')}
  onCartPageButtonClick={() => router.push('/cart')}
/>
```

### Icon-only (no sidebar, custom click handler)

When `showCartSidebarOnClick` is `false`, clicking the icon fires `onCartIconClick` instead of opening the sidebar. Useful when you want to navigate directly to the cart page.

```tsx
<CartIconAndSidebar
  cart={cart}
  showCartSidebarOnClick={false}
  onCartIconClick={(cart) => router.push('/cart')}
/>
```

### Custom labels

```tsx
<CartIconAndSidebar
  cart={cart}
  cartSidebarTitle="Your Bag"
  labels={{
    totalLabel: 'Subtotal',
    itemsLabel: 'products',
    emptyCart: 'Nothing here yet.',
    continueShopping: 'Keep Browsing',
    qty: 'Quantity',
    total: 'Order Total',
    checkoutButton: 'Proceed to Checkout',
    cartPageButton: 'View Full Cart',
    cartIconLabel: 'Open cart',
    closeLabel: 'Close cart',
  }}
  onCheckoutButtonClick={() => router.push('/checkout')}
  onCartPageButtonClick={() => router.push('/cart')}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a standalone cart icon with sidebar, you need to read from the `Cart` object and manage two pieces of UI state.

### Basic cart data access

```ts
import type { Cart, CartMainItem } from 'propeller-sdk-v2';

// --- Cart data access ---
const itemCount = cart?.items?.length ?? 0;
const totalPrice = cart?.total?.totalNet ?? 0;

// Per-item data mapping:
// - Name:  item.product?.names?.[0]?.value
// - Image: item.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url
//          (use an SVG placeholder when the URL is missing or does not start with "http")
// - Qty:   item.quantity
// - Price: item.totalSumNet
```

### Icon-only (no sidebar, custom click handler)

```ts
// When not using a sidebar, simply track the item count and navigate on click:
const itemCount = cart?.items?.length ?? 0;

function onCartIconClick(cart: Cart) {
  // Navigate to the cart page
  // Not documented in source — implement based on your setup
}
```

### Full sidebar implementation

**State to track:**

- `sidebarOpen` (boolean) -- controls whether the sidebar panel is visible.
- `mounted` (boolean) -- a hydration guard flag, initialized to `false`, set to `true` after the component mounts on the client. Wrap the badge and the sidebar content area behind this flag so that server-rendered HTML does not include cart data from `localStorage`.

**Hydration note:** Because cart data typically comes from `localStorage`, it is not available during server-side rendering. Any element that displays cart-derived values (item count badge, item list, totals) must be guarded so it only renders after the component has mounted on the client. This prevents mismatches between server and client HTML.

**UI structure:**

- **Icon button** with a cart icon. When `sidebarOpen` is false and the item count is greater than zero (and the component has mounted), show a count badge.
- **Overlay** behind the sidebar, clicking it closes the sidebar.
- **Sidebar panel** that slides in from the right. Contains a header with title and close button, a scrollable list of cart items (filter out items without a `product`), and a footer with the total price and checkout/cart-page buttons.
- **Empty state** when the cart has no items, show an empty cart message with a "Continue Shopping" action that closes the sidebar.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Core

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cart` | `Cart` | *required* | The cart object from Propeller SDK. |

### Icon & Badge

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showBadge` | `boolean` | `true` | Show item count badge on the cart icon. |
| `showTotals` | `boolean` | `false` | Show a totals tooltip when hovering the icon. |
| `iconClassName` | `string` | — | Additional CSS class for the icon button. |

### Sidebar

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showCartSidebarOnClick` | `boolean` | `true` | Open the sidebar on icon click. When `false`, fires `onCartIconClick` instead. |
| `cartSidebarTitle` | `string` | `'Shopping cart'` | Title displayed at the top of the sidebar. |
| `cartCheckoutButton` | `boolean` | `true` | Show the checkout button in the sidebar footer. |
| `cartPageButton` | `boolean` | `true` | Show the "View Cart Details" button in the sidebar footer. |
| `sidebarClassName` | `string` | — | Additional CSS class for the sidebar panel. |

### Callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onCartIconClick` | `(cart: Cart) => void` | Fired on icon click when `showCartSidebarOnClick` is `false`. |
| `onCheckoutButtonClick` | `(cart: Cart) => void` | Fired when the checkout button in the sidebar is clicked. |
| `onCartPageButtonClick` | `(cart: Cart) => void` | Fired when the cart page button in the sidebar is clicked. |

### Labels

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `labels` | `Record<string, string>` | — | Override any UI text. Keys: `cartIconLabel`, `totalLabel`, `itemsLabel`, `emptyCart`, `continueShopping`, `qty`, `total`, `checkoutButton`, `cartPageButton`, `closeLabel`, `cartSidebarTitle`. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function Signature

```ts
import type { Cart, CartMainItem } from 'propeller-sdk-v2';

// This component is display-only. It receives a Cart object and reads fields from it.
// No SDK service calls are made internally.

// Primary data access:
const itemCount: number = cart?.items?.length ?? 0;
const totalPrice: number = cart?.total?.totalNet ?? 0;
```

### Options Table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `cart` | `Cart` | — | The cart object; reads `cart.items`, `cart.total.totalNet` |

### Callbacks Table

| Callback | When it fires | What to implement |
|---|---|---|
| `onCartIconClick` | Icon clicked when sidebar is disabled | Navigate to the cart page or open a custom cart view. |
| `onCheckoutButtonClick` | Checkout button clicked in sidebar | Navigate to the checkout page. |
| `onCartPageButtonClick` | Cart page button clicked in sidebar | Navigate to the full cart page. |

### UI-Only Props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `showBadge` — show/hide item count badge
- `showTotals` — show/hide hover totals tooltip
- `iconClassName` — CSS class for the icon button
- `showCartSidebarOnClick` — whether clicking the icon opens the sidebar
- `cartSidebarTitle` — sidebar header title
- `cartCheckoutButton` — show/hide checkout button in sidebar
- `cartPageButton` — show/hide cart page button in sidebar
- `sidebarClassName` — CSS class for the sidebar panel
- `labels` — customizable UI strings

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default | Used in |
|-----|---------|---------|
| `cartIconLabel` | *(cart icon label)* | Accessibility label for the cart icon button |
| `totalLabel` | *(total label)* | Label for the total price in the hover tooltip |
| `itemsLabel` | *(items label)* | Label for the item count in the hover tooltip |
| `emptyCart` | *(empty cart message)* | Message shown when the cart has no items |
| `continueShopping` | *(continue shopping text)* | Link text in the empty cart state |
| `qty` | *(quantity label)* | Label prefix for item quantity |
| `total` | *(total label)* | Label for the total price in the sidebar footer |
| `checkoutButton` | *(checkout button text)* | Checkout button label |
| `cartPageButton` | *(cart page button text)* | Cart page button label |
| `closeLabel` | *(close label)* | Close button accessibility label |
| `cartSidebarTitle` | *(sidebar title)* | Sidebar header title |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const labels = {
  cartIconLabel: 'Open cart',
  totalLabel: 'Total',
  itemsLabel: 'items',
  emptyCart: 'Your cart is empty.',
  continueShopping: 'Continue Shopping',
  qty: 'Qty',
  total: 'Total',
  checkoutButton: 'Checkout',
  cartPageButton: 'View Cart Details',
  closeLabel: 'Close cart',
  cartSidebarTitle: 'Shopping cart',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Icon badge

The badge displays the number of items in `cart.items`. It only renders when `showBadge` is `true` (the default) and the item count is greater than zero. The badge is hidden during server-side rendering and appears only after the component mounts (see Hydration guard below).

### Sidebar open/close

- **Opening**: Clicking the cart icon opens the sidebar by default (`showCartSidebarOnClick={true}`). When set to `false`, the icon click fires `onCartIconClick` instead.
- **Closing**: The sidebar closes when clicking the dark overlay behind it, clicking the close (X) button, or when a checkout/cart-page button is clicked (callbacks fire after the sidebar closes).
- **Animation**: The sidebar slides in from the right with a 300ms CSS transition. The overlay uses `backdrop-blur-sm` for a blurred background effect.
- **Empty state**: When the cart has no items, the sidebar shows an empty cart message with a "Continue Shopping" link that closes the sidebar.

### Hover totals tooltip

When `showTotals` is `true`, hovering over the cart icon shows a small tooltip with the total price and item count. The tooltip appears below the icon and right-aligned.

### Image fallback

When a product has no image URL (or the URL does not start with `http`), the component renders an inline SVG placeholder (a landscape/image icon) instead of a broken `<img>` tag. No external fallback image file is needed.

### Bundle items

Cart items that contain bundle data (`item.bundle`) render differently from regular items. The bundle name and total price appear at the top, followed by an indented list showing the bundle leader product first, then remaining bundle items with their individual prices.

### Hydration guard

The component uses an `_isMounted` state flag that starts as `false` and flips to `true` after the component mounts on the client. The item count badge and the entire sidebar content area are wrapped in a mount guard, preventing hydration mismatches when cart data comes from `localStorage` (which is unavailable during SSR).

## Cart Data (SDK Fields Read)

This component is display-only. It receives a `Cart` object as a prop and reads the following fields:

| Field | Type | Used For |
|-------|------|----------|
| `cart.items` | `CartMainItem[]` | List of line items displayed in the sidebar. Item count for the badge. |
| `cart.total.totalNet` | `number` | Total price (incl. VAT) shown in the hover tooltip and sidebar footer. |
| `item.product.names[0].value` | `string` | Product display name. |
| `item.product.media.images.items[0].imageVariants[0].url` | `string` | Product thumbnail in the sidebar. |
| `item.product.slugs[0].value` | `string` | Used to build product/cluster URLs. |
| `item.product.sku` | `string` | SKU displayed beneath the product name. |
| `item.product.class` | `Enums.ProductClass` | Determines URL format (`/product/...` vs `/cluster/...`). |
| `item.product.productId` / `item.product.clusterId` | `number` | Used in URL generation. |
| `item.quantity` | `number` | Displayed as "Qty: N". |
| `item.totalSumNet` | `number` | Line item total price (incl. VAT). |
| `item.childItems` | `CartBaseItem[]` | Cluster child items, displayed indented beneath the parent. |
| `item.bundle` | `Bundle` | Bundle data. When present, the item renders as a bundle with leader + non-leader items. |
| `item.bundle.name` | `string` | Bundle display name. |
| `item.bundle.price.net` | `number` | Bundle total price. |
| `item.bundle.items[].isLeader` | `Enums.YesNo` | Identifies the bundle leader product. |
| `item.bundle.items[].product.names[0].value` | `string` | Individual bundle item name. |
| `item.bundle.items[].price.net` | `number` | Individual bundle item price. |
