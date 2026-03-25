# CartItem

A self-contained cart line item component that handles quantity updates, item deletion, notes, stock display, bundle items, cluster children, cross-sell suggestions, and VAT-aware pricing -- all via the Propeller SDK.

---

## Usage

### Basic Cart Item

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

### With Cross-Sell Accessories

Fetches and displays related products beneath the cart item on mount. Cross-sell results are rendered as compact thumbnail cards.

```tsx
<CartItem
  graphqlClient={graphqlClient}
  cartId={cart.cartId}
  cartItem={item}
  configuration={config}
  user={authState.user}
  taxZone="NL"
  showCrossupsells={true}
  crossupsellTypes={['ACCESSORIES', 'RELATED']}
  crossupsellLimit={4}
  onCrossupsellClick={(product) => router.push(config.urls.getProductUrl(product))}
  afterCartUpdate={(updatedCart) => saveCart(updatedCart)}
/>
```

### With Notes Field

Enables a per-item textarea for customer notes. Notes are debounced (500 ms) before being persisted to the cart.

```tsx
<CartItem
  graphqlClient={graphqlClient}
  cartId={cart.cartId}
  cartItem={item}
  configuration={config}
  showCartItemNotesField={true}
  afterCartUpdate={(updatedCart) => saveCart(updatedCart)}
/>
```

### Cluster Children (Included Options)

When a cart item belongs to a cluster (`cartItem.clusterId` is set and `cartItem.childItems` has entries), the component automatically renders child items beneath the product name with their SKU and price.

```tsx
{/* No extra props needed -- cluster children render automatically */}
<CartItem
  graphqlClient={graphqlClient}
  cartId={cart.cartId}
  cartItem={clusterItem}
  configuration={config}
  afterCartUpdate={(updatedCart) => saveCart(updatedCart)}
/>
```

### Full-Featured Example

```tsx
<CartItem
  graphqlClient={graphqlClient}
  cartId={cart.cartId}
  cartItem={item}
  configuration={config}
  user={authState.user}
  taxZone="NL"
  language="EN"
  showStockComponent={true}
  showCartItemNotesField={true}
  showSku={true}
  enableIncrementDecrement={true}
  showCrossupsells={true}
  crossupsellTypes={['ACCESSORIES']}
  crossupsellLimit={3}
  includeTax={true}
  labels={{
    notes: 'Item notes',
    notesPlaceholder: 'Special instructions...',
    includedOptions: 'Selected options:',
    crossupsellTitle: 'Frequently bought together',
    updating: 'Saving...',
  }}
  afterCartUpdate={(updatedCart) => saveCart(updatedCart)}
/>
```

### Delegation Mode (External Cart Mutations)

When `onQuantityChange`, `onNoteChange`, or `onDelete` callbacks are provided, the component delegates those operations to the parent instead of calling CartService internally.

```tsx
<CartItem
  graphqlClient={graphqlClient}
  cartId={cart.cartId}
  cartItem={item}
  configuration={config}
  onQuantityChange={(item, qty) => myCustomUpdate(item.itemId, qty)}
  onNoteChange={(item, note) => myCustomNoteUpdate(item.itemId, note)}
  onDelete={(item) => myCustomDelete(item.itemId)}
/>
```

---

## Props

### Required

| Prop | Type | Description |
|---|---|---|
| `graphqlClient` | `GraphQLClient` | Propeller SDK GraphQL client instance |
| `cartId` | `string` | Shopping cart unique identifier |
| `cartItem` | `CartMainItem` | The cart line item to render |

### Display Options

| Prop | Type | Default | Description |
|---|---|---|---|
| `titleLinkable` | `boolean` | `true` | Make the item title a link to the product detail page |
| `showStockComponent` | `boolean` | `false` | Show stock availability via the ItemStock component |
| `showSku` | `boolean` | `true` | Display the product SKU beneath the item name |
| `enableIncrementDecrement` | `boolean` | `true` | Show +/- buttons around the quantity input |
| `showCartItemNotesField` | `boolean` | `false` | Show a notes textarea for the item |
| `includeTax` | `boolean` | `false` | Display prices including VAT (`totalSumNet`) or excluding VAT (`totalSum`) |
| `className` | `string` | -- | Additional CSS class for the root element |

