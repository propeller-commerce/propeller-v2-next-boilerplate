# CartItem

A Mitosis UI component that renders an individual product line within the shopping cart. It manages quantity updates, item removal, SKU display, stock information (via ItemStock), optional notes, and cluster child items.

**Source:** `ui-components/CartItem.lite.tsx`
**Compiled React:** `output/react/ui-components/CartItem`
**Active copy:** `components/propeller/CartItem.tsx`

---

## Usage

### Minimal (self-contained cart mutations)

```tsx
import CartItem from '@/components/propeller/CartItem';
import { graphqlClient } from '@/lib/api';
import { config } from '@/data/config';

<CartItem
  graphqlClient={graphqlClient}
  cartId={cart.cartId}
  cartItem={item}
  configuration={config}
  afterCartUpdate={(updatedCart) => saveCart(updatedCart)}
/>
```

### With callback-based quantity/delete (delegation mode)

```tsx
<CartItem
  graphqlClient={graphqlClient}
  cartId={cart.cartId}
  cartItem={item}
  configuration={config}
  onQuantityChange={(item, qty) => updateCartItem(item.itemId, qty)}
  onDelete={(item) => removeFromCart(item.itemId)}
/>
```

### Full-featured

```tsx
<CartItem
  graphqlClient={graphqlClient}
  cartId={cart.cartId}
  cartItem={item}
  configuration={config}
  showStockComponent={true}
  showCartItemNotesField={true}
  enableIncrementDecrement={true}
  afterCartUpdate={(updatedCart) => saveCart(updatedCart)}
/>
```

### With cross-sell accessories (auto-fetch)

```tsx
<CartItem
  graphqlClient={graphqlClient}
  cartId={cart.cartId}
  cartItem={item}
  configuration={config}
  showCrossupsells={true}
  crossupsellTypes={['ACCESSORIES']}
  crossupsellLimit={2}
  afterCartUpdate={(updatedCart) => saveCart(updatedCart)}
/>
```

### With multiple cross-sell types

```tsx
<CartItem
  graphqlClient={graphqlClient}
  cartId={cart.cartId}
  cartItem={item}
  configuration={config}
  showCrossupsells={true}
  crossupsellTypes={['ACCESSORIES', 'RELATED']}
  crossupsellLimit={4}
  onCrossupsellClick={(product) => router.push(config.urls.getProductUrl(product))}
  afterCartUpdate={(updatedCart) => saveCart(updatedCart)}
/>
```

---

## Props

### Required

| Prop | Type | Description |
|---|---|---|
| `graphqlClient` | `GraphQLClient` | Propeller SDK GraphQL client |
| `cartId` | `string` | Shopping cart unique identifier |
| `cartItem` | `CartMainItem` | The cart item to render |

### Display

| Prop | Type | Default | Description |
|---|---|---|---|
| `titleLinkable` | `boolean` | `true` | Make the item title a link to the PDP |
| `showStockComponent` | `boolean` | `false` | Show stock availability via ItemStock component |
| `showSku` | `boolean` | `true` | Display the SKU beneath the item name |
| `enableIncrementDecrement` | `boolean` | `true` | Show +/- buttons around quantity input |
| `showCartItemNotesField` | `boolean` | `false` | Show a notes textarea for the item |
| `showCrossupsells` | `boolean` | `false` | Show cross-sell/upsell product suggestions below the item |
| `crossupsellTypes` | `string[]` | `['ACCESSORIES']` | Which cross-sell types to fetch. Values: `'ACCESSORIES'`, `'ALTERNATIVES'`, `'OPTIONS'`, `'PARTS'`, `'RELATED'` |
| `crossupsellLimit` | `number` | `3` | Maximum number of cross-sell products to display |

### Callbacks

| Prop | Type | Description |
|---|---|---|
| `onQuantityChange` | `(item, quantity) => void` | Overrides internal quantity update. When provided, CartService is NOT called |
| `onNoteChange` | `(item, note) => void` | Overrides internal note update. When provided, CartService is NOT called |
| `onDelete` | `(item) => void` | Overrides internal delete. When provided, CartService is NOT called |
| `afterCartUpdate` | `(cart: Cart) => void` | Called after any successful internal CartService mutation. Use to sync cart state |
| `onCrossupsellClick` | `(product: any) => void` | Overrides default navigation when a cross-sell product is clicked. Receives the `productTo` or `clusterTo` object |

### Configuration

| Prop | Type | Default | Description |
|---|---|---|---|
| `configuration` | `any` | — | Config object providing `imageSearchFiltersGrid`, `imageVariantFiltersSmall`, and `urls.getProductUrl()` |
| `language` | `string` | `'NL'` | Language code for CartService operations |
| `labels` | `Record<string, string>` | — | Override UI strings (see Labels section) |
| `className` | `string` | — | Additional CSS class for the root element |

---

## Labels

| Key | Default | Description |
|---|---|---|
| `remove` | `'Remove'` | Delete button text |
| `deleting` | `'Removing...'` | Delete button text while deleting |
| `updating` | `'Updating...'` | Shown during quantity update |
| `notes` | `'Notes'` | Notes field label |
| `notesPlaceholder` | `'Add a note for this item...'` | Notes textarea placeholder |
| `includedOptions` | `'Included Options:'` | Cluster child items heading |
| `crossupsellTitle` | `'You might also like'` | Cross-sell section heading |

---

## Internal behaviour

- **Quantity updates**: Calls `CartService.updateCartItem` with debounce-free direct calls. On error, reverts to the original quantity.
- **Notes updates**: Debounced at 500ms before calling `CartService.updateCartItem`.
- **Delete**: Calls `CartService.deleteCartItem`. Button shows loading state while deleting.
- **Price toggle**: Listens for `priceToggleChanged` custom event and reads `price_include_tax` from localStorage. Uses `totalSumNet` (incl. VAT) or `totalSum` (excl. VAT).
- **Cluster child items**: Automatically renders child items when `cartItem.clusterId` and `cartItem.childItems` are present.
- **Stock display**: Uses the `ItemStock` component when `showStockComponent={true}` and the product has inventory data.
- **Cross-sells**: When `showCrossupsells={true}`, fetches via `CrossupsellService.getCrossupsells()` on mount using `productIdsFrom` and `types` filters. Results are rendered as compact cards with thumbnail + name, linking to the product page. Limited by `crossupsellLimit` (default 3). Errors are caught silently (no cross-sells shown). Note: `CrossupsellService.getCrossupsells()` has a known SDK bug (undeclared fragment variables cause HTTP 400) — cross-sells may not display until the SDK is fixed.

### React copy differences from compiled output

- Uses Next.js `Link` instead of `<a>` for product title
- Uses Next.js `Image` instead of `<img>` for product image
- Uses `ItemStock` component directly instead of data-attribute placeholder
- Uses `useRef` for notes timeout instead of `useState` (avoids stale closure)
- Event listener created inline in `useEffect` (standard pattern for Mitosis compiled React)
- Uses theme tokens (`bg-card`, `text-primary`, etc.) instead of hardcoded colors
