import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# FavoriteListItem

Renders a single product or cluster as a horizontal row within a favorite list. Products display an inline AddToCart widget; clusters display a "View cluster" button. Each row includes an image, name, optional SKU, price, stock badge, and action buttons (add to cart, delete).

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Standard favorite list page with cart integration

```tsx
import FavoriteListItem from '@/components/propeller/FavoriteListItem';
import config from '@/data/config';

{items.map((item) => (
  <FavoriteListItem
    key={item.productId ?? item.clusterId}
    item={item}
    graphqlClient={graphqlClient}
    user={authState.user}
    cartId={cart?.cartId}
    createCart={true}
    onCartCreated={(newCart) => saveCart(newCart)}
    afterAddToCart={(updatedCart) => saveCart(updatedCart)}
    configuration={config}
    onDelete={(itemId) => handleRemoveFromList(itemId)}
  />
))}
```

### Read-only display (no actions)

```tsx
<FavoriteListItem
  item={product}
  allowAddToCart={false}
  showDelete={false}
  configuration={config}
/>
```

### SPA navigation with custom click handler

```tsx
<FavoriteListItem
  item={cluster}
  configuration={config}
  onItemClick={(item) => router.push(getClusterUrl(item))}
  onDelete={(itemId) => handleRemoveFromList(itemId)}
/>
```

### Minimal display (image + name only)

```tsx
<FavoriteListItem
  item={product}
  showSku={false}
  showStockComponent={false}
  allowAddToCart={false}
  showDelete={false}
/>
```

### With stock display and custom labels

```tsx
<FavoriteListItem
  item={product}
  showStockComponent={true}
  showAvailability={true}
  showStock={true}
  graphqlClient={graphqlClient}
  user={authState.user}
  cartId={cart?.cartId}
  configuration={config}
  onDelete={(itemId) => handleRemoveFromList(itemId)}
  labels={{
    viewCluster: 'Bekijk cluster',
    delete: 'Verwijderen',
    inStock: 'Op voorraad',
    lowStock: 'Beperkte voorraad',
    outOfStock: 'Niet op voorraad',
  }}
  addToCartLabels={{ addToCart: 'In winkelwagen' }}
  stockLabels={{ inStock: 'Op voorraad' }}
/>
```

### With price excluding VAT

```tsx
<FavoriteListItem
  item={product}
  includeTax={false}
  graphqlClient={graphqlClient}
  configuration={config}
  onDelete={(itemId) => handleRemoveFromList(itemId)}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To create a custom favorite list item component, you need to handle these concerns:

1. **Item type detection** -- Check for `'productId' in item` to distinguish products from clusters.

2. **Data extraction** -- Products and clusters have different shapes for names, SKU, images, and prices. Always use optional chaining since these fields can be null.

3. **URL generation** -- Use the configuration object's URL helpers (`getProductUrl`, `getClusterUrl`) or build URLs manually from the item's slug/ID.

4. **Price display** -- Read `price.net` (incl. VAT) or `price.gross` (excl. VAT) depending on the user's preference. For clusters, use `defaultProduct.price`.

5. **Stock display** -- Products have a full `inventory` object compatible with the ItemStock component. Clusters only expose `defaultProduct.inventory.totalQuantity`, so you need simpler threshold-based logic (e.g., > 5 = in stock, 1-5 = low, 0 = out of stock).

6. **Cart integration** -- Use the AddToCart component or call `CartService.addItemToCart()` directly. Clusters cannot be added to cart directly; the user must visit the cluster page first.

7. **Delete handling** -- Call `FavoriteListService.removeFavoriteListItem()` with the list ID and item ID. Update local state optimistically for a responsive UI.

```tsx
// Minimal custom implementation skeleton
function CustomFavoriteItem({ item, onDelete, graphqlClient, cartId }) {
  const isProduct = 'productId' in item;
  const name = item.names?.[0]?.value || 'Unnamed';
  const price = isProduct
    ? item.price?.net
    : item.defaultProduct?.price?.net;

  return (
    <div className="flex items-center gap-4 p-4 border rounded">
      <span>{name}</span>
      {price != null && <span>EUR {price.toFixed(2)}</span>}

      {isProduct && graphqlClient && (
        <AddToCart
          graphqlClient={graphqlClient}
          product={item}
          cartId={cartId}
        />
      )}

      <button onClick={() => onDelete(
        String(isProduct ? item.productId : item.clusterId)
      )}>
        Remove
      </button>
    </div>
  );
}
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Core Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `item` | `Product \| Cluster` | Yes | -- | The product or cluster to display |
| `configuration` | `object` | No | -- | Configuration object for URL generation (e.g., `config` from `@/data/config`). Must expose `urls.getProductUrl()` and `urls.getClusterUrl()` |
| `className` | `string` | No | -- | Extra CSS class applied to the root element |

