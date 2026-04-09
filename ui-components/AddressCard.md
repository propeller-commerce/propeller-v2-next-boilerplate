import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# AddressCard

A complete address display and management component that integrates with the Propeller SDK. Renders a structured address card with optional edit, delete, and set-as-default actions. Supports multiple address types (`Address`, `CartAddress`, `WarehouseAddress`, `OrderAddress`) and two form rendering modes: **modal** (default overlay) and **inline** (embedded in page flow).

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Full CRUD on an addresses page

```tsx
import AddressCard from '@/components/propeller/AddressCard';
import { graphqlClient } from '@/lib/api';
import { AddressService, UserService } from 'propeller-sdk-v2';
import countries from '@/data/countries';
import toast from 'react-hot-toast';

const addressService = new AddressService(graphqlClient);
const userService = new UserService(graphqlClient);

function AddressesPage({ addresses }: { addresses: Address[] }) {
  const handleEdit = async (editedAddress: Address) => {
    await addressService.updateAddress({
      id: editedAddress.id,
      input: {
        firstName: editedAddress.firstName,
        lastName: editedAddress.lastName,
        street: editedAddress.street,
        number: editedAddress.number,
        numberExtension: editedAddress.numberExtension,
        postalCode: editedAddress.postalCode,
        city: editedAddress.city,
        country: editedAddress.country,
        email: editedAddress.email,
        phone: editedAddress.phone,
        company: editedAddress.company,
        gender: editedAddress.gender,
        icp: editedAddress.icp,
      },
    });
  };

  const handleDelete = async (address: Address) => {
    await addressService.deleteAddress({ id: address.id });
  };

  const handleSetDefault = async (address: Address) => {
    await userService.setDefaultAddress({ addressId: address.id });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {addresses.map((addr) => (
        <AddressCard
          key={addr.id}
          graphqlClient={graphqlClient}
          address={addr}
          countries={countries}
          onEdit={handleEdit}
          afterEdit={() => toast.success('Address updated')}
          onDelete={handleDelete}
          afterDelete={() => toast.success('Address deleted')}
          onSetDefault={handleSetDefault}
          afterSetDefault={() => toast.success('Default address updated')}
        />
      ))}
    </div>
  );
}
```

### Read-only display (order detail page)

```tsx
<AddressCard address={order.invoiceAddress} enableActions={false} />
<AddressCard address={order.deliveryAddress} enableActions={false} />
```

### New address creation (modal)

```tsx
const [showNewForm, setShowNewForm] = useState(false);

{showNewForm && (
  <AddressCard
    graphqlClient={graphqlClient}
    address={null}
    isNew
    addressType="DELIVERY"
    countries={countries}
    onEdit={async (newAddress) => {
      await addressService.createAddress({ input: newAddress });
      await refreshAddresses();
    }}
    onCancel={() => setShowNewForm(false)}
  />
)}
```

### Inline form for checkout

```tsx
<AddressCard
  address={null}
  inline
  isNew
  addressType="INVOICE"
  title="Invoice Address"
  showIcp
  countries={countries}
  onEdit={(addressData) => handleCheckoutAddress(addressData, 'INVOICE')}
/>
```

### Checkout with existing address (logged-in user)

```tsx
<AddressCard
  address={cart.invoiceAddress}
  enableDelete={false}
  enableSetDefault={false}
  countries={countries}
  onEdit={(addressData) => handleAddressSubmit(addressData, 'INVOICE')}
  afterEdit={() => toast.success('Address updated')}
/>
```

### With custom labels (localization)

```tsx
<AddressCard
  address={null}
  inline
  isNew
  addressType="INVOICE"
  countries={countries}
  labels={{
    firstName: 'Voornaam',
    lastName: 'Achternaam',
    street: 'Straat',
    number: 'Huisnr',
    postalCode: 'Postcode',
    city: 'Plaats',
    country: 'Land',
    selectCountry: 'Selecteer land',
    save: 'Opslaan',
    cancel: 'Annuleren',
    newTitle: 'Nieuw adres',
  }}
  onEdit={handleSave}
/>
```

