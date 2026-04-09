import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# CompanySwitcher

Provides a dropdown selector for B2B users (Contact type) who belong to multiple companies. Displays the currently active company name and lets the user switch between their assigned companies. Designed for use in the site header or navigation bar.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic usage in Header

```tsx
import CompanySwitcher from '@/components/propeller/CompanySwitcher';
import { Contact, Company } from 'propeller-sdk-v2';

function Header({ user }: { user: Contact }) {
  const handleCompanyChange = (company: Company) => {
    console.log('Switched to:', company.name, company.companyId);
  };

  return (
    <CompanySwitcher
      user={user}
      onCompanyChange={handleCompanyChange}
    />
  );
}
```

### With CompanyContext integration

The recommended pattern uses `CompanyContext` to persist the selected company across the app and sync it with other components (e.g., OrderList, UserDetails, AddressCard).

```tsx
import CompanySwitcher from '@/components/propeller/CompanySwitcher';
import { useCompany } from '@/context/CompanyContext';
import { Contact } from 'propeller-sdk-v2';

function Header({ user }: { user: Contact }) {
  const { selectedCompany, setSelectedCompany } = useCompany();

  return (
    <CompanySwitcher
      user={user}
      selectedCompanyId={selectedCompany?.companyId}
      onCompanyChange={setSelectedCompany}
    />
  );
}
```

### Conditional rendering for multi-company contacts only

Only show the switcher when the user is a Contact with more than one company:

```tsx
import { Contact } from 'propeller-sdk-v2';

{state.isAuthenticated && state.user && 'contactId' in state.user
  && (state.user as Contact).companies
  && ((state.user as Contact).companies!.items?.length || 0) > 1 && (
    <CompanySwitcher
      user={state.user as Contact}
      selectedCompanyId={selectedCompany?.companyId}
      onCompanyChange={setSelectedCompany}
    />
  )}
```

### With custom icon

```tsx
<CompanySwitcher
  user={user}
  icon="building"
  onCompanyChange={handleCompanyChange}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Extracting companies from the user object

```ts
import { Contact, Company } from 'propeller-sdk-v2';

function getCompanies(user: Contact): Company[] {
  // The SDK may serialize items under `items` or `_items`
  const raw = user.companies as any;
  const items = (raw?.items ?? raw?._items) as Company[] | undefined;
  if (Array.isArray(items) && items.length > 0) return items;
  return user.company ? [user.company] : [];
}

// Only show the switcher when the user has more than one company
const companies = getCompanies(user);
if (companies.length <= 1) {
  // No switcher needed
}
```

### Handling company selection

```ts
function handleSelect(company: Company) {
  // pseudo-code: update your active company state

  // Persist to localStorage so other components and page reloads can read it
  localStorage.setItem('selected_company', JSON.stringify(company));

  // Notify other components (e.g., OrderList, UserDetails) via custom event
  window.dispatchEvent(new CustomEvent('companySwitched', { detail: company }));
}
```

### Active company resolution

Determine the active company using this priority:

1. The company the user just selected (from your local state)
2. An externally controlled `selectedCompanyId` (e.g., from a shared state provider)
3. `user.company` as the default fallback

### Click-outside dismissal

When the dropdown is open, add a `mousedown` listener on `document` that checks whether the click target is outside the switcher element. If so, close the dropdown. Remove the listener when the dropdown closes.

### Cross-component sync pattern

To persist the selected company across page navigations and sync with other components:

- Store the selected company in `localStorage` (key: `selected_company`) and in your app-level state.
- Dispatch a `companySwitched` custom event on `window` when the selection changes.
- Listen for `userLoggedOut` events to clear the selection on logout.
- Other components (OrderList, UserDetails, etc.) listen for the `companySwitched` event to refetch data for the new company.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required Props

| Prop | Type | Description |
|---|---|---|
| `user` | `Contact` | The authenticated B2B user. Companies are read from `user.companies.items` (or `user.companies._items`). Falls back to `user.company` if no companies list is available. |
| `onCompanyChange` | `(company: Company) => void` | Callback fired when the user selects a different company. Receives the full `Company` object. |

### Optional Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `icon` | `string` | `'default-company-switch-icon'` | CSS icon class identifier. Applied as `icon-{value}` on the trigger button icon span. |
| `selectedCompanyId` | `number` | `undefined` | Externally controlled active company ID. Use this to sync the switcher with a context provider (e.g., `CompanyContext`). When not provided, the component defaults to `user.company`. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function companySwitcher(options: CompanySwitcherOptions): void
```

