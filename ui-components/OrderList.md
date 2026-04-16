import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# OrderList

A self-contained, paginated order list that fetches orders from the Propeller GraphQL API. Supports text search, date/price range filters, sorting, status filtering, and company-aware queries for B2B users.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Orders page (basic)

```tsx
import OrderList from '@/components/propeller/OrderList';
import { graphqlClient } from '@/lib/graphql';

<OrderList
  graphqlClient={graphqlClient}
  user={user}
  onOrderClick={(orderId) => router.push(`/account/orders/${orderId}`)}
  enableSearch={true}
  searchFields={['term', 'createdAt']}
  columns={['id', 'date', 'status', 'total', 'action']}
  columnConfig={{ id: '#', date: 'Date', status: 'Status', total: 'Total', action: '' }}
/>
```

### Quotes page (with status filter and validUntil column)

Filter by `QUOTATION` status and add the `validUntil` column to show quote expiry dates:

```tsx
<OrderList
  graphqlClient={graphqlClient}
  user={user}
  orderStatus={['QUOTATION']}
  columns={['id', 'date', 'status', 'validUntil', 'total']}
  columnConfig={{
    id: '#',
    date: 'Date',
    status: 'Status',
    validUntil: 'Valid until',
    total: 'Total',
  }}
  rowsClickable={true}
  enableSearch={true}
  searchFields={['term', 'createdAt', 'price']}
  onOrderClick={(orderId) => router.push(`/account/quotes/${orderId}`)}
/>
```

### B2B with company filter (CompanyContext integration)

For Contact users who belong to multiple companies, pass the active company ID so orders are scoped to that company. The component re-fetches automatically when `companyId` changes.

```tsx
import { useCompany } from '@/context/CompanyContext';

const { selectedCompany } = useCompany();
const isContact = (u: any) => u !== null && 'company' in u;
const getActiveCompany = () =>
  !user || !isContact(user) ? null : selectedCompany ?? null;

<OrderList
  graphqlClient={graphqlClient}
  user={user}
  companyId={getActiveCompany()?.companyId}
  onOrderClick={(orderId) => router.push(`/account/orders/${orderId}`)}
  enableSearch={true}
  searchFields={['term', 'createdAt', 'price']}
  columns={['id', 'date', 'status', 'total', 'action']}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

Standalone implementation using the SDK directly:

```ts
import {
  OrderService,
  OrderSearchArguments,
  Order,
  Enums,
  GraphQLClient,
} from 'propeller-sdk-v2';

// pseudo-code

// 1. Initialize the service
const orderService = new OrderService(graphqlClient);

// 2. Build search arguments
const itemsPerPage = 10;
const args: OrderSearchArguments = {
  status: ['NEW', 'CONFIRMED', 'VALIDATED', 'ORDER'],
  userId: [userId],
  ...(companyId && { companyIds: [companyId] }),
  page: 1,
  offset: itemsPerPage,
  term: '',
  termFields: [
    Enums.OrderSearchFields.REFERENCE,
    Enums.OrderSearchFields.ITEM_SKU,
    Enums.OrderSearchFields.ID,
  ],
};

// 3. Fetch orders
const response = await orderService.getOrders(args);
const orders: Order[] = response.items || [];
const totalPages = Math.ceil((response.itemsFound || 0) / itemsPerPage);
```

**Data mapping per order row:**

| Field | Source |
|---|---|
| Order ID | `order.id` |
| Date | `new Date(order.date \|\| order.createdAt \|\| '').toLocaleDateString()` |
| Status | `order.status` |
| Total | `order.total?.net` (format as currency, e.g., `EUR X.XX`) |

**Quotes with company filter:**

```ts
// pseudo-code: fetch quotes scoped to a specific company
const quoteArgs: OrderSearchArguments = {
  status: ['QUOTATION'],
  userId: [userId],
  companyIds: [companyId],
  page: 1,
  offset: 10,
  term: '',
  termFields: [
    Enums.OrderSearchFields.REFERENCE,
    Enums.OrderSearchFields.ITEM_SKU,
    Enums.OrderSearchFields.ID,
  ],
};

