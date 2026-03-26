# ProductGrid

A self-contained product listing component that handles data fetching, pagination, sorting, filtering, and cart integration. It can operate in two modes: **self-fetching** (provide a `graphqlClient` and let it query the API internally) or **controlled** (pass pre-fetched `products` directly).

---

## Usage

### Category page

Display products from a specific category with full cart integration:

```tsx
import ProductGrid from '@/components/propeller/ProductGrid';

<ProductGrid
  graphqlClient={graphqlClient}
  categoryId={42}
  language="NL"
  columns={3}
  cartId={cart?.cartId}
  createCart={true}
  user={authState.user}
  onCartCreated={(newCart) => saveCart(newCart)}
  afterAddToCart={(updatedCart) => saveCart(updatedCart)}
  configuration={config}
/>
```

### Search results

Pass a `term` prop to search across the entire catalog. The grid automatically uses `baseCategoryId` from the configuration and sets sort to `RELEVANCE`:

```tsx
<ProductGrid
  graphqlClient={graphqlClient}
  term={searchQuery}
  language="NL"
  columns={3}
  cartId={cart?.cartId}
  createCart={true}
  user={authState.user}
  onCartCreated={(newCart) => saveCart(newCart)}
  afterAddToCart={(updatedCart) => saveCart(updatedCart)}
  onItemsFoundChange={(count) => setResultCount(count)}
  configuration={config}
/>
```

### With filters sidebar

Wire up a `GridFilters` sidebar by connecting the grid's filter callbacks to external state:

```tsx
const [filters, setFilters] = useState<AttributeFilter[]>([]);
const [textFilters, setTextFilters] = useState<ProductTextFilterInput[]>([]);
const [priceMin, setPriceMin] = useState<number | undefined>();
const [priceMax, setPriceMax] = useState<number | undefined>();
const [priceBounds, setPriceBounds] = useState({ min: 0, max: 0 });

<GridFilters
  filters={filters}
  onFilterChange={(updated) => setTextFilters(updated)}
  onPriceChange={(min, max) => { setPriceMin(min); setPriceMax(max); }}
  priceBoundsMin={priceBounds.min}
  priceBoundsMax={priceBounds.max}
/>

<ProductGrid
  graphqlClient={graphqlClient}
  categoryId={42}
  textFilters={textFilters}
  priceFilterMin={priceMin}
  priceFilterMax={priceMax}
  onFiltersChange={(f) => setFilters(f)}
  onPriceBoundsChange={(min, max) => setPriceBounds({ min, max })}
  configuration={config}
/>
```

### With external pagination and toolbar

Connect to `GridPagination` and `GridToolbar` via callbacks:

```tsx
const [page, setPage] = useState(1);
const [productsResponse, setProductsResponse] = useState<ProductsResponse | null>(null);
const [category, setCategory] = useState<Category | null>(null);

<GridToolbar
  sortField={sortField}
  sortOrder={sortOrder}
  onSortChange={(field, order) => { setSortField(field); setSortOrder(order); }}
/>

<ProductGrid
  graphqlClient={graphqlClient}
  categoryId={42}
  page={page}
  pageSize={12}
  sortField={sortField}
  sortOrder={sortOrder}
  onProductsResponse={setProductsResponse}
  onCategoryChange={setCategory}
  onPageChange={setPage}
  configuration={config}
/>

<GridPagination
  products={productsResponse}
  onPageChange={setPage}
/>
```

### With cart integration (full pattern)

The grid manages add-to-cart through embedded `ProductCard` and `AddToCart` components. To keep the app's `CartContext` in sync:

```tsx
const { cart, saveCart } = useCart();
const { state: authState } = useAuth();

<ProductGrid
  graphqlClient={graphqlClient}
  categoryId={42}
  cartId={cart?.cartId}
  createCart={true}
  user={authState.user}
  onCartCreated={(newCart) => saveCart(newCart)}
  afterAddToCart={(updatedCart) => saveCart(updatedCart)}
  showModal={false}
  allowIncrDecr={true}
  stockValidation={true}
  showStock={true}
  configuration={config}
/>
```

