# AddressCard

The AddressCard component renders a structured view of a single address and integrates with the Propeller SDK. It supports multiple address sources (`Address`, `CartAddress`, `WarehouseAddress`, `ExternalAddress`) and provides granular visibility control for company name, personal details, and location fields.

The component optionally enables address management actions such as edit, delete, and set-as-default, each with configurable callbacks and lifecycle hooks. It encapsulates address presentation and interaction while delegating persistence and business logic to the parent application.

## Source Files

- **Mitosis source**: `ui-components/AddressCard.lite.tsx`
- **Compiled React**: `components/propeller/AddressCard.tsx`
- **Compiled Vue**: `output/vue/ui-components/AddressCard.vue`

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | No | — | GraphQL client for the Propeller SDK (only needed when editing) |
| `address` | `Address \| CartAddress \| WarehouseAddress \| ExternalAddress` | Yes | — | The address to display |
| `showCompanyName` | `boolean` | No | `true` | Display company name |
| `showSalutation` | `boolean` | No | `true` | Display salutation (Mr./Mrs.) in the name line |
| `showFullName` | `boolean` | No | `true` | Display full name line |
| `showStreet` | `boolean` | No | `true` | Display street line |
| `showNumberExtension` | `boolean` | No | `true` | Display house number and extension in street line |
| `showPostalCode` | `boolean` | No | `true` | Display postal code in city line |
| `showCity` | `boolean` | No | `true` | Display city in city line |
| `showCountry` | `boolean` | No | `true` | Display country name |
| `enableActions` | `boolean` | No | `true` | Show action buttons (edit, delete, set default) |
| `enableEdit` | `boolean` | No | `true` | Show Edit button (launches modal with address form) |
| `enableDelete` | `boolean` | No | `true` | Show Delete button (with confirmation dialog) |
| `enableSetDefault` | `boolean` | No | `true` | Show Set Default button (hidden when already default) |
| `onEdit` | `(address) => void \| Promise<void>` | No | — | Called when address is edited via the modal form (supports async) |
| `afterEdit` | `(address) => void \| Promise<void>` | No | — | Called after edit completes (supports async) |
| `onDelete` | `(addressId: number) => void` | No | — | Called when address is deleted (after confirmation) |
| `afterDelete` | `(addressId: number) => void` | No | — | Called after deletion completes |
| `onSetDefault` | `(address) => void` | No | — | Called when Set Default is clicked |
| `afterSetDefault` | `(address) => void` | No | — | Called after set-default completes |
| `countries` | `{ code: string; name: string }[]` | No | — | Country list for dropdown (Mitosis only; React version imports from `@/data/countries`) |
| `isNew` | `boolean` | No | `false` | When true, renders in "new address" mode: auto-opens edit modal, hides card body |
| `onCancel` | `() => void` | No | — | Called when the modal is cancelled in `isNew` mode |

## Usage

### Read-only display (e.g., order detail page, cart)

```tsx
<AddressCard address={address} enableActions={false} />
```

### Editable with all defaults

```tsx
import AddressCard from '@/components/propeller/AddressCard';
import { graphqlClient } from '@/lib/api';

<AddressCard
  graphqlClient={graphqlClient}
  address={address}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onSetDefault={handleSetDefault}
/>
```

### New address creation mode

```tsx
<AddressCard
  graphqlClient={graphqlClient}
  address={{ type: 'invoice' }}
  isNew
  onEdit={handleSaveNewAddress}
  onCancel={() => setShowModal(false)}
  enableActions={false}
/>
```

### Minimal display (street and city only)

```tsx
<AddressCard
  address={address}
  showCompanyName={false}
  showFullName={false}
  showCountry={false}
  enableActions={false}
/>
```

### With async lifecycle hooks

```tsx
<AddressCard
  graphqlClient={graphqlClient}
  address={address}
  onEdit={async (editedAddress) => {
    await updateAddress(editedAddress);
    await refreshUserData();
  }}
  onDelete={(id) => deleteAddress(id)}
  afterDelete={(id) => toast.success('Address deleted')}
/>
```

## Features

- **Edit Modal**: Built-in form with fields for gender, company, name, street, postal code, city, country (dropdown with country codes), email, and phone
- **Async callbacks**: `onEdit` and `afterEdit` are awaited, ensuring async operations (API calls, state refresh) complete before the modal closes
- **Optimistic updates**: `_localAddress` state overrides `props.address` for immediate UI feedback via the internal `addr()` helper
- **New address mode**: `isNew` prop auto-opens the modal on mount, hides the card body, and calls `onCancel` on dismiss
- **Delete Confirmation**: Inline confirmation dialog before deletion
- **Set Default**: Button automatically hidden when the address is already the default
- **Default Badge**: Shows a violet badge when `address.isDefault === 'Y'` with the address type
- **Country dropdown**: The edit form uses a `<select>` with 2-letter ISO country codes from `@/data/countries` (React) or `countries` prop (Mitosis)
- **Country name display**: The React compiled version uses `getCountryName()` to display full country names instead of codes

## Address Display Structure

1. Company name (bold, large)
2. Full name with salutation (medium weight)
3. Street + number + extension
4. Postal code + city
5. Country name
6. Default badge (if applicable)

## Notes

- `graphqlClient` is optional — omit it for read-only use cases (order detail, cart sidebar)
- `CartAddress` does not have `id`, `isDefault`, or `type` fields — delete and set-default actions will gracefully no-op
- The `onEdit` callback receives the full edited address object (including `id`, `type`, `isDefault` from the original)
- All `show*` and `enable*` props default to `true` — pass `false` to hide specific elements
- The country field sends 2-letter ISO codes (e.g., "DE" for Germany) — the GraphQL API requires max 2-char country codes
