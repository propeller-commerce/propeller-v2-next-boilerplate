import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# CartItem

A self-contained cart line item component that handles quantity updates, item deletion, notes, stock display, bundle items, cluster children, cross-sell suggestions, and VAT-aware pricing -- all via the Propeller SDK.

---

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

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

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

A standalone implementation of a cart item row requires three SDK operations: update quantity, update notes, and delete.

```ts
import { CartService, Cart, CartMainItem, GraphQLClient } from 'propeller-sdk-v2';

// pseudo-code

const cartService = new CartService(graphqlClient);
const language = 'NL';

// --- Reading item data ---
const productName = cartItem.product?.names?.[0]?.value || 'Product';
const productSku = cartItem.product?.sku || '';
const price = cartItem.totalSum || 0;
const imageUrl = cartItem.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;

// --- Update quantity ---
// Call immediately on +/- click. On failure, revert to the original quantity.
async function updateQuantity(cartId: string, cartItem: CartMainItem, newQty: number): Promise<Cart> {
  return await cartService.updateCartItem({
    id: cartId,
    itemId: cartItem.itemId.toString(),
    input: { quantity: newQty },
    language,
  });
}

// --- Update notes ---
// Use a debounce pattern: reset a timer on each keystroke, then call the API
// after 500ms of inactivity. Store the timer reference so it can be cleared
// on subsequent keystrokes.
async function updateNotes(cartId: string, cartItem: CartMainItem, notes: string): Promise<Cart> {
  return await cartService.updateCartItem({
    id: cartId,
    itemId: cartItem.itemId.toString(),
    input: { notes },
    language,
  });
}

// --- Delete item ---
// Disable the delete button while the request is in progress to prevent
// duplicate calls.
async function deleteItem(cartId: string, cartItem: CartMainItem): Promise<Cart> {
  return await cartService.deleteCartItem({
    id: cartId,
    itemId: cartItem.itemId,
    input: { itemId: cartItem.itemId },
    language,
  });
}
```

### With Cross-Sell Accessories

```ts
import { CrossupsellService, GraphQLClient } from 'propeller-sdk-v2';

const crossupsellService = new CrossupsellService(graphqlClient);

// Fetch cross-sells for a cart item's product
const crossupsells = await crossupsellService.getCrossupsells({
  types: ['ACCESSORIES', 'RELATED'],
  productIdsFrom: [cartItem.product.productId],
  page: 1,
  offset: 50,
});

// For cluster products, use clusterIdsFrom instead:
// const crossupsells = await crossupsellService.getCrossupsells({
//   types: ['ACCESSORIES'],
//   clusterIdsFrom: [cartItem.clusterId],
//   page: 1,
//   offset: 50,
// });

// Limit the displayed results
const limitedItems = crossupsells?.items?.slice(0, 4) || [];

// Add a cross-sell product to the cart
const cartService = new CartService(graphqlClient);
const productId = crossupsellItem.productTo?.productId || crossupsellItem.clusterTo?.id;
const updatedCart = await cartService.addItemToCart({
  id: cartId,
  input: { productId, quantity: 1 },
  language: 'NL',
});

// Get cross-sell price
const product = crossupsellItem.productTo || crossupsellItem.clusterTo;
const price = includeTax ? product?.price?.net : product?.price?.gross;
```

### Delegation Mode (External Cart Mutations)

```ts
// When you want to handle cart mutations externally instead of using CartService:
// Provide your own update/delete handlers and skip the SDK calls.

function handleQuantityChange(item: CartMainItem, quantity: number): void {
  // Your custom quantity update logic
}

function handleNoteChange(item: CartMainItem, note: string): void {
  // Your custom note update logic
}

function handleDelete(item: CartMainItem): void {
  // Your custom delete logic
}
```

**UI structure:** Render each cart item as a row with a product image (or SVG placeholder if no image), product name, SKU, a quantity input with +/- buttons, the line total price, a notes textarea, and a delete button. Track `quantity`, `notes`, and loading/deleting flags in your framework's state mechanism. After each successful SDK call, forward the returned `Cart` object to your app's cart state so totals stay in sync.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

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

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
import { CartService, CrossupsellService, Cart, CartMainItem, GraphQLClient } from 'propeller-sdk-v2';

const cartService = new CartService(graphqlClient);

// Update quantity or notes
async function updateCartItem(params: {
  id: string;            // cartId
  itemId: string;        // cartItem.itemId
  input: { quantity?: number; notes?: string };
  language: string;
}): Promise<Cart>

// Delete item
async function deleteCartItem(params: {
  id: string;            // cartId
  itemId: string;        // cartItem.itemId
  input: { itemId: string };
  language: string;
}): Promise<Cart>

