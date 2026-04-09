import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# SearchBar

A self-contained search bar with autocomplete dropdown. Fetches product results internally via `ProductService` and displays them with images, prices, and SKUs. Supports debounced input, configurable result limits, and click-outside dismissal.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic usage in a header

```tsx
import SearchBar from '@/components/propeller/SearchBar';
import { graphqlClient } from '@/lib/api';
import { useRouter } from 'next/navigation';

function Header() {
  const router = useRouter();

  return (
    <SearchBar
      graphqlClient={graphqlClient}
      onSubmit={(term) => router.push(`/search/${encodeURIComponent(term)}`)}
      onResultClick={(result) => result.url && router.push(result.url)}
      onViewAllClick={(term) => router.push(`/search/${encodeURIComponent(term)}`)}
    />
  );
}
```

### With custom language, fallback image, and price formatter

```tsx
<SearchBar
  graphqlClient={graphqlClient}
  language="EN"
  placeholder="Search our catalog..."
  noImageUrl="/images/no-image.webp"
  formatPrice={(price) => `$${price.toFixed(2)}`}
  onSubmit={(term) => router.push(`/search/${encodeURIComponent(term)}`)}
  onResultClick={(result) => result.url && router.push(result.url)}
  onViewAllClick={(term) => router.push(`/search/${encodeURIComponent(term)}`)}
/>
```

### With stricter debounce and fewer results

```tsx
<SearchBar
  graphqlClient={graphqlClient}
  minSearchLength={2}
  debounceMs={500}
  maxResults={5}
  labels={{
    viewAll: 'Show all products',
    noResults: 'Nothing found for',
  }}
  onSubmit={(term) => router.push(`/search/${encodeURIComponent(term)}`)}
  onResultClick={(result) => result.url && router.push(result.url)}
  onViewAllClick={(term) => router.push(`/search/${encodeURIComponent(term)}`)}
/>
```

### Custom container styling

```tsx
<SearchBar
  graphqlClient={graphqlClient}
  containerClassName="relative w-full max-w-lg"
  onSubmit={(term) => router.push(`/search/${encodeURIComponent(term)}`)}
  onResultClick={(result) => result.url && router.push(result.url)}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom search component that uses the same Propeller product search:

### 1. Create a ProductService instance

```ts
import { ProductService, GraphQLClient } from 'propeller-sdk-v2';

