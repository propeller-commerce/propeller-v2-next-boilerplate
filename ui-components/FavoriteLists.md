# FavoriteLists Component

Displays a list of the user's favorite lists with inline edit, delete confirmation modal, and create modal. Supports showing all lists or limiting to the last N most recently modified.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `graphqlClient` | `GraphQLClient` | Yes | - | GraphQL client for the Propeller SDK |
| `user` | `Contact \| Customer` | Yes | - | The logged in user for which favorites lists are going to be listed for |
| `onListClick` | `(listId: string \| number) => void` | No | - | Callback when a list name is clicked (parent handles navigation) |
| `limit` | `number` | No | - | Show only the last N modified lists. `undefined` = show all |
| `showDefaultIndicator` | `boolean` | No | `true` | Displays the "Default" badge in the favorite list |
| `showLastModified` | `boolean` | No | `true` | Displays the last modified date the favorite list |
| `showItemsCount` | `boolean` | No | `true` | Displays number of products and clusters contained in the favorite list |
| `showActions` | `boolean` | No | `true` | Displays the actions "Edit" and "Delete" the favorite list |
| `allowFavoriteListCreate` | `boolean` | No | `true` | Displays create new favorite list button that opens a modal with a form for creating a new favorite list |
| `className` | `string` | No | - | Custom CSS class |
| `formatDate` | `(dateString: string) => string` | No | `dd/mm/YYYY` | Function that formats the favorite lists dates. If not provided the fallback date formatting function is used |
| `labels` | `object` | No | - | Localization labels (see below) |
| `onCreate` | `(favoriteListData: FavoriteListFormData) => void` | No | - | Action function triggered when creating a new favorite list. If not provided the default action in the component is executed |
| `onEdit` | `(favoriteListId: string, favoriteListData: FavoriteListFormData) => void` | No | - | Action function triggered when editing a favorite list. If not provided the default action in the component is executed |
| `onDelete` | `(favoriteListId: string) => void` | No | - | Action function triggered when deleting a favorite list. If not provided the default action in the component is executed |

## Types

```tsx
interface FavoriteListFormData {
  name: string;
  isDefault: boolean;
}
```

## Labels

All labels are optional with English defaults:

- `lastModified`, `items`, `products`, `clusters`, `defaultBadge`
- `editSave`, `editCancel`, `makeDefault`
- `deleteTitle`, `deleteConfirm`, `deleteWarning`, `deleteButton`, `cancelButton`
- `createTitle`, `createButton`, `createPlaceholder`, `setAsDefault`, `saveButton`
- `noLists`, `noListsDescription`, `createFirstList`, `loading`

## Usage

### All lists (favorites page)

```tsx
<FavoriteLists
  user={authState.user}
  graphqlClient={graphqlClient}
  onListClick={(id) => router.push(`/account/favorites/${id}`)}
  showActions={true}
  allowFavoriteListCreate={true}
/>
```

### Last 3 modified lists (dashboard widget)

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

### With custom action handlers

```tsx
<FavoriteLists
  user={authState.user}
  graphqlClient={graphqlClient}
  onCreate={(data) => console.log('Creating:', data)}
  onEdit={(id, data) => console.log('Editing:', id, data)}
  onDelete={(id) => console.log('Deleting:', id)}
/>
```

### Minimal display (no metadata)

```tsx
<FavoriteLists
  user={authState.user}
  graphqlClient={graphqlClient}
  showDefaultIndicator={false}
  showLastModified={false}
  showItemsCount={false}
  showActions={false}
  allowFavoriteListCreate={false}
/>
```

## Optimistic Updates

- **Rename**: Updates the list name/default status in local state immediately, refetches on error.
- **Delete**: Removes the list from local state immediately, refetches on error.
- **Create**: Refetches the full list after creation to get server-assigned data.
- **Set as default**: Clears default from all other lists when setting a new default.
