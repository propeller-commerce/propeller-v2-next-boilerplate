import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# FavoriteListDetails

Renders the contents of a favorite list, displaying products and clusters with client-side pagination. Each item is rendered via `FavoriteListItem` and supports add-to-cart, deletion, stock display, and navigation.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Full integration on a favorites detail page

```tsx
import FavoriteListDetails from '@/components/propeller/FavoriteListDetails';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { getGraphqlClient } from '@/lib/graphql';
import config from '@/data/config';

const graphqlClient = getGraphqlClient();
const { state: authState } = useAuth();
const { cart, saveCart } = useCart();

<FavoriteListDetails
  graphqlClient={graphqlClient}
  user={authState.user}
  favoriteListId={listId}
  onItemDelete={handleItemDelete}
  onListLoaded={(list) => setPageTitle(list.name)}
  configuration={config}
  cartId={cart?.cartId}
  createCart={true}
  onCartCreated={(newCart) => saveCart(newCart)}
  afterAddToCart={(updatedCart) => saveCart(updatedCart)}
  itemsPerPage={12}
  showPagination={true}
/>
```

### Read-only display (no cart actions, no delete)

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

### Compact preview with limited items per page

```tsx
<FavoriteListDetails
  graphqlClient={graphqlClient}
  user={authState.user}
  favoriteListId={listId}
  itemsPerPage={4}
  paginationVariant="compact"
  showStockComponent={true}
  showSku={false}
  labels={{
    emptyTitle: 'No items yet',
    emptyDescription: 'Start adding products to this list.',
  }}
/>
```

### Full pagination variant with custom item labels

```tsx
<FavoriteListDetails
  graphqlClient={graphqlClient}
  user={authState.user}
  favoriteListId={listId}
  itemsPerPage={6}
  paginationVariant="full"
  itemLabels={{ deleteButton: 'Remove', viewCluster: 'View options' }}
  addToCartLabels={{ addButton: 'Add to basket' }}
/>
```

### With stock validation and checkout flow

```tsx
<FavoriteListDetails
  graphqlClient={graphqlClient}
  user={authState.user}
  favoriteListId={listId}
  cartId={cart?.cartId}
  createCart={true}
  onCartCreated={(newCart) => saveCart(newCart)}
  afterAddToCart={(updatedCart) => saveCart(updatedCart)}
  showStockComponent={true}
  showAvailability={true}
  showStock={true}
  enableStockValidation={true}
  showModal={true}
  onProceedToCheckout={() => router.push('/checkout')}
  configuration={config}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom favorite list detail view, you need:

1. **Fetch the list** -- Create a `FavoriteListService` and call `getFavoriteList()` with the list ID, language, price input, and image filters.

2. **Merge products and clusters** -- The response separates products and clusters into two `ProductsResponse` objects. Combine them into a single array for rendering.

3. **Handle pagination** -- The SDK returns all items at once. Slice the merged array client-side based on page size and current page.

4. **Handle deletion** -- Remove the item from local state optimistically, then call the SDK to persist the deletion. The `FavoriteListService` provides `removeProductFromFavoriteList()` and `removeClusterFromFavoriteList()` for this.

5. **Determine item type** -- Check for `productId` vs `clusterId` on each item to distinguish products from clusters. This matters for deletion (different SDK methods) and for display (clusters show "View cluster" instead of add-to-cart).

```tsx
import { FavoriteListService, GraphQLClient } from 'propeller-sdk-v2';

const service = new FavoriteListService(graphqlClient);

// Fetch
const list = await service.getFavoriteList({
  id: listId,
  language: 'NL',
  priceCalculateProductInput: { taxZone: 'NL', customerId: user.customerId },
  imageSearchFilters: { page: 1, offset: 1 },
  imageVariantFilters: {
    transformations: [{
      name: 'cart_thumb',
      transformation: { format: 'WEBP', height: 200, width: 200, fit: 'BOUNDS' },
    }],
  },
});

// Merge items
const allItems = [
  ...(list.products?.items || []),
  ...(list.clusters?.items || []),
];

// Delete a product
await service.removeProductFromFavoriteList({
  favoriteListId: listId,
  productId: itemId,
});

// Delete a cluster
await service.removeClusterFromFavoriteList({
  favoriteListId: listId,
  clusterId: itemId,
});
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Core

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `graphqlClient` | `GraphQLClient` | Yes | -- | GraphQL client instance for the Propeller SDK |
| `user` | `Contact \| Customer` | Yes | -- | Logged-in user whose favorite list is displayed |
| `favoriteListId` | `string` | Yes | -- | ID of the favorite list to fetch |
| `configuration` | `object` | No | -- | Configuration object for URL generation (e.g., `config` from `@/data/config`) |
| `className` | `string` | No | -- | Extra CSS class on the root element |
| `language` | `string` | No | `'NL'` | Language code forwarded to the SDK for localized data |
| `includeTax` | `boolean` | No | -- | Whether prices include tax. Pass from your price context |

### Callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onItemDelete` | `(itemId: string, itemType: string) => void` | Called after an item is optimistically removed. `itemType` is `'product'` or `'cluster'`. The parent should perform the actual SDK deletion |
| `onListLoaded` | `(list: FavoriteList) => void` | Called after the favorite list is fetched, with the full list object. Useful for setting the page title |
| `onItemClick` | `(item: Product \| Cluster) => void` | Called when an item title or image is clicked |

### Item Display

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `titleLinkable` | `boolean` | `true` | Whether item titles link to the product detail page |
| `showStockComponent` | `boolean` | `false` | Show stock availability indicator on items |
| `showAvailability` | `boolean` | `true` | Show availability status text (e.g., "In stock") inside stock indicator |
| `showStock` | `boolean` | `true` | Show numeric stock quantity inside stock indicator |
| `showSku` | `boolean` | `true` | Display the SKU beneath item names |
| `allowAddToCart` | `boolean` | `true` | Enable add-to-cart for products. Clusters show a "View cluster" link instead |
| `showDelete` | `boolean` | `true` | Show the delete button on each item |

### Pagination

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `itemsPerPage` | `number` | `12` | Number of items shown per page |
| `showPagination` | `boolean` | `true` | Show pagination controls below items |
| `paginationVariant` | `string` | `'compact'` | Pagination style: `'compact'` or `'full'` |

### Add-to-Cart (passed through to each FavoriteListItem / AddToCart)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cartId` | `string` | -- | Existing cart ID to add items to |
| `createCart` | `boolean` | -- | Auto-create a cart if none exists |
| `onCartCreated` | `(cart: Cart) => void` | -- | Called when a new cart is created internally |
| `onAddToCart` | `(product, clusterId?, quantity?, childItems?, notes?, price?, showModal?) => Cart` | -- | Fully replaces the internal add-to-cart call |
| `afterAddToCart` | `(cart: Cart, item?: CartMainItem) => void` | -- | Called after every successful add-to-cart |
| `showModal` | `boolean` | `false` | Show confirmation modal after adding to cart |
| `allowIncrDecr` | `boolean` | `true` | Render increment/decrement buttons beside quantity input |
| `enableStockValidation` | `boolean` | `false` | Validate available stock before adding to cart |
| `onProceedToCheckout` | `() => void` | -- | Called when "Proceed to checkout" is clicked in the add-to-cart modal |

### Labels

