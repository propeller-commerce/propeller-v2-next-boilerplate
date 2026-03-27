import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# FavoriteLists

Displays a user's favorite lists with full CRUD support: inline renaming, delete confirmation modal, and a create modal. Lists can be limited to the most recently modified N items, making the component suitable for both dedicated pages and compact dashboard widgets.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Full favorites page

All lists visible, with edit/delete actions and a create button.

```tsx
import FavoriteLists from '@/components/propeller/FavoriteLists';
import { useAuth } from '@/context/AuthContext';
import { graphqlClient } from '@/lib/graphql';
import { useRouter } from 'next/navigation';

export default function FavoritesPage() {
  const { state: authState } = useAuth();
  const router = useRouter();

  return (
    <FavoriteLists
      user={authState.user}
      graphqlClient={graphqlClient}
      onListClick={(id) => router.push(`/account/favorites/${id}`)}
    />
  );
}
```

### Dashboard widget with limit

Show only the 3 most recently modified lists, read-only, without the create button.

```tsx
<FavoriteLists
  user={authState.user}
  graphqlClient={graphqlClient}
  limit={3}
  showActions={false}
  allowFavoriteListCreate={false}
  onListClick={(id) => router.push(`/account/favorites/${id}`)}
/>
```

### Custom labels (localization)

Override any label for internationalization or branding.

```tsx
<FavoriteLists
  user={authState.user}
  graphqlClient={graphqlClient}
  onListClick={(id) => router.push(`/account/favorites/${id}`)}
  labels={{
    lastModified: 'Laatst gewijzigd',
    items: 'artikelen',
    defaultBadge: 'Standaard',
    createButton: 'Nieuwe lijst',
    createTitle: 'Nieuwe lijst aanmaken',
    deleteTitle: 'Lijst verwijderen',
    deleteConfirm: 'Weet je zeker dat je wilt verwijderen',
    deleteWarning: 'Deze actie kan niet ongedaan worden gemaakt.',
    noLists: 'Geen favorieten lijsten',
    noListsDescription: 'Maak een nieuwe lijst aan om je producten op te slaan.',
    createFirstList: 'Maak je eerste lijst',
  }}
/>
```

### Custom action handlers

Delegate create, edit, and delete to parent logic instead of using the built-in SDK calls.

```tsx
<FavoriteLists
  user={authState.user}
  graphqlClient={graphqlClient}
  onCreate={(data) => {
    // data: { name: string, isDefault: boolean }
    myCustomCreateHandler(data);
  }}
  onEdit={(listId, data) => {
    myCustomEditHandler(listId, data);
  }}
  onDelete={(listId) => {
    myCustomDeleteHandler(listId);
  }}
  onListClick={(id) => router.push(`/account/favorites/${id}`)}
/>
```

### Minimal read-only display

Strip all metadata and actions for a compact list-name-only view.

```tsx
<FavoriteLists
  user={authState.user}
  graphqlClient={graphqlClient}
  showDefaultIndicator={false}
  showLastModified={false}
  showItemsCount={false}
  showActions={false}
  allowFavoriteListCreate={false}
  onListClick={(id) => router.push(`/account/favorites/${id}`)}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom favorite lists UI while reusing the same data layer:

1. **Initialize the service** with your `GraphQLClient` instance.
2. **Fetch lists** using `getFavoriteLists()` with the appropriate search input for your user type.
3. **Determine user type** by checking for the presence of `contactId` on the user object (`'contactId' in user`). Contact users are B2B; Customer users are B2C.
4. **Sort by recency** if needed: sort the returned `items` array by `updatedAt` descending and slice to your desired limit.
5. **Count items** per list using `list.products.itemsFound` and `list.clusters.itemsFound`. Fall back to `list.products.items.length` if `itemsFound` is not available.
6. **Handle default list switching**: before setting a new list as default, update the current default list to `isDefault: false` first, then set the new one. The API does not auto-unset the previous default.
7. **Error recovery**: wrap mutations in try/catch. On failure, refetch the full list from the API to restore consistent state.

### Service setup

```ts
import { FavoriteListService, FavoriteList } from 'propeller-sdk-v2';

const service = new FavoriteListService(graphqlClient);

// Determine user type
const isContact = 'contactId' in user;
const searchInput = isContact
  ? { contactId: user.contactId }
  : { customerId: user.customerId };
