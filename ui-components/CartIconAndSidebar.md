# CartIconAndSidebar

A shopping cart icon with item count badge, hover totals tooltip, and a slide-in sidebar that displays cart contents. Designed for use in site headers.

## Usage

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

## Props

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

## Building Your Own

To build a standalone cart icon with sidebar without using this component:

```tsx
'use client';

import { useState } from 'react';
import { Cart, CartMainItem } from 'propeller-sdk-v2';
import { useSyncExternalStore } from 'react';

function MyCartIcon({ cart }: { cart: Cart | null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Hydration guard: only render client-dependent content after mount
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const itemCount = cart?.items?.length ?? 0;
  const totalPrice = cart?.total?.totalNet ?? 0;

  return (
    <div className="relative">
      {/* Icon button */}
      <button onClick={() => setSidebarOpen(true)} className="relative p-2">
        {/* Your cart icon here */}
        <ShoppingBagIcon className="w-6 h-6" />

        {/* Badge */}
        {mounted && itemCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
            {itemCount}
          </span>
        )}
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-xl transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {mounted && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-semibold">Shopping Cart ({itemCount})</h2>
              <button onClick={() => setSidebarOpen(false)}>Close</button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {(cart?.items ?? [])
                .filter((item: CartMainItem) => item?.product)
                .map((item: CartMainItem) => {
                  const name = item.product?.names?.[0]?.value ?? 'Product';
                  const imageUrl =
                    item.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;

                  return (
                    <div key={item.itemId} className="flex gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                        {imageUrl ? (
                          <img src={imageUrl} alt={name} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-gray-300 text-xs">No image</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{name}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        <p className="text-sm font-semibold">
                          &euro;{item.totalSumNet.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Footer */}
            {itemCount > 0 && (
              <div className="p-4 border-t space-y-3">
                <div className="flex justify-between">
                  <span>Total</span>
                  <span className="font-bold">&euro;{totalPrice.toFixed(2)}</span>
                </div>
                <button className="w-full py-2 bg-primary text-white rounded">
                  Checkout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```
