# ProductSlider

Displays products and/or clusters in a horizontally scrollable slider with navigation arrows. Fetches items internally via `ProductService` when IDs are provided, or accepts pre-loaded items via props. Designed for CMS integration where editors configure product/cluster IDs.

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | **Yes** | — | Propeller SDK GraphQL client. |
| `products` | `(Product \| Cluster)[]` | No | `[]` | Pre-loaded items. When provided, skips internal fetching. |
| `productIds` | `number[]` | No | — | Product IDs to fetch internally. |
| `clusterIds` | `number[]` | No | — | Cluster IDs to fetch internally. |
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

### With CMS-provided IDs (internal fetch)

```tsx
import ProductSlider from '@/components/propeller/ProductSlider';
import { graphqlClient } from '@/lib/api';

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

### With pre-loaded products (no fetch)

```tsx
<ProductSlider
  graphqlClient={graphqlClient}
  products={preLoadedProducts}
  language="NL"
  taxZone="NL"
  title="Related Products"
  configuration={config}
  onProductClick={(product) => router.push(config.urls.getProductUrl(product))}
/>
```

### CMS Integration (Strapi)

Add a `shared.product-slider` component in Strapi with fields `title`, `productIds` (text, comma-separated), `clusterIds` (text, comma-separated). The CMS block wrapper `ProductSliderBlock` handles auth, cart, and config wiring automatically.

## Behavior

- **Internal fetching**: When `productIds` or `clusterIds` are provided (and `products` is empty), calls `ProductService.getProducts()` with those IDs.
- **Pre-loaded items**: When `products` prop has items, renders them directly without fetching.
- **Re-fetch on ID change**: Automatically re-fetches when `productIds` or `clusterIds` props change.
- **Scroll navigation**: Left/right arrows scroll the track by 80% of visible width. Arrows disable at scroll boundaries.
- **Loading skeleton**: Shows animated placeholder cards matching `desktopCount` while fetching.
- **Empty state**: Shows "No products found" when fetch returns no items.
- **Mixed content**: Supports both Products and Clusters in the same slider, rendering appropriate card types.
- **Responsive width**: Card width is calculated as `calc((100% - gaps) / desktopCount)`.
- **VAT toggle**: Reacts to the `priceToggleChanged` custom event (reads `price_include_tax` from localStorage). Can be overridden via `includeTax` prop.

## Mitosis vs React Differences

The **Mitosis source** (`ui-components/ProductSlider.lite.tsx`) renders inline card markup because Mitosis cannot import other Mitosis components. It includes basic product/cluster display with image, name, SKU, and price.

The **React copy** (`components/propeller/ProductSlider.tsx`) is intentionally rewritten to render actual `ProductCard` and `ClusterCard` components, providing full catalog-page-equivalent features:

- **Add-to-cart** with quantity increment/decrement
- **Stock display** and availability indicators
- **VAT toggle** reactivity (via ProductCard's internal `priceToggleChanged` listener)
- **Cart integration** (`cartId`, `createCart`, `onCartCreated`, `afterAddToCart`)
- **`useRef`** for scroll track (supports multiple sliders on one page, unlike Mitosis's `querySelector`)
- **Scroll dimension updates** via `useEffect` on items change + window resize listener

When updating, edit the Mitosis source for props/fetching logic, then manually update the React copy for card rendering changes.

## Mitosis Source

`ui-components/ProductSlider.lite.tsx`