| Prop | Type | Description |
|------|------|-------------|
| `labels` | `Record<string, string>` | UI string overrides for the component itself (see below) |
| `addToCartLabels` | `Record<string, string>` | Label overrides passed to AddToCart |
| `stockLabels` | `Record<string, string>` | Label overrides passed to ItemStock |
| `itemLabels` | `Record<string, string>` | Label overrides passed to FavoriteListItem |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
async function fetchFavoriteListDetails(options: FavoriteListDetailsOptions): Promise<FavoriteListResult>
```

### Options

| Field | Type | Default | Maps to |
|-------|------|---------|---------|
| `graphqlClient` | `GraphQLClient` | (required) | `graphqlClient` prop |
| `user` | `Contact \| Customer` | (required) | `user` prop |
| `favoriteListId` | `string` | (required) | `favoriteListId` prop |
| `language` | `string` | `'NL'` | `language` prop |
| `includeTax` | `boolean` | `false` | `includeTax` prop |
| `itemsPerPage` | `number` | `12` | `itemsPerPage` prop |

### Cart resolution

When integrating cart functionality:

| Field | Type | Default | Maps to |
|-------|------|---------|---------|
| `cartId` | `string` | -- | `cartId` prop |
| `createCart` | `boolean` | -- | `createCart` prop |

### Callbacks

| Field | Type | Maps to |
|-------|------|---------|
| `onItemDelete` | `(itemId: string, itemType: string) => void` | `onItemDelete` prop |
| `onListLoaded` | `(list: FavoriteList) => void` | `onListLoaded` prop |
| `onItemClick` | `(item: Product \| Cluster) => void` | `onItemClick` prop |
| `onCartCreated` | `(cart: Cart) => void` | `onCartCreated` prop |
| `afterAddToCart` | `(cart: Cart, item?: CartMainItem) => void` | `afterAddToCart` prop |

### UI-only props

The following props are UI-specific and do not apply when building your own:

- `className` -- CSS class on root element
- `titleLinkable` -- Link styling for item titles
- `showStockComponent`, `showAvailability`, `showStock`, `showSku` -- Display toggles
- `allowAddToCart`, `showDelete` -- Action visibility toggles
- `showPagination`, `paginationVariant` -- Pagination display options
- `showModal`, `allowIncrDecr` -- AddToCart UI options
- `configuration` -- URL generation config (implement your own URL scheme)

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

**`labels` keys:**

| Key | Default |
|-----|---------|
| `emptyTitle` | `"List is empty"` |
| `emptyDescription` | `"You haven't added any products or clusters to this list yet."` |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  emptyTitle: "List is empty",
  emptyDescription: "You haven't added any products or clusters to this list yet.",
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

- **Data fetching**: Fetches the favorite list on mount via `FavoriteListService.getFavoriteList()`. Re-fetches automatically whenever `favoriteListId` changes. Tracks the previous list ID internally to prevent duplicate fetches when the same ID is passed.
- **User-aware pricing**: Price calculation variables adapt to the user type -- `customerId` for B2C customers, `contactId` and `companyId` for B2B contacts.
- **Client-side pagination**: The SDK returns all items in a single response. The component slices the combined products + clusters array based on `itemsPerPage` and the current page.
- **Optimistic delete**: When an item is deleted, it is immediately removed from the local array before calling the `onItemDelete` callback. The parent is responsible for the actual SDK deletion call.
- **Page adjustment**: After removing an item, if the current page exceeds the new total page count, the component automatically navigates to the last available page.
- **Loading skeleton**: While fetching, three placeholder rows with animated pulse styling are shown.
- **Empty state**: When the list contains no items, a centered message with a heart icon and customizable text is displayed.
- **Hydration safety**: Uses an `isMounted` guard to prevent rendering client-only content during server-side rendering.
- **Item type detection**: Products are identified by the presence of `productId`, clusters by `clusterId`. This determines whether add-to-cart or a "View cluster" link is shown.

## SDK Services

The component uses **`FavoriteListService`** from `propeller-sdk-v2` to fetch the favorite list and its items.

### How it works

1. A `FavoriteListService` instance is created from the provided `graphqlClient`.
2. `service.getFavoriteList(variables)` is called with variables built internally from props.
3. The response contains the list metadata plus `products` and `clusters` as `ProductsResponse` objects. Both are merged into a single array for display.

### Variables built internally

The component constructs query variables automatically based on props:

```ts
{
  id: props.favoriteListId,
  language: props.language || 'NL',
  priceCalculateProductInput: {
    taxZone: 'NL',
    customerId: /* from user if Customer */,
    contactId: /* from user if Contact */,
    companyId: /* from user.company if Contact */,
  },
  imageSearchFilters: { page: 1, offset: 1 },
  imageVariantFilters: {
    transformations: [{
      name: 'cart_thumb',
      transformation: { format: 'WEBP', height: 200, width: 200, fit: 'BOUNDS' },
    }],
  },
}
```

Price calculation input adapts to the user type: `customerId` for B2C `Customer` users, `contactId` + `companyId` for B2B `Contact` users.

**Note:** `taxZone` is hardcoded to `'NL'` — there is no prop to override it (unlike ProductGrid which accepts a `taxZone` prop). Image filters are also hardcoded to `page: 1, offset: 1` search filters and `cart_thumb` 200x200 WEBP variant.

## GraphQL Queries and Mutations

The SDK's `FavoriteListService.getFavoriteList()` sends a query similar to:

```graphql
query FavoriteList(
  $id: String!
  $language: String
  $priceCalculateProductInput: PriceCalculateProductInput
  $imageSearchFilters: ImageSearchInput
  $imageVariantFilters: ImageVariantSearchInput
) {
  favoriteList(id: $id) {
    id
    name
    description
    products(
      language: $language
      calculatePrice: $priceCalculateProductInput
    ) {
      items {
        productId
        sku
        name {
          value
        }
        price {
          net
          gross
        }
        media(input: $imageSearchFilters) {
          images(input: $imageVariantFilters) {
            url
          }
        }
        inventory {
          totalQuantity
        }
      }
    }
    clusters(
      language: $language
      calculatePrice: $priceCalculateProductInput
    ) {
      items {
        clusterId
        sku
        name {
          value
        }
        price {
          net
          gross
        }
        media(input: $imageSearchFilters) {
          images(input: $imageVariantFilters) {
            url
          }
        }
      }
    }
  }
}
```