```

### Fetch lists

```ts
async function fetchLists(): Promise<FavoriteList[]> {
  const res = await service.getFavoriteLists(searchInput);
  return res.items || [];
}
```

### Create a list

```ts
async function createList(name: string, isDefault: boolean, currentLists: FavoriteList[]) {
  // If setting as default, unset the current default first
  if (isDefault) {
    const currentDefault = currentLists.find((l) => l.isDefault);
    if (currentDefault) {
      await service.updateFavoriteList(String(currentDefault.id), {
        name: currentDefault.name,
        isDefault: false,
      });
    }
  }

  await service.createFavoriteList({
    name,
    isDefault,
    ...(isContact
      ? { contactId: user.contactId }
      : { customerId: user.customerId }),
  });

  // Refetch to get server-assigned ID and timestamps
  return fetchLists();
}
```

### Rename a list

```ts
async function renameList(listId: string, name: string) {
  // pseudo-code: optimistically update the list name in local state
  try {
    await service.updateFavoriteList(listId, { name });
  } catch {
    // pseudo-code: on error, refetch full list from API to restore consistent state
  }
}
```

### Delete a list

```ts
async function deleteList(listId: string) {
  // pseudo-code: optimistically remove the list from local state
  try {
    await service.deleteFavoriteList(listId);
  } catch {
    // pseudo-code: on error, refetch full list from API to restore consistent state
  }
}
```

### Optimistic update pattern

For rename and delete operations, update the in-memory list immediately to provide instant visual feedback. If the API call fails, refetch the full list from the server to roll back to a consistent state. For create operations, call `onListChanged` which triggers `refreshUser()` on the parent page -- the updated user object flows back as `props.user`, and the component re-reads lists automatically.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required

| Prop | Type | Description |
|------|------|-------------|
| `user` | `Contact \| Customer \| null` | The authenticated user. Lists are fetched for this user's `contactId` (B2B) or `customerId` (B2C). |
| `graphqlClient` | `GraphQLClient` | Initialized SDK GraphQL client used for all API calls. |

### Display options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | `number` | `undefined` | When set, shows only the last N modified lists (sorted by `updatedAt` descending). `undefined` shows all. |
| `showDefaultIndicator` | `boolean` | `true` | Show a "Default" badge next to the default list. |
| `showLastModified` | `boolean` | `true` | Show the last modified date on each list card. |
| `showItemsCount` | `boolean` | `true` | Show the total number of products and clusters in each list. |
| `showActions` | `boolean` | `true` | Show edit and delete buttons on each list card. |
| `allowFavoriteListCreate` | `boolean` | `true` | Show the "Create New List" button (top of list and in empty state). |
| `className` | `string` | `undefined` | Custom CSS class applied to the root container. |

### Callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onListClick` | `(listId: string \| number) => void` | Called when a list card is clicked. Typically used for navigation. |
| `onCreate` | `(data: FavoriteListFormData) => void` | Override default create behavior. When provided, the component delegates to this callback instead of calling the SDK. |
| `onEdit` | `(listId: string, data: FavoriteListFormData) => void` | Override default edit behavior. When provided, the component delegates to this callback instead of calling the SDK. |
| `onDelete` | `(listId: string) => void` | Override default delete behavior. When provided, the component delegates to this callback instead of calling the SDK. |
| `onListChanged` | `() => void` | Called after any list mutation (create, edit, delete) succeeds. Wire this to `refreshUser()` to keep the user object's `favoriteLists` in sync. |

### Formatting and labels

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `formatDate` | `(dateString: string) => string` | `dd/mm/YYYY` | Custom date formatter. Receives the raw ISO date string, returns the display string. |
| `labels` | `object` | English defaults | Localization overrides (see Labels section below). |

### Types

```ts
interface FavoriteListFormData {
  name: string;
  isDefault: boolean;
}
```

