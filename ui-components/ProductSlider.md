import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ProductSlider

A horizontally scrollable product carousel with built-in data fetching, navigation arrows, and responsive breakpoints. Renders ProductCard and ClusterCard components with full add-to-cart, stock, and favorites support.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### CMS-driven slider -- fetch products by ID

Content editors define which products appear. The component fetches them internally using `ProductService.getProducts()`.

```tsx
<ProductSlider
  graphqlClient={graphqlClient}
  productIds={[123, 456, 789]}
  clusterIds={[101, 202]}
  language="NL"
  taxZone="NL"
  title="Featured Products"
  user={authState.user}
  cartId={cart?.cartId}
  createCart={true}
  onCartCreated={(newCart) => saveCart(newCart)}
  afterAddToCart={(updatedCart) => saveCart(updatedCart)}
  configuration={config}
  onProductClick={(product) => router.push(config.urls.getProductUrl(product))}
  onClusterClick={(cluster) => router.push(config.urls.getClusterUrl(cluster))}
/>
```

### Cross-upsell slider on a product detail page

Fetches accessories and related products for a specific product via `CrossupsellService.getCrossupsells()`. The title auto-generates from the cross-upsell types (e.g., "Accessories & Related products") unless overridden.

```tsx
<ProductSlider
  graphqlClient={graphqlClient}
  crossUpsellTypes={['ACCESSORIES', 'RELATED']}
  productId={product.productId}
  language="NL"
  taxZone="NL"
  user={authState.user}
  cartId={cart?.cartId}
  createCart={true}
  onCartCreated={(newCart) => saveCart(newCart)}
  afterAddToCart={(updatedCart) => saveCart(updatedCart)}
  configuration={config}
  onProductClick={(product) => router.push(config.urls.getProductUrl(product))}
  onClusterClick={(cluster) => router.push(config.urls.getClusterUrl(cluster))}
/>
```

### Cross-upsell slider for a cluster

```tsx
<ProductSlider
  graphqlClient={graphqlClient}
  crossUpsellTypes={['ALTERNATIVES']}
  clusterId={cluster.clusterId}
  language="NL"
  taxZone="NL"
  configuration={config}
  onProductClick={(product) => router.push(config.urls.getProductUrl(product))}
/>
```

### Pre-loaded items (skip fetching)

Pass an array of already-fetched Product or Cluster objects. No API call is made.

```tsx
<ProductSlider
  graphqlClient={graphqlClient}
  products={preLoadedProducts}
  language="NL"
  taxZone="NL"
  title="Hand-picked Products"
  configuration={config}
  onProductClick={(product) => router.push(config.urls.getProductUrl(product))}
/>
```

### Catalog-only mode (no add-to-cart)

Set `portalMode="semi-closed"` to hide the add-to-cart button on each card.

```tsx
<ProductSlider
  graphqlClient={graphqlClient}
  productIds={[10, 20, 30]}
  language="NL"
  taxZone="NL"
  portalMode="semi-closed"
  configuration={config}
  onProductClick={(product) => router.push(config.urls.getProductUrl(product))}
/>
```

### Custom responsive layout

```tsx
<ProductSlider
  graphqlClient={graphqlClient}
  productIds={[10, 20, 30, 40, 50, 60]}
  language="NL"
  taxZone="NL"
  itemsPerView={{ mobile: 2, tablet: 3, desktop: 5 }}
  configuration={config}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom slider or replace the built-in fetching logic:

1. **Fetch data externally** using `ProductService` or `CrossupsellService` as shown above.
2. **Pass results via the `products` prop** to skip internal fetching entirely.
3. **Wire up cart integration** by passing `cartId`, `createCart`, `onCartCreated`, and `afterAddToCart` to keep the app's CartContext in sync.
4. **Handle routing** with `onProductClick` and `onClusterClick` callbacks rather than relying on anchor tags, so the slider works with any router.

Example -- fetch externally with custom filtering, then pass results via the `products` prop:

```ts
import { ProductService, Enums, Product, Cluster } from 'propeller-sdk-v2';

