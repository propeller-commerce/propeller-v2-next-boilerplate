# AddressCard

The AddressCard component renders a structured view of a single address and integrates with the Propeller SDK. It supports multiple address sources (`Address`, `CartAddress`, `WarehouseAddress`, `ExternalAddress`) and provides granular visibility control for company name, personal details, and location fields.

The component optionally enables address management actions such as edit, delete, and set-as-default, each with configurable callbacks and lifecycle hooks. It encapsulates address presentation and interaction while delegating persistence and business logic to the parent application.

It supports two form rendering modes: **modal** (default) for overlay-based editing, and **inline** for embedded forms (e.g., checkout flows where the form should appear within the page).

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
| `onEdit` | `(address) => void \| Promise<void>` | No | — | Called when address is edited via the form (supports async) |
| `afterEdit` | `(address) => void \| Promise<void>` | No | — | Called after edit completes (supports async) |
| `onDelete` | `(addressId: number) => void` | No | — | Called when address is deleted (after confirmation) |
| `afterDelete` | `(addressId: number) => void` | No | — | Called after deletion completes |
| `onSetDefault` | `(address) => void` | No | — | Called when Set Default is clicked |
| `afterSetDefault` | `(address) => void` | No | — | Called after set-default completes |
| `countries` | `{ code: string; name: string }[]` | No | — | Country list for dropdown (Mitosis only; React version imports from `@/data/countries`) |
| `isNew` | `boolean` | No | `false` | When true, renders in "new address" mode: auto-opens edit form, hides card body |
| `onCancel` | `() => void` | No | — | Called when the form is cancelled in `isNew` mode |
| `inline` | `boolean` | No | `false` | When true, renders the form inline instead of in a modal overlay |
| `addressType` | `string` | No | — | Address type for new addresses (e.g., `'DELIVERY'`, `'INVOICE'`). Included in the edited address object when the address has no existing type. |
| `showIcp` | `boolean` | No | `false` | Show ICP/ICS (intra-community supply) checkbox in the form |
| `title` | `string` | No | — | Custom title for the form. Falls back to "New Address" (isNew) or "Edit Address" |
| `labels` | `Record<string, string>` | No | `{}` | Custom labels for form fields and buttons |
| `beforeSave` | `() => void` | No | — | Called before save starts (before `onEdit`) |

## Label Keys

| Key | Default | Description |
|-----|---------|-------------|
| `gender` | `'Gender'` | Gender field label |
| `genderMale` | `'Male'` | Male option text |
| `genderFemale` | `'Female'` | Female option text |
| `genderOther` | `'Other'` | Other option text |
| `company` | `'Company'` | Company field label |
| `firstName` | `'First Name'` | First name field label |
| `middleName` | `'Middle Name'` | Middle name field label |
| `lastName` | `'Last Name'` | Last name field label |
| `street` | `'Street'` | Street field label |
| `number` | `'Number'` | House number field label |
| `numberExtension` | `'Ext'` | Number extension field label |
| `postalCode` | `'Postal Code'` | Postal code field label |
| `city` | `'City'` | City field label |
| `country` | `'Country'` | Country field label |
| `selectCountry` | `'Select country'` | Country dropdown placeholder |
| `email` | `'Email'` | Email field label |
| `phone` | `'Phone'` | Phone field label |
| `icp` | `'ICP/ICS (Intra-Community Supply)'` | ICP checkbox label |
| `edit` | `'Edit'` | Edit button text |
| `delete` | `'Delete'` | Delete button text |
| `setDefault` | `'Set Default'` | Set default button text |
| `save` | `'Save'` | Save button text |
| `cancel` | `'Cancel'` | Cancel button text |
| `newTitle` | `'New Address'` | Form title in new mode |
| `editTitle` | `'Edit Address'` | Form title in edit mode |
| `confirmDeleteTitle` | `'Confirm Delete'` | Delete confirmation title |
| `confirmDeleteMessage` | `'Are you sure you want to delete this address?'` | Delete confirmation message |

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

