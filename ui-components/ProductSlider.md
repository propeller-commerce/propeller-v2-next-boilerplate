# ProductSlider

Displays products and/or clusters in a horizontally scrollable slider with navigation arrows. Supports two fetching modes:

1. **CMS mode** — Fetches products/clusters by IDs (configured by CMS editors)
2. **Cross-upsell mode** — Fetches cross-sell/upsell items for a given product or cluster

Can also accept pre-loaded items via `products` prop to skip fetching entirely.

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | **Yes** | — | Propeller SDK GraphQL client. |
| `products` | `(Product \| Cluster)[]` | No | `[]` | Pre-loaded items. When provided, skips internal fetching. |
| `productIds` | `number[]` | No | — | Product IDs to fetch (CMS mode). |
| `clusterIds` | `number[]` | No | — | Cluster IDs to fetch (CMS mode). |
| `crossUpsellTypes` | `string[]` | No | — | Cross-upsell types to fetch. Enables cross-upsell mode. Values: `'ACCESSORIES'`, `'ALTERNATIVES'`, `'RELATED'`, `'OPTIONS'`, `'PARTS'`. |
| `productId` | `number` | No | — | Source product ID for cross-upsell lookup. Required when `crossUpsellTypes` is set. |
| `clusterId` | `number` | No | — | Source cluster ID for cross-upsell lookup. Required when `crossUpsellTypes` is set. |
| `language` | `string` | **Yes** | — | Language code for API requests. |
| `taxZone` | `string` | **Yes** | — | Tax zone for price calculations. |
| `portalMode` | `'open' \| 'semi-closed'` | No | `'open'` | Portal mode controlling add-to-cart visibility. |
| `user` | `Contact \| Customer \| null` | No | `null` | Authenticated user for cart operations. |
| `includeTax` | `boolean` | No | — | Override VAT toggle. When omitted, follows `price_include_tax` localStorage + `priceToggleChanged` event. |
| `stockValidation` | `boolean` | No | `false` | Validate stock before adding to cart. |
| `showIncrDecr` | `boolean` | No | `true` | Show increment/decrement buttons on add-to-cart. |
| `itemsPerView` | `{ mobile?: number; tablet?: number; desktop?: number }` | No | `{ mobile: 1, tablet: 2, desktop: 4 }` | Items visible per breakpoint. |
| `title` | `string` | No | — | Slider heading. |
| `noImageUrl` | `string` | No | — | Fallback image URL. |
| `cartId` | `string` | No | — | Existing cart ID. |
| `createCart` | `boolean` | No | — | Auto-create cart if none exists. |
| `onCartCreated` | `(cart: Cart) => void` | No | — | Called after new cart creation. |
| `afterAddToCart` | `(cart: Cart, item?) => void` | No | — | Called after successful add-to-cart. |
| `onProductClick` | `(product: Product) => void` | No | — | Called when a product card is clicked. |
| `onClusterClick` | `(cluster: Cluster) => void` | No | — | Called when a cluster card is clicked. |
| `urlPattern` | `string` | No | — | URL pattern for product links. |
| `configuration` | `any` | No | — | Configuration object for cards (URL generation, feature flags). |
| `labels` | `Record<string, string>` | No | — | UI string overrides (see Labels section). |
| `containerClassName` | `string` | No | `'mb-12'` | Container CSS class. |

### Labels

| Key | Default | Description |
|---|---|---|
| `scrollLeft` | `'Scroll left'` | Left arrow aria-label |
| `scrollRight` | `'Scroll right'` | Right arrow aria-label |
| `viewCluster` | `'View options'` | Cluster card CTA text (Mitosis only) |
| `noProducts` | `'No products found'` | Empty state message |

## Usage

### CMS mode — fetch by IDs

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

### Cross-upsell mode — on product page

```tsx
<ProductSlider
  graphqlClient={graphqlClient}
  crossUpsellTypes={['ACCESSORIES', 'RELATED']}
  productId={product.productId}
  language="NL"
  taxZone="NL"
  title="Related Products"
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

### Cross-upsell mode — for a cluster

```tsx
<ProductSlider
  graphqlClient={graphqlClient}
  crossUpsellTypes={['ALTERNATIVES']}
  clusterId={cluster.clusterId}
  language="NL"
  taxZone="NL"
  title="Alternative Products"
  configuration={config}
  onProductClick={(product) => router.push(config.urls.getProductUrl(product))}
/>
```

### Pre-loaded items (no fetch)

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

## Behavior

### Fetching modes

- **CMS mode** (default): When `productIds` or `clusterIds` are provided, calls `ProductService.getProducts()`.
- **Cross-upsell mode**: When `crossUpsellTypes` is set with a `productId` or `clusterId`, calls `CrossupsellService.getCrossupsells()` and extracts `productTo`/`clusterTo` from the response.
- **Pre-loaded**: When `products` prop has items, renders them directly without fetching.
- Cross-upsell mode takes priority over CMS mode when `crossUpsellTypes` is set.

### UI behavior

- **Re-fetch on prop change**: Automatically re-fetches when IDs, cross-upsell types, or source product/cluster change.
- **Scroll navigation**: Left/right arrows scroll the track by 80% of visible width. Arrows disable at scroll boundaries.
- **Loading skeleton**: Shows animated placeholder cards matching `desktopCount` while fetching.
- **Empty state**: Shows "No products found" in CMS mode. Hidden in cross-upsell mode (no results is normal).
- **Mixed content**: Supports both Products and Clusters in the same slider.
- **Responsive width**: Card width is calculated as `calc((100% - gaps) / desktopCount)`.
- **VAT toggle**: Reacts to the `priceToggleChanged` custom event. Can be overridden via `includeTax` prop.

### Known limitation

`CrossupsellService.getCrossupsells()` has a known SDK bug (undeclared fragment variables cause HTTP 400). Cross-upsell results may not display until the SDK is fixed. The error is caught silently.

## Mitosis vs React Differences

The **Mitosis source** (`ui-components/ProductSlider.lite.tsx`) renders inline card markup because Mitosis cannot import other Mitosis components.

The **React copy** (`components/propeller/ProductSlider.tsx`) renders actual `ProductCard` and `ClusterCard` components with full catalog-page features:

- Add-to-cart with quantity increment/decrement
- Stock display and availability indicators
- VAT toggle reactivity (via ProductCard's internal listener)
- Cart integration (`cartId`, `createCart`, `onCartCreated`, `afterAddToCart`)
- `useRef` for scroll track (supports multiple sliders on one page)
- Scroll dimension updates via `useEffect` on items change + window resize listener

When updating, edit the Mitosis source for props/fetching logic, then manually update the React copy for card rendering changes.

## CMS Integration (Strapi)

Add a `shared.product-slider` component in Strapi with fields `title`, `productIds` (text, comma-separated), `clusterIds` (text, comma-separated). The CMS block wrapper `ProductSliderBlock` handles auth, cart, and config wiring automatically.

## Mitosis Source

`ui-components/ProductSlider.lite.tsx`
