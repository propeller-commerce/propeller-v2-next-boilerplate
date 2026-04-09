import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# GridFilters

Sidebar filter panel for product grids. Renders collapsible accordion sections for attribute filters (checkboxes with counts) and a price range filter with dual slider and numeric inputs. Supports portal-mode visibility gating and external clear signals.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic attribute filters

```tsx
import GridFilters from "@/components/propeller/GridFilters";

<GridFilters
  filters={attributeFilters}
  onFilterChange={(filter, value) => handleFilterChange(filter, value)}
/>
```

### With price range filter

```tsx
<GridFilters
  filters={attributeFilters}
  priceMin={0}
  priceMax={500}
  onFilterChange={handleFilterChange}
  onPriceChange={(min, max) => handlePriceChange(min, max)}
/>
```

### Full-featured sidebar with clear support

```tsx
const [clearSignal, setClearSignal] = useState(0);
const [filters, setFilters] = useState<Record<string, string[]>>({});

<GridFilters
  filters={attributeFilters}
  priceMin={productsPriceMin}
  priceMax={productsPriceMax}
  language="NL"
  collapsed={true}
  clearSignal={clearSignal}
  activeTextFilters={filters}
  onFilterChange={handleFilterChange}
  onPriceChange={handlePriceChange}
  onClearFilters={handleClearAll}
  getSelectedFilters={() => console.log("Filters changed")}
/>

{/* Trigger clear from toolbar */}
<GridToolbar onClearFilters={() => setClearSignal((s) => s + 1)} />
```

### Semi-closed portal mode (price filter hidden for guests)

```tsx
<GridFilters
  filters={attributeFilters}
  priceMin={0}
  priceMax={1000}
  portalMode="semi-closed"
  user={authenticatedUser}
  onFilterChange={handleFilterChange}
  onPriceChange={handlePriceChange}
/>
```

### Mobile layout (no sticky positioning)

```tsx
<GridFilters
  filters={attributeFilters}
  isMobile={true}
  collapsed={false}
  onFilterChange={handleFilterChange}
  className="px-4"
/>
```

### Integration with ProductGrid and GridToolbar

```tsx
const [textFilters, setTextFilters] = useState<Record<string, string[]>>({});
const [priceRange, setPriceRange] = useState({ min: 0, max: 9999 });
const [clearSignal, setClearSignal] = useState(0);

// Sidebar filters
<GridFilters
  filters={productsResponse?.filters || []}
  priceMin={productsResponse?.minPrice}
  priceMax={productsResponse?.maxPrice}
  clearSignal={clearSignal}
  onFilterChange={(filter, value) => {
    // Toggle value in textFilters state
  }}
  onPriceChange={(min, max) => setPriceRange({ min, max })}
  onClearFilters={() => {
    setTextFilters({});
    setPriceRange({ min: 0, max: 9999 });
  }}
/>

// Toolbar shows active filter badges
<GridToolbar
  activeTextFilters={textFilters}
  priceFilterMin={priceRange.min}
  priceFilterMax={priceRange.max}
  onFilterRemove={(name, value) => { /* remove from textFilters */ }}
  onPriceFilterRemove={() => setPriceRange({ min: 0, max: 9999 })}
  onClearFilters={() => setClearSignal((s) => s + 1)}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom filter panel:

1. **Render attribute filters** -- Iterate over `AttributeFilter[]`. For each filter, display its `attributeDescription.descriptions[0].value` as the section title. Render `textFilters` as checkboxes.
2. **Filter out empty options** -- Only show options where `count > 0` or `countActive > 0`. Only show filters that have at least one valid option.
3. **Track selections** -- Maintain a `Record<string, string[]>` mapping filter names to selected values. Toggle values on checkbox change.
4. **Price range** -- Render min/max number inputs bounded by `priceMin`/`priceMax`. Optionally add a dual-thumb range slider. Apply price on blur or slider release, not on every keystroke.
5. **Accordion pattern** -- Wrap each filter section in a collapsible panel. Track expanded state per filter name. Auto-collapse filters with no active selections when the filter list refreshes.
6. **External clear** -- Watch a `clearSignal` counter prop. When it increments, reset all selections and price inputs to defaults.
7. **External filter sync** -- Watch an `activeTextFilters` prop. When it changes, replace internal checkbox state with the provided values so that filters removed via toolbar chips are reflected in the sidebar.
8. **Portal-mode gating** -- In `semi-closed` mode, hide the price filter when no authenticated user is provided.

```ts
import { AttributeFilter } from 'propeller-sdk-v2';