const quoteResponse = await orderService.getOrders(quoteArgs);
```

**UI structure:**

- Show a loading indicator while fetching. Show an empty-state message when `orders` is empty.
- Render a table with columns for order ID, date, status, and total. Each row should be clickable to navigate to the order detail.
- When `totalPages > 1`, render Previous/Next pagination controls. Track the current page number in your framework's state mechanism and re-fetch orders when it changes.
- Re-fetch when `userId`, `companyId`, or the current page changes.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required

| Prop | Type | Description |
|---|---|---|
| `user` | `Contact \| Customer \| null` | The authenticated user. Component does not fetch until a user is provided. |
| `graphqlClient` | `GraphQLClient` | Initialized SDK GraphQL client instance. |
| `onOrderClick` | `(orderId: number) => void` | Called when an order row or "View" button is clicked. |

### Display

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` | `string[]` | `['id', 'date', 'status', 'total']` | Column keys to render. Built-in renderers exist for `id`, `date`, `status`, `total`, `validUntil`, `action`. Any other key renders `order[key]` as plain text. |
| `columnConfig` | `Record<string, string>` | Auto-capitalized key | Maps column keys to display labels for table headers. |
| `className` | `string` | `undefined` | CSS class applied to the root wrapper `<div>`. |
| `rowsClickable` | `boolean` | `false` | When `true`, the entire row is clickable (calls `onOrderClick`) and the `action` column button is hidden. |

### Filtering and Search

| Prop | Type | Default | Description |
|---|---|---|---|
| `orderStatus` | `string[]` | `['NEW', 'CONFIRMED', 'VALIDATED', 'ORDER']` | Status codes to filter by. Use `['QUOTATION']` for quotes. |
| `companyId` | `number` | `undefined` | Override company ID for order filtering. Falls back to `user.company.companyId` for Contact users. Omitted entirely for Customer users. |
| `enableSearch` | `boolean` | `false` | Show the search panel above the table. |
| `searchFields` | `string[]` | `[]` | Which search inputs to render. Options: `'term'`, `'createdAt'`, `'lastModifiedAt'`, `'price'`, `'sortInput'`, `'type'`. When `enableSearch` is `true`, `'term'` is automatically prepended if not already present. |
| `termFields` | `OrderSearchFields[]` | `[REFERENCE, ITEM_SKU, ID, ITEM_NAME, REMARKS]` | Backend fields searched when the user types a text query. Uses `Enums.OrderSearchFields` values. |
| `channelIds` | `number[]` | `undefined` | Filter orders by channel IDs. Maps to the Propeller API `channelIds` search argument. |

### Pagination

| Prop | Type | Default | Description |
|---|---|---|---|
| `initialItemsPerPage` | `number` | `10` | Number of orders per page. |
| `hidePagination` | `boolean` | `false` | When `true`, pagination controls are hidden even when there are multiple pages. |

### Formatting and Localization

