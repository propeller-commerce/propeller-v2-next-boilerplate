# RegisterForm Component

A configurable user registration component that manages the full account creation flow for either Contact (B2B company) or Customer (B2C consumer) users, including company creation, address management, and automatic login.

## Usage Examples

### Basic usage (both user types, full form)

```tsx
import RegisterForm from '@/components/propeller/RegisterForm';
import { createGraphQLClient } from 'propeller-sdk-v2';

const graphqlClient = createGraphQLClient({ /* config */ });

<RegisterForm
  graphqlClient={graphqlClient}
  afterRegistration={(user) => router.push('/account')}
/>
```

### B2B company-only registration

```tsx
<RegisterForm
  graphqlClient={graphqlClient}
  showUserType="Contact"
  requiredFields={['firstName', 'lastName', 'phone', 'companyName', 'vatNumber', 'cocNumber']}
  afterRegistration={(user) => router.push('/account')}
/>
```

### B2C consumer-only registration

```tsx
<RegisterForm
  graphqlClient={graphqlClient}
  showUserType="Customer"
  requiredFields={['firstName', 'lastName', 'phone']}
  afterRegistration={(user) => router.push('/account')}
/>
```

### Full page integration with custom labels

```tsx
<RegisterForm
  graphqlClient={graphqlClient}
  title=""
  requiredFields={['firstName', 'lastName']}
  onLoginClick={() => router.push('/login')}
  afterRegistration={() => router.push('/account')}
  labels={{
    personalDetailsTitle: 'Personal Information',
    billingAddressTitle: 'Invoice Address',
    contactLabel: 'Business',
    customerLabel: 'Personal',
  }}
/>
```

### Registration without automatic login

```tsx
<RegisterForm
  graphqlClient={graphqlClient}
  automaticLogin={false}
  beforeRegistration={() => console.log('Starting registration...')}
  afterRegistration={(user) => {
    // user is registered but NOT logged in
    router.push('/login?registered=true');
  }}
/>
```

### With country dropdown

```tsx
import { countries } from '@/data/countries';

<RegisterForm
  graphqlClient={graphqlClient}
  countries={countries}
  preferredLanguage="EN"
  afterRegistration={(user) => router.push('/account')}
/>
```

## Props

### Core Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `graphqlClient` | `GraphQLClient` | Yes | - | Configured GraphQL client for SDK service calls |
| `title` | `string` | No | `"Create account"` | Form title. Pass empty string to hide |
| `subtitle` | `string` | No | `""` | Subtitle displayed below the title |
| `buttonText` | `string` | No | `"Register"` | Label for the submit button |

### User Type Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `showUserType` | `'Contact' \| 'Customer' \| null` | No | `null` | `null` shows a type selector toggle. `'Contact'` forces B2B mode (shows company fields). `'Customer'` forces B2C mode |

### Configuration Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `requiredFields` | `string[]` | No | `[]` | Field names to mark as required (see Available Required Fields below) |
| `automaticLogin` | `boolean` | No | `true` | Automatically log the user in after successful registration |
| `labels` | `Record<string, string>` | No | `{}` | Override default labels for form fields and sections (see Available Labels below) |
| `preferredLanguage` | `string` | No | `'NL'` | Language code sent with the registration request |
| `countries` | `Record<string, string>` | No | `{}` | Key-value pairs of country codes and names for the country dropdown |

### Callback Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `beforeRegistration` | `() => void` | No | - | Called before the registration process starts |
| `afterRegistration` | `(user, accessToken?, refreshToken?, expiresAt?) => void` | No | - | Called after successful registration. Receives the created `Contact` or `Customer` object, plus session tokens when `automaticLogin` is enabled |
| `onLoginClick` | `() => void` | No | - | Callback when the "Log in" link is clicked |
| `displayLoginLink` | `boolean` | No | `true` | Show or hide the login link at the bottom of the form |

### Available Required Fields