### Pre-fetched products (controlled mode)

When the parent manages data fetching, pass products directly. The grid skips all internal API calls:

```tsx
<ProductGrid
  products={myProducts}
  isLoading={isFetching}
  columns={4}
  configuration={config}
/>
```

### Catalog-only mode (no add-to-cart)

For a read-only catalog view, use `portalMode="semi-closed"` or `allowAddToCart={false}`:

```tsx
<ProductGrid
  graphqlClient={graphqlClient}
  categoryId={42}
  portalMode="semi-closed"
  configuration={config}
/>
```

---

## Props

### Data Source

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `graphqlClient` | `GraphQLClient` | -- | Initialized SDK GraphQL client. Required when `products` is not provided. |
| `products` | `(Product \| Cluster)[]` | -- | Pre-fetched items. When provided, the grid skips internal fetching entirely. Pass `[]` for empty state. |

### Query Mode

These props only apply when `graphqlClient` is provided and `products` is not.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `categoryId` | `number` | `config.baseCategoryId` | Category to list products from. |
| `term` | `string` | -- | Search term. Searches the full catalog using `baseCategoryId`. Auto-sets sort to `RELEVANCE`. |
| `brand` | `string` | -- | Manufacturer/brand name filter. Uses `baseCategoryId` for a catalog-wide search. |

### Locale and Pricing

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `language` | `string` | `'NL'` | Language code for product data and name filtering. |
| `taxZone` | `string` | `'NL'` | Tax zone for price calculation. |
| `includeTax` | `boolean` | `false` | When true, shows tax-inclusive prices as the leading price. |

### Layout

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `number` | `3` | Number of grid columns. Accepts 1, 2, 3, or 4. Responsive: 2-col on mobile, full on large screens. |
| `className` | `string` | -- | Extra CSS class on the root element. |
| `isLoading` | `boolean` | `false` | Force skeleton loader display. Useful in controlled mode. |

### Pagination and Sorting

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `page` | `number` | internal | Externally controlled page number. Overrides internal page counter when provided. |
| `pageSize` | `number` | `12` | Items per page. Triggers re-fetch and resets to page 1 when changed. |
| `sortField` | `string` | -- | Sort field (e.g. `'NAME'`, `'PRICE'`, `'RELEVANCE'`). Overrides internal sort state. |
| `sortOrder` | `string` | `'ASC'` | Sort direction: `'ASC'` or `'DESC'`. |

### Filtering

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `textFilters` | `ProductTextFilterInput[]` | -- | Active attribute filters. Triggers re-fetch and resets to page 1 when changed. |
| `priceFilterMin` | `number` | -- | Minimum price filter bound. |
| `priceFilterMax` | `number` | -- | Maximum price filter bound. |

### Cart Integration

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `cartId` | `string` | -- | Existing cart ID to add items into. |
| `createCart` | `boolean` | -- | Auto-create a cart when none exists. Pair with `onCartCreated`. |
| `onCartCreated` | `(cart: Cart) => void` | -- | Called after a new cart is created internally. Persist the cart to your context here. |
| `afterAddToCart` | `(cart: Cart, item?: CartMainItem) => void` | -- | Called after every successful add-to-cart. Update your cart context here. |
| `showModal` | `boolean` | `false` | Show a success modal instead of a toast after adding to cart. |
| `allowIncrDecr` | `boolean` | `true` | Show quantity stepper buttons in AddToCart. |
| `onProceedToCheckout` | `() => void` | -- | Called when "Proceed to checkout" is clicked in the AddToCart modal. |
| `addToCartLabels` | `Record<string, string>` | -- | Label overrides for AddToCart. Keys: `add`, `adding`, `addedToCart`, `outOfStock`, `noCartId`, `errorAdding`, `modalTitle`, `quantity`, `continueShopping`, `proceedToCheckout`. |