### New address creation mode (modal)

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

### Inline form for checkout (guest user, no existing address)

```tsx
<AddressCard
  address={null}
  inline
  isNew
  addressType="INVOICE"
  title="Invoice Address"
  showIcp
  onEdit={(addressData) => handleAddressSubmit(addressData, 'INVOICE')}
/>
```

### Checkout with existing address (logged-in user)

```tsx
<AddressCard
  address={cart.invoiceAddress}
  enableDelete={false}
  enableSetDefault={false}
  onEdit={(addressData) => handleAddressSubmit(addressData, 'INVOICE')}
  afterEdit={() => toast.success('Address updated')}
/>
```

### With ICP checkbox

```tsx
<AddressCard
  address={null}
  inline
  isNew
  addressType="DELIVERY"
  showIcp
  onEdit={handleSave}
/>
```

### With custom labels

```tsx
<AddressCard
  address={null}
  inline
  isNew
  addressType="INVOICE"
  labels={{
    firstName: 'Voornaam',
    lastName: 'Achternaam',
    street: 'Straat',
    save: 'Opslaan',
    cancel: 'Annuleren',
  }}
  onEdit={handleSave}
/>
```

### With async lifecycle hooks

```tsx
<AddressCard
  graphqlClient={graphqlClient}
  address={address}
  beforeSave={() => setLoading(true)}
  onEdit={async (editedAddress) => {
    await updateAddress(editedAddress);
    await refreshUserData();
  }}
  afterEdit={() => setLoading(false)}
  onDelete={(id) => deleteAddress(id)}
  afterDelete={(id) => toast.success('Address deleted')}
/>
```

## Features

- **Two form modes**: Modal (default overlay) and inline (embedded in page flow, controlled by `inline` prop)
- **Edit Modal**: Built-in form with fields for gender, company, name, street, postal code, city, country (dropdown), email, phone, and optional ICP checkbox
- **Async callbacks**: `onEdit` and `afterEdit` are awaited, ensuring async operations complete before the form closes
- **Optimistic updates**: `_localAddress` state overrides `props.address` for immediate UI feedback
- **New address mode**: `isNew` prop auto-opens the form on mount, hides the card body, and calls `onCancel` on dismiss
- **Inline auto-open**: When `inline` is true and no address is provided, the form auto-opens on mount
- **Address type**: `addressType` prop sets the type field on new addresses (e.g., `'DELIVERY'`, `'INVOICE'`)
- **ICP/ICS checkbox**: Shown when `showIcp` is true, value included in the edited address as `icp: boolean`
- **Custom labels**: All text (field labels, button text, titles) customizable via `labels` prop
- **beforeSave hook**: Called before any save processing begins
- **Delete Confirmation**: Inline confirmation dialog before deletion
- **Set Default**: Button automatically hidden when the address is already the default
- **Default Badge**: Shows a violet badge when `address.isDefault === 'Y'`
- **Country dropdown**: React version auto-imports from `@/data/countries`; Mitosis receives via `countries` prop
- **Country name display**: React version uses `getCountryName()` to display full country names

## Address Display Structure

1. Company name (bold, large)
2. Full name with salutation (medium weight)
3. Street + number + extension
4. Postal code + city
5. Country name (full name in React, code in Mitosis)
6. Default badge (if applicable)

## Notes

- `graphqlClient` is optional — omit it for read-only use cases
- `CartAddress` does not have `id`, `isDefault`, or `type` fields — delete and set-default actions will gracefully no-op
- The `onEdit` callback receives the full edited address object (including `id`, `type`, `isDefault`, `icp`)
- All `show*` and `enable*` props default to `true` — pass `false` to hide
- The `inline` prop only affects form rendering; the card display is unaffected
- When `inline` + `isNew` (or no address), the card is hidden and the form shows directly
- The country field sends 2-letter ISO codes (e.g., "DE") — the GraphQL API requires max 2-char codes
- The React version extracts form fields into a `renderFormFields()` helper to avoid duplication between inline and modal modes