### With async lifecycle hooks

```tsx
<AddressCard
  graphqlClient={graphqlClient}
  address={address}
  countries={countries}
  beforeSave={() => setLoading(true)}
  onEdit={async (editedAddress) => {
    await addressService.updateAddress({ id: editedAddress.id, input: editedAddress });
    await refreshUserData();
  }}
  afterEdit={() => setLoading(false)}
  onDelete={(addr) => addressService.deleteAddress({ id: addr.id })}
  afterDelete={() => toast.success('Address deleted')}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

If you need full control over address management without using the AddressCard component, here is how to set up the SDK services and perform the four key operations.

### Service setup

```ts
import { GraphQLClient, AddressService, UserService, Address } from 'propeller-sdk-v2';

const addressService = new AddressService(graphqlClient);
const userService = new UserService(graphqlClient);
```

### Fetch addresses

Addresses are available on the user/contact object returned by `UserService.getViewer()`:

```ts
async function fetchAddresses(): Promise<Address[]> {
  const viewer = await userService.getViewer({});
  return viewer?.addresses || [];
}
```

### Create a new address

```ts
async function createAddress(formData: Record<string, any>) {
  await addressService.createAddress({
    input: {
      type: 'DELIVERY',
      firstName: formData.firstName,
      lastName: formData.lastName,
      street: formData.street,
      number: formData.number,
      numberExtension: formData.numberExtension,
      postalCode: formData.postalCode,
      city: formData.city,
      country: formData.country, // 2-letter ISO code, e.g. 'NL'
      email: formData.email,
      phone: formData.phone,
      company: formData.company,
      gender: formData.gender,
    },
  });
  // pseudo-code: refetch addresses, show success notification
}
```

### Update an existing address

```ts
async function updateAddress(id: number, formData: Record<string, any>) {
  await addressService.updateAddress({
    id,
    input: formData,
  });
  // pseudo-code: refetch addresses, show success notification
}
```

### Delete an address

```ts
async function deleteAddress(id: number) {
  await addressService.deleteAddress({ id });
  // pseudo-code: refetch addresses, show success notification
}
```

### Set as default address

```ts
async function setDefaultAddress(addressId: number) {
  await userService.setDefaultAddress({ addressId });
  // pseudo-code: refetch addresses, show success notification
}
```

### UI notes

Render each address as a card showing: company name, full name with salutation, street + number + extension, postal code + city, and country (resolve the 2-letter code to a full name from a countries list). Show a "Default" badge when `isDefault === 'Y'`. Provide edit, delete, and set-default action buttons on each card. Use a form with fields for gender, company, first name, middle name, last name, street, number, extension, postal code, city, country (dropdown), email, and phone.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Core

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | No | -- | GraphQL client instance. Only needed when the parent performs SDK operations in callbacks. Omit for read-only use. |
| `address` | `Address \| CartAddress \| WarehouseAddress \| OrderAddress \| null` | Yes | -- | The address object to display. Pass `null` for new address forms. |
| `countries` | `{ code: string; name: string }[]` | No | -- | Country list for the country dropdown. Each entry has a 2-letter ISO `code` and display `name`. |

### Visibility

All visibility props default to `true`. Pass `false` to hide.

| Prop | Type | Default | Description |
|---|---|---|---|
| `showCompanyName` | `boolean` | `true` | Display company name |
| `showSalutation` | `boolean` | `true` | Display salutation (Mr./Mrs.) in the name line |
| `showFullName` | `boolean` | `true` | Display full name line |
| `showStreet` | `boolean` | `true` | Display street line |
| `showNumberExtension` | `boolean` | `true` | Display house number and extension in street line |
| `showPostalCode` | `boolean` | `true` | Display postal code in city line |
| `showCity` | `boolean` | `true` | Display city in city line |
| `showCountry` | `boolean` | `true` | Display country name |
| `showEmail` | `boolean` | `false` | Display email address |
| `showPhone` | `boolean` | `false` | Display phone number |
| `showIcp` | `boolean` | `false` | Show ICP/ICS (intra-community supply) checkbox in the edit form |

### Actions

| Prop | Type | Default | Description |
|---|---|---|---|
| `enableActions` | `boolean` | `true` | Show the action buttons area (edit, delete, set default) |
| `enableEdit` | `boolean` | `true` | Show Edit button |
| `enableDelete` | `boolean` | `true` | Show Delete button |
| `enableSetDefault` | `boolean` | `true` | Show Set Default button (auto-hidden when address is already default) |

### Callbacks

| Prop | Type | Description |
|---|---|---|
| `beforeSave` | `() => void` | Called before any save processing begins |
| `onEdit` | `(address: Address) => void \| Promise<void>` | Called when the user submits the edit form. Receives the full edited address object. Supports async -- the form waits for resolution before closing. |
| `afterEdit` | `(address: Address) => void \| Promise<void>` | Called after `onEdit` completes. Use for notifications, loading state cleanup, etc. |
| `onDelete` | `(address: Address) => void` | Called when the user confirms deletion. Receives the full address object (not just the ID). |
| `afterDelete` | `(address: Address) => void` | Called after `onDelete` completes. Receives the same address object. |
| `onSetDefault` | `(address: Address) => void` | Called when Set Default is clicked. |
| `afterSetDefault` | `(address: Address) => void` | Called after `onSetDefault` completes. |
| `onCancel` | `() => void` | Called when the form is cancelled in `isNew` mode. Use to hide the component or reset parent state. |

### Form configuration

| Prop | Type | Default | Description |
|---|---|---|---|
| `isNew` | `boolean` | `false` | New address mode: auto-opens the edit form on mount, hides the card body, calls `onCancel` on dismiss |
| `inline` | `boolean` | `false` | Render the form inline (embedded in page) instead of in a modal overlay |
| `addressType` | `string` | -- | Address type for new addresses (e.g., `'DELIVERY'`, `'INVOICE'`). Included in the edited address when the address has no existing type. |
| `title` | `string` | -- | Custom title for the form. Falls back to "New Address" (`isNew`) or "Edit Address" |
| `labels` | `Record<string, string>` | `{}` | Custom labels for all form fields, buttons, and titles. See Label Keys below. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signatures

```ts
// AddressService
addressService.createAddress({ input: AddressInput }): Promise<Address>
addressService.updateAddress({ id: number, input: AddressInput }): Promise<Address>
addressService.deleteAddress({ id: number }): Promise<void>