### Cross-Sell Options

| Prop | Type | Default | Description |
|---|---|---|---|
| `showCrossupsells` | `boolean` | `false` | Enable cross-sell/upsell product suggestions below the item |
| `crossupsellTypes` | `string[]` | `['ACCESSORIES']` | Which cross-sell types to fetch: `'ACCESSORIES'`, `'ALTERNATIVES'`, `'OPTIONS'`, `'PARTS'`, `'RELATED'` |
| `crossupsellLimit` | `number` | `3` | Maximum number of cross-sell products to display |

### Callbacks

| Prop | Type | Description |
|---|---|---|
| `onQuantityChange` | `(item: CartMainItem, quantity: number) => void` | Override internal quantity update -- CartService is NOT called when provided |
| `onNoteChange` | `(item: CartMainItem, note: string) => void` | Override internal note update -- CartService is NOT called when provided |
| `onDelete` | `(item: CartMainItem) => void` | Override internal delete -- CartService is NOT called when provided |
| `afterCartUpdate` | `(cart: Cart) => void` | Called after any successful internal CartService mutation; use to sync cart state with your app |
| `onCrossupsellClick` | `(product: Product \| Cluster) => void` | Override default navigation when a cross-sell product is clicked |

### Configuration

| Prop | Type | Default | Description |
|---|---|---|---|
| `configuration` | `any` | -- | App config object providing `imageSearchFiltersGrid`, `imageVariantFiltersSmall`, `imageVariantFiltersMedium`, and `urls.getProductUrl()` |
| `language` | `string` | `'NL'` | Language code passed to CartService and CrossupsellService operations |
| `taxZone` | `string` | `'NL'` | Tax zone for cross-sell price calculations |
| `user` | `Contact \| Customer \| null` | -- | Authenticated user; used for cross-sell price calculations (company/contact/customer IDs) |
| `labels` | `Record<string, string>` | -- | Override UI strings (see Labels section) |

---

## Labels

| Key | Default | Description |
|---|---|---|
| `remove` | `'Remove'` | Delete button text |
| `deleting` | `'Removing...'` | Delete button text while removing |
| `updating` | `'Updating...'` | Shown next to quantity controls during update |
| `notes` | `'Notes'` | Notes field label |
| `notesPlaceholder` | `'Add a note for this item...'` | Notes textarea placeholder |
| `includedOptions` | `'Included Options:'` | Heading above cluster child items |
| `crossupsellTitle` | `'You might also like'` | Cross-sell section heading |

---

## SDK Services

The component uses the following `propeller-sdk-v2` services internally:

### CartService

Used for quantity updates and item deletion. Each mutation returns the full updated `Cart` object, which is forwarded to `afterCartUpdate`.

- **`CartService.updateCartItem()`** -- updates quantity or notes for a cart item
- **`CartService.deleteCartItem()`** -- removes an item from the cart

### CrossupsellService

Used to fetch cross-sell/upsell suggestions when `showCrossupsells` is enabled.

- **`CrossupsellService.getCrossupsells()`** -- fetches related products by `productIdsFrom` or `clusterIdsFrom`, filtered by `types` (e.g., `ACCESSORIES`, `RELATED`)

> **Known SDK issue**: `CrossupsellService.getCrossupsells()` may return an HTTP 400 due to undeclared fragment variables in the SDK's internal query. The error is caught silently, and no cross-sells are displayed. This will resolve when the SDK is updated.

### ItemStock (via parent)

Stock display relies on the `ItemStock` component rendered by the parent React copy. When `showStockComponent={true}` and the product has `inventory` data, a stock indicator is shown.

