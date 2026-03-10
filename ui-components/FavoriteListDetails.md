# FavoriteListDetails Component

Renders the contents of a selected favorite list for the logged-in user. Fetches the favorite list by ID, displays products and clusters using the `FavoriteListItem` component, and provides client-side pagination. Delegates item deletion to the parent via callback.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `graphqlClient` | `GraphQLClient` | Yes | - | GraphQL client for the Propeller SDK |
| `user` | `Contact \| Customer` | Yes | - | The logged in user for which the favorite list is going to be displayed |
| `favoriteListId` | `string` | Yes | - | The favorite list ID to fetch and display |
| `onItemDelete` | `(itemId: string) => void` | No | - | Action method for deleting a favorite list item. The component optimistically removes the item from the UI and calls this callback so the parent can handle the SDK deletion |
| `itemsPerPage` | `number` | No | `12` | Number of items to show per page |
| `showPagination` | `boolean` | No | `true` | Show pagination controls below the items |
| `paginationVariant` | `string` | No | `'compact'` | Pagination display variant: `'compact'` or `'full'` |
| `className` | `string` | No | - | Extra CSS class on the root element |
| `configuration` | `object` | No | - | Configuration object for URL generation (e.g., `config` from `@/data/config`) |
| `labels` | `Record<string, string>` | No | - | UI string overrides (see Labels section) |

### FavoriteListItem Display Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `titleLinkable` | `boolean` | `true` | Whether item titles link to the PDP |
| `showStockComponent` | `boolean` | `false` | Show stock availability on items |
| `showSku` | `boolean` | `true` | Display the SKU beneath item names |
| `allowAddToCart` | `boolean` | `true` | Enable add to cart for products |
| `showDelete` | `boolean` | `true` | Show delete button on each item |
| `onItemClick` | `(item: Product \| Cluster) => void` | - | Callback when an item title or image is clicked |

### AddToCart Pass-Through Props (products only)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cartId` | `string` | - | Existing cart ID |
| `createCart` | `boolean` | - | Auto-create cart if none exists |
| `onCartCreated` | `(cart: Cart) => void` | - | Called after a new cart is created |
| `onAddToCart` | `(product, ...) => Cart` | - | Replaces internal add-to-cart logic |
| `afterAddToCart` | `(cart: Cart, item?) => void` | - | Called after every successful add-to-cart |
| `showModal` | `boolean` | `false` | Show modal after successful add |
| `allowIncrDecr` | `boolean` | `true` | Show increment/decrement buttons |
| `enableStockValidation` | `boolean` | `false` | Validate stock before adding to cart |
| `language` | `string` | `'NL'` | Language code for CartService |
| `onProceedToCheckout` | `() => void` | - | Checkout button callback |
| `addToCartLabels` | `Record<string, string>` | - | Label overrides for AddToCart UI |
| `stockLabels` | `Record<string, string>` | - | Label overrides for ItemStock UI |
| `itemLabels` | `Record<string, string>` | - | Label overrides for FavoriteListItem UI |

## Labels

All labels are optional with English defaults:

- `emptyTitle` — Empty state heading (default: "List is empty")
- `emptyDescription` — Empty state description (default: "You haven't added any products or clusters to this list yet.")

## Usage

### Favorites detail page (full integration)

```tsx
<FavoriteListDetails
  graphqlClient={graphqlClient}
  user={authState.user}
  favoriteListId={listId}
  onItemDelete={handleItemDelete}
  configuration={config}
  cartId={cart?.cartId}
  createCart={true}
  onCartCreated={(newCart) => saveCart(newCart)}
  afterAddToCart={(updatedCart) => saveCart(updatedCart)}
  itemsPerPage={12}
  showPagination={true}
/>
```

### Read-only display (no add-to-cart, no delete)

```tsx
<FavoriteListDetails
  graphqlClient={graphqlClient}
  user={authState.user}
  favoriteListId={listId}
  allowAddToCart={false}
  showDelete={false}
  showPagination={false}
/>
```

### With full pagination variant

```tsx
<FavoriteListDetails
  graphqlClient={graphqlClient}
  user={authState.user}
  favoriteListId={listId}
  itemsPerPage={6}
  paginationVariant="full"
/>
```

## Behavior

- **Data fetching**: Fetches the favorite list on mount and when `favoriteListId` changes, using `FavoriteListService.getFavoriteList()` from the SDK.
- **Client-side pagination**: The SDK returns all items in a single response. Pagination is handled client-side by slicing the combined products + clusters array.
- **Optimistic delete**: When an item is deleted, it is immediately removed from the local items array. The `onItemDelete` callback is called so the parent can perform the actual SDK deletion.
- **Page adjustment**: After item removal, if the current page exceeds the total pages, it is automatically adjusted.
- **Empty state**: When the list has no items, a centered message with a heart icon is displayed.