`firstName`, `middleName`, `lastName`, `email` (always required), `password` (always required), `phone`, `mobile`, `gender`, `companyName`, `vatNumber`, `cocNumber`, `street`, `number`, `numberExtension`, `postalCode`, `city`, `country`

### Available Labels

| Key | Default | Description |
|-----|---------|-------------|
| `personalDetailsTitle` | `"Your details"` | Section title |
| `billingAddressTitle` | `"Billing address"` | Section title |
| `deliveryAddressTitle` | `"Delivery address"` | Section title |
| `passwordTitle` | `"Password"` | Section title |
| `sameAsDelivery` | `"Delivery address is the same as billing address"` | Checkbox label |
| `firstName` | `"First name"` | Field label |
| `middleName` | `"Insertion"` | Field label |
| `lastName` | `"Last name"` | Field label |
| `email` | `"Email address"` | Field label |
| `password` | `"Password"` | Field label |
| `confirmPassword` | `"Repeat password"` | Field label |
| `phone` | `"Phone number"` | Field label |
| `gender` | `"Title"` | Field label |
| `companyName` | `"Company name"` | Contact only |
| `vatNumber` | `"VAT number"` | Contact only |
| `cocNumber` | `"CoC number"` | Contact only |
| `street` | `"Street"` | Address field |
| `number` | `"Number"` | Address field |
| `numberExtension` | `"Apt/Suite/Unit"` | Address field |
| `postalCode` | `"Postal code"` | Address field |
| `city` | `"City"` | Address field |
| `country` | `"Country"` | Address field |
| `userTypeLabel` | `"Account type"` | Type selector label |
| `contactLabel` | `"Company"` | Contact toggle label |
| `customerLabel` | `"Consumer"` | Customer toggle label |
| `emailPlaceholder` | `"name@example.com"` | Placeholder |
| `passwordPlaceholder` | `"••••••••"` | Placeholder |
| `passwordMismatch` | `"Passwords do not match"` | Validation error message |
| `loginText` | `"Already have an account?"` | Login link prefix |
| `loginLink` | `"Log in"` | Login link text |

## Behavior

### Form Sections

The form is divided into four sections:

1. **Your Details** -- Account type toggle (Contact/Customer), title/gender radio buttons (Mr./Mrs./Other mapped to `Enums.Gender`), email, company fields (Contact only: company name, VAT number, CoC number), first name, middle name, last name, phone number.

2. **Billing Address** -- Postal code, street, number, apt/suite/unit, city, country.

3. **Delivery Address** -- A "same as billing address" checkbox (default: checked). When unchecked, shows a separate delivery address form.

4. **Password** -- Password and confirm password fields.

### Registration Flow

1. **Validation** -- Checks that a user type is selected and passwords match.
2. **`beforeRegistration` callback** -- Called if provided.
3. **Company creation** (Contact only) -- If company name is filled, creates a company via `CompanyService.createCompany()`.
4. **User registration** -- Calls `UserService.registerContact()` or `UserService.registerCustomer()` depending on user type.
5. **Authentication** -- Updates the GraphQL client with the returned `accessToken` to authorize subsequent address creation calls.
6. **Invoice address creation** -- Creates a billing/invoice address via `AddressService.createCustomerAddress()` or `AddressService.createCompanyAddress()`.
7. **Delivery address creation** -- Creates a delivery address. If "same as billing" is checked, copies the invoice address with `type: 'delivery'`. Otherwise uses the separate delivery form values.
8. **Auto-login** -- If `automaticLogin` is enabled and session tokens are present, dispatches a `userLoggedIn` custom event (picked up by AuthContext).
9. **`afterRegistration` callback** -- Called with the created user object and optional session tokens.

### Error Handling

- Password mismatch is caught client-side before any API calls.
- API errors are caught and displayed as an error message above the form.
- The form shows a loading state (disabled inputs) during submission.
- After successful registration, the form is replaced with a success state (`submitted = true`).

### User Type Behavior

