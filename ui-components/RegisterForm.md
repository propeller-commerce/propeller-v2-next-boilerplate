# RegisterForm Component

A configurable user registration component built on top of the Propeller SDK. It manages the full account creation flow for either Contact (company) or Customer (consumer) users, including company creation and address management.

## Features

- **Dual user types**: Register as Contact (company) or Customer (consumer)
- **User type selection**: Can operate in single user-type mode or allow the user to choose
- **Company fields**: VAT number, CoC number, and company name shown only for Contact type
- **Address management**: Billing address and delivery address with "same as billing" toggle
- **Configurable required fields**: Align with specific B2B/B2C requirements
- **Automatic login**: Logs in the user after successful registration (configurable)
- **Lifecycle hooks**: `beforeRegistration` and `afterRegistration` callbacks
- **Self-contained**: Handles all SDK calls internally (user registration, company creation, address creation)

## Form Sections

### 1. Your Details
- Account type toggle (Company / Consumer)
- Title (Mr. / Mrs. / Other) — maps to Gender enum
- Email address
- VAT number, CoC number, Company name (Contact/Company only)
- First name, Insertion (middle name), Last name
- Phone number

### 2. Billing Address
- Postal code, Street, Number, Apt/Suite/Unit, City, Country

### 3. Delivery Address
- "Delivery address is the same as billing address" checkbox (default: checked)
- When unchecked: Postal code, Street, Number, Apt/Suite/Unit, City, Country

### 4. Password
- Password, Repeat password

## Registration Flow (SDK calls)

1. `UserService.registerContact()` or `UserService.registerCustomer()` — creates the user (includes `primaryLanguage` from `localStorage('preferred_language')`, defaults to `'NL'`)
2. `CompanyService.createCompany()` — creates company with VAT/CoC (Contact only, when company name is filled)
3. `AddressService.createCustomerAddress()` or `AddressService.createCompanyAddress()` — creates invoice address (includes `company` field when Contact type)
4. Same service — creates delivery address (either copy of billing, or separate; also includes `company` field when Contact type)
5. Stores tokens in `localStorage` and dispatches `userLoggedIn` event (when `automaticLogin` is enabled)

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `graphqlClient` | `GraphQLClient` | Yes | - | GraphQL client for the Propeller SDK |
| `title` | `string` | No | `"Create account"` | Title of the register form |
| `subtitle` | `string` | No | `""` | Subtitle of the register form |
| `buttonText` | `string` | No | `"Register"` | Label for the submit button |
| `showUserType` | `'Contact' \| 'Customer' \| null` | No | `null` | If `null`, shows a type selector; `'Contact'` = company; `'Customer'` = consumer |
| `requiredFields` | `string[]` | No | `[]` | Field names to mark as required |
| `automaticLogin` | `boolean` | No | `true` | Auto-login after successful registration |
| `labels` | `Record<string, string>` | No | `{}` | Override labels for form fields |
| `beforeRegistration` | `() => void` | No | - | Callback before registration starts |
| `afterRegistration` | `(user: Contact \| Customer) => void` | No | - | Callback after successful registration |
| `onLoginClick` | `() => void` | No | - | Callback for the login link click |
| `displayLoginLink` | `boolean` | No | `true` | Show/hide the login link |

## Available `requiredFields` values

`firstName`, `middleName`, `lastName`, `email` (always required), `password` (always required), `phone`, `gender`, `companyName`, `vatNumber`, `cocNumber`, `street`, `number`, `numberExtension`, `postalCode`, `city`, `country`

## Available `labels` keys

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
| `companyName` | `"Company name"` | Field label (Contact only) |
| `vatNumber` | `"VAT number"` | Field label (Contact only) |
| `cocNumber` | `"CoC number"` | Field label (Contact only) |
| `street` | `"Street"` | Address field label |
| `number` | `"Number"` | Address field label |
| `numberExtension` | `"Apt/Suite/Unit"` | Address field label |
| `postalCode` | `"Postal code"` | Address field label |
| `city` | `"City"` | Address field label |
| `country` | `"Country"` | Address field label |
| `userTypeLabel` | `"Account type"` | Type selector label |
| `contactLabel` | `"Company"` | Contact option label |
| `customerLabel` | `"Consumer"` | Customer option label |
| `emailPlaceholder` | `"name@example.com"` | Placeholder |
| `passwordPlaceholder` | `"••••••••"` | Placeholder |
| `passwordMismatch` | `"Passwords do not match"` | Error message |
| `loginText` | `"Already have an account?"` | Login link prefix |
| `loginLink` | `"Log in"` | Login link text |

## Usage Examples

### Basic usage (both user types, full form)
```tsx
<RegisterForm
  graphqlClient={graphqlClient}
  afterRegistration={(user) => router.push('/account')}
/>
```

### Company-only registration
```tsx
<RegisterForm
  graphqlClient={graphqlClient}
  showUserType="Contact"
  requiredFields={['firstName', 'lastName', 'phone', 'companyName', 'vatNumber', 'cocNumber']}
  afterRegistration={(user) => router.push('/account')}
/>
```

### Consumer-only registration (no company fields)
```tsx
<RegisterForm
  graphqlClient={graphqlClient}
  showUserType="Customer"
  requiredFields={['firstName', 'lastName', 'phone']}
  afterRegistration={(user) => router.push('/account')}
/>
```

### Full page integration (as used in app/register/page.tsx)
```tsx
<RegisterForm
  graphqlClient={graphqlClient}
  title=""
  requiredFields={['firstName', 'lastName']}
  onLoginClick={() => router.push('/login')}
  afterRegistration={() => router.push('/account')}
/>
```

## SDK Services Used

- `UserService.registerContact(input)` / `UserService.registerCustomer(input)` — user registration
- `CompanyService.createCompany(input)` — company creation with `name`, `taxNumber` (VAT), `cocNumber`
- `AddressService.createCustomerAddress(input)` / `AddressService.createCompanyAddress(input)` — address creation with type `'invoice'` or `'delivery'`

All responses include session tokens (`accessToken`, `refreshToken`) which are stored in `localStorage` when `automaticLogin` is enabled, and a `userLoggedIn` custom event is dispatched for `AuthContext` to pick up.

### Language Handling

The `primaryLanguage` field is automatically included in the registration input. It reads from `localStorage.getItem('preferred_language')` with a fallback to `'NL'`, matching the language selection pattern used throughout the app (e.g., Header component).
