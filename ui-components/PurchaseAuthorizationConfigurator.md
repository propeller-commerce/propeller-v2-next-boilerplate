# PurchaseAuthorizationConfigurator

Allows contacts with the `AUTHORIZATION_MANAGER` role to manage purchase authorization configurations (PACs) for all contacts in the active company.

Renders nothing if the logged-in user is not an authorization manager for the given company.

## Features

- Paginated contacts table with inline role/limit editing
- Create, save, and delete purchase authorization configurations per contact
- Optional "Add contact" modal to register new contacts in the company
- All SDK operations can be overridden via callback props

## Usage

```tsx
import PurchaseAuthorizationConfigurator from '@/components/propeller/PurchaseAuthorizationConfigurator';

<PurchaseAuthorizationConfigurator
  graphqlClient={graphqlClient}
  user={user}
  companyId={companyId}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `graphqlClient` | `GraphQLClient` | ✅ | — | Propeller SDK GraphQL client |
| `user` | `Contact \| Customer` | ✅ | — | Logged-in user (role is read from their PAC data) |
| `companyId` | `number` | ✅ | — | Active company ID |
| `allowContactCreate` | `boolean` | — | `true` | Show "Add contact" button |
| `beforeContactCreate` | `(input) => void` | — | — | Fires before contact registration |
| `onContactCreate` | `(input) => void` | — | — | Override default `UserService.registerContact()` call |
| `afterContactCreate` | `(contact) => void` | — | — | Fires after contact created; default refreshes list |
| `onPurchaseAuthorizationCreate` | `(pac) => void` | — | — | Override default `createPurchaseAuthorizationConfig()` |
| `afterPurchaseAuthorizationCreate` | `(pac) => void` | — | — | Fires after PAC created; default refreshes list |
| `onPurchaseAuthorizationUpdate` | `(pac) => void` | — | — | Override default `updatePurchaseAuthorizationConfig()` |
| `afterPurchaseAuthorizationUpdate` | `(pac) => void` | — | — | Fires after PAC updated; default refreshes list |
| `onPurchaseAuthorizationDelete` | `(pac) => void` | — | — | Override default `deletePurchaseAuthorizationConfig()` |
| `afterPurchaseAuthorizationDelete` | `(deleted) => void` | — | — | Fires after PAC deleted; default refreshes list |
| `labels` | `Record<string, string>` | — | `{}` | Override any displayed text |
| `className` | `string` | — | `''` | Additional CSS class |
| `configuration` | `Record<string, any>` | — | — | App configuration passthrough |

## Labels

| Key | Default |
|-----|---------|
| `title` | `Purchase Authorization Settings` |
| `addContact` | `Add contact` |
| `addContactTitle` | `Add Contact` |
| `colId` | `ID` |
| `colName` | `Name` |
| `colRole` | `Role` |
| `colLimit` | `Limit` |
| `colActions` | `Actions` |
| `selectRole` | `— Select role —` |
| `rolePurchaser` | `Purchaser` |
| `roleManager` | `Authorization Manager` |
| `limitPlaceholder` | `0.00` |
| `save` | `Save` |
| `create` | `Create` |
| `delete` | `Delete` |
| `previous` | `Previous` |
| `next` | `Next` |
| `page` | `Page` |
| `of` | `of` |
| `companyName` | `Company` |
| `gender` | `Gender` |
| `email` | `Email` |
| `firstName` | `First name` |
| `middleName` | `Middle` |
| `lastName` | `Last name` |
| `phone` | `Phone` |
| `cancel` | `Cancel` |
| `addContactSubmit` | `Add Contact` |

## Role guard

The component reads `user.purchaseAuthorizationConfigs.items` from the session user object and checks for a PAC with `purchaseRole === AUTHORIZATION_MANAGER` and `company.companyId === companyId`. If not found, the component renders nothing.

## Data fetching

On mount and on every page change, calls `CompanyService.getCompany()` with server-side contact pagination (`page`, `offset: 10`). Each contact's PAC for the current company is included in the response via `ContactListFields`.

## SDK services

- `CompanyService.getCompany(CompanyVariables)` — fetches company with contacts and their PACs
- `PurchaseAuthorizationConfigService.createPurchaseAuthorizationConfig(input)` — creates a PAC
- `PurchaseAuthorizationConfigService.updatePurchaseAuthorizationConfig(id, input)` — updates a PAC
- `PurchaseAuthorizationConfigService.deletePurchaseAuthorizationConfig(id)` — deletes a PAC
- `UserService.registerContact(input)` — registers a new contact
