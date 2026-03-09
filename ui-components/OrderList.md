# OrderList

The OrderList component fetches and displays a paginated, searchable list of orders from the Propeller SDK. It supports both Contact (B2B) and Customer (B2C) users, with company-aware filtering for multi-company Contact users.

## Source Files

- **Mitosis source**: `ui-components/OrderList.lite.tsx`
- **Compiled React**: `output/react/ui-components/OrderList.tsx`
- **Compiled Vue**: `output/vue/ui-components/OrderList.vue`

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `user` | `Contact \| Customer \| null` | Yes | — | The authenticated user |
| `graphqlClient` | `GraphQLClient` | Yes | — | Initialized GraphQL client instance |
| `onOrderClick` | `(orderId: number) => void` | Yes | — | Callback when an order row is clicked |
| `companyId` | `number` | No | — | Override company ID for filtering (respects company switcher) |
| `columns` | `string[]` | No | `['id', 'date', 'status', 'total']` | Columns to display |
| `columnConfig` | `Record<string, string>` | No | — | Label mapping for column headers |
| `enableSearch` | `boolean` | No | `false` | Enable search UI |
| `searchFields` | `(keyof OrderSearchArguments)[]` | No | `[]` | Fields enabled for searching (e.g., `['term', 'createdAt', 'price']`) |
| `termFields` | `OrderSearchFields[]` | No | `[REFERENCE, ITEM_SKU]` | Backend fields to search when using term search |
| `orderStatus` | `string[]` | No | `['NEW', 'CONFIRMED', 'VALIDATED', 'ORDER']` | Filter orders by these statuses (e.g., `['QUOTATION']` for quotes) |
| `className` | `string` | No | — | Override base CSS class |
| `initialItemsPerPage` | `number` | No | `10` | Items per page |
| `rowsClickable` | `boolean` | No | `false` | Make entire rows clickable (calls `onOrderClick`) |
| `formatPrice` | `(price: number) => string` | No | `€{price}` | Custom price formatter |
| `formatDate` | `(dateString: string) => string` | No | `toLocaleDateString()` | Custom date formatter |
| `getStatusColor` | `(status: string) => string` | No | Built-in | Custom status color classes |
| `labels` | `object` | No | English defaults | Localization labels (see below) |

### Labels Object

```ts
{
  view?: string;       // "View" button text
  previous?: string;   // Pagination previous
  next?: string;       // Pagination next
  showingPage?: string; // "Showing page" text
  of?: string;         // "of" text
  noOrders?: string;   // Empty state message
  loading?: string;    // Loading state message
  order?: string;
  date?: string;
  status?: string;
  total?: string;
  action?: string;
}
```

## Usage

### Basic usage

```tsx
import OrderList from '@/output/react/ui-components/OrderList';
import { graphqlClient } from '@/lib/api';

<OrderList
  graphqlClient={graphqlClient}
  user={state.user}
  onOrderClick={(orderId) => router.push(`/account/orders/${orderId}`)}
/>
```

### With company switcher support

```tsx
const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(() => {
  const stored = localStorage.getItem('selected_company_id');
  return stored ? parseInt(stored, 10) : undefined;
});

useEffect(() => {
  const listener = (event: CustomEvent) => {
    if (event.detail?.companyId) setSelectedCompanyId(event.detail.companyId);
  };
  window.addEventListener('companySwitched', listener as EventListener);
  return () => window.removeEventListener('companySwitched', listener as EventListener);
}, []);

<OrderList
  graphqlClient={graphqlClient}
  user={state.user}
  companyId={selectedCompanyId}
  onOrderClick={(orderId) => router.push(`/account/orders/${orderId}`)}
/>
```

### With search and custom columns

```tsx
<OrderList
  graphqlClient={graphqlClient}
  user={state.user}
  companyId={selectedCompanyId}
  onOrderClick={(orderId) => router.push(`/account/orders/${orderId}`)}
  enableSearch={true}
  searchFields={['term', 'createdAt', 'price']}
  columns={['id', 'date', 'status', 'total']}
  columnConfig={{ id: '#', date: 'Date', status: 'Status', total: 'Total' }}
  rowsClickable={true}
/>
```

## Company-Aware Filtering

The `companyId` prop controls which company's orders are fetched:

- **When provided**: Uses `companyId` in the `companyIds` filter of the orders query
- **When omitted**: Falls back to `user.company.companyId` for Contact users
- **For Customer users**: `companyIds` is not included in the query (customers don't belong to companies)

The component re-fetches orders when `companyId` changes (tracked via `onUpdate` / `useEffect` dependency).

## Search Fields

The search UI renders different input types based on the field:

- `term` — Text input with Enter-key submit
- `createdAt` / `lastModifiedAt` — Date range (from/to)
- `price` — Decimal range (min/max)
- `sortInput` — Sort field + order dropdowns
- `type` — Order type dropdown

## Built-in Column Renderers

The following column names have special rendering logic:

- `id` — Bold gray text
- `date` — Formatted via `formatDate()` (uses `order.date` or `order.createdAt`)
- `status` — Colored badge via `getStatusColor()`
- `total` — Formatted via `formatPrice()` (uses `order.total.net`), right-aligned
- `validUntil` — Formatted via `formatDate()` (uses `order.validUntil`), useful for quote expiry dates
- `action` — "View" button (hidden when `rowsClickable` is true)

Any other column name falls through to a catch-all that renders `order[col]` as plain text.

### Quotes page with validUntil column

```tsx
<OrderList
  graphqlClient={graphqlClient}
  user={state.user}
  orderStatus={["QUOTATION"]}
  columns={['id', 'date', 'status', 'validUntil', 'total']}
  columnConfig={{ id: '#', date: 'Datum', status: 'Status', validUntil: 'Geldig tot', total: 'Totaal' }}
  rowsClickable={true}
  enableSearch={true}
  searchFields={['term', 'createdAt', 'price']}
  onOrderClick={(orderId) => router.push(`/account/quotes/${orderId}`)}
/>
```

## Notes

- Orders are fetched on mount and re-fetched when `user`, `currentPage`, or `companyId` changes
- The component manages its own pagination state internally
- Status colors: violet for COMPLETE/QUOTE_ACCEPTED, red for CANCELLED/QUOTE_REJECTED, yellow for all others
