# FavoriteLists Component

Displays a list of the user's favorite lists with inline edit, delete confirmation modal, and create modal. Supports showing all lists or limiting to the last N most recently modified.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `user` | `Contact \| Customer \| null` | required | The authenticated user |
| `graphqlClient` | `GraphQLClient` | required | Initialized GraphQL client |
| `onListClick` | `(listId: string \| number) => void` | - | Callback when a list name is clicked (parent handles navigation) |
| `limit` | `number` | - | Show only the last N modified lists. `undefined` = show all |
| `showCreateButton` | `boolean` | `true` | Show the "Create New List" button (top when lists exist, inline when empty) |
| `enableActions` | `boolean` | `true` | Show edit/delete action buttons on each list |
| `className` | `string` | - | Custom CSS class |
| `formatDate` | `(dateString: string) => string` | - | Override date formatting |
| `labels` | `object` | - | Localization labels (see below) |
| `afterCreate` | `(list: FavoriteList) => void` | - | Callback after list creation |
| `afterUpdate` | `(list: FavoriteList) => void` | - | Callback after list update |
| `afterDelete` | `(listId: string) => void` | - | Callback after list deletion |

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
  enableActions={true}
  afterCreate={() => toast.success('Created')}
  afterUpdate={() => toast.success('Updated')}
  afterDelete={() => toast.success('Deleted')}
/>
```

### Last 3 modified lists (dashboard widget)

```tsx
<FavoriteLists
  user={authState.user}
  graphqlClient={graphqlClient}
  limit={3}
  enableActions={false}
  showCreateButton={false}
  onListClick={(id) => router.push(`/account/favorites/${id}`)}
/>
```

## Optimistic Updates

- **Rename**: Updates the list name/default status in local state immediately, refetches on error.
- **Delete**: Removes the list from local state immediately, refetches on error.
- **Create**: Refetches the full list after creation to get server-assigned data.
