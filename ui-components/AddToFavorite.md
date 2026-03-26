import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# AddToFavorite

A self-contained heart-toggle component that lets authenticated users add or remove a product or cluster from their favorite lists. Renders a heart icon button that opens a modal with list selection.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic product favorite button

```tsx
<AddToFavorite
  graphqlClient={graphqlClient}
  user={user}
  productId={12345}
/>
```

### Cluster favorite button

```tsx
<AddToFavorite
  graphqlClient={graphqlClient}
  user={user}
  clusterId={678}
/>
```

### With custom labels and styling

```tsx
<AddToFavorite
  graphqlClient={graphqlClient}
  user={user}
  productId={12345}
  className="my-custom-class"
  labels={{
    modalTitle: 'Save this product?',
    addToFavorites: 'Save',
    removeFromFavorites: 'Unsave',
    chooseList: 'Pick a list*',
    adding: 'Saving...',
    removing: 'Unsaving...',
    noLists: 'No lists yet. Create one in your account.',
  }}
/>
```

### Inside a product card

```tsx
<div className="relative">
  <ProductImage src={product.image} />
  <div className="absolute top-2 right-2">
    <AddToFavorite
      graphqlClient={graphqlClient}
      user={user}
      productId={product.productId}
    />
  </div>
</div>
```

### Inside a cluster detail page

```tsx
function ClusterDetailPage({ cluster, user, graphqlClient }) {
  return (
    <div className="flex items-center gap-4">
      <h1>{cluster.name}</h1>
      <AddToFavorite
        graphqlClient={graphqlClient}
        user={user}
        clusterId={cluster.clusterId}
      />
    </div>
  );
}
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom favorite toggle, you need three things:

1. **Determine membership** -- Read the user's `favoriteLists.items` array. For each list, check `list.products.items` for matching `productId` or `clusterId`. No extra API call is needed since favorite list contents are included in the user object.

2. **Add/remove via FavoriteListService** -- Instantiate the service with a `GraphQLClient` and call `addFavoriteListItems` or `removeFavoriteListItems` with the list ID and an input object containing `productIds` or `clusterIds`.

3. **Refresh user data after mutation** -- After adding or removing, call `refreshUser()` from AuthContext on the parent page. The component itself only fires `onFavoriteChanged` -- it does not refresh the user object internally.

```ts
const service = new FavoriteListService(graphqlClient);

// Add
await service.addFavoriteListItems(listId, { productIds: [productId] });

// Remove
await service.removeFavoriteListItems(listId, { productIds: [productId] });

// Parent page wires onFavoriteChanged to refreshUser():
// <AddToFavorite ... onFavoriteChanged={() => refreshUser()} />
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required

| Prop | Type | Description |
|------|------|-------------|
| `graphqlClient` | `GraphQLClient` | Initialized SDK client for API calls |
| `user` | `Contact \| Customer \| null` | Authenticated user object. Component renders nothing when `null` |

### Item identification (provide one)

| Prop | Type | Description |
|------|------|-------------|
| `productId` | `number` | Product ID to favorite. Takes precedence over `clusterId` |
| `clusterId` | `number` | Cluster ID to favorite. Used when `productId` is not set |

### Callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onFavoriteChanged` | `() => void` | Called after a favorite list mutation (add/remove) succeeds. Wire this to `refreshUser()` on the parent page to sync the user object |

### Customization

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | `''` | Extra CSS class on the root button element |
| `labels` | `Record<string, string>` | See below | UI string overrides |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
// Add to a favorite list
async function addFavoriteListItems(
  listId: string,
  input: { productIds?: number[]; clusterIds?: number[] }
): Promise<FavoriteList>