### Visibility and Access Control

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `user` | `Contact \| Customer \| null` | -- | Authenticated user. Passed to ProductCard/AddToCart for price calculation and permissions. |
| `portalMode` | `string` | `'open'` | `'open'` shows AddToCart on cards. `'semi-closed'` hides it (catalog-only). |
| `allowAddToCart` | `boolean` | `true` | When false, hides AddToCart on product cards. ClusterCards always show their navigation button. |

### Stock Display

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showStock` | `boolean` | `false` | Show stock/availability widget on each product card. |
| `showAvailability` | `boolean` | `true` | Show only the availability indicator inside the stock widget. |
| `stockValidation` | `boolean` | `false` | Block add-to-cart when quantity exceeds available stock. |
| `stockLabels` | `Record<string, string>` | -- | Label overrides for ItemStock. Keys: `inStock`, `outOfStock`, `lowStock`, `available`, `notAvailable`, `pieces`. |

### Favorites

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enableAddFavorite` | `boolean` | -- | Show a heart-icon favorite toggle on each card. |
| `onToggleFavorite` | `(item: Product \| Cluster, isFavorite: boolean) => void` | -- | Called when a favorite is toggled. |

### Card Interaction

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onProductClick` | `(product: Product) => void` | -- | Called on product card click. Use for SPA routing. |
| `onClusterClick` | `(cluster: Cluster) => void` | -- | Called on cluster card click. Use for SPA routing. |

### Custom Card Renderers

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `renderProductCard` | `(product: Product) => any` | Built-in `ProductCard` | Custom product card renderer. |
| `renderClusterCard` | `(cluster: Cluster) => any` | Built-in `ClusterCard` | Custom cluster card renderer. |

### Event Callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onFiltersChange` | `(filters: AttributeFilter[]) => void` | Emits filterable attributes after each fetch. Use to populate a `GridFilters` sidebar. |
| `onPriceBoundsChange` | `(min: number, max: number) => void` | Emits min/max price of the current result set. Use for a price range slider. |
| `onItemsFoundChange` | `(count: number) => void` | Emits total product count after each fetch. |
| `onPageItemCountChange` | `(count: number) => void` | Emits number of items visible on the current page (after language filtering). |
| `onPageChange` | `(page: number) => void` | Emits the new page number on pagination. |
| `onProductsResponse` | `(products: ProductsResponse) => void` | Emits the full `ProductsResponse` after each fetch. Use to drive a `GridPagination` component. |
| `onCategoryChange` | `(category: Category) => void` | Emits the full `Category` object after each fetch. Use for `GridTitle` or `CategoryDescription`. |
| `onSortChange` | `(sort: any) => void` | Emits sort state changes for syncing a sibling toolbar. |

### Configuration

| Prop | Type | Description |
|------|------|-------------|
| `configuration` | `any` | App config object providing `baseCategoryId`, `imageSearchFiltersGrid`, `imageVariantFiltersMedium`, and `urls.getProductUrl` / `urls.getClusterUrl` for card URL generation. |

---

## SDK Services

ProductGrid uses three SDK services internally:

### CategoryService

The primary service for fetching products. The grid creates a `CategoryService` instance from the provided `graphqlClient` and calls `getCategory()` with a full set of query variables including:

- `categoryId` -- the target category (or `baseCategoryId` for search/brand queries)
- `language` -- locale for product data
- `imageSearchFilters` / `imageVariantFilters` -- from `configuration` for image optimization
- `priceCalculateProductInput` -- includes `taxZone`, `companyId`, `contactId`, or `customerId` depending on user type
- `categoryProductSearchInput` -- the main search input with pagination, sorting, filtering, status filtering, and search term/brand

The response provides `products.items`, `products.filters` (for sidebar), `products.minPrice`/`maxPrice` (for price range), `products.itemsFound`, and `products.pages`.

### ProductService

Not used directly by ProductGrid, but the embedded `ProductCard` components may use it for product-level operations.

### CartService

Used indirectly through the embedded `AddToCart` component inside each `ProductCard`. The grid passes cart-related props (`cartId`, `createCart`, `graphqlClient`, `user`) down to `ProductCard`, which forwards them to `AddToCart`. CartService handles:

