# UserDetails

The UserDetails component displays key information about the currently logged-in user within the dashboard. It supports both **Contact** (B2B) and **Customer** (B2C) user types and can optionally present company details, associated companies, and default invoice or delivery addresses.

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `user` | `Contact \| Customer` | Yes | — | The currently logged-in user |
| `showCompanyInfo` | `boolean` | No | `true` | Display basic company information (name, tax number, CoC number) for the active company if user is Contact |
| `listAllContactCompanies` | `boolean` | No | `false` | Display a list of all companies if the user is Contact |
| `showDefaultInvoiceAddress` | `boolean` | No | `true` | Display the user's default invoice address |
| `showDefaultDeliveryAddress` | `boolean` | No | `false` | Display the user's default delivery address |

## Company Switching

When the user is a Contact with multiple companies, the component reacts to company switches from the `CompanySwitcher` component (typically in the Header). Communication uses the **custom event pattern**:

- **localStorage key**: `selected_company_id` — persists the selected company ID
- **Custom event**: `companySwitched` — dispatched with `{ detail: company }` when company changes
- On mount, reads `selected_company_id` from localStorage to restore the last selection
- Listens for `companySwitched` events to update displayed company info and addresses in real-time

## Sections Rendered

1. **Personal Information** — Name and email (always shown)
2. **Company Information** — Company name, tax number, CoC number (when `showCompanyInfo` is true and user is Contact)
3. **Companies List** — All associated companies with active indicator (when `listAllContactCompanies` is true and user is Contact)
4. **Default Addresses** — Invoice and/or delivery address cards (controlled by `showDefaultInvoiceAddress` and `showDefaultDeliveryAddress`)

## Usage

```tsx
import UserDetails from '@/components/propeller/UserDetails';

<UserDetails
  user={user}
  showCompanyInfo={true}
  listAllContactCompanies={false}
  showDefaultInvoiceAddress={true}
  showDefaultDeliveryAddress={true}
/>
```

## Address Resolution

- **Contact users**: Addresses come from the active company's `addresses` array
- **Customer users**: Addresses come from the user's `addresses` array
- Default addresses are found by filtering for `type === 'invoice'|'delivery'` and `isDefault === 'Y'`

## Files

- **Mitosis source**: `ui-components/UserDetails.lite.tsx`
- **Compiled React**: `components/propeller/UserDetails.tsx`
- **Compiled output**: `output/react/ui-components/UserDetails.tsx`