### Options

| Field | Type | Default | Maps to |
|---|---|---|---|
| `user` | `Contact` | (required) | `user` prop |
| `onCompanyChange` | `(company: Company) => void` | (required) | `onCompanyChange` prop |
| `selectedCompanyId` | `number` | `undefined` | `selectedCompanyId` prop |

### UI-only props

The following props are UI-specific and do not apply when building your own:

- `icon` -- CSS icon class for the trigger button

  </TabItem>
</Tabs>

---

## Behavior

### Active company resolution

The component determines the active company using the following priority:

1. **Internal state** (`activeCompanyId`) -- set when the user clicks a company in the dropdown
2. **`selectedCompanyId` prop** -- syncs with external state (e.g., `CompanyContext`)
3. **`user.company`** -- the user's default company from the Propeller API

If no company can be resolved, the trigger button displays "Select company".

### Company list resolution

The component reads the user's companies from `user.companies.items`. Due to SDK serialization behavior, it also checks `user.companies._items` as a fallback. If neither is available or the array is empty, it falls back to a single-item list containing `user.company`.

### Dropdown interaction

- **Open/close**: Clicking the trigger button toggles the dropdown. An animated chevron rotates to indicate open/closed state.
- **Click outside**: Clicking anywhere outside the component closes the dropdown.
- **Selection**: Clicking a company in the list immediately updates the internal state, closes the dropdown, and fires `onCompanyChange`.
- **Active indicator**: The currently active company is shown in bold with a checkmark icon.

### Accessibility

- The trigger button uses `aria-haspopup="listbox"` and `aria-expanded` to communicate dropdown state.
- The dropdown list uses `role="listbox"` with `role="option"` and `aria-selected` on each item.
- The trigger has `aria-label="Switch company"` for screen readers.

### Cross-component sync via CompanyContext

When used with `CompanyContext`, selecting a company triggers the following chain:

1. `onCompanyChange` fires with the selected `Company`
2. `CompanyContext.setSelectedCompany()` stores it in React state and `localStorage` (key: `selected_company`)
3. A `companySwitched` custom event is dispatched on `window`
4. Other components listening for `companySwitched` (e.g., UserDetails, OrderList) react to the change and refetch data for the new company
5. On logout, `CompanyContext` automatically clears the selected company

## SDK Services

This component does **not** call any SDK services directly. It is a purely presentational component that reads company data from the `user` prop (a `Contact` object already fetched via the Propeller SDK).

The company data it consumes is typically fetched as part of the user/viewer query:

```ts
import { UserService } from 'propeller-sdk-v2';

const userService = new UserService(graphqlClient);
const viewer = await userService.getViewer({});
// viewer.companies.items contains the Company[] list
// viewer.company contains the default Company
```

### Related SDK types

```ts
import { Contact, Company } from 'propeller-sdk-v2';

// Contact — B2B user type
interface Contact {
  contactId: number;
  company: Company;           // Default company
  companies: {
    items: Company[];         // All assigned companies
  };
  // ...other fields
}

// Company
interface Company {
  companyId: number;
  name: string;
  // ...other fields
}
```

## GraphQL Queries and Mutations

The company data consumed by this component comes from the `viewer` query, which returns the authenticated user's profile including their company associations:

```graphql
query Viewer {
  viewer {
    ... on Contact {
      contactId
      firstName
      lastName
      company {
        companyId
        name
      }
      companies {
        items {
          companyId
          name
        }
      }
    }
  }
}
```

## CSS Classes

The component uses BEM-style class names for targeted styling:

| Class | Element |
|---|---|
| `.company-switcher` | Root container |
| `.company-switcher__trigger` | Trigger button |
| `.company-switcher__icon` | Icon span (also receives `icon-{value}`) |
| `.company-switcher__label` | Active company name (truncated at 160px) |
| `.company-switcher__chevron` | Chevron arrow (rotates on open) |
| `.company-switcher__dropdown` | Dropdown list container |
| `.company-switcher__option` | Individual company list item |
| `.company-switcher__option-name` | Company name text within option |
| `.company-switcher__option-check` | Checkmark SVG on active option |
