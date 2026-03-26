# GridToolbar

Toolbar for product grids that provides sort controls, per-page size selector, grid/list view toggle, result count display, and removable filter badges. Designed to sit above a ProductGrid and coordinate sorting, pagination size, view mode, and active filter visualization.

---

## Usage

### Basic with sort and page size callbacks

```tsx
import GridToolbar from "@/components/propeller/GridToolbar";

<GridToolbar
  itemsFound={594}
  onSortChange={(field, order) => console.log(field, order)}
  onOffsetChange={(size) => console.log("Page size:", size)}
/>
```

### With custom sort options and default sort

```tsx
<GridToolbar
  sortOptions={["NAME", "PRICE", "CREATED_AT"]}
  defaultSort={[{ field: "PRICE", order: "DESC" }]}
  onSortChange={handleSortChange}
  onOffsetChange={handleOffsetChange}
  itemsFound={totalProducts}
/>
```

### Full toolbar with view toggle, pagination range, and active filters

```tsx
<GridToolbar
  sortOptions={["CATEGORY_ORDER", "NAME", "PRICE"]}
  defaultSort={currentSort}
  viewMode={viewMode}
  offset={[12, 24, 48, 96]}
  defaultOffset={24}
  itemsFound={totalProducts}
  page={currentPage}
  pageSize={24}
  pageItemCount={productsOnThisPage}
  activeTextFilters={{ color: ["Red", "Blue"], brand: ["Nike"] }}
  priceFilterMin={10}
  priceFilterMax={200}
  onSortChange={handleSort}
  onOffsetChange={handlePageSize}
  onViewChange={handleViewChange}
  onFilterRemove={handleFilterRemove}
  onPriceFilterRemove={handlePriceFilterRemove}
  onClearFilters={handleClearAll}
  labels={{ products: " items", clearAll: "Reset filters" }}
  className="mb-6"
/>
```

### Semi-closed portal mode (price sorting disabled for guests)

```tsx
<GridToolbar
  portalMode="semi-closed"
  user={authenticatedUser}
  onSortChange={handleSort}
  onOffsetChange={handlePageSize}
  itemsFound={120}
/>
```

### Minimal with custom page sizes only

```tsx
<GridToolbar
  offset={[10, 25, 50, 100]}
  defaultOffset={25}
  onOffsetChange={handlePageSize}
/>
```

---

## Props

### Data Display

| Prop            | Type     | Default | Description                                                                                |
| --------------- | -------- | ------- | ------------------------------------------------------------------------------------------ |
| `itemsFound`    | `number` | --      | Total products found. Displays as a count on the left side. Pass 0 or omit to hide         |
| `page`          | `number` | --      | Current page number (1-based). Used with `pageSize` and `itemsFound` for range display     |
| `pageSize`      | `number` | `12`    | Items per page. Used with `page` and `itemsFound` to compute the displayed range           |
| `pageItemCount` | `number` | --      | Actual items on the current page. Overrides `pageSize` for the range end when provided     |

### Sorting

| Prop          | Type                                          | Default                                        | Description                                                                            |
| ------------- | --------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `sortOptions` | `string[]`                                    | All `ProductSortField` values                  | Sort field keys to show in the dropdown (e.g. `['NAME', 'PRICE']`)                     |
| `defaultSort` | `{ field: string; order: string }[]`          | `[{ field: 'CATEGORY_ORDER', order: 'ASC' }]` | Active sort. First element is used                                                      |
| `onSortChange`| `(field: string, order: string) => void`      | --                                             | Called when sort field or direction changes. Receives new field key and `'ASC'`/`'DESC'` |

### Page Size

| Prop             | Type                         | Default      | Description                                            |
| ---------------- | ---------------------------- | ------------ | ------------------------------------------------------ |
| `offset`         | `number[]`                   | `[12, 24, 48]` | Available page-size options in the per-page dropdown  |
| `defaultOffset`  | `number`                     | `12`         | Initially selected page size                            |
| `onOffsetChange` | `(offset: number) => void`   | --           | Called when the user selects a different per-page value |

### View Mode

| Prop           | Type                           | Default  | Description                                                        |
| -------------- | ------------------------------ | -------- | ------------------------------------------------------------------ |
| `viewMode`     | `string`                       | `'grid'` | Layout mode: `'grid'` or `'list'`. Controls which toggle icon shows |
| `onViewChange` | `(mode: string) => void`       | --       | Called when the view toggle is clicked. Receives `'grid'` or `'list'` |

### Active Filter Badges

| Prop                 | Type                                           | Default | Description                                                         |
| -------------------- | ---------------------------------------------- | ------- | ------------------------------------------------------------------- |
| `activeTextFilters`  | `Record<string, string[]>`                     | --      | Currently active attribute filters. Key = attribute, value = selections. Renders removable badges |
| `priceFilterMin`     | `number`                                       | --      | Active price filter lower bound. Renders a price badge when defined |
| `priceFilterMax`     | `number`                                       | --      | Active price filter upper bound                                     |
| `onFilterRemove`     | `(filterName: string, value: string) => void`  | --      | Called when an attribute filter badge X is clicked                   |
| `onPriceFilterRemove`| `() => void`                                   | --      | Called when the price filter badge X is clicked                     |
| `onClearFilters`     | `() => void`                                   | --      | Called when "Clear All" is clicked                                  |

### Portal Mode & Auth