// pseudo-code: call this on initialization or when productIds change
const productService = new ProductService(graphqlClient);
const res = await productService.getProducts({
  input: {
    productIds: cmsBlock.productIds,
    language: 'NL',
    page: 1,
    offset: 20,
    statuses: [Enums.ProductStatus.A],
  },
  imageSearchFilters: config.imageSearchFiltersGrid,
  imageVariantFilters: config.imageVariantFiltersMedium,
  filterAvailableAttributeInput: { isSearchable: true },
});

// Custom filter: only items with images
const items = (res.items || []).filter(
  (item: Product | Cluster) => item.media?.images?.length > 0
);

// pseudo-code: pass `items` to the ProductSlider's `products` prop to skip internal fetching
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Data Source

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | Yes | -- | Propeller SDK client for API calls. |
| `products` | `(Product \| Cluster)[]` | No | `[]` | Pre-loaded items. Skips all internal fetching when provided. |
| `productIds` | `number[]` | No | -- | Product IDs to fetch (CMS mode). |
| `clusterIds` | `number[]` | No | -- | Cluster IDs to fetch (CMS mode). |
| `crossUpsellTypes` | `string[]` | No | -- | Enables cross-upsell mode. Values: `'ACCESSORIES'`, `'ALTERNATIVES'`, `'RELATED'`, `'OPTIONS'`, `'PARTS'`. |
| `productId` | `number` | No | -- | Source product for cross-upsell lookup. Required when `crossUpsellTypes` is set. |
| `clusterId` | `number` | No | -- | Source cluster for cross-upsell lookup. Required when `crossUpsellTypes` is set. |

### Locale and Pricing

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `language` | `string` | Yes | -- | Language code for API requests and localized content. |
| `taxZone` | `string` | Yes | -- | Tax zone for price calculations. |
| `includeTax` | `boolean` | No | -- | Override the VAT toggle. When omitted, follows the `price_include_tax` localStorage value and `priceToggleChanged` event. |

### Layout

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | `string` | No | -- | Heading displayed above the slider. In cross-upsell mode, auto-generates from the type names if omitted. |
| `itemsPerView` | `{ mobile?: number; tablet?: number; desktop?: number }` | No | `{ mobile: 1, tablet: 2, desktop: 4 }` | Number of visible cards at each breakpoint. |
| `containerClassName` | `string` | No | `'mb-12'` | CSS class for the outermost wrapper. |

### Portal and Visibility

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `portalMode` | `'open' \| 'semi-closed'` | No | `'open'` | `'open'` shows add-to-cart on product cards. `'semi-closed'` hides it for a catalog-only view. |
| `user` | `Contact \| Customer \| null` | No | `null` | Authenticated user, forwarded to cards for cart and pricing operations. |

### Cart Integration

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `cartId` | `string` | No | -- | Existing cart ID to add items to. |
| `createCart` | `boolean` | No | `false` | Auto-create a cart when none exists. Pair with `onCartCreated`. |
| `onCartCreated` | `(cart: Cart) => void` | No | -- | Called after a new cart is created internally. |
| `afterAddToCart` | `(cart: Cart, item?: CartMainItem) => void` | No | -- | Called after every successful add-to-cart with the updated cart. |
| `stockValidation` | `boolean` | No | `false` | Validate stock before adding to cart. |
| `showIncrDecr` | `boolean` | No | `true` | Show +/- stepper buttons on add-to-cart. |
| `showModal` | `boolean` | No | `false` | Show a success modal instead of a toast after adding to cart. |
| `onProceedToCheckout` | `() => void` | No | -- | Called when "Proceed to checkout" is clicked in the add-to-cart modal. |

### Stock Display

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `showStock` | `boolean` | No | `false` | Show the stock/availability widget on each card. |
| `showAvailability` | `boolean` | No | `true` | Show only the availability indicator (Available / Not available). |
| `stockLabels` | `Record<string, string>` | No | -- | Label overrides for ItemStock. Keys: `inStock`, `outOfStock`, `lowStock`, `available`, `notAvailable`, `pieces`. |