const productService = new ProductService(graphqlClient);
```

### 2. Call getProducts() with a search term and image variant filters

```ts
const response = await productService.getProducts({
  input: {
    term: searchTerm,
    language: 'NL',
    page: 1,
    offset: 10,
    statuses: [Enums.ProductStatus.A, Enums.ProductStatus.P],
    hidden: false,
    sortInputs: [{ field: Enums.ProductSortField.RELEVANCE, order: Enums.SortOrder.DESC }],
  },
  imageSearchFilters: { page: 1, offset: 1 },
  imageVariantFilters: {
    transformations: [{
      name: 'thumb',
      transformation: { format: Enums.Format.WEBP, height: 100, width: 100, fit: Enums.Fit.BOUNDS },
    }],
  },
});
```

### 3. Map the results

Each item in `response.items` is either a `Product` or a `Cluster`. Check for `clusterId` to distinguish them. For clusters, use `cluster.defaultProduct` for price and image data.

### 4. Handle debouncing

Use `setTimeout`/`clearTimeout` or a library like `lodash.debounce` to avoid excessive API calls on every keystroke.

### 5. Important: imageVariantFilters

Never pass an empty `imageVariantFilters` object. Always include at least one transformation entry, or omit the parameter entirely.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required

| Prop | Type | Description |
|---|---|---|
| `graphqlClient` | `GraphQLClient` | Propeller SDK GraphQL client instance. The component creates `ProductService` internally. |

### Search Configuration

| Prop | Type | Default | Description |
|---|---|---|---|
| `language` | `string` | `'NL'` | Language code sent with search requests. |
| `placeholder` | `string` | `'Search products...'` | Placeholder text for the input field. |
| `minSearchLength` | `number` | `3` | Minimum characters typed before a search request fires. |
| `debounceMs` | `number` | `300` | Milliseconds to wait after the last keystroke before searching. |
| `maxResults` | `number` | `8` | Maximum number of suggestion results shown in the dropdown. |

### Display

| Prop | Type | Default | Description |
|---|---|---|---|
| `noImageUrl` | `string` | `''` | Fallback image URL when a result has no product image. When empty, broken image icons may appear for products without images. |
| `formatPrice` | `(price: number) => string` | Formats as `€{price}` | Custom price formatting function. |
| `labels` | `Record<string, string>` | See Labels table | Customizable UI text strings. |
| `containerClassName` | `string` | `'relative flex-1 max-w-2xl mx-8'` | CSS class for the outermost container element. |

### Callbacks

| Prop | Type | Description |
|---|---|---|
| `onSubmit` | `(term: string) => void` | Fires when the form is submitted (Enter key). Receives the trimmed search term. |
| `onResultClick` | `(result: SearchBarResult) => void` | Fires when a dropdown result is clicked. Receives the `SearchBarResult` object. |
| `onViewAllClick` | `(term: string) => void` | Fires when "View all results" is clicked. Receives the current search term. |

### SearchBarResult Interface

The result object passed to `onResultClick` and used internally:

```ts
interface SearchBarResult {
  id: number | string;
  name: string;
  sku?: string;
  price?: number;
  imageUrl?: string;
  url?: string;
  isCluster?: boolean;
}
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
async function searchProducts(
  graphqlClient: GraphQLClient,
  options: {
    term: string;
    language?: string;
    maxResults?: number;
  }
): Promise<SearchBarResult[]>
```

Types from `propeller-sdk-v2`: `GraphQLClient`, `ProductService`, `Product`, `Cluster`.

### Options table

| Field | Type | Default | Maps to |
|-------|------|---------|---------|
| `graphqlClient` | `GraphQLClient` | *required* | `graphqlClient` prop — SDK client passed to `ProductService` |
| `term` | `string` | *required* | The search term typed by the user |
| `language` | `string` | `'NL'` | `language` prop — language code sent with search requests |
| `maxResults` | `number` | `8` | `maxResults` prop — pagination offset for results |
| `minSearchLength` | `number` | `3` | `minSearchLength` prop — minimum characters before searching |
| `debounceMs` | `number` | `300` | `debounceMs` prop — delay after last keystroke before firing search |

### Callbacks table

| Callback | When it fires | What to implement |
|----------|--------------|-------------------|
| `onSubmit` | Form is submitted (Enter key) | Navigate to full search results page with the trimmed search term |
| `onResultClick` | A dropdown result is clicked | Navigate to the product/cluster detail page using the `SearchBarResult.url` |
| `onViewAllClick` | "View all results" link is clicked | Navigate to full search results page with the current search term |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `placeholder` — placeholder text for the input field
- `noImageUrl` — fallback image URL for products without images
- `formatPrice` — custom price formatting function
- `labels` — UI string overrides (`viewAll`, `noResults`)
- `containerClassName` — CSS class for the outermost container

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default | Description |
|---|---|---|
| `viewAll` | `'View all results'` | Text for the "view all" link at the bottom of the dropdown. |
| `noResults` | `'No products found for'` | Prefix text shown when no results match the query. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const labels = {
  viewAll: 'View all results',
  noResults: 'No products found for',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Debounce and minimum characters

The component waits `debounceMs` (default 300ms) after the user stops typing before making a search request. No request is made until at least `minSearchLength` (default 3) characters have been entered. If the user clears the input below the minimum length, the dropdown closes immediately.

### Image variants

Search results request 100x100 WEBP thumbnails via the `imageVariantFilters` parameter. The `imageVariantFilters` must contain a `transformations` array -- passing an empty object `{}` causes the Propeller API to return an error. If a result has no image and `noImageUrl` is provided, the fallback image is shown instead.

### Navigation on select

When a user clicks a result, the component:
1. Calls `onResultClick(result)` with the full `SearchBarResult` object
2. Closes the dropdown
3. Clears the search input

Result URLs are auto-generated as `/cluster/{id}/{slug}` for clusters or `/product/{id}/{slug}` for products. The parent component handles actual navigation in the `onResultClick` callback.

### Form submission

Pressing Enter submits the form and calls `onSubmit` with the trimmed search term. This is typically used to navigate to a full search results page.

### View all results

When the total number of matching items (`itemsFound`) exceeds `maxResults`, a "View all results (N)" link appears at the bottom of the dropdown. Clicking it calls `onViewAllClick` with the current search term.

### Click outside dismissal

The dropdown closes automatically when the user clicks anywhere outside the search bar. This is handled via a `mousedown` listener on `document`.

### Loading state

A spinning indicator appears in the input field while a search request is in progress.

---

## GraphQL Query

Under the hood, `ProductService.getProducts()` executes a query similar to:

```graphql
query SearchProducts($input: ProductSearchInput!, $imageSearchFilters: ImageSearchInput, $imageVariantFilters: ImageVariantSearchInput) {
  products(input: $input) {
    itemsFound
    items {
      productId
      clusterId
      sku
      names { value }
      slugs { value }
      price { gross net }
      defaultProduct {
        sku
        price { gross net }
        media {
          images(input: $imageSearchFilters) {
            items {
              imageVariants(input: $imageVariantFilters) {
                url
              }
            }
          }
        }
      }
      media {
        images(input: $imageSearchFilters) {
          items {
            imageVariants(input: $imageVariantFilters) {
              url
            }
          }
        }
      }
    }
  }
}
```

Variables sent by the component:

```ts
{
  input: {
    term: "search text",
    language: "NL",
    page: 1,
    offset: 8,
    statuses: ["A", "P", "T", "S"],
    hidden: false,
    sortInputs: [{ field: "RELEVANCE", order: "DESC" }],
  },
  imageSearchFilters: { page: 1, offset: 1 },
  imageVariantFilters: {
    transformations: [{
      name: "thumb",
      transformation: {
        format: "WEBP",
        height: 100,
        width: 100,
        fit: "BOUNDS",
      },
    }],
  },
}
```

**IMPORTANT**: `imageVariantFilters` must NOT be an empty object `{}`. The Propeller API rejects empty variant filters. You must always include a `transformations` array with at least one entry.

---

## SDK Services

The component uses **`ProductService`** from `propeller-sdk-v2` to fetch search suggestions. It creates the service instance internally:

```ts
const productService = new ProductService(graphqlClient);
const response = await productService.getProducts({ input, imageSearchFilters, imageVariantFilters });
```

The response items (which can be `Product` or `Cluster` objects) are mapped to `SearchBarResult` objects. For clusters, the `defaultProduct` is used for price and image data.

### Search parameters

The component searches with these fixed parameters:

- **Statuses**: `A` (active), `P` (published), `T` (temporary), `S` (special)
- **Sort**: `RELEVANCE` descending
- **Hidden**: `false`
- **Searchable attributes only**: `isSearchable: true`
- **Pagination**: page 1, offset = `maxResults`