// UserService
userService.setDefaultAddress({ addressId: number }): Promise<Address>
userService.getViewer({}): Promise<Contact | Customer>
```

### Options table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `id` | `number` | *required* (update/delete) | `id` param in `updateAddress` / `deleteAddress` |
| `input.type` | `string` | -- | Address type: `'DELIVERY'`, `'INVOICE'` |
| `input.firstName` | `string` | *required* | First name field |
| `input.lastName` | `string` | *required* | Last name field |
| `input.street` | `string` | *required* | Street name |
| `input.number` | `string` | *required* | House number |
| `input.numberExtension` | `string` | -- | House number extension |
| `input.postalCode` | `string` | *required* | Postal code |
| `input.city` | `string` | *required* | City name |
| `input.country` | `string` | *required* | 2-letter ISO country code (e.g., `'NL'`) |
| `input.email` | `string` | *required* | Email address |
| `input.phone` | `string` | -- | Phone number |
| `input.company` | `string` | -- | Company name |
| `input.gender` | `string` | -- | Gender code: `'M'`, `'F'`, `'U'` |
| `input.icp` | `boolean` | -- | Intra-community supply flag |
| `addressId` | `number` | *required* (set default) | `addressId` param in `setDefaultAddress` |

### Callbacks table

| Callback | Purpose |
|---|---|
| `beforeSave` | Pre-save hook (e.g., show loading state) |
| `onEdit` | Persist the edited address via SDK |
| `afterEdit` | Post-save hook (e.g., show notification, hide loading) |
| `onDelete` | Persist deletion via SDK |
| `afterDelete` | Post-delete hook (e.g., show notification) |
| `onSetDefault` | Set address as default via SDK |
| `afterSetDefault` | Post-set-default hook |
| `onCancel` | Handle form cancellation (e.g., unmount the new-address form) |

### UI-only props (no SDK equivalent)

The following props control visual presentation only and have no SDK counterpart: `showCompanyName`, `showSalutation`, `showFullName`, `showStreet`, `showNumberExtension`, `showPostalCode`, `showCity`, `showCountry`, `showEmail`, `showPhone`, `showIcp`, `enableActions`, `enableEdit`, `enableDelete`, `enableSetDefault`, `inline`, `title`, `className`, `labels`, `countries`.

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default | Used for |
|-----|---------|---------|
| `gender` | `'Gender'` | Gender field label |
| `genderMale` | `'Male'` | Male option |
| `genderFemale` | `'Female'` | Female option |
| `genderOther` | `'Other'` | Other option |
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
| `saving` | `'Saving...'` | Save button text while the form is submitting |
| `cancel` | `'Cancel'` | Cancel button text |
| `newTitle` | `'New Address'` | Form title in new mode |
| `editTitle` | `'Edit Address'` | Form title in edit mode |
| `confirmDeleteTitle` | `'Confirm Delete'` | Delete confirmation dialog title |
| `confirmDeleteMessage` | `'Are you sure you want to delete this address?'` | Delete confirmation dialog message |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  gender: 'Gender',
  genderMale: 'Male',
  genderFemale: 'Female',
  genderOther: 'Other',
  company: 'Company',
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  street: 'Street',
  number: 'Number',
  numberExtension: 'Ext',
  postalCode: 'Postal Code',
  city: 'City',
  country: 'Country',
  selectCountry: 'Select country',
  email: 'Email',
  phone: 'Phone',
  icp: 'ICP/ICS (Intra-Community Supply)',
  edit: 'Edit',
  delete: 'Delete',
  setDefault: 'Set Default',
  save: 'Save',
  saving: 'Saving...',
  cancel: 'Cancel',
  newTitle: 'New Address',
  editTitle: 'Edit Address',
  confirmDeleteTitle: 'Confirm Delete',
  confirmDeleteMessage: 'Are you sure you want to delete this address?',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Address Display Structure

The card renders address fields in this order:

1. Company name (bold, large text)
2. Full name with salutation -- Mr./Mrs. prefix based on `gender` field (M/F/U)
3. Street + house number + extension
4. Postal code + city
5. Country (full name resolved from the `countries` list, falls back to the 2-letter code)
6. Email and phone (only when `showEmail` / `showPhone` are `true`)
7. Default badge -- a colored badge reading "Default DELIVERY Address" (or similar) when `isDefault === 'Y'`

### Edit Form

The edit form contains fields for: gender (dropdown), company, first name, middle name, last name, street, house number, number extension, postal code, city, country (dropdown from `countries` prop), email, phone, and optionally ICP/ICS checkbox.

Required fields (enforced by HTML validation): first name, last name, street, number, postal code, city, country, email.

The form can render in two modes controlled by the `inline` prop:
- **Modal** (default): Opens as a centered overlay with backdrop. Includes a close button in the header.
- **Inline**: Renders embedded in the page flow without any overlay. Useful for checkout forms.

### Delete Confirmation Modal

Clicking "Delete" opens a confirmation dialog. The address is only deleted (via `onDelete`) after the user confirms. The dialog text is customizable via `confirmDeleteTitle` and `confirmDeleteMessage` labels.

### isNew Mode

When `isNew` is `true`:
- The address card body is hidden
- The edit form auto-opens on mount
- The "Cancel" button only appears when `onCancel` is provided; clicking it calls the callback (e.g., to unmount the component)
- The `addressType` prop fills the `type` field on the resulting address object

### Optimistic Updates

After the user saves the form, the component immediately updates its internal display using a local state copy of the address (`localAddress`). This provides instant visual feedback while the parent performs the actual API call in `onEdit`. If the API call fails, the parent should handle reverting.

### Save Loading State

A `saving` flag prevents the form from being submitted multiple times. While a save is in progress:
- The **Save** button is disabled and its text changes to "Saving..." (customizable via the `saving` label key)
- The **Cancel** button is disabled to prevent closing the form mid-save
- The `beforeSave` callback fires after the guard is set but before the address object is constructed

The `saving` state supports async `onEdit` callbacks -- it remains active until the `onEdit` promise resolves (or rejects), at which point both buttons re-enable automatically via a `finally` block.

### Notes Field

The `notes` field is preserved when editing — the existing `notes` value is carried through to the saved address object — but there is **no input field** for it in the form UI. If your use case requires editable notes, build a custom form.

### Country Dropdown

The country dropdown is populated from the `countries` prop -- an array of `{ code: string; name: string }` objects. The `code` is stored as the address's `country` value (2-letter ISO code, e.g., `'NL'`, `'DE'`). The card display resolves the code back to the full country name using `getCountryName()`.

### CartAddress Limitations

`CartAddress` objects typically lack `id`, `isDefault`, and `type` fields. When displaying a `CartAddress`, the delete and set-default actions will gracefully no-op because there is no `id` to act on.

## GraphQL Queries and Mutations

### Create address

```graphql
mutation CreateAddress($input: AddressInput!) {
  addressCreate(input: $input) {
    id
    type
    firstName
    lastName
    street
    number
    numberExtension
    postalCode
    city
    country
    email
    phone
    company
    gender
    isDefault
    icp
  }
}
```

### Update address

```graphql
mutation UpdateAddress($id: Int!, $input: AddressInput!) {
  addressUpdate(id: $id, input: $input) {
    id
    type
    firstName
    lastName
    street
    number
    numberExtension
    postalCode
    city
    country
    email
    phone
    company
    gender
    isDefault
    icp
  }
}
```

### Delete address

```graphql
mutation DeleteAddress($id: Int!) {
  addressDelete(id: $id)
}
```

### Set default address

```graphql
mutation SetDefaultAddress($addressId: Int!) {
  userSetDefaultAddress(addressId: $addressId) {
    id
    isDefault
  }
}
```

## SDK Services

AddressCard delegates persistence to the parent via callbacks. The parent typically uses these `propeller-sdk-v2` services:

### AddressService

Used for creating, updating, and deleting addresses.

```ts
import { AddressService, GraphQLClient } from 'propeller-sdk-v2';

