# FavoriteListItem Component

Renders a single product or cluster as a horizontal row within a favorite list detail page. Products show an AddToCart widget; clusters show a "View cluster" button. Reuses `AddToCart`, `ItemStock`, and `ProductPriceDisplay` sub-components.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `item` | `Product \| Cluster` | Yes | - | The product or cluster to display |
| `titleLinkable` | `boolean` | No | `true` | Whether the item name and image link to the PDP |
| `showStockComponent` | `boolean` | No | `false` | Display stock availability info |
| `showSku` | `boolean` | No | `true` | Display the SKU beneath the item name |
| `allowAddToCart` | `boolean` | No | `true` | Show AddToCart for products. Clusters always show "View cluster" instead |
| `showDelete` | `boolean` | No | `true` | Show the delete (trash) button |
| `onDelete` | `(itemId: string) => void` | No | - | Callback when delete button is clicked |
| `onItemClick` | `(item: Product \| Cluster) => void` | No | - | Callback when the item name or image is clicked (overrides default navigation) |
| `className` | `string` | No | - | Extra CSS class on the root element |
| `configuration` | `object` | No | - | Configuration object for URL generation (e.g., `config` from `@/data/config`) |
| `labels` | `Record<string, string>` | No | - | UI string overrides (see Labels section) |

### AddToCart Pass-Through Props (products only)

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `graphqlClient` | `GraphQLClient` | No | - | Propeller SDK GraphQL client |
| `user` | `Contact \| Customer \| null` | No | - | Authenticated user for cart operations |
| `cartId` | `string` | No | - | Existing cart ID |
| `createCart` | `boolean` | No | - | Auto-create cart if none exists |
| `onCartCreated` | `(cart: Cart) => void` | No | - | Called after a new cart is created |
| `onAddToCart` | `(product, clusterId?, quantity?, childItems?, notes?, price?, showModal?) => Cart` | No | - | Replaces internal add-to-cart logic |
| `afterAddToCart` | `(cart: Cart, item?: CartMainItem) => void` | No | - | Called after every successful add-to-cart |
| `showModal` | `boolean` | No | `false` | Show modal after successful add |
| `allowIncrDecr` | `boolean` | No | `true` | Show increment/decrement buttons |
| `enableStockValidation` | `boolean` | No | `false` | Validate stock before adding to cart |
| `language` | `string` | No | `'NL'` | Language code for CartService |
| `onProceedToCheckout` | `() => void` | No | - | Called when "Proceed to checkout" is clicked in AddToCart modal |
| `addToCartLabels` | `Record<string, string>` | No | - | Label overrides for AddToCart UI |
| `stockLabels` | `Record<string, string>` | No | - | Label overrides for ItemStock UI |

## Labels

All labels are optional with English defaults:

- `clusterBadge` — Badge text for cluster items (default: "Cluster")
- `viewCluster` — Button text for cluster items (default: "View cluster")
- `delete` — Delete button tooltip (default: "Remove from list")
- `inStock` — Stock badge (default: "In stock")
- `lowStock` — Stock badge (default: "Low stock")
- `outOfStock` — Stock badge (default: "Out of stock")

## Product vs Cluster Behavior

| Feature | Product | Cluster |
|---------|---------|---------|
| Image | From `product.media.images` | From `cluster.defaultProduct.media.images` |
| Name | From `product.names[0].value` | From `cluster.names[0].value` or `defaultProduct.names[0].value` |
| SKU | From `product.sku` | From `cluster.sku` or `defaultProduct.sku` |
| Price | `ProductPriceDisplay` with `product.price` | `ProductPriceDisplay` with `defaultProduct.price` + `cluster.options` |
| Stock | `ItemStock` component | Inline badge (In stock / Low stock / Out of stock) |
| Action | `AddToCart` component | "View cluster" link button |
| Badge | None | "Cluster" badge |

## Usage

### Basic usage on favorites detail page

```tsx
<FavoriteListItem
  item={product}
  graphqlClient={graphqlClient}
  user={authState.user}
  cartId={cart?.cartId}
  createCart={true}
  onCartCreated={(newCart) => saveCart(newCart)}
  afterAddToCart={(updatedCart) => saveCart(updatedCart)}
  configuration={config}
  onDelete={(itemId) => handleRemoveFromList(itemId)}
/>
```

### Read-only (no add-to-cart, no delete)

```tsx
<FavoriteListItem
  item={product}
  allowAddToCart={false}
  showDelete={false}
  configuration={config}
/>
```

### With custom click handler (SPA navigation)

```tsx
<FavoriteListItem
  item={cluster}
  configuration={config}
  onItemClick={(item) => router.push(`/cluster/${item.clusterId}`)}
  onDelete={(itemId) => handleRemoveFromList(itemId)}
/>
```

### Minimal display

```tsx
<FavoriteListItem
  item={product}
  showSku={false}
  showStockComponent={false}
  allowAddToCart={false}
  showDelete={false}
/>
```