### Display Options

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `titleLinkable` | `boolean` | No | `true` | Whether the item name and image link to the product detail page |
| `showSku` | `boolean` | No | `true` | Display the SKU beneath the item name |
| `showStockComponent` | `boolean` | No | `false` | Display stock availability badge |
| `showAvailability` | `boolean` | No | `true` | Show availability status text inside ItemStock (products only) |
| `showStock` | `boolean` | No | `true` | Show numeric stock quantity inside ItemStock (products only) |
| `includeTax` | `boolean` | No | `false` | Include tax in the displayed price. When provided, overrides the internal PriceToggle localStorage state |

### Action Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `allowAddToCart` | `boolean` | No | `true` | Show the AddToCart widget for products. Clusters always show a "View cluster" button instead |
| `showDelete` | `boolean` | No | `true` | Show the delete (trash) button |
| `onDelete` | `(itemId: string) => void` | No | -- | Callback when the delete button is clicked. Receives the product ID or cluster ID as a string |
| `onItemClick` | `(item: Product \| Cluster) => void` | No | -- | Callback when the row, item name, or image is clicked. Prevents default `<a>` navigation when provided |

### Label Overrides

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `labels` | `Record<string, string>` | No | -- | UI string overrides for the component itself (see Labels section below) |
| `addToCartLabels` | `Record<string, string>` | No | -- | Label overrides forwarded to the embedded AddToCart component |
| `stockLabels` | `Record<string, string>` | No | -- | Label overrides forwarded to the embedded ItemStock component |

### AddToCart Pass-Through Props (products only)

These props are forwarded to the embedded AddToCart component and only take effect when the item is a product.

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `graphqlClient` | `GraphQLClient` | No | -- | Propeller SDK GraphQL client. Required for add-to-cart functionality |
| `user` | `Contact \| Customer \| null` | No | -- | Authenticated user for cart operations |
| `cartId` | `string` | No | -- | Existing cart ID to add items to |
| `createCart` | `boolean` | No | -- | Auto-create a new cart if no `cartId` is available |
| `onCartCreated` | `(cart: Cart) => void` | No | -- | Called after a new cart is created internally |
| `onAddToCart` | `(product, clusterId?, quantity?, childItems?, notes?, price?, showModal?) => Cart` | No | -- | Fully replaces the internal CartService.addItemToCart call |
| `afterAddToCart` | `(cart: Cart, item?: CartMainItem) => void` | No | -- | Called after every successful add-to-cart |
| `showModal` | `boolean` | No | `false` | Show confirmation modal after a successful add |
| `allowIncrDecr` | `boolean` | No | `true` | Show increment/decrement buttons beside the quantity input |
| `enableStockValidation` | `boolean` | No | `false` | Validate available stock before adding to cart |
| `language` | `string` | No | `'NL'` | Language code forwarded to CartService |
| `onProceedToCheckout` | `() => void` | No | -- | Called when "Proceed to checkout" is clicked in the AddToCart modal |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function favoriteListItem(options: FavoriteListItemOptions): void
```

### Options

| Field | Type | Default | Maps to |
|-------|------|---------|---------|
| `item` | `Product \| Cluster` | (required) | `item` prop |
| `graphqlClient` | `GraphQLClient` | -- | `graphqlClient` prop |
| `user` | `Contact \| Customer \| null` | -- | `user` prop |
| `cartId` | `string` | -- | `cartId` prop |
| `createCart` | `boolean` | -- | `createCart` prop |
| `includeTax` | `boolean` | `false` | `includeTax` prop |
| `language` | `string` | `'NL'` | `language` prop |

### Cart resolution

When integrating cart functionality:

| Field | Type | Default | Maps to |
|-------|------|---------|---------|
| `cartId` | `string` | -- | `cartId` prop |
| `createCart` | `boolean` | -- | `createCart` prop |

### Callbacks

| Field | Type | Maps to |
|-------|------|---------|
| `onDelete` | `(itemId: string) => void` | `onDelete` prop |
| `onItemClick` | `(item: Product \| Cluster) => void` | `onItemClick` prop |
| `onCartCreated` | `(cart: Cart) => void` | `onCartCreated` prop |
| `afterAddToCart` | `(cart: Cart, item?: CartMainItem) => void` | `afterAddToCart` prop |

### UI-only props

The following props are UI-specific and do not apply when building your own:

- `className` -- CSS class on root element
- `titleLinkable` -- Link styling for item titles
- `showSku`, `showStockComponent`, `showAvailability`, `showStock` -- Display toggles
- `allowAddToCart`, `showDelete` -- Action visibility toggles
- `showModal`, `allowIncrDecr`, `enableStockValidation` -- AddToCart UI options
- `configuration` -- URL generation config (implement your own URL scheme)
- `labels`, `addToCartLabels`, `stockLabels` -- UI string overrides

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

All labels are optional and fall back to English defaults:

| Key | Default | Description |
|-----|---------|-------------|
| `viewCluster` | `"View cluster"` | Button text for cluster items |
| `delete` | `"Remove from list"` | Delete button tooltip |
| `inStock` | `"In stock"` | Stock badge for clusters with quantity > 5 |
| `lowStock` | `"Low stock"` | Stock badge for clusters with quantity 1-5 |
| `outOfStock` | `"Out of stock"` | Stock badge for clusters with quantity 0 |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  viewCluster: "View cluster",
  delete: "Remove from list",
  inStock: "In stock",
  lowStock: "Low stock",
  outOfStock: "Out of stock",
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Product vs Cluster Differences

| Feature | Product | Cluster |
|---------|---------|---------|
| Image source | `product.media.images.items[0]` | `cluster.defaultProduct.media.images.items[0]` |
| Name source | `product.names[0].value` | `cluster.names[0].value`, falls back to `defaultProduct.names[0].value` |
| SKU source | `product.sku` | `cluster.sku`, falls back to `defaultProduct.sku` |
| Price source | `product.price` | `cluster.defaultProduct.price` |
| Stock display | Full `ItemStock` component with availability and quantity | Simplified inline badge (In stock / Low stock / Out of stock) based on `defaultProduct.inventory.totalQuantity` |
| Primary action | AddToCart widget (quantity input + add button) | "View cluster" link button |
| Detection | Has `productId` property | Does not have `productId` property |

### Price Toggle

The component respects the global price toggle (VAT incl/excl):

- When `includeTax` prop is provided, it takes precedence over any internal state.
- When `includeTax` is omitted, the default is `false` (prices shown excluding VAT).
- Price mapping from the SDK: `price.net` = including VAT, `price.gross` = excluding VAT.
- Prices are formatted as euros with two decimal places (e.g., `EUR 12.50`).

### Remove from List

The delete button calls `onDelete(itemId)` where `itemId` is:
- `String(product.productId)` for products
- `String(cluster.clusterId)` for clusters

The component does not perform the API call itself. The parent must handle the actual removal via `FavoriteListService` and update local state accordingly.

### Add to Cart

For products, the embedded AddToCart component handles the full cart flow:
1. If no `cartId` is provided and `createCart` is `true`, a new cart is created automatically.
2. The product is added to the cart via `CartService.addItemToCart`.
3. `onCartCreated` fires if a new cart was created; `afterAddToCart` fires after every successful addition.
4. When `showModal` is `true`, a confirmation modal appears after adding.

Clusters do not support add-to-cart. They display a "View cluster" button that navigates to the cluster detail page, where the user can select a specific variant.

### Click Handling

The entire row is clickable. Clicking navigates to the product/cluster detail page using the URL from `configuration.urls.getProductUrl()` or `configuration.urls.getClusterUrl()`. When `onItemClick` is provided, it intercepts the click and calls the callback instead, allowing SPA navigation via `router.push()`. The action buttons area (add to cart, delete) stops event propagation to prevent triggering the row click.

### Image Fallback

When no image is available, an SVG placeholder icon is rendered instead of a broken image.

## SDK Services

### FavoriteListService

The component itself does not call any SDK service directly. The parent page is responsible for fetching favorite list items and handling deletion. A typical integration uses `FavoriteListService` to remove items:

```ts
import { FavoriteListService } from 'propeller-sdk-v2';