This is the shape passed to `onCreate` and `onEdit` callbacks and used internally for create/update API calls.

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
async function manageFavoriteLists(options: FavoriteListsOptions): Promise<void>
```

### Options

| Field | Type | Default | Maps to |
|-------|------|---------|---------|
| `user` | `Contact \| Customer \| null` | (required) | `user` prop |
| `graphqlClient` | `GraphQLClient` | (required) | `graphqlClient` prop |
| `limit` | `number` | `undefined` | `limit` prop |

### Callbacks

| Field | Type | Maps to |
|-------|------|---------|
| `onListClick` | `(listId: string \| number) => void` | `onListClick` prop |
| `onCreate` | `(data: FavoriteListFormData) => void` | `onCreate` prop |
| `onEdit` | `(listId: string, data: FavoriteListFormData) => void` | `onEdit` prop |
| `onDelete` | `(listId: string) => void` | `onDelete` prop |
| `onListChanged` | `() => void` | `onListChanged` prop |

### UI-only props

The following props are UI-specific and do not apply when building your own:

- `showDefaultIndicator` -- Badge visibility
- `showLastModified` -- Date display toggle
- `showItemsCount` -- Item count display toggle
- `showActions` -- Edit/delete button visibility
- `allowFavoriteListCreate` -- Create button visibility
- `className` -- CSS class on root container
- `formatDate` -- Date formatting function
- `labels` -- UI string overrides

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

All labels are optional. Provide any subset to override the English defaults.

| Key | Default | Used in |
|-----|---------|---------|
| `lastModified` | `"Last modified"` | Date label on each list card |
| `items` | `"items"` | Item count label on each list card |
| `products` | `"products"` | Product count (if shown separately) |
| `clusters` | `"clusters"` | Cluster count (if shown separately) |
| `defaultBadge` | `"Default"` | Badge text on the default list |
| `editSave` | `"Save"` | Save button in inline edit form |
| `editCancel` | `"Cancel"` | Cancel button in inline edit form |
| `makeDefault` | `"Make default"` | Checkbox label in edit form |
| `deleteTitle` | `"Delete Favorite List"` | Delete modal heading |
| `deleteConfirm` | `"Are you sure you want to delete"` | Delete modal body text |
| `deleteWarning` | `"This action cannot be undone."` | Delete modal warning |
| `deleteButton` | `"Delete"` | Delete modal confirm button |
| `cancelButton` | `"Cancel"` | Cancel button in modals |
| `createTitle` | `"Create New List"` | Create modal heading |
| `createButton` | `"Create New List"` | Create button above list |
| `createPlaceholder` | `"Enter list name"` | Input placeholder in create modal |
| `setAsDefault` | `"Set as default favorite list"` | Checkbox label in create modal |
| `saveButton` | `"Save"` | Save button in create modal |
| `noLists` | `"No favorite lists"` | Empty state heading |
| `noListsDescription` | `"Start by creating a new list to save your items."` | Empty state description |
| `createFirstList` | `"Create your first list"` | Empty state create button |
| `loading` | `"Loading..."` | Loading state text |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  lastModified: "Last modified",
  items: "items",
  products: "products",
  clusters: "clusters",
  defaultBadge: "Default",
  editSave: "Save",
  editCancel: "Cancel",
  makeDefault: "Make default",
  deleteTitle: "Delete Favorite List",
  deleteConfirm: "Are you sure you want to delete",
  deleteWarning: "This action cannot be undone.",
  deleteButton: "Delete",
  cancelButton: "Cancel",
  createTitle: "Create New List",
  createButton: "Create New List",
  createPlaceholder: "Enter list name",
  setAsDefault: "Set as default favorite list",
  saveButton: "Save",
  noLists: "No favorite lists",
  noListsDescription: "Start by creating a new list to save your items.",
  createFirstList: "Create your first list",
  loading: "Loading...",
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Optimistic updates

The component updates local state immediately after user actions to provide instant feedback, without waiting for the API response:

- **Rename**: The list name and default status update in-place instantly. On API error, the full list is refetched from the server.
- **Delete**: The list is removed from the displayed array instantly. On API error, the full list is refetched.
- **Create**: After the API call succeeds, the component calls `onListChanged` (which triggers `refreshUser` on the parent page). The updated `props.user` flows back down, and the component re-reads lists from `user.favoriteLists.items` via the `useEffect` on `props.user`.
- **Set as default**: When a list is marked as default, the component clears the `isDefault` flag on the previously default list both in local state and via a separate API call before applying the new default.

### Modals

- **Create modal**: Opens from the "Create New List" button. Contains a name input and a "Set as default" checkbox. The save button is disabled when the name is empty. The modal closes on save or cancel.
- **Delete modal**: Opens when the delete button is clicked on a list card. Shows a confirmation prompt with the list name and a warning that the action is irreversible. Confirm triggers deletion; cancel closes the modal.

### Inline editing

Clicking the edit button on a list card replaces the list name and metadata with an inline form containing a name input, a "Make default" checkbox, and save/cancel buttons. Only one list can be edited at a time. Clicking the list card while in edit mode does not trigger `onListClick`.

### Sorting and limiting

When the `limit` prop is set, the component sorts all fetched lists by `updatedAt` descending (most recently modified first) and displays only the first N. Without `limit`, lists are displayed in the order returned by the API.

### Duplicate submission prevention

A `saving` flag prevents double-submissions during async create/edit/delete operations. Buttons are implicitly disabled while a mutation is in flight.

### Hydration safety

The component uses an `isMounted` state guard to prevent server/client hydration mismatches. Content renders only after the component has mounted on the client; a skeleton loader is shown during SSR.

### Loading state

While lists are being fetched, the component renders animated placeholder skeleton cards. The create button and empty state are hidden during loading.

### Empty state

When the user has no favorite lists, the component shows a centered empty state with a heart icon, a heading, a description, and (if `allowFavoriteListCreate` is `true`) a "Create your first list" button that opens the create modal.

### User type detection

The component determines whether the user is a B2B Contact or B2C Customer by checking for the presence of `contactId` on the user object. This determines which search field (`contactId` or `customerId`) is used when fetching and creating lists.

## SDK Services

The component uses `FavoriteListService` from `propeller-sdk-v2` for all CRUD operations.

### Service initialization

```ts
import { FavoriteListService, GraphQLClient } from 'propeller-sdk-v2';