// Attribute filters come from the `filters` field in product query responses.
// Each AttributeFilter has:
//   attributeDescription.name — internal filter identifier
//   attributeDescription.descriptions[0].value — localized display title
//   textFilters[] — array of { value, count, countActive }

// Track selections as a map of filter name -> selected values
const selections: Record<string, string[]> = {};

function toggleFilter(filter: AttributeFilter, value: string) {
  const name = filter.attributeDescription?.name || '';
  if (!selections[name]) selections[name] = [];
  const idx = selections[name].indexOf(value);
  if (idx >= 0) {
    selections[name].splice(idx, 1);
  } else {
    selections[name].push(value);
  }
  // Re-fetch products with updated filter selections
}

// Price range: track min/max inputs bounded by priceMin/priceMax from the product query response
// Apply on blur or slider release, not on every keystroke
function applyPriceRange(min: number, max: number) {
  // Re-fetch products with price filter applied
}

// External clear: reset all selections and price inputs when clearSignal increments
function clearAll() {
  Object.keys(selections).forEach((key) => delete selections[key]);
  // Reset price inputs to defaults
}
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required

| Prop             | Type                                                    | Description                                                                                    |
| ---------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `filters`        | `AttributeFilter[]`                                     | Attribute filter definitions from the product query response. Each entry is one filterable facet |
| `onFilterChange` | `(filter: AttributeFilter, value: string \| number) => void` | Called on every checkbox toggle. Receives the filter object and the toggled value              |

### Price Range

| Prop            | Type                                      | Default | Description                                                                        |
| --------------- | ----------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `priceMin`      | `number`                                  | --      | Lower bound of the price range from the current product set. Omit to hide price filter |
| `priceMax`      | `number`                                  | --      | Upper bound of the price range                                                     |
| `onPriceChange` | `(min: number, max: number) => void`      | --      | Called when price range changes (on input blur or slider release)                   |

### Display & Layout

| Prop        | Type      | Default | Description                                                                       |
| ----------- | --------- | ------- | --------------------------------------------------------------------------------- |
| `collapsed` | `boolean` | `true`  | Whether filter accordions start collapsed. Set `false` to start expanded           |
| `isMobile`  | `boolean` | --      | Enables mobile layout (adds bottom padding, removes sticky positioning)            |
| `language`  | `string`  | `'NL'`  | Language code for filter labels                                                    |
| `className` | `string`  | --      | Extra CSS class applied to the root element                                        |

### Portal Mode & Auth

| Prop         | Type                          | Default  | Description                                                                     |
| ------------ | ----------------------------- | -------- | ------------------------------------------------------------------------------- |
| `portalMode` | `string`                      | `'open'` | `'open'` = show price filter for all. `'semi-closed'` = hide price for guests  |
| `user`       | `Contact \| Customer \| null` | --       | Authenticated user. Determines price filter visibility in `semi-closed` mode    |

### External Control