const favoriteListService = new FavoriteListService(graphqlClient);

async function handleRemoveFromList(itemId: string) {
  await favoriteListService.removeFavoriteListItem({
    favoriteListId: listId,
    itemId,
  });
  // Re-fetch the list or optimistically remove from local state
  setItems((prev) => prev.filter((i) =>
    String('productId' in i ? i.productId : i.clusterId) !== itemId
  ));
}
```

### CartService (via AddToCart)

When `graphqlClient` is provided and the item is a product, the embedded AddToCart component uses `CartService` internally to add items to the cart:

```ts
import { CartService } from 'propeller-sdk-v2';

const cartService = new CartService(graphqlClient);

// AddToCart handles this internally, but you can override via onAddToCart:
const updatedCart = await cartService.addItemToCart({
  cartId,
  productId: product.productId,
  quantity: 1,
});
```

## GraphQL Queries and Mutations

### Remove item from favorite list

```graphql
mutation RemoveFavoriteListItem($favoriteListId: Int!, $itemId: String!) {
  favoriteListRemoveItem(
    input: {
      favoriteListId: $favoriteListId
      itemId: $itemId
    }
  ) {
    id
    name
    items {
      productId
      clusterId
    }
  }
}
```

### Add product to cart (handled by embedded AddToCart)

```graphql
mutation AddToCart($cartId: String!, $productId: Int!, $quantity: Int!) {
  cartAddItem(
    input: {
      cartId: $cartId
      productId: $productId
      quantity: $quantity
    }
  ) {
    cartId
    items {
      productId
      quantity
      totalPrice
    }
    total {
      totalNet
      totalGross
    }
  }
}
```
