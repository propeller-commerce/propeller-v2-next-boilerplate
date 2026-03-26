# UserDetails

The UserDetails component displays key information about the currently logged-in user. It supports both **Contact** (B2B) and **Customer** (B2C) user types from the Propeller e-commerce platform, and can present personal details, company information, associated companies, and default addresses.

## Usage

### B2B Contact user with company info and addresses

```tsx
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Contact, Customer } from 'propeller-sdk-v2';
import UserDetails from '@/components/propeller/UserDetails';

const COUNTRIES = [
  { code: 'NL', name: 'Netherlands' },
  { code: 'BE', name: 'Belgium' },
  { code: 'DE', name: 'Germany' },
];

export default function AccountPage() {
  const { state } = useAuth();
  const { selectedCompany } = useCompany();
  const user = state.user;

  if (!state.isAuthenticated || !user) return null;

  return (
    <UserDetails
      user={user as Contact | Customer}
      activeCompany={selectedCompany}
      showCompanyInfo={true}
      listAllContactCompanies={false}
      showDefaultInvoiceAddress={true}
      showDefaultDeliveryAddress={true}
      countries={COUNTRIES}
    />
  );
}
```

### B2B Contact with all companies listed

Show the full list of associated companies with an "Active" badge on the selected one:

```tsx
<UserDetails
  user={contactUser}
  activeCompany={selectedCompany}
  showCompanyInfo={true}
  listAllContactCompanies={true}
  showDefaultInvoiceAddress={true}
  showDefaultDeliveryAddress={true}
  countries={COUNTRIES}
/>
```

### B2C Customer (minimal)

For B2C customers, company-related sections are automatically hidden. Only personal info and addresses are shown:

```tsx
<UserDetails
  user={customerUser}
  activeCompany={null}
  showDefaultInvoiceAddress={true}
  showDefaultDeliveryAddress={false}
/>
```

### Read-only personal info only

Hide all address and company sections:

```tsx
<UserDetails
  user={user as Contact | Customer}
  activeCompany={null}
  showCompanyInfo={false}
  showDefaultInvoiceAddress={false}
  showDefaultDeliveryAddress={false}
/>
```

## Props

### Required

| Prop | Type | Description |
|---|---|---|
| `user` | `Contact \| Customer` | The currently logged-in user object from the Propeller SDK |
| `activeCompany` | `Company \| null` | The currently selected company (from `CompanyContext` or `companySwitched` event). Pass `null` for B2C customers. |

### Display toggles

| Prop | Type | Default | Description |
|---|---|---|---|
| `showCompanyInfo` | `boolean` | `true` | Show company name, tax number, and CoC number for the active company (Contact users only) |
| `listAllContactCompanies` | `boolean` | `false` | Show a list of all associated companies with an active indicator (Contact users only) |
| `showDefaultInvoiceAddress` | `boolean` | `true` | Show the user's default invoice address |
| `showDefaultDeliveryAddress` | `boolean` | `false` | Show the user's default delivery address |

### Data

| Prop | Type | Default | Description |
|---|---|---|---|
| `countries` | `{ code: string; name: string }[]` | `[]` | Country code-to-name mapping for displaying full country names in addresses. If omitted, raw ISO codes are shown. |

## Behavior

### Sections rendered

The component renders up to four card sections, each in a rounded card with shadow:

1. **Personal Information** -- Always shown. Displays the user's name and email address.
2. **Company Information** -- Shown when `showCompanyInfo` is `true` and the user is a Contact with an active company. Displays company name, tax number (if available), and CoC number (if available).
3. **Companies List** -- Shown when `listAllContactCompanies` is `true` and the user is a Contact. Lists all associated companies with the active company highlighted and badged.
4. **Default Addresses** -- Shown when either `showDefaultInvoiceAddress` or `showDefaultDeliveryAddress` is `true`. Renders invoice and/or delivery address in a two-column grid.

### User type detection

The component determines whether the user is a Contact (B2B) or Customer (B2C) by checking for the presence of the `company` property on the user object:

```ts
const isContact = user !== null && 'company' in user;
```

Company-related sections (Company Information, Companies List) are only rendered for Contact users, regardless of prop values.

### Address resolution

- **Contact users**: Addresses are sourced from the active company's `addresses` array (`activeCompany.addresses`).
- **Customer users**: Addresses are sourced from the user's own `addresses` array (`user.addresses`).
- Default addresses are found by filtering for `type === 'invoice'` or `type === 'delivery'` combined with `isDefault === 'Y'`.
- If no matching default address exists, the component displays an italicized "No invoice/delivery address found" message.

### Company switching

When used with the `CompanyContext` and `CompanySwitcher` component, UserDetails reacts to company changes in real-time. The parent page passes the `activeCompany` prop from the `useCompany()` hook. When the user switches companies via the CompanySwitcher (typically in the header), the context updates `selectedCompany`, and UserDetails re-renders with the new company's information and addresses.

The company switching flow:

1. User selects a company in `CompanySwitcher`
2. `CompanyContext` updates state and dispatches a `companySwitched` custom event
3. The parent page receives the updated `selectedCompany` from `useCompany()`
4. `UserDetails` re-renders with the new `activeCompany` prop, showing updated company info and addresses

### Hydration safety

The component uses a mounted guard (`isMounted` state set via `useEffect`) to prevent hydration mismatches. All content is rendered only after the component has mounted on the client, avoiding server/client divergence for data sourced from localStorage or context.

## SDK Services

This component is a **display-only** component. It does not call any SDK services internally -- it receives all data via props. The parent page is responsible for fetching the user and company data.