const addressService = new AddressService(graphqlClient);

// Create
await addressService.createAddress({
  input: {
    type: 'DELIVERY',
    firstName: 'Jan',
    lastName: 'de Vries',
    street: 'Keizersgracht',
    number: '100',
    postalCode: '1015AA',
    city: 'Amsterdam',
    country: 'NL',
    email: 'jan@example.com',
  },
});

// Update
await addressService.updateAddress({
  id: 42,
  input: {
    firstName: 'Jan',
    lastName: 'de Vries',
    street: 'Herengracht',
    number: '200',
    postalCode: '1016BS',
    city: 'Amsterdam',
    country: 'NL',
  },
});

// Delete
await addressService.deleteAddress({ id: 42 });
```

### UserService

Used for setting a default address on the user profile.

```ts
import { UserService } from 'propeller-sdk-v2';

const userService = new UserService(graphqlClient);

// Set default address
await userService.setDefaultAddress({ addressId: 42 });
```

## Notes

- `graphqlClient` is optional -- omit it for read-only use cases (order detail, cart sidebar)
- The `onEdit` callback receives the full edited address object including `id`, `type`, `isDefault`, and `icp`
- The country field sends 2-letter ISO codes (e.g., `"NL"`) -- the Propeller GraphQL API requires max 2-character country codes
- The `inline` prop only affects form rendering; the card display is unaffected
- When `inline` is `true` and no address is provided, the form auto-opens on mount (same as `isNew`)