---

## GraphQL Query and Mutation Examples

### Update Cart Item Quantity

```graphql
mutation UpdateCartItem($id: String!, $itemId: String!, $input: CartItemUpdateInput!) {
  cartUpdateItem(id: $id, itemId: $itemId, input: $input) {
    cartId
    items {
      itemId
      quantity
      totalSum
      totalSumNet
      product {
        productId
        sku
        names { value }
      }
    }
    total {
      subTotal
      totalNet
      totalGross
    }
  }
}
```

Variables:

```json
{
  "id": "cart-abc-123",
  "itemId": "456",
  "input": { "quantity": 3 }
}
```

### Update Cart Item Notes

```json
{
  "id": "cart-abc-123",
  "itemId": "456",
  "input": { "notes": "Please gift wrap this item" }
}
```

### Delete Cart Item

```graphql
mutation DeleteCartItem($id: String!, $itemId: String!, $input: CartItemDeleteInput!) {
  cartDeleteItem(id: $id, itemId: $itemId, input: $input) {
    cartId
    items {
      itemId
      quantity
    }
    total {
      subTotal
      totalNet
      totalGross
    }
  }
}
```

Variables:

```json
{
  "id": "cart-abc-123",
  "itemId": "456",
  "input": { "itemId": "456" }
}
```

### Fetch Cross-Sells

```graphql
query Crossupsells($input: CrossupsellSearchInput!, $language: String) {
  crossupsells(input: $input, language: $language) {
    items {
      crossupsellId
      type
      productTo {
        productId
        names { value }
        media {
          images {
            items {
              imageVariants { url }
            }
          }
        }
      }
      clusterTo {
        clusterId
        names { value }
      }
    }
  }
}
```

Variables:

```json
{
  "input": {
    "types": ["ACCESSORIES"],
    "productIdsFrom": [12345],
    "page": 1,
    "offset": 50
  },
  "language": "NL"
}
```

---

## Behavior

### Quantity Controls

- By default, +/- buttons are shown around a numeric input (`enableIncrementDecrement={true}`).
- Setting `enableIncrementDecrement={false}` renders a plain number input without buttons.
- Minimum quantity is 1; the minus button is disabled at that value.
- On change, `CartService.updateCartItem()` is called immediately (no debounce). If the API call fails, the quantity reverts to the original value.
- While the update is in progress, the `loading` state disables the controls and shows the `updating` label.

### Delete

- Clicking the trash icon calls `CartService.deleteCartItem()`.
- A spinner replaces the icon while the deletion is in progress, and the button is disabled to prevent duplicate calls.
- The updated cart is forwarded to `afterCartUpdate`.

### Notes

- When `showCartItemNotesField={true}`, a textarea appears below the product info.
- Changes are debounced at 500 ms before calling `CartService.updateCartItem()` with the `notes` field.
- The debounce timer resets on each keystroke.

### Price Display

- Prices are formatted as EUR with two decimal places.
- When `includeTax` is `true`, the component uses `totalSumNet` (price including VAT).
- When `includeTax` is `false` (default), it uses `totalSum` (price excluding VAT).
- The component also listens for the `priceToggleChanged` custom event and reads `price_include_tax` from `localStorage` to stay in sync with the global VAT toggle.

### Stock Display

- When `showStockComponent={true}` and the product has `inventory` data, a stock status indicator is rendered.
- The compiled React copy uses the `ItemStock` component directly; the base component outputs a data-attribute placeholder for framework-specific rendering.

### Bundle Items

- When `cartItem.bundle` is present, the component renders the bundle name as the title instead of the product name.
- Bundle items are listed beneath the title: the leader item is shown first (bold), followed by non-leader items. Each shows name and price connected by a dotted line.
- The SKU line is hidden for bundle items.

### Cluster Children

