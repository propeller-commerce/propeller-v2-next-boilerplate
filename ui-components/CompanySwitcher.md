# CompanySwitcher

The CompanySwitcher component provides a dropdown selector for B2B users (Contact type) who belong to multiple companies. It displays the currently active company name and lets the user switch between their assigned companies. This component is designed for use in the site header or navigation bar.

## Usage

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

## Props

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

## GraphQL Query

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

## Building Your Own

If you need a company switcher with custom UI or additional logic, you can build your own using the same data from the Propeller SDK:

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Contact, Company, UserService } from 'propeller-sdk-v2';

interface CustomCompanySwitcherProps {
  user: Contact;
  onCompanyChange: (company: Company) => void;
}

export default function CustomCompanySwitcher({ user, onCompanyChange }: CustomCompanySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCompanyId, setActiveCompanyId] = useState<number | null>(
    user.company?.companyId ?? null
  );
  const ref = useRef<HTMLDivElement>(null);

  // Extract companies from user object
  const companies: Company[] = (() => {
    const raw = user.companies as any;
    const items = (raw?.items ?? raw?._items) as Company[] | undefined;
    if (Array.isArray(items) && items.length > 0) return items;
    return user.company ? [user.company] : [];
  })();

  const activeCompany = companies.find(c => c.companyId === activeCompanyId) ?? user.company ?? null;

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleSelect = (company: Company) => {
    setActiveCompanyId(company.companyId);
    setIsOpen(false);
    onCompanyChange(company);

    // Persist and notify other components
    localStorage.setItem('selected_company', JSON.stringify(company));
    window.dispatchEvent(new CustomEvent('companySwitched', { detail: company }));
  };

  if (companies.length <= 1) return null; // No need to switch

  return (
    <div ref={ref} className="relative inline-block">
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-1.5 text-sm">
        {activeCompany?.name ?? 'Select company'}
      </button>

      {isOpen && (
        <ul className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded border bg-white shadow-lg">
          {companies.map(company => (
            <li
              key={company.companyId}
              onClick={() => handleSelect(company)}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                company.companyId === activeCompanyId ? 'font-bold' : ''
              }`}
            >
              {company.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Integrating with CompanyContext

To persist the selected company across page navigations and sync with other components, wrap your app with `CompanyProvider` and use the `useCompany` hook:

```tsx
import { useCompany } from '@/context/CompanyContext';

function MyHeader({ user }: { user: Contact }) {
  const { selectedCompany, setSelectedCompany } = useCompany();

  return (
    <CustomCompanySwitcher
      user={user}
      onCompanyChange={setSelectedCompany}
    />
  );
}
```

The `CompanyContext` handles:
- Storing the selected company in `localStorage` (key: `selected_company`)
- Dispatching `companySwitched` custom events for cross-component sync
- Clearing the selection on `userLoggedOut` events
- Syncing across tabs via the `companySwitched` event listener

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