const service = new FavoriteListService(graphqlClient);
```

### Data source

The component reads lists directly from `props.user.favoriteLists.items` — it does **not** call `getFavoriteLists()` from the API. This means the user object (from AuthContext) must already contain populated favorite lists from the authentication response.

Lists are re-read whenever `props.user` changes. After mutations (create/edit/delete), the component calls `onListChanged` so the parent page can call `refreshUser()` to update the user object, which in turn updates the lists. The component does **not** refetch lists via a separate API call after mutations -- it relies entirely on the `props.user` update cycle.

If you are building your own component, you can fetch lists from the API directly:

```ts
import { FavoriteListsSearchInput } from 'propeller-sdk-v2';

// For B2B Contact users
const searchInput: FavoriteListsSearchInput = {
  contactId: user.contactId,
};

// For B2C Customer users
const searchInput: FavoriteListsSearchInput = {
  customerId: user.customerId,
};

const response = await service.getFavoriteLists(searchInput);
const lists = response.items; // FavoriteList[]
```

### Creating a list

```ts
await service.createFavoriteList({
  name: 'My new list',
  isDefault: false,
  contactId: user.contactId, // or customerId for B2C
});
```

### Renaming / updating a list

```ts
await service.updateFavoriteList(listId, {
  name: 'Renamed list',
  isDefault: true,
});
```

### Deleting a list

```ts
await service.deleteFavoriteList(listId);
```

## GraphQL Queries and Mutations

The SDK service methods correspond to the following Propeller GraphQL operations.

### Query: list favorite lists

```graphql
query FavoriteLists($input: FavoriteListsSearchInput) {
  favoriteLists(input: $input) {
    itemsFound
    items {
      id
      name
      isDefault
      updatedAt
      products {
        itemsFound
        items {
          productId
        }
      }
      clusters {
        itemsFound
        items {
          clusterId
        }
      }
    }
  }
}
```

Variables:

```json
{
  "input": {
    "contactId": 123
  }
}
```

### Mutation: create a favorite list

```graphql
mutation CreateFavoriteList($input: FavoriteListCreateInput!) {
  favoriteListCreate(input: $input) {
    id
    name
    isDefault
  }
}
```

Variables:

```json
{
  "input": {
    "name": "Weekend project parts",
    "isDefault": false,
    "contactId": 123
  }
}
```

### Mutation: update a favorite list

```graphql
mutation UpdateFavoriteList($id: ID!, $input: FavoriteListUpdateInput!) {
  favoriteListUpdate(id: $id, input: $input) {
    id
    name
    isDefault
  }
}
```

Variables:

```json
{
  "id": "456",
  "input": {
    "name": "Renamed list",
    "isDefault": true
  }
}
```

### Mutation: delete a favorite list

```graphql
mutation DeleteFavoriteList($id: ID!) {
  favoriteListDelete(id: $id)
}
```

Variables:

```json
{
  "id": "456"
}
```