- When `cartItem.clusterId` is set and `cartItem.childItems` contains entries, an "Included Options" section renders automatically.
- Each child item shows its name, SKU, and price in a bordered list.

### Cross-Sells

- When `showCrossupsells={true}`, the component fetches cross-sell products on mount via `CrossupsellService.getCrossupsells()`.
- Products are fetched using `productIdsFrom` (for simple products) or `clusterIdsFrom` (for cluster products).
- Results are displayed as horizontally scrollable compact cards with thumbnail and name, limited by `crossupsellLimit` (default 3).
- Clicking a cross-sell navigates to the product page, or calls `onCrossupsellClick` if provided.
- Errors are caught silently -- the section simply does not appear.

---

## Building Your Own

A standalone implementation of a cart item row with quantity controls, delete, and notes:

```tsx
'use client';

import { useState, useRef } from 'react';
import { GraphQLClient, CartService, Cart, CartMainItem } from 'propeller-sdk-v2';

interface SimpleCartItemProps {
  graphqlClient: GraphQLClient;
  cartId: string;
  cartItem: CartMainItem;
  language?: string;
  onCartUpdated?: (cart: Cart) => void;
}

export function SimpleCartItem({
  graphqlClient,
  cartId,
  cartItem,
  language = 'NL',
  onCartUpdated,
}: SimpleCartItemProps) {
  const [quantity, setQuantity] = useState(cartItem.quantity || 1);
  const [notes, setNotes] = useState(cartItem.notes || '');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartService = new CartService(graphqlClient);

  const productName = cartItem.product?.names?.[0]?.value || 'Product';
  const productSku = cartItem.product?.sku || '';
  const price = cartItem.totalSum || 0;
  const imageUrl = cartItem.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;

  async function handleQuantityChange(newQty: number) {
    if (newQty < 1 || loading) return;
    setQuantity(newQty);
    setLoading(true);

    try {
      const updatedCart = await cartService.updateCartItem({
        id: cartId,
        itemId: cartItem.itemId.toString(),
        input: { quantity: newQty },
        language,
      });
      onCartUpdated?.(updatedCart);
    } catch (err) {
      console.error('Failed to update quantity:', err);
      setQuantity(cartItem.quantity);
    } finally {
      setLoading(false);
    }
  }

  function handleNotesChange(value: string) {
    setNotes(value);
    if (notesTimer.current) clearTimeout(notesTimer.current);

    notesTimer.current = setTimeout(async () => {
      try {
        const updatedCart = await cartService.updateCartItem({
          id: cartId,
          itemId: cartItem.itemId.toString(),
          input: { notes: value },
          language,
        });
        onCartUpdated?.(updatedCart);
      } catch (err) {
        console.error('Failed to update notes:', err);
      }
    }, 500);
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);

    try {
      const updatedCart = await cartService.deleteCartItem({
        id: cartId,
        itemId: cartItem.itemId,
        input: { itemId: cartItem.itemId },
        language,
      });
      onCartUpdated?.(updatedCart);
    } catch (err) {
      console.error('Failed to delete item:', err);
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      {imageUrl && (
        <img src={imageUrl} alt={productName} className="w-20 h-20 object-contain" />
      )}

      <div className="flex-1">
        <p className="font-semibold">{productName}</p>
        {productSku && <p className="text-xs text-gray-400 font-mono">{productSku}</p>}

        <textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder="Add a note..."
          rows={2}
          className="mt-2 w-full text-sm border rounded px-2 py-1 resize-none"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="font-bold">{`\u20AC${price.toFixed(2)}`}</span>

        <button onClick={() => handleQuantityChange(quantity - 1)} disabled={quantity <= 1 || loading}>
          -
        </button>
        <span className="w-8 text-center">{quantity}</span>
        <button onClick={() => handleQuantityChange(quantity + 1)} disabled={loading}>
          +
        </button>

        <button onClick={handleDelete} disabled={deleting} className="text-red-500 ml-2">
          {deleting ? '...' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
```