// Remove from a favorite list
async function removeFavoriteListItems(
  listId: string,
  input: { productIds?: number[]; clusterIds?: number[] }
): Promise<FavoriteList>
```

### Options table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `listId` | `string` | *required* | First argument to `addFavoriteListItems` / `removeFavoriteListItems` |
| `productIds` | `number[]` | -- | `input.productIds` |
| `clusterIds` | `number[]` | -- | `input.clusterIds` |

### Callbacks table

| Callback | Purpose |
|---|---|
| `onFavoriteChanged` | Notify parent to refresh user data after a mutation |

### UI-only props (no SDK equivalent)

The following props control visual presentation only and have no SDK counterpart: `className`, `labels`.

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default |
|-----|---------|
| `modalTitle` | `'Favorite product?'` |
| `addToFavorites` | `'Add to favorites'` |
| `removeFromFavorites` | `'Remove from favorites'` |
| `chooseList` | `'Choose a favorites list*'` |
| `adding` | `'Adding...'` |
| `removing` | `'Removing...'` |
| `noLists` | `'You have no favorite lists. Create one in your account first.'` |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  modalTitle: 'Favorite product?',
  addToFavorites: 'Add to favorites',
  removeFromFavorites: 'Remove from favorites',
  chooseList: 'Choose a favorites list*',
  adding: 'Adding...',
  removing: 'Removing...',
  noLists: 'You have no favorite lists. Create one in your account first.',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Heart icon state

The heart button has two visual states:

- **Unfavorited** (outline heart) -- The item is not in any of the user's favorite lists. The button has a gray border and gray icon, with a hover effect that transitions to the primary color.
- **Favorited** (filled heart) -- The item is in at least one favorite list. The button uses the primary color with a subtle background tint.

The icon state is derived from `memberListIds.size > 0`. Membership is computed locally from the user's `favoriteLists.items` -- no separate API call is made to check membership.

### Toggle behavior

Clicking the heart button opens a centered modal overlay. The modal shows:

1. **Member lists** (lists that already contain this item) -- Each displayed with a checked checkbox icon. Clicking a list removes the item from that list. A "Remove from favorites" button removes the item from the first member list.
2. **Non-member lists** (lists that do not contain this item) -- Shown in a dropdown selector. Selecting a list and clicking "Add to favorites" adds the item.
3. **No lists** -- If the user has no favorite lists at all, a message prompts them to create one in their account.

### List selection

The dropdown for adding to a list shows only lists where the item is **not** already a member. After adding, that list moves to the "member lists" section. After removing from all lists, the heart icon reverts to the outline (unfavorited) state.

### Optimistic updates

After a successful add or remove, the component updates `memberListIds` immediately so the UI reflects the change instantly. It then calls `onFavoriteChanged` so the parent can refresh the user object. Loading flags (`addLoading` / `removeLoading`) prevent duplicate API calls while a mutation is in flight.

### List selection

When the modal opens, the first non-member list is auto-selected in the dropdown. After each add or remove operation, `selectedListId` is reset to empty.

### Authentication guard

The entire component is wrapped in a `Show when={props.user}` guard. When the user is `null` (not logged in), nothing renders. There is no unauthenticated fallback -- the button simply does not appear.

### Hydration safety

The modal is guarded by `_isMounted` state to prevent hydration mismatches. The mount flag is set on the client side only, so the modal overlay never renders during server-side rendering.

## GraphQL Mutations

### addFavoriteListItems

```graphql
mutation addFavoriteListItems($listId: String!, $input: FavoriteListItemsInput!) {
  addFavoriteListItems(favoriteListId: $listId, input: $input) {
    id
    name
    products {
      items {
        productId
        clusterId
      }
    }
  }
}
```

Called with:

```ts
// For a product
service.addFavoriteListItems("42", { productIds: [12345] });

// For a cluster
service.addFavoriteListItems("42", { clusterIds: [678] });
```

### removeFavoriteListItems

```graphql
mutation removeFavoriteListItems($listId: String!, $input: FavoriteListItemsInput!) {
  removeFavoriteListItems(favoriteListId: $listId, input: $input) {
    id
    name
    products {
      items {
        productId
        clusterId
      }
    }
  }
}
```

Called with the same input shape as add.

## SDK Services

The component uses **`FavoriteListService`** from `propeller-sdk-v2` internally:

- **`addFavoriteListItems(listId, input)`** -- Adds a product or cluster to a favorite list. Input is `{ productIds: [id] }` or `{ clusterIds: [id] }`.
- **`removeFavoriteListItems(listId, input)`** -- Removes a product or cluster from a favorite list. Same input shape.

The component does **not** call `UserService.getViewer()` or refresh user data itself. Instead, after a successful mutation it calls the `onFavoriteChanged` callback, and the parent page is responsible for refreshing the user object (e.g., via `AuthContext.refreshUser()`).