| Prop                | Type         | Default | Description                                                                              |
| ------------------- | ------------ | ------- | ---------------------------------------------------------------------------------------- |
| `clearSignal`       | `number`     | --      | Increment this counter to reset all selected filters and price inputs externally          |
| `activeTextFilters` | `Record<string, string[]>` | --      | Currently active text filters (URL-driven). Syncs internal checkbox state when filters are removed externally (e.g. via toolbar filter chips) |
| `onClearFilters`    | `() => void` | --      | Called when the internal "Clear all" action fires                                         |
| `getSelectedFilters`| `() => void` | --      | Notification callback fired after every filter or price change                            |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function gridFilters(
  filters: AttributeFilter[],
  onFilterChange: (filter: AttributeFilter, value: string | number) => void,
  options?: GridFiltersOptions,
): void
```

### Options

| Field | Type | Default | Maps to |
|---|---|---|---|
| `filters` | `AttributeFilter[]` | **required** | Attribute filter definitions from product query response |
| `priceMin` | `number` | `undefined` | Lower bound of the price range |
| `priceMax` | `number` | `undefined` | Upper bound of the price range |
| `language` | `string` | `'NL'` | Language code for filter labels |
| `portalMode` | `string` | `'open'` | Price filter visibility mode |
| `user` | `Contact \| Customer \| null` | `null` | Authenticated user for portal-mode gating |
| `clearSignal` | `number` | `undefined` | External clear trigger counter |
| `activeTextFilters` | `Record<string, string[]>` | `undefined` | URL-driven active filters — syncs internal checkbox state on external changes |

### Callbacks

| Callback | When it fires | What to implement |
|---|---|---|
| `onFilterChange` | On every checkbox toggle | Update filter selections and re-fetch products |
| `onPriceChange` | On price input blur or slider release | Update price range and re-fetch products |
| `onClearFilters` | When internal "Clear all" fires | Reset all filter state |
| `getSelectedFilters` | After every filter or price change | Notification hook for tracking changes |

### UI-only props

The following props are purely presentational and are not part of the SDK layer: `collapsed`, `isMobile`, `className`. These are the developer's responsibility to implement.

  </TabItem>
</Tabs>

---

## Behavior

- **Accordion auto-management**: On initial load and when the `filters` prop changes, new filter sections default to collapsed (or expanded if `collapsed={false}`). Filters with no active selections auto-collapse on re-render.
- **Price range sync**: When `priceMin` or `priceMax` props change (e.g., after a product re-fetch with different filters), the internal min/max inputs update to match.
- **Dual input + slider**: The price filter provides both numeric inputs and a dual-thumb range slider. The slider applies the price immediately on change. The inputs apply on blur.
- **Min/max clamping**: The min input cannot exceed the current max, and the max input cannot go below the current min.
- **External clear signal**: Incrementing `clearSignal` resets all checkbox selections, price inputs, and accordion states. This is the mechanism for GridToolbar's "Clear All" button to reach GridFilters without direct coupling.
- **External filter sync**: The `activeTextFilters` prop keeps internal checkbox state in sync with URL-driven filter state. When a filter is removed externally (e.g. clicking "×" on a filter chip in GridToolbar), the parent updates `activeTextFilters` and the checkboxes uncheck automatically.
- **Filter option counts**: Each checkbox option displays the product count in parentheses. When `count` is 0 but `countActive` is greater than 0, `countActive` is displayed instead (handles the case where a selected filter shows its active match count).
- **Empty state**: When the `filters` array is empty, a "No filters available" message is displayed.
- **Sticky positioning**: By default the filter panel uses `sticky top-24` to stay visible while scrolling. This is disabled when `isMobile={true}`.
- **No API calls**: GridFilters is purely a UI component. All data fetching and query variable assembly is the parent's responsibility.

## SDK Services & Types

### Types Used

- **`AttributeFilter`** from `propeller-sdk-v2` -- Filter facet object returned by product queries. Key fields:
  - `attributeDescription.name` -- Internal filter identifier (used as key in selections map)
  - `attributeDescription.descriptions[0].value` -- Localized display title
  - `textFilters[]` -- Array of filter options, each with:
    - `value` -- The option label/value string
    - `count` -- Number of matching products
    - `countActive` -- Number of matching products when this option is already selected

- **`Contact`** / **`Customer`** from `propeller-sdk-v2` -- Used for portal-mode price filter gating

### GraphQL Response Shape

Attribute filters come from the `filters` field in product queries:

```graphql
query Products($categoryId: Int!, $language: String) {
  products(categoryId: $categoryId, language: $language) {
    items { ... }
    filters {
      attributeDescription {
        name
        descriptions {
          value
          language
        }
      }
      textFilters {
        value
        count
        countActive
      }
    }
    minPrice
    maxPrice
  }
}
```

The `filters` array maps directly to the `filters` prop, while `minPrice`/`maxPrice` map to `priceMin`/`priceMax`.