- When `showUserType` is `null` (default), the form displays toggle buttons for the user to choose between "Company" and "Customer".
- When `showUserType` is `'Contact'`, company fields (company name, VAT number, CoC number) are always visible and the type selector is hidden.
- When `showUserType` is `'Customer'`, company fields are hidden and the type selector is hidden.

### Gender / Title Mapping

The title radio buttons map to Propeller SDK `Enums.Gender` values:
- Mr. = `Enums.Gender.M`
- Mrs. = `Enums.Gender.F`
- Other = `Enums.Gender.U` (default)

## SDK Services

The component uses three services from `propeller-sdk-v2` internally:

### UserService

Handles user registration for both Contact and Customer types.

```ts
import { UserService, GraphQLClient, ContactRegisterInput, CustomerRegisterInput } from 'propeller-sdk-v2';

const userService = new UserService(graphqlClient);

// Register a Contact (B2B user linked to a company)
const contactInput: ContactRegisterInput = {
  contactRegisterInput: {
    email: 'john@company.com',
    password: 'securePassword',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+31612345678',
    gender: Enums.Gender.M,
    primaryLanguage: 'NL',
    parentId: 12345, // companyId from CompanyService.createCompany()
  },
  companyAttributesInput: {},
  contactAttributesInput: {},
  contactPAConfigInput: { page: 1, offset: 10 },
};
const contactResponse = await userService.registerContact(contactInput);
// contactResponse.contact — the created Contact
// contactResponse.session — { accessToken, refreshToken, expirationTime }

// Register a Customer (B2C user)
const customerInput: CustomerRegisterInput = {
  customerRegisterInput: {
    email: 'jane@example.com',
    password: 'securePassword',
    firstName: 'Jane',
    lastName: 'Doe',
    gender: Enums.Gender.F,
    primaryLanguage: 'EN',
  },
  customerAttributesInput: {},
};
const customerResponse = await userService.registerCustomer(customerInput);
// customerResponse.customer — the created Customer
// customerResponse.session — { accessToken, refreshToken, expirationTime }
```

### CompanyService

Creates a company record for Contact registrations.

```ts
import { CompanyService, CreateCompanyInput } from 'propeller-sdk-v2';

const companyService = new CompanyService(graphqlClient);

const companyInput: CreateCompanyInput = {
  name: 'Acme Corp',
  taxNumber: 'NL123456789B01',  // VAT number
  cocNumber: '12345678',         // Chamber of Commerce number
  email: 'john@company.com',
  phone: '+31612345678',
};
const company = await companyService.createCompany(companyInput);
// company.companyId — used as parentId for registerContact()
```

### AddressService

Creates invoice and delivery addresses after registration.

```ts
import {
  AddressService,
  CustomerAddressCreateInput,
  CompanyAddressCreateInput,
  Enums,
} from 'propeller-sdk-v2';

const addressService = new AddressService(graphqlClient);

// Create a customer address (B2C)
const customerAddress: CustomerAddressCreateInput = {
  firstName: 'Jane',
  lastName: 'Doe',
  street: 'Keizersgracht',
  number: '100',
  postalCode: '1015AA',
  city: 'Amsterdam',
  country: 'NL',
  type: Enums.AddressType.invoice,
  isDefault: Enums.YesNo.Y,
  customerId: 123,
};
await addressService.createCustomerAddress(customerAddress);

// Create a company address (B2B)
const companyAddress: CompanyAddressCreateInput = {
  firstName: 'John',
  lastName: 'Doe',
  company: 'Acme Corp',
  street: 'Herengracht',
  number: '200',
  postalCode: '1016BS',
  city: 'Amsterdam',
  country: 'NL',
  type: Enums.AddressType.delivery,
  isDefault: Enums.YesNo.Y,
  companyId: 456,
};
await addressService.createCompanyAddress(companyAddress);
```

## GraphQL Queries and Mutations

### registerContact mutation

