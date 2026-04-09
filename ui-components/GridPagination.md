import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# GridPagination

Pagination control for product grids. Supports two display variants: a compact "Page X of Y" style and a full numbered-buttons style with ellipsis collapsing. Reads pagination data directly from a `ProductsResponse` object.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Compact pagination (default)

```tsx
import GridPagination from "@/components/propeller/GridPagination";

<GridPagination
  products={productsResponse}
  onPageChange={(page) => setCurrentPage(page)}
/>
```

### Full numbered pagination

```tsx
<GridPagination
  products={productsResponse}
  onPageChange={handlePageChange}
  variant="full"
/>
```

### Full pagination with custom sibling count

```tsx
<GridPagination
  products={productsResponse}
  onPageChange={handlePageChange}
  variant="full"
  siblingCount={3}
/>
```

### With custom labels

```tsx
<GridPagination
  products={productsResponse}
  onPageChange={handlePageChange}
  labels={{
    previous: "Vorige",
    next: "Volgende",
    page: "Pagina",
    of: "van",
  }}
/>
```

### Placed above and below a product grid

```tsx
<GridPagination
  products={productsResponse}
  onPageChange={handlePageChange}
  variant="compact"
  className="mb-4"
/>

<ProductGrid /* ... */ />

<GridPagination
  products={productsResponse}
  onPageChange={handlePageChange}
  variant="full"
  className="mt-8"
/>
```

### Integration with ProductGrid

GridPagination does not fetch data itself. It reads pagination metadata from the same `ProductsResponse` that ProductGrid produces:

```tsx
const [page, setPage] = useState(1);

// ProductGrid populates productsResponse
<ProductGrid
  page={page}
  offset={24}
  onProductsLoaded={(response) => setProductsResponse(response)}
  /* ... */
/>

<GridPagination
  products={productsResponse}
  onPageChange={(newPage) => setPage(newPage)}
  variant="full"
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom pagination component:

1. **Read pagination state** -- Extract `page` and `pages` from `ProductsResponse`.
2. **Compact variant** -- Render Previous/Next buttons with a "Page X of Y" label between them. Disable Previous on page 1 and Next on the last page.
3. **Full variant (ellipsis algorithm)** --
   - Always show page 1 and the last page.
   - Show `siblingCount` pages centered on the current page.
   - Insert ellipsis (`...`) spacers for gaps larger than 1.
   - When total pages fit within `siblingCount + 4` slots, skip ellipsis and show all pages.
4. **Emit page number** -- Call the parent's handler with the 1-based page number on click.
5. **Hide when unnecessary** -- Do not render pagination when `pages <= 1`.

```ts
import { ProductsResponse } from 'propeller-sdk-v2';

// Extract pagination state from the products response
function getPaginationState(products: ProductsResponse) {
  const currentPage = products?.page || 1;
  const totalPages = products?.pages || 1;
  return { currentPage, totalPages };
}

// Compact variant: "Page X of Y" with Previous/Next buttons
function renderCompact(currentPage: number, totalPages: number, onPageChange: (page: number) => void) {
  // Previous button — disabled on page 1
  // "Page {currentPage} of {totalPages}" text
  // Next button — disabled on last page
}

// Full variant: numbered page buttons with ellipsis
function generatePageNumbers(currentPage: number, totalPages: number, siblingCount: number = 5): (number | '...')[] {
  // Always include page 1 and totalPages
  // Center siblingCount pages around currentPage
  // Insert '...' for gaps larger than 1
  // If totalPages <= siblingCount + 4, show all pages without ellipsis
  // Not documented in source — implement based on your setup
  return [];
}

// The `page` value emitted maps directly to the `page` variable in product queries
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required

| Prop           | Type                              | Description                                                                 |
| -------------- | --------------------------------- | --------------------------------------------------------------------------- |
| `products`     | `ProductsResponse`                | Products response object. Reads `page` (current) and `pages` (total) from it |
| `onPageChange` | `(page: number) => void`          | Called when the user navigates to a different page. Receives the 1-based page number |

### Display

| Prop           | Type     | Default     | Description                                                                                   |
| -------------- | -------- | ----------- | --------------------------------------------------------------------------------------------- |
| `variant`      | `string` | `'compact'` | `'compact'` = Previous / "Page X of Y" / Next. `'full'` = numbered page buttons with ellipsis |
| `siblingCount` | `number` | `5`         | Number of visible page buttons around the current page in `'full'` variant                     |

### Customization

| Prop        | Type                     | Default | Description                                                  |
| ----------- | ------------------------ | ------- | ------------------------------------------------------------ |
| `labels`    | `Record<string, string>` | --      | Override built-in text (see Labels section below)            |
| `className` | `string`                 | --      | Extra CSS class applied to the root element                  |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function gridPagination(
  products: ProductsResponse,
  onPageChange: (page: number) => void,
  options?: GridPaginationOptions,
): void
```

### Options

| Field | Type | Default | Maps to |
|---|---|---|---|
| `products` | `ProductsResponse` | **required** | Products response object with `page` and `pages` fields |
| `variant` | `string` | `'compact'` | Pagination display variant |
| `siblingCount` | `number` | `5` | Number of visible page buttons around the current page |

### Callbacks

| Callback | When it fires | What to implement |
|---|---|---|
| `onPageChange` | When the user navigates to a different page | Re-fetch products with the new 1-based page number |

### UI-only props

The following props are purely presentational and are not part of the SDK layer: `labels`, `className`. These are the developer's responsibility to implement.

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

Override any of these via the `labels` prop:

| Key        | Default      | Used For                          |
| ---------- | ------------ | --------------------------------- |
| `previous` | `'Previous'` | Previous page button text         |
| `next`     | `'Next'`     | Next page button text             |
| `page`     | `'Page'`     | Compact variant label prefix      |
| `of`       | `'of'`       | Compact variant separator ("of")  |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  previous: 'Previous',
  next: 'Next',
  page: 'Page',
  of: 'of',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

- **Auto-hides on single page**: When `pages` is 1 or less, the component renders nothing.
- **Previous/Next button disabling**: Previous is disabled on page 1. Next is disabled on the last page. Both use `disabled` attribute with reduced opacity styling.
- **Compact variant**: Renders three elements in a row: Previous button, "Page X of Y" text, Next button.
- **Full variant page algorithm**: Page 1 and the last page are always visible. A window of `siblingCount` pages (default 5) is centered on the current page. Gaps are collapsed with ellipsis spacers. When the total page count is small enough (`<= siblingCount + 4`), all pages are shown without ellipsis.
- **Active page highlighting**: In full variant, the current page button receives primary-colored styling (`bg-primary text-white`), while other page buttons use neutral styling.
- **1-based page numbers**: All page numbers are 1-based, matching the Propeller API convention.
- **Responsive**: The full variant uses `flex-wrap` to handle large page counts on small screens.
- **No API calls**: GridPagination is purely a UI control. The parent is responsible for re-fetching products with the new page number.

## SDK Services & Types

### Types Used

- **`ProductsResponse`** from `propeller-sdk-v2` -- The component reads two fields:
  - `products.page` -- Current page number (1-based)
  - `products.pages` -- Total number of pages

### Corresponding GraphQL Query Variables

The `page` value emitted by `onPageChange` maps directly to the `page` variable in product queries:

```graphql
query Products($page: Int, $offset: Int) {
  products(page: $page, offset: $offset) {
    page
    pages
    itemsFound
    items { ... }
  }
}
```