The data typically comes from:

### UserService

Used by the parent page or `AuthContext` to fetch the current user:

```ts
import { UserService } from 'propeller-sdk-v2';

const userService = new UserService(graphqlClient);
const viewer = await userService.getViewer({});
// viewer is Contact | Customer
```

### CompanyContext

Used by the parent page to get the selected company:

```ts
import { useCompany } from '@/context/CompanyContext';

const { selectedCompany } = useCompany();
// selectedCompany is Company | null
```

## GraphQL Queries

The component itself does not execute GraphQL queries, but the data it displays is fetched by the parent using these queries:

### Viewer query (fetches the logged-in user)

```graphql
query {
  viewer {
    ... on Contact {
      contactId
      firstName
      lastName
      email
      company {
        companyId
        name
        taxNumber
        cocNumber
        addresses {
          id
          firstName
          middleName
          lastName
          company
          street
          number
          numberExtension
          postalCode
          city
          country
          type
          isDefault
        }
      }
      companies {
        items {
          companyId
          name
          taxNumber
          cocNumber
          addresses {
            id
            firstName
            middleName
            lastName
            company
            street
            number
            numberExtension
            postalCode
            city
            country
            type
            isDefault
          }
        }
      }
    }
    ... on Customer {
      customerId
      firstName
      lastName
      email
      addresses {
        id
        firstName
        middleName
        lastName
        company
        street
        number
        numberExtension
        postalCode
        city
        country
        type
        isDefault
      }
    }
  }
}
```

## Building Your Own

If you need a custom user details component, you can build one using the same SDK services and data patterns:

```tsx
'use client';

import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Contact, Customer, Company, Address } from 'propeller-sdk-v2';

export default function CustomUserDetails() {
  const { state } = useAuth();
  const { selectedCompany } = useCompany();
  const user = state.user;

  if (!state.isAuthenticated || !user) return null;

  const isContact = user !== null && 'company' in user;

  // Get the active company for Contact users
  const activeCompany: Company | null = isContact ? selectedCompany : null;

  // Resolve addresses based on user type
  const addresses: Address[] = isContact
    ? activeCompany?.addresses || []
    : (user as Customer).addresses || [];

  const defaultInvoiceAddress = addresses.find(
    (addr) => addr.type === 'invoice' && addr.isDefault === 'Y'
  ) ?? null;

  const defaultDeliveryAddress = addresses.find(
    (addr) => addr.type === 'delivery' && addr.isDefault === 'Y'
  ) ?? null;

  // Build display name
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'User';

  return (
    <div className="space-y-6">
      {/* Personal info */}
      <section>
        <h3>Personal Information</h3>
        <p>Name: {name}</p>
        <p>Email: {user.email}</p>
      </section>

      {/* Company info (B2B only) */}
      {isContact && activeCompany && (
        <section>
          <h3>Company</h3>
          <p>Name: {activeCompany.name}</p>
          {activeCompany.taxNumber && <p>Tax: {activeCompany.taxNumber}</p>}
          {activeCompany.cocNumber && <p>CoC: {activeCompany.cocNumber}</p>}
        </section>
      )}

      {/* All companies list (B2B only) */}
      {isContact && (
        <section>
          <h3>Companies</h3>
          <ul>
            {(() => {
              const contact = user as Contact;
              const companies =
                contact.companies?.items?.length > 0
                  ? contact.companies.items
                  : contact.company
                    ? [contact.company]
                    : [];
              return companies.map((company) => (
                <li key={company.companyId}>
                  {company.name}
                  {activeCompany?.companyId === company.companyId && ' (Active)'}
                </li>
              ));
            })()}
          </ul>
        </section>
      )}

      {/* Default addresses */}
      <section>
        <h3>Default Addresses</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <h4>Invoice</h4>
            {defaultInvoiceAddress ? (
              <div>
                {defaultInvoiceAddress.company && <p>{defaultInvoiceAddress.company}</p>}
                <p>{[defaultInvoiceAddress.street, defaultInvoiceAddress.number].filter(Boolean).join(' ')}</p>
                <p>{[defaultInvoiceAddress.postalCode, defaultInvoiceAddress.city].filter(Boolean).join(' ')}</p>
                {defaultInvoiceAddress.country && <p>{defaultInvoiceAddress.country}</p>}
              </div>
            ) : (
              <p>No invoice address found</p>
            )}
          </div>
          <div>
            <h4>Delivery</h4>
            {defaultDeliveryAddress ? (
              <div>
                {defaultDeliveryAddress.company && <p>{defaultDeliveryAddress.company}</p>}
                <p>{[defaultDeliveryAddress.street, defaultDeliveryAddress.number].filter(Boolean).join(' ')}</p>
                <p>{[defaultDeliveryAddress.postalCode, defaultDeliveryAddress.city].filter(Boolean).join(' ')}</p>
                {defaultDeliveryAddress.country && <p>{defaultDeliveryAddress.country}</p>}
              </div>
            ) : (
              <p>No delivery address found</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
```

Key points for a custom implementation:

- **User type check**: Use `'company' in user` to distinguish Contact from Customer.
- **Address source**: Contact addresses come from the active company; Customer addresses are on the user directly.
- **Default address filter**: Match on `type === 'invoice'|'delivery'` and `isDefault === 'Y'`.
- **Company switching**: Use `useCompany()` from `CompanyContext` to get the active company and react to changes. The context dispatches a `companySwitched` custom event when the company changes.
- **Hydration safety**: Wrap client-only content in a mounted guard to avoid server/client mismatches.
