# AddressCard

The AddressCard component renders a structured view of a single address and integrates with the Propeller SDK via the provided `graphqlClient`. It supports multiple address sources (`Address`, `CartAddress`, `WarehouseAddress`, `ExternalAddress`) and provides granular visibility control for company name, personal details, and location fields.

The component optionally enables address management actions such as edit, delete, and set-as-default, each with configurable callbacks and lifecycle hooks. It encapsulates address presentation and interaction while delegating persistence and business logic to the parent application.

## Source Files

- **Mitosis source**: `ui-components/AddressCard.lite.tsx`
- **Compiled React**: `components/propeller/AddressCard.tsx`
- **Compiled Vue**: `output/vue/ui-components/AddressCard.vue`

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | Yes | — | GraphQL client for the Propeller SDK |
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
| `onEdit` | `(address) => void` | No | — | Called when address is edited via the modal form |
| `afterEdit` | `(address) => void` | No | — | Called after edit completes |
| `onDelete` | `(addressId: number) => void` | No | — | Called when address is deleted (after confirmation) |
| `afterDelete` | `(addressId: number) => void` | No | — | Called after deletion completes |
| `onSetDefault` | `(address) => void` | No | — | Called when Set Default is clicked |
| `afterSetDefault` | `(address) => void` | No | — | Called after set-default completes |

## Usage

### Basic usage with all defaults

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

### Read-only display (no actions)

```tsx
<AddressCard
  graphqlClient={graphqlClient}
  address={address}
  enableActions={false}
/>
```

### Minimal display (street and city only)

```tsx
<AddressCard
  graphqlClient={graphqlClient}
  address={address}
  showCompanyName={false}
  showFullName={false}
  showCountry={false}
  enableActions={false}
/>
```

### With lifecycle hooks

```tsx
<AddressCard
  graphqlClient={graphqlClient}
  address={address}
  onEdit={(editedAddress) => updateAddress(editedAddress)}
  afterEdit={(editedAddress) => refreshUserData()}
  onDelete={(id) => deleteAddress(id)}
  afterDelete={(id) => toast.success('Address deleted')}
/>
```

## Features

- **Edit Modal**: Built-in form with fields for gender, company, name, street, postal code, city, country, email, and phone
- **Delete Confirmation**: Inline confirmation dialog before deletion
- **Set Default**: Button automatically hidden when the address is already the default
- **Default Badge**: Shows a violet badge when `address.isDefault === 'Y'` with the address type
- **Country Name Resolution**: The React compiled version uses `getCountryName()` to display full country names instead of codes

## Address Display Structure

1. Company name (bold, large)
2. Full name with salutation (medium weight)
3. Street + number + extension
4. Postal code + city
5. Country name
6. Default badge (if applicable)

## Notes

- `CartAddress` does not have `id`, `isDefault`, or `type` fields — delete and set-default actions will gracefully no-op
- The `onEdit` callback receives the full edited address object (including `id`, `type`, `isDefault` from the original)
- All `show*` and `enable*` props default to `true` — pass `false` to hide specific elements
- The edit form uses a text input for country (country code); the parent can enhance this via the `onEdit` callback pattern