| Prop | Type | Default | Description |
|---|---|---|---|
| `formatPrice` | `(price: number) => string` | Formats as `EUR X.XX` | Custom price formatter. |
| `formatDate` | `(dateString: string) => string` | `toLocaleDateString()` | Custom date formatter. |
| `getStatusColor` | `(status: string) => string` | Built-in color map | Returns Tailwind class string for the status badge. |
| `labels` | `object` | English defaults | UI text overrides (see Labels section). |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
async function fetchOrders(
  graphqlClient: GraphQLClient,
  args: OrderSearchArguments
): Promise<{ items: Order[]; itemsFound: number; offset: number }> {
  const orderService = new OrderService(graphqlClient);
  return await orderService.getOrders(args);
}
```

### Options table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `status` | `string[]` | `['NEW', 'CONFIRMED', 'VALIDATED', 'ORDER']` | `orderStatus` prop |
| `userId` | `number[]` | -- | Derived from `user` prop |
| `companyIds` | `number[]` | -- | `companyId` prop |
| `page` | `number` | `1` | Internal page counter |
| `offset` | `number` | `10` | `initialItemsPerPage` prop |
| `term` | `string` | `''` | Search text input |
| `termFields` | `OrderSearchFields[]` | `[REFERENCE, ITEM_SKU, ID, ITEM_NAME, REMARKS]` | `termFields` prop |
| `createdAt` | `{ greaterThan, lessThan }` | -- | `createdAt` search field |
| `price` | `{ greaterThan, lessThan }` | -- | `price` search field |
| `sortInput` | `{ field, order }` | -- | `sortInput` search field |
| `type` | `OrderType` | -- | `type` search field |

### Callbacks table

| Callback | When it fires | What to implement |
|---|---|---|
| `onOrderClick` | User clicks an order row or "View" button | Navigate to the order detail page |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. You are responsible for implementing equivalent behavior in your custom UI:

`className`, `columns`, `columnConfig`, `rowsClickable`, `enableSearch`, `searchFields`, `formatPrice`, `formatDate`, `getStatusColor`, `labels`.

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

All fields are optional. Defaults are English strings.

```ts
{
  view?: string;        // "View" button text (default: "View")
  previous?: string;    // Pagination previous button (default: "Previous")
  next?: string;        // Pagination next button (default: "Next")
  showingPage?: string; // Page indicator prefix (default: "Showing page")
  of?: string;          // Page indicator separator (default: "of")
  noOrders?: string;    // Empty state message (default: "No orders found.")
  loading?: string;     // Loading spinner text (default: "Loading orders...")
  order?: string;
  date?: string;
  status?: string;
  total?: string;
  action?: string;
}
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  view: 'View',
  previous: 'Previous',
  next: 'Next',
  showingPage: 'Showing page',
  of: 'of',
  noOrders: 'No orders found.',
  loading: 'Loading orders...',
  order: 'order',
  date: 'date',
  status: 'status',
  total: 'total',
  action: 'action',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Pagination

- Page-based pagination using `page` and `offset` (items per page) parameters.
- Pagination controls appear only when `totalPages > 1`.
- Mobile: simplified Previous/Next buttons. Desktop: page indicator ("Showing page X of Y") with Previous/Next buttons.
- The `initialItemsPerPage` prop sets the page size (default 10). The API response `offset` can override this.

### Search

- The search panel only renders when `enableSearch={true}` and at least one search field is configured.
- The `term` field is automatically added when `enableSearch` is `true`, even if not listed in `searchFields`.
- Pressing Enter in the term input triggers a search. A "Search" button and "Clear" button are also provided.
- Searching always resets to page 1.

### Search field types

| Field | Input type | Sent as |
|---|---|---|
| `term` | Text (full width) | `term: string` |
| `createdAt` | Two date pickers (from/to) | `createdAt: { greaterThan?: string, lessThan?: string }` — each value is an ISO 8601 string or `undefined` when cleared |
| `lastModifiedAt` | Two date pickers (from/to) | `lastModifiedAt: { greaterThan?: string, lessThan?: string }` — each value is an ISO 8601 string or `undefined` when cleared |
| `price` | Two number inputs (min/max) | `price: { greaterThan, lessThan }` |
| `sortInput` | Two dropdowns (field + order) | `sortInput: { field, order }` |
| `type` | Dropdown (order type) | `type: OrderType` |

### Column renderers

Six column keys have built-in rendering logic:

| Column | Rendering |
|---|---|
| `id` | Bold text, `order.id` |
| `date` | Formatted date from `order.date` or `order.createdAt` |
| `status` | Colored badge using `getStatusColor()` |
| `total` | Right-aligned, formatted price from `order.total.net` |
| `validUntil` | Formatted date from `order.validUntil` (useful for quote expiry) |
| `action` | "View" button that calls `onOrderClick`. Hidden when `rowsClickable` is `true`. |

Any other column key falls through to render `order[columnKey]` as plain text, allowing access to any field on the Order object.

### Status colors (defaults)

| Status | Style |
|---|---|
| `COMPLETE`, `QUOTE_ACCEPTED` | Green-tinted badge (`bg-secondary/10 text-secondary`) |
| `CANCELLED`, `QUOTE_REJECTED` | Red badge (`bg-red-100 text-red-800`) |
| All others | Yellow badge (`bg-yellow-100 text-yellow-800`) |

Override with the `getStatusColor` prop to return your own Tailwind class string.

### Company filtering

- **`companyId` prop provided**: Filters orders by that company via `companyIds` in the search arguments.
- **`companyId` prop omitted, Contact user**: Falls back to `user.company.companyId`.
- **Customer user (B2C)**: `companyIds` is not included in the query. Customers see only their own orders.
- The component re-fetches when `companyId` changes, enabling live updates from a company switcher.