- Creating a new cart when `createCart` is true and no `cartId` exists
- Adding products to the cart with the specified quantity
- Returning the updated cart object through `afterAddToCart`

---

## GraphQL Query Examples

### Product listing with filters, sort, and pagination

The grid internally builds a `CategoryQueryVariables` object like this:

```graphql
query Category(
  $categoryId: Int!
  $language: String
  $categoryProductSearchInput: CategoryProductSearchInput
  $priceCalculateProductInput: PriceCalculateProductInput
) {
  category(categoryId: $categoryId) {
    products(
      categoryProductSearchInput: $categoryProductSearchInput
      priceCalculateProductInput: $priceCalculateProductInput
    ) {
      items {
        ... on Product {
          productId
          names { value language }
          descriptions { value language }
          media { images { url } }
          price { net gross }
          sku
          status
          inventory { totalQuantity }
        }
        ... on Cluster {
          clusterId
          names { value language }
          descriptions { value language }
          media { images { url } }
          price { net gross }
        }
      }
      itemsFound
      pages
      filters {
        id
        attributeDescription { name }
        isSearchable
        values { value count }
      }
      minPrice
      maxPrice
    }
  }
}
```

Variables for a category page with text filters and sorting:

```json
{
  "categoryId": 42,
  "language": "NL",
  "categoryProductSearchInput": {
    "language": "NL",
    "page": 1,
    "offset": 12,
    "hidden": false,
    "statuses": ["A", "P", "T", "S"],
    "textFilters": [
      { "searchId": "color", "values": ["red", "blue"] }
    ],
    "sortInputs": [
      { "field": "NAME", "order": "ASC" }
    ]
  },
  "priceCalculateProductInput": {
    "taxZone": "NL"
  }
}
```

Variables for a search query:

```json
{
  "categoryId": 17,
  "language": "NL",
  "categoryProductSearchInput": {
    "language": "NL",
    "page": 1,
    "offset": 12,
    "hidden": false,
    "statuses": ["A", "P", "T", "S"],
    "term": "laptop",
    "searchFields": [
      {
        "fieldNames": ["NAME", "KEYWORDS", "SKU", "CUSTOM_KEYWORDS"],
        "boost": 5
      },
      {
        "fieldNames": ["DESCRIPTION", "MANUFACTURER", "MANUFACTURER_CODE", "EAN_CODE", "BAR_CODE", "CLUSTER_ID", "CUSTOM_KEYWORDS", "PRODUCT_ID", "SHORT_DESCRIPTION", "SUPPLIER", "SUPPLIER_CODE"],
        "boost": 1
      }
    ],
    "sortInputs": [
      { "field": "RELEVANCE", "order": "ASC" }
    ]
  }
}
```

Variables with price range filter:

```json
{
  "categoryId": 42,
  "categoryProductSearchInput": {
    "language": "NL",
    "page": 1,
    "offset": 12,
    "hidden": false,
    "statuses": ["A", "P", "T", "S"],
    "price": {
      "from": 50,
      "to": 200
    }
  }
}
```

---

## Building Your Own

To create a custom product grid that replaces or extends this component:

1. **Data fetching** -- Instantiate `CategoryService` with a `GraphQLClient` and call `getCategory()`. The key input is `CategoryProductSearchInput`, which controls pagination (`page`, `offset`), sorting (`sortInputs`), text filters (`textFilters`), price range (`price`), search term (`term`), and product statuses (`statuses`).

2. **Product type detection** -- The API returns a mixed array of `Product` and `Cluster` items. Distinguish them by checking for `clusterId` on the item (clusters have it, products do not).

3. **Language filtering** -- The API returns products matching the category regardless of translation status. Filter items client-side by checking that `item.names` contains an entry with the desired `language` code. Adjust `itemsFound` accordingly.

4. **Stale response handling** -- When filter/sort/page changes trigger rapid re-fetches, use an incrementing fetch ID to discard responses from superseded requests. Only apply results where the fetch ID matches the current value.

