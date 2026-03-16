# SearchBar

A framework-agnostic search bar with autocomplete dropdown. Uses `graphqlClient` to fetch products internally via `ProductService`. Supports debounced search, result display with images/prices, and "View all results" link.

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | **Yes** | — | Propeller SDK GraphQL client. The component creates `ProductService` internally. |
| `language` | `string` | No | `'NL'` | Language code for search requests. |
| `placeholder` | `string` | No | `'Search products...'` | Placeholder text for the search input. |
| `minSearchLength` | `number` | No | `3` | Minimum characters before search triggers. |
| `debounceMs` | `number` | No | `300` | Debounce delay in milliseconds. |
| `maxResults` | `number` | No | `8` | Maximum number of results shown in dropdown. |
| `noImageUrl` | `string` | No | `''` | Fallback image URL when a result has no image. |
| `onSubmit` | `(term: string) => void` | No | — | Fires when the form is submitted (Enter key). |
| `onResultClick` | `(result: SearchBarResult) => void` | No | — | Fires when a result item is clicked. |
| `onViewAllClick` | `(term: string) => void` | No | — | Fires when "View all results" is clicked. |
| `formatPrice` | `(price: number) => string` | No | `€{price}` | Custom price formatting function. |
| `labels` | `Record<string, string>` | No | — | Customizable labels (see Labels section). |
| `containerClassName` | `string` | No | `'relative flex-1 max-w-2xl mx-8'` | Additional class name for the container. |

### SearchBarResult Interface

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

### Labels

| Key | Default | Description |
|---|---|---|
| `viewAll` | `'View all results'` | "View all" link text |
| `noResults` | `'No products found for'` | No results message prefix |

## Usage

```tsx
import SearchBar from '@/components/propeller/SearchBar';
import { graphqlClient } from '@/lib/api';

<SearchBar
  graphqlClient={graphqlClient}
  language={process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'}
  onSubmit={(term) => router.push(`/search/${encodeURIComponent(term)}`)}
  onResultClick={(result) => result.url && router.push(result.url)}
  onViewAllClick={(term) => router.push(`/search/${encodeURIComponent(term)}`)}
  noImageUrl="https://example.com/no-image.webp"
/>
```

## Behavior

- **Internal SDK usage**: Creates `new ProductService(graphqlClient)` internally and calls `getProducts()` with the search term. Maps SDK `Product`/`Cluster` results to `SearchBarResult` objects.
- **Search parameters**: Filters by statuses `A`, `P`, `T`, `S`; sorted by `RELEVANCE` descending; `hidden: false`; `isSearchable: true`.
- **Debounced search**: Waits `debounceMs` after typing stops before fetching.
- **Minimum length**: Does not search until `minSearchLength` characters are entered.
- **Loading spinner**: Shows while the search request is pending.
- **Click outside**: Dropdown closes when clicking outside the component.
- **Form submit**: Pressing Enter calls `onSubmit` with the trimmed search term.
- **Result click**: Clears search term and closes dropdown after clicking a result.
- **View all**: Shown when total results exceed `maxResults`.
- **Result URLs**: Auto-generated as `/cluster/{id}/{slug}` or `/product/{id}/{slug}`.

## Mitosis Source

`ui-components/SearchBar.lite.tsx`