### Status codes

Common status strings used with `orderStatus`:

| Status | Usage |
|---|---|
| `NEW` | Newly placed order |
| `CONFIRMED` | Order confirmed |
| `VALIDATED` | Order validated |
| `ORDER` | Active order |
| `COMPLETE` | Fulfilled order |
| `CANCELLED` | Cancelled order |
| `QUOTATION` | Quote / request for quotation |
| `QUOTE_ACCEPTED` | Accepted quote |
| `QUOTE_REJECTED` | Rejected quote |

Default filter (when `orderStatus` is not provided): `['NEW', 'CONFIRMED', 'VALIDATED', 'ORDER']`.

### Re-fetch triggers

The component fetches orders on mount and re-fetches when any of these change:
- `user` (login/logout)
- `currentPage` (pagination)
- `companyId` (company switcher)

A `fetching` guard prevents concurrent requests.

## GraphQL Query Examples

Under the hood, `OrderService.getOrders()` executes a GraphQL query. Here are equivalent raw queries for reference.

### Paginated orders with search

```graphql
query Orders($input: OrderSearchArguments!) {
  orders(input: $input) {
    items {
      id
      date
      createdAt
      status
      total {
        net
        gross
      }
    }
    itemsFound
    offset
    page
  }
}
```

Variables for a basic paginated fetch:

```json
{
  "input": {
    "status": ["NEW", "CONFIRMED", "VALIDATED", "ORDER"],
    "userId": [12345],
    "page": 1,
    "offset": 10,
    "term": "",
    "termFields": ["REFERENCE", "ITEM_SKU", "ID", "ITEM_NAME", "REMARKS"]
  }
}
```

### Quotes with company filter

```json
{
  "input": {
    "status": ["QUOTATION"],
    "userId": [12345],
    "companyIds": [678],
    "page": 1,
    "offset": 10,
    "term": ""
  }
}
```

### Orders with date range and price filter

```json
{
  "input": {
    "status": ["NEW", "CONFIRMED", "ORDER"],
    "userId": [12345],
    "page": 1,
    "offset": 20,
    "term": "SKU-001",
    "termFields": ["ITEM_SKU", "REFERENCE"],
    "createdAt": {
      "greaterThan": "2025-06-01T00:00:00Z",
      "lessThan": "2025-12-31T23:59:59Z"
    },
    "price": {
      "greaterThan": 100.0,
      "lessThan": 1000.0
    },
    "sortInput": {
      "field": "DATE",
      "order": "DESC"
    }
  }
}
```

## SDK Services

The component uses `OrderService` from `propeller-sdk-v2` internally:

```ts
import { OrderService, OrderSearchArguments, Enums } from 'propeller-sdk-v2';

const orderService = new OrderService(graphqlClient);
const response = await orderService.getOrders(searchArgs);
// response.items    — Order[]
// response.itemsFound — total count
// response.offset   — items per page
```

The `OrderSearchArguments` object controls all filtering, pagination, and sorting:

```ts
const searchArgs: OrderSearchArguments = {
  status: ['NEW', 'CONFIRMED', 'VALIDATED', 'ORDER'],
  userId: [userId],
  companyIds: [companyId],       // optional, B2B only
  page: 1,
  offset: 10,                   // items per page
  term: 'search text',
  termFields: [
    Enums.OrderSearchFields.REFERENCE,
    Enums.OrderSearchFields.ITEM_SKU,
    Enums.OrderSearchFields.ID,
    Enums.OrderSearchFields.ITEM_NAME,
    Enums.OrderSearchFields.REMARKS,
  ],
  createdAt: {                   // optional date range; omit or use undefined to clear
    greaterThan: '2025-01-01T00:00:00Z',
    lessThan: '2025-12-31T23:59:59Z',
  },
  price: {                       // optional price range
    greaterThan: 50.0,
    lessThan: 500.0,
  },
  sortInput: {                   // optional sorting
    field: Enums.OrderSortField.DATE,
    order: Enums.SortOrder.DESC,
  },
  type: Enums.OrderType.ORDER,   // optional type filter
};
```