5. **Filter sidebar integration** -- The `products.filters` array from the API response contains `AttributeFilter` objects with searchable attribute metadata and value counts. Pass these to a filter UI component, collect selected values as `ProductTextFilterInput[]`, and feed them back into the next query.

6. **Price bounds** -- The API returns `minPrice` and `maxPrice` on the products response. Use these to initialize a price range slider. When the user adjusts the range, pass `price: { from, to }` in the search input.

7. **Cart integration** -- Use `CartService` from the SDK. Pass `cartId` and the `graphqlClient` to your add-to-cart controls. Handle the `onCartCreated` flow when no cart exists yet: CartService will create one, and you must persist the new cart ID.

8. **Status filtering** -- Always include `statuses: [A, P, T, S]` to show only active, pre-order, temporarily unavailable, and special products. Status `N` (not available) and `D` (deleted) should be excluded.

9. **Search boosting** -- When building search queries, use `searchFields` with `boost` values to prioritize matches. Name/SKU/keyword matches should have higher boost (e.g., 5) than description/supplier matches (e.g., 1).

10. **Skeleton loading** -- Show a skeleton grid with a count that matches your column layout (e.g., 6 items for 3 columns, 8 for 4 columns) during fetches for a smooth loading experience.

---

## Behavior

### Grid vs List View

The `columns` prop controls the grid layout:
- `1` -- single-column flex layout (list view)
- `2` -- 2-column grid
- `3` (default) -- 2 columns on mobile, 3 on large screens
- `4` -- 2 columns on mobile, 4 on large screens

All multi-column layouts use `auto-rows-fr` for equal row heights.

### Filtering

The grid supports three types of filters, all controlled externally:

- **Text filters** (`textFilters` prop) -- attribute-based filters like color, size, brand. Built from `AttributeFilter` data emitted by `onFiltersChange`.
- **Price range** (`priceFilterMin` / `priceFilterMax` props) -- numeric bounds. Initialize slider limits from `onPriceBoundsChange`.
- **Brand** (`brand` prop) -- manufacturer name filter, switches to catalog-wide search.

When any filter prop changes, the grid automatically re-fetches and the page resets to 1.

### Sorting

Sorting can be controlled externally via `sortField` and `sortOrder` props, or managed internally. Available sort fields include `NAME`, `PRICE`, `RELEVANCE` (auto-selected for search queries), and others from the `ProductSortField` enum. The `onSortChange` callback emits changes for syncing with a toolbar component.

### Pagination

The grid supports both internal and external pagination:

- **Internal** -- the grid tracks `currentPage` and provides `handlePageChange` for built-in Previous/Next controls.
- **External** -- pass a `page` prop to control the current page. Wire `onPageChange` to update your state, and use `onProductsResponse` to feed a `GridPagination` component.

The `pageSize` prop (default 12) sets items per page. Changing it triggers a re-fetch with page reset to 1.

### Cart Integration

The grid passes cart props through to embedded `ProductCard` > `AddToCart` components:

- `cartId` -- ID of an existing cart. When provided, items are added to this cart.
- `createCart` -- when true and no `cartId` is available, AddToCart creates a new cart automatically.
- `onCartCreated` -- callback to persist the newly created cart. Always implement this when using `createCart={true}`.
- `afterAddToCart` -- callback with the updated cart after each add. Use to sync your CartContext.

The add-to-cart button visibility is controlled by `portalMode` and `allowAddToCart`. In `'semi-closed'` portal mode or when `allowAddToCart={false}`, product cards render without add-to-cart controls. Cluster cards always show their navigation button regardless of these settings.

### Language Filtering

After fetching products from the API, the grid filters items client-side to include only those with a `names` entry matching the current `language`. Products without a translation for the active language are excluded from display. The `itemsFound` count is adjusted downward to account for filtered-out untranslated items, ensuring accurate pagination metadata.

When the `language` prop changes, the grid automatically re-fetches all data.