```graphql
mutation registerContact($input: ContactRegisterInput!) {
  registerContact(input: $input) {
    contact {
      contactId
      firstName
      lastName
      email
    }
    session {
      accessToken
      refreshToken
      expirationTime
    }
  }
}
```

### registerCustomer mutation

```graphql
mutation registerCustomer($input: CustomerRegisterInput!) {
  registerCustomer(input: $input) {
    customer {
      customerId
      firstName
      lastName
      email
    }
    session {
      accessToken
      refreshToken
      expirationTime
    }
  }
}
```

### createCompany mutation

```graphql
mutation createCompany($input: CreateCompanyInput!) {
  createCompany(input: $input) {
    companyId
    name
    taxNumber
    cocNumber
  }
}
```

### createCustomerAddress / createCompanyAddress mutations

```graphql
mutation createCustomerAddress($input: CustomerAddressCreateInput!) {
  createCustomerAddress(input: $input) {
    id
    street
    number
    city
    country
    type
  }
}

mutation createCompanyAddress($input: CompanyAddressCreateInput!) {
  createCompanyAddress(input: $input) {
    id
    street
    number
    city
    country
    type
  }
}
```

## Building Your Own

If you need full control over the registration flow, you can build your own form using the same SDK services. Below is a standalone example covering the complete Contact (B2B) registration flow:

```tsx
'use client';

import { useState } from 'react';
import {
  GraphQLClient,
  UserService,
  CompanyService,
  AddressService,
  Enums,
  ContactRegisterInput,
  CreateCompanyInput,
  CustomerAddressCreateInput,
  CompanyAddressCreateInput,
} from 'propeller-sdk-v2';

interface CustomRegisterFormProps {
  graphqlClient: GraphQLClient;
  onSuccess: () => void;
}

export default function CustomRegisterForm({ graphqlClient, onSuccess }: CustomRegisterFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('NL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userService = new UserService(graphqlClient);
      const companyService = new CompanyService(graphqlClient);
      const addressService = new AddressService(graphqlClient);

      // Step 1: Create the company
      const company = await companyService.createCompany({
        name: companyName,
        taxNumber: vatNumber,
        email,
      });

      // Step 2: Register the contact under the company
      const response = await userService.registerContact({
        contactRegisterInput: {
          email,
          password,
          firstName,
          lastName,
          primaryLanguage: 'NL',
          parentId: company.companyId,
        },
        companyAttributesInput: {},
        contactAttributesInput: {},
        contactPAConfigInput: { page: 1, offset: 10 },
      });

      // Step 3: Authenticate for subsequent calls
      const session = response.session;
      if (session?.accessToken) {
        const currentConfig = graphqlClient.getConfig();
        graphqlClient.updateConfig({
          headers: {
            ...currentConfig.headers,
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
      }

      // Step 4: Create invoice address
      await addressService.createCompanyAddress({
        firstName,
        lastName,
        company: companyName,
        street,
        number,
        postalCode,
        city,
        country,
        type: Enums.AddressType.invoice,
        isDefault: Enums.YesNo.Y,
        companyId: company.companyId,
      });

      // Step 5: Create delivery address (copy of invoice)
      await addressService.createCompanyAddress({
        firstName,
        lastName,
        company: companyName,
        street,
        number,
        postalCode,
        city,
        country,
        type: Enums.AddressType.delivery,
        isDefault: Enums.YesNo.Y,
        companyId: company.companyId,
      });

      // Step 6: Trigger login event for AuthContext
      if (session?.accessToken && session?.refreshToken) {
        window.dispatchEvent(new CustomEvent('userLoggedIn'));
      }

      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="text-red-500">{error}</p>}
      {/* Add your form fields here using the state variables above */}
      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}
```

For a B2C (Customer) registration, replace `registerContact` with `registerCustomer`, skip the `CompanyService.createCompany()` step, and use `AddressService.createCustomerAddress()` instead of `createCompanyAddress()`.