### Favorites

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `enableAddFavorite` | `boolean` | No | `false` | Show a heart-icon toggle on each card. |
| `onToggleFavorite` | `(item: Product \| Cluster, isFavorite: boolean) => void` | No | -- | Called when a favorite is toggled. |

### Navigation Callbacks

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `onProductClick` | `(product: Product) => void` | No | -- | Called when a product card is clicked. Use for SPA-style routing. |
| `onClusterClick` | `(cluster: Cluster) => void` | No | -- | Called when a cluster card is clicked. |

### Labels and Configuration

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `configuration` | `any` | No | -- | App config object providing `imageSearchFiltersGrid`, `imageVariantFiltersMedium`, and `urls` for URL generation. |
| `labels` | `Record<string, string>` | No | -- | UI string overrides (see Labels section). |
| `addToCartLabels` | `Record<string, string>` | No | -- | Label overrides forwarded to the AddToCart component inside each card. Keys: `add`, `adding`, `addedToCart`, `outOfStock`, `noCartId`, `errorAdding`, `modalTitle`, `quantity`, `continueShopping`, `proceedToCheckout`. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
async function fetchSliderProducts(options: {
  graphqlClient: GraphQLClient;
  productIds?: number[];
  clusterIds?: number[];
  crossUpsellTypes?: string[];
  productId?: number;
  clusterId?: number;
  language: string;
  taxZone: string;
  configuration?: any;
  user?: Contact | Customer | null;
}): Promise<(Product | Cluster)[]>
```

### Options

| Field | Type | Default | Maps to |
|-------|------|---------|---------|
| `graphqlClient` | `GraphQLClient` | **required** | `graphqlClient` prop |
| `productIds` | `number[]` | `undefined` | `productIds` prop |
| `clusterIds` | `number[]` | `undefined` | `clusterIds` prop |
| `crossUpsellTypes` | `string[]` | `undefined` | `crossUpsellTypes` prop |
| `productId` | `number` | `undefined` | `productId` prop |
| `clusterId` | `number` | `undefined` | `clusterId` prop |
| `language` | `string` | **required** | `language` prop |
| `taxZone` | `string` | **required** | `taxZone` prop |
| `configuration` | `any` | `undefined` | `configuration` prop |
| `user` | `Contact \| Customer \| null` | `null` | `user` prop |

### Cart resolution

When adding items to cart from within the slider, the component resolves the cart as follows:

1. If `cartId` is provided, use the existing cart.
2. If `createCart` is `true` and no `cartId` exists, auto-create a new cart and fire `onCartCreated`.
3. After every successful add-to-cart, fire `afterAddToCart` with the updated cart.

### Callbacks

| Callback | Signature | Purpose |
|----------|-----------|---------|
| `onCartCreated` | `(cart: Cart) => void` | Persist newly created cart to app state |
| `afterAddToCart` | `(cart: Cart, item?: CartMainItem) => void` | Sync updated cart to app state |
| `onProductClick` | `(product: Product) => void` | Handle product card navigation |
| `onClusterClick` | `(cluster: Cluster) => void` | Handle cluster card navigation |
| `onToggleFavorite` | `(item: Product \| Cluster, isFavorite: boolean) => void` | Handle favorite toggle |
| `onProceedToCheckout` | `() => void` | Handle checkout navigation from add-to-cart modal |

### UI-only props (React component only)

The following props control visual presentation and have no equivalent in a custom implementation:

- `title` — Heading above the slider
- `itemsPerView` — Responsive card counts
- `containerClassName` — CSS class for the outermost wrapper
- `showIncrDecr` — Show +/- stepper buttons
- `showModal` — Show modal vs toast after add-to-cart
- `stockLabels` — Label overrides for stock widget
- `addToCartLabels` — Label overrides for AddToCart component

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default | Description |
|---|---|---|
| `scrollLeft` | `'Scroll left'` | Left arrow aria-label. |
| `scrollRight` | `'Scroll right'` | Right arrow aria-label. |
| `noProducts` | `'No products found'` | Empty state message (CMS mode only). |
| `ACCESSORIES` | `'Accessories'` | Cross-upsell type display name. |
| `ALTERNATIVES` | `'Alternatives'` | Cross-upsell type display name. |
| `RELATED` | `'Related products'` | Cross-upsell type display name. |
| `OPTIONS` | `'Options'` | Cross-upsell type display name. |
| `PARTS` | `'Parts'` | Cross-upsell type display name. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  scrollLeft: 'Scroll left',
  scrollRight: 'Scroll right',
  noProducts: 'No products found',
  ACCESSORIES: 'Accessories',
  ALTERNATIVES: 'Alternatives',
  RELATED: 'Related products',
  OPTIONS: 'Options',
  PARTS: 'Parts',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Responsive Card Widths

Card widths are calculated with CSS `calc()` to fill the container minus gaps:

- **Mobile** (default): `calc((100% - 1.5rem) / 1.5)` -- shows ~1.5 cards, hinting that more content is scrollable.
- **Tablet** (`md`): `calc((100% - 3rem) / 2.5)` -- shows ~2.5 cards.
- **Desktop** (`lg`): `calc((100% - 4.5rem) / 4)` -- shows 4 full cards.

The partial-card pattern is intentional: it signals to the user that the row is scrollable.

### Scroll Navigation

- Left/right arrow buttons appear when the number of items exceeds the desktop count.
- Each click scrolls the track by 80% of its visible width using `scrollBy({ behavior: 'smooth' })`.
- Arrows disable automatically at scroll boundaries (left arrow at the start, right arrow at the end).
- Scroll position is tracked via the native `onScroll` event.

### Loading and Empty States

- **Loading**: Displays four animated skeleton cards (gray pulsing rectangles) while fetching.
- **Empty (CMS mode)**: Shows the `noProducts` label ("No products found" by default).
- **Empty (cross-upsell mode)**: The entire component hides itself. This is intentional -- a product may have no cross-upsells, and showing an empty section would be confusing.

### Re-fetching

The component re-fetches automatically when any of these props change:
- `productIds` or `clusterIds` (compared by value via `JSON.stringify`, not by reference — prevents stale-reference refetches when arrays are re-created with the same contents)
- `crossUpsellTypes` (compared by value via `JSON.stringify`)
- `productId` or `clusterId` (cross-upsell source)
- `language`

### Scroll initialization

The slider generates a unique `sliderId` on mount (via `Math.random()`) and uses a `data-slider-id` DOM attribute to query scroll dimensions. Scroll dimensions are initialized with a 50ms `setTimeout` after the slider ID is set, to ensure the DOM has fully rendered.

### CMS-Driven Content (Strapi)

Add a `shared.product-slider` component in Strapi with fields for `title`, `productIds` (comma-separated text), and `clusterIds` (comma-separated text). A CMS block wrapper (`ProductSliderBlock`) parses these fields into number arrays and handles auth, cart, and configuration wiring automatically, so editors only need to enter IDs.

### Mixed Content

A single slider can contain both Product and Cluster items. The component detects the item type by checking for `clusterId` vs `productId` and renders the appropriate card (ClusterCard or ProductCard).

### VAT Toggle

Each card respects the global VAT toggle. The `includeTax` prop overrides the toggle when set explicitly. When omitted, cards read from `localStorage` (`price_include_tax`) and listen for the `priceToggleChanged` custom event.

## SDK Services

### ProductService -- CMS mode

When `productIds` or `clusterIds` are provided (and `products` is not), the component calls `ProductService.getProducts()` internally:

```ts
const productService = new ProductService(graphqlClient);
const response = await productService.getProducts({
  input: {
    productIds: [123, 456],
    clusterIds: [101],
    language: 'NL',
    page: 1,
    offset: 50,
    statuses: [
      Enums.ProductStatus.A,  // Active
      Enums.ProductStatus.P,  // Published
      Enums.ProductStatus.T,  // Temporary
      Enums.ProductStatus.S,  // Stock
    ],
  },
  imageSearchFilters: configuration?.imageSearchFiltersGrid || { page: 1, offset: 1 },
  imageVariantFilters: configuration?.imageVariantFiltersMedium || {
    transformations: [{
      name: 'grid',
      transformation: {
        format: Enums.Format.WEBP,
        height: 300,
        width: 300,
        fit: Enums.Fit.BOUNDS,
      },
    }],
  },
  filterAvailableAttributeInput: { isSearchable: true },
});
```

The response shape is `{ items: (Product | Cluster)[] }`. Both products and clusters can appear in a single response.

### CrossupsellService -- cross-upsell mode

When `crossUpsellTypes` is set along with `productId` or `clusterId`, the component calls `CrossupsellService.getCrossupsells()`:

```ts
const crossupsellService = new CrossupsellService(graphqlClient);
const result = await crossupsellService.getCrossupsells({
  input: {
    types: ['ACCESSORIES', 'RELATED'],
    page: 1,
    offset: 50,
    productIdsFrom: [product.productId],
    // or: clusterIdsFrom: [cluster.clusterId],
  },
  language: 'NL',
  imageSearchFilters: configuration?.imageSearchFiltersGrid,
  imageVariantFilters: configuration?.imageVariantFiltersMedium,
  priceCalculateProductInput: {
    taxZone: 'NL',
    companyId: user?.company?.companyId,   // B2B Contact
    contactId: user?.contactId,            // B2B Contact
    customerId: user?.customerId,          // B2C Customer
  },
});
```

The response contains `{ items: Crossupsell[] }`. Each `Crossupsell` has either a `productTo` or `clusterTo` field referencing the related item.

**Known limitation**: `CrossupsellService.getCrossupsells()` has a known SDK bug where undeclared fragment variables cause an HTTP 400. Cross-upsell results may not display until the SDK is fixed. The error is caught silently.

## GraphQL Queries and Mutations

### Fetch products by ID (what ProductService.getProducts sends)

```graphql
query products(
  $input: ProductSearchInput!
  $imageSearchFilters: ProductImageSearchInput
  $imageVariantFilters: ProductImageVariantSearchInput
) {
  products(input: $input) {
    items {
      productId
      sku
      name { value language }
      slug { value language }
      price { net gross }
      media(input: $imageSearchFilters) {
        images {
          url
          variants(input: $imageVariantFilters) { url }
        }
      }
    }
    itemsFound
  }
}
```

Variables:

```json
{
  "input": {
    "productIds": [123, 456],
    "language": "NL",
    "page": 1,
    "offset": 50,
    "statuses": ["A", "P", "T", "S"]
  },
  "imageSearchFilters": { "page": 1, "offset": 1 },
  "imageVariantFilters": {
    "transformations": [{
      "name": "grid",
      "transformation": { "format": "WEBP", "height": 300, "width": 300, "fit": "BOUNDS" }
    }]
  }
}
```

### Fetch cross-upsells for a product

```graphql
query crossupsells(
  $input: CrossupsellSearchInput!
  $language: String
  $imageSearchFilters: ProductImageSearchInput
  $imageVariantFilters: ProductImageVariantSearchInput
) {
  crossupsells(input: $input) {
    items {
      type
      productTo {
        productId
        name(language: $language) { value }
        slug(language: $language) { value }
        price { net gross }
      }
      clusterTo {
        clusterId
        name(language: $language) { value }
        slug(language: $language) { value }
      }
    }
  }
}
```

Variables:

```json
{
  "input": {
    "types": ["ACCESSORIES", "RELATED"],
    "productIdsFrom": [123],
    "page": 1,
    "offset": 50
  },
  "language": "NL"
}
```