// Fetch cross-sells
const crossupsellService = new CrossupsellService(graphqlClient);
async function getCrossupsells(input: {
  types: string[];
  productIdsFrom?: number[];
  clusterIdsFrom?: number[];
  page?: number;
  offset?: number;
}): Promise<CrossupsellsResponse>
```

### Options table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `cartId` | `string` | -- | `id` parameter in `updateCartItem` / `deleteCartItem` |
| `cartItem` | `CartMainItem` | -- | Source of `itemId`, product data, pricing, child items |
| `language` | `string` | `'NL'` | `language` parameter in CartService and CrossupsellService calls |
| `taxZone` | `string` | `'NL'` | Tax zone for cross-sell price calculations |
| `user` | `Contact \| Customer \| null` | -- | Used to build price calculation input for cross-sells (company/contact/customer IDs) |
| `crossupsellTypes` | `string[]` | `['ACCESSORIES']` | `types` in `getCrossupsells` input |
| `crossupsellLimit` | `number` | `3` | Limits how many cross-sell results to display |
| `includeTax` | `boolean` | `false` | Selects `totalSumNet` (true) or `totalSum` (false) from cart item |

### Callbacks table

| Callback | When it fires | What to implement |
|---|---|---|
| `onQuantityChange` | User changes quantity (overrides internal CartService call) | Call your own cart update logic with the item and new quantity |
| `onNoteChange` | User changes notes (overrides internal CartService call) | Call your own cart update logic with the item and new note text |
| `onDelete` | User clicks delete (overrides internal CartService call) | Call your own cart delete logic with the item |
| `afterCartUpdate` | After any successful internal CartService mutation | Sync the returned `Cart` object with your app's cart state |
| `onCrossupsellClick` | User clicks a cross-sell product | Navigate to the product detail page or handle as needed |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `titleLinkable` -- make the item title a clickable link
- `showStockComponent` -- show/hide stock indicator
- `showSku` -- show/hide product SKU
- `enableIncrementDecrement` -- show/hide +/- buttons around quantity input
- `showCartItemNotesField` -- show/hide notes textarea
- `showCrossupsells` -- show/hide cross-sell section
- `className` -- CSS class for styling
- `labels` -- UI string overrides
- `configuration` -- app config for image filters and URL generation

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default | Description |
|---|---|---|
| `remove` | `'Remove'` | Delete button text |
| `deleting` | `'Removing...'` | Delete button text while removing |
| `updating` | `'Updating...'` | Shown next to quantity controls during update |
| `notes` | `'Notes'` | Notes field label |
| `notesPlaceholder` | `'Add a note for this item...'` | Notes textarea placeholder |
| `includedOptions` | `'Included Options:'` | Heading above cluster child items |
| `crossupsellTitle` | `'You might also like'` | Cross-sell section heading |
| `addToCart` | `'Add to cart'` | Tooltip for the cross-sell add-to-cart button |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  remove: 'Remove',
  deleting: 'Removing...',
  updating: 'Updating...',
  notes: 'Notes',
  notesPlaceholder: 'Add a note for this item...',
  includedOptions: 'Included Options:',
  crossupsellTitle: 'You might also like',
  addToCart: 'Add to cart',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

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
- Results are displayed as vertically stacked cards with thumbnail, name, price, and an add-to-cart button, limited by `crossupsellLimit` (default 3).
- Prices respect the `includeTax` prop (shows `price.net` when true, `price.gross` when false).
- The add-to-cart button adds 1 quantity of the cross-sell product directly to the current cart via `CartService.addItemToCart()`. A loading spinner is shown during the operation, and `afterCartUpdate` is called on success.
- Clicking the product name/image navigates to the product page, or calls `onCrossupsellClick` if provided.
- Errors are caught silently -- the section simply does not appear.

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

## SDK Services

The component uses the following `propeller-sdk-v2` services internally:

### CartService

Used for quantity updates and item deletion. Each mutation returns the full updated `Cart` object, which is forwarded to `afterCartUpdate`.

- **`CartService.updateCartItem()`** -- updates quantity or notes for a cart item
- **`CartService.deleteCartItem()`** -- removes an item from the cart
- **`CartService.addItemToCart()`** -- adds a cross-sell product to the cart (1 quantity)

### CrossupsellService

Used to fetch cross-sell/upsell suggestions when `showCrossupsells` is enabled.

- **`CrossupsellService.getCrossupsells()`** -- fetches related products by `productIdsFrom` or `clusterIdsFrom`, filtered by `types` (e.g., `ACCESSORIES`, `RELATED`)

> **Known SDK issue**: `CrossupsellService.getCrossupsells()` may return an HTTP 400 due to undeclared fragment variables in the SDK's internal query. The error is caught silently, and no cross-sells are displayed. This will resolve when the SDK is updated.

### ItemStock (via parent)

Stock display relies on the `ItemStock` component rendered by the parent React copy. When `showStockComponent={true}` and the product has `inventory` data, a stock indicator is shown.