| Prop         | Type                            | Default  | Description                                                              |
| ------------ | ------------------------------- | -------- | ------------------------------------------------------------------------ |
| `portalMode` | `string`                        | `'open'` | `'open'` = price sort available for all. `'semi-closed'` = disabled for guests |
| `user`       | `Contact \| Customer \| null`   | --       | Authenticated user. When null in `semi-closed` mode, PRICE sort is disabled |

### Customization

| Prop       | Type                     | Default | Description                                                        |
| ---------- | ------------------------ | ------- | ------------------------------------------------------------------ |
| `labels`   | `Record<string, string>` | --      | Label overrides for any built-in text (see Label Keys below)       |
| `className`| `string`                 | --      | Extra CSS class applied to the root element                        |

---

## Label Keys

Override any of these via the `labels` prop:

| Key                  | Default              | Used For                    |
| -------------------- | -------------------- | --------------------------- |
| `CATEGORY_ORDER`     | `'Default Sorting'`  | Sort dropdown option        |
| `NAME`               | `'Name'`             | Sort dropdown option        |
| `PRICE`              | `'Price'`            | Sort dropdown option + badge |
| `SKU`                | `'SKU'`              | Sort dropdown option        |
| `SUPPLIER_CODE`      | `'Supplier Code'`    | Sort dropdown option        |
| `CREATED_AT`         | `'Created Date'`     | Sort dropdown option        |
| `LAST_MODIFIED_AT`   | `'Last Modified Date'`| Sort dropdown option       |
| `RELEVANCE`          | `'Relevance'`        | Sort dropdown option        |
| `PRIORITY`           | `'Priority'`         | Sort dropdown option        |
| `ASC`                | `'Low to High'`      | Sort direction dropdown     |
| `DESC`               | `'High to Low'`      | Sort direction dropdown     |
| `clearAll`           | `'Clear All'`        | Clear filters button        |
| `products`           | `' Products'`        | Result count suffix         |
| `from`               | `'from'`             | Range indicator             |
| `results`            | `'results'`          | Range indicator             |
| `perPage`            | `' per page'`        | Page size dropdown suffix   |
| `price`              | `'Price'`            | Price filter badge prefix   |
| `switchToList`       | `'Switch to list view'`| View toggle tooltip       |
| `switchToGrid`       | `'Switch to grid view'`| View toggle tooltip       |

---

## SDK Services & Types

### Enums Used

- **`Enums.ProductSortField`** -- Provides sort field constants: `CATEGORY_ORDER`, `NAME`, `PRICE`, `SKU`, `SUPPLIER_CODE`, `CREATED_AT`, `LAST_MODIFIED_AT`, `RELEVANCE`, `PRIORITY`
- **`Enums.SortOrder`** -- Sort direction constants: `ASC`, `DESC`

### User Types

- **`Contact`** / **`Customer`** from `propeller-sdk-v2` -- Used for the `user` prop to determine portal access level

### Integration with ProductGrid

GridToolbar does not make API calls itself. It emits user intent via callbacks (`onSortChange`, `onOffsetChange`, etc.) that the parent page uses to update ProductGrid query variables:

```tsx
const [sort, setSort] = useState([{ field: "CATEGORY_ORDER", order: "ASC" }]);
const [pageSize, setPageSize] = useState(12);

<GridToolbar
  defaultSort={sort}
  defaultOffset={pageSize}
  onSortChange={(field, order) => setSort([{ field, order }])}
  onOffsetChange={(size) => setPageSize(size)}
  itemsFound={products?.itemsFound}
/>

<ProductGrid sort={sort} offset={pageSize} /* ... */ />
```

---

## Building Your Own

GridToolbar is a pure presentational + local-state component. To build a custom version:

1. **Sort controls** -- Read `Enums.ProductSortField` keys for available sort fields. Emit `{ field, order }` on change.
2. **Page size selector** -- Render options from an array of numbers. Emit the selected value on change.
3. **View toggle** -- Track `'grid'` / `'list'` state and toggle on click.
4. **Filter badges** -- Flatten `Record<string, string[]>` into individual badge items. Each badge needs the filter name + value so the parent can remove it.
5. **Price badge** -- Render when `priceFilterMin` or `priceFilterMax` is defined. Display as a formatted range.
6. **Sync from props** -- Watch `defaultSort`, `defaultOffset`, and `viewMode` for external state changes (e.g., URL-driven sort).

---

## Behavior

- **Controlled externally via props**: `defaultSort`, `defaultOffset`, and `viewMode` sync internal state when they change, allowing URL-driven or parent-driven updates.
- **Sort field + direction are separate dropdowns**: The sort field and sort direction (ASC/DESC) are independent selects. Both emit through the same `onSortChange` callback.
- **Price sort gating**: In `semi-closed` portal mode, the PRICE sort option is rendered with `disabled` when no `user` is provided.
- **Filter badges auto-render**: When `activeTextFilters` or `priceFilterMin`/`priceFilterMax` are provided, the badges bar appears automatically below the toolbar controls.
- **Clear All**: Appears at the start of the badge bar. Calls `onClearFilters` to let the parent reset all filter state.
- **View toggle icon swap**: Shows a list icon when in grid mode (click to switch to list) and a grid icon when in list mode (click to switch to grid).
- **Responsive layout**: Controls stack vertically on small screens (`flex-col`) and align horizontally on `sm:` and above.
- **No API calls**: GridToolbar is purely a UI controller. All data fetching responsibility remains with the parent or sibling ProductGrid.
