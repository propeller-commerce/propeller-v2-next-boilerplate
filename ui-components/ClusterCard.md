import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ClusterCard

A card component that renders a Propeller Commerce cluster: default product image with optional badge overlays, cluster details (name, SKU, manufacturer, short description, price, stock), a favourite toggle, and a "View cluster" navigation button. Supports both grid and row layouts.

---

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic grid card

```tsx
import ClusterCard from '@/components/propeller/ClusterCard';
import config from '@/data/config';

<ClusterCard
  cluster={cluster}
  configuration={config}
  language="NL"
/>
```

### SPA navigation with Next.js router

```tsx
import { useRouter } from 'next/navigation';

const router = useRouter();

<ClusterCard
  cluster={cluster}
  configuration={config}
  onClusterClick={(c) => router.push(config.urls.getClusterUrl(c, 'NL'))}
/>
```

### With image badges and text attribute labels

```tsx
<ClusterCard
  cluster={cluster}
  configuration={config}
  imageLabels={['new', 'sale']}
  textLabels={['brand', 'color']}
/>
```

Each string in `imageLabels` / `textLabels` is matched against `defaultProduct.attributes.items[].attributeDescription.name`. Attributes with no matching value are silently omitted.

### With favourite toggle

```tsx
<ClusterCard
  cluster={cluster}
  configuration={config}
  enableAddFavorite={true}
  onToggleFavorite={(cluster, isFavorite) => {
    isFavorite
      ? wishlistService.add(cluster.clusterId)
      : wishlistService.remove(cluster.clusterId);
  }}
/>
```

### All display options enabled

```tsx
<ClusterCard
  cluster={cluster}
  configuration={config}
  showName={true}
  showImage={true}
  showSku={true}
  showManufacturer={true}
  showShortDescription={true}
  showStock={true}
  showAvailability={true}
  language="NL"
/>
```

### Row layout (single-column list)

When `columns` is set to `1`, the card renders as a compact horizontal row instead of a vertical card.

```tsx
<ClusterCard
  cluster={cluster}
  configuration={config}
  columns={1}
/>
```

### Localised labels (Dutch)

```tsx
<ClusterCard
  cluster={cluster}
  configuration={config}
  labels={{
    addToFavorites: 'Toevoegen aan favorieten',
    removeFromFavorites: 'Verwijderen uit favorieten',
    viewCluster: 'Bekijk cluster',
    inStock: 'Op voorraad',
    lowStock: 'Weinig voorraad',
    outOfStock: 'Niet op voorraad',
  }}
  stockLabels={{
    inStock: 'Op voorraad',
    outOfStock: 'Niet op voorraad',
    lowStock: 'Weinig voorraad',
    pieces: 'stuks',
  }}
/>
```

### Price excluding VAT

```tsx
<ClusterCard
  cluster={cluster}
  configuration={config}
  includeTax={false}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

Standalone example showing how to render a minimal cluster card without using this component:

```tsx
import { Cluster } from 'propeller-sdk-v2';

interface SimpleClusterCardProps {
  cluster: Cluster;
  language?: string;
  onClick?: (cluster: Cluster) => void;
}

function SimpleClusterCard({ cluster, language = 'NL', onClick }: SimpleClusterCardProps) {
  const name =
    cluster.names?.find((n) => n.language === language)?.value ||
    cluster.defaultProduct?.names?.find((n) => n.language === language)?.value ||
    cluster.names?.[0]?.value ||
    'Unnamed cluster';

  const imageUrl =
    cluster.defaultProduct?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;

  const price = cluster.defaultProduct?.price?.net;

  const sku = cluster.sku || cluster.defaultProduct?.sku || '';

  const stockQty = cluster.defaultProduct?.inventory?.totalQuantity;

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick(cluster);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="mb-3 h-48 w-full object-contain"
        />
      ) : (
        <div className="mb-3 flex h-48 items-center justify-center bg-gray-50 text-gray-300">
          No image
        </div>
      )}

      {sku && (
        <p className="font-mono text-xs text-gray-400">{sku}</p>
      )}

      <a
        href={`/cluster/${cluster.clusterId}`}
        onClick={handleClick}
        className="block text-sm font-medium text-gray-900 hover:text-primary"
      >
        {name}
      </a>

      {stockQty !== undefined && stockQty !== null && (
        <p className={`text-xs ${stockQty > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {stockQty > 0 ? `In stock (${stockQty})` : 'Out of stock'}
        </p>
      )}

      {price !== undefined && price !== null && (
        <p className="mt-2 text-lg font-bold text-gray-900">
          &euro;{Number(price).toFixed(2)}
        </p>
      )}

      <a
        href={`/cluster/${cluster.clusterId}`}
        onClick={handleClick}
        className="mt-3 block w-full rounded bg-primary px-4 py-2 text-center text-sm font-medium text-white"
      >
        View cluster
      </a>
    </div>
  );
}

export default SimpleClusterCard;
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Core

| Prop | Type | Required | Description |
|---|---|---|---|
| `cluster` | `Cluster` | Yes | The Propeller cluster object to display |
| `configuration` | `any` | Yes | App configuration object (from `@/data/config`). Must expose `urls.getClusterUrl()` |
| `language` | `string` | No | Language code for resolving localised names and slugs. Defaults to `'NL'` |

### Display toggles

| Prop | Type | Default | Description |
|---|---|---|---|
| `showName` | `boolean` | `true` | Renders the cluster name as a clickable link |
| `showImage` | `boolean` | `true` | Renders the default product image area |
| `showSku` | `boolean` | `true` | Renders SKU; uses `cluster.sku`, falls back to `defaultProduct.sku` |
| `showShortDescription` | `boolean` | `false` | Renders the first localised short description |
| `showManufacturer` | `boolean` | `false` | Renders `defaultProduct.manufacturer` |
| `showStock` | `boolean` | `true` | Renders a stock badge via the embedded `ItemStock` component |
| `showAvailability` | `boolean` | `true` | Shows the availability indicator inside `ItemStock`. Only relevant when `showStock` is true |

### Layout

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` | `number` | `undefined` | When set to `1`, renders the card as a compact horizontal row instead of a vertical card |
| `className` | `string` | `undefined` | Extra CSS class applied to the root element |

### Attribute labels

| Prop | Type | Description |
|---|---|---|
| `imageLabels` | `string[]` | Attribute names whose values are shown as badge overlays on the image |
| `textLabels` | `string[]` | Attribute names whose values are shown as extra text rows below the name |

Attribute lookup is performed against `defaultProduct.attributes.items[n].attributeDescription.name`. The resolved `value.value` string is rendered. Entries with no match are dropped.

### Favourites

| Prop | Type | Default | Description |
|---|---|---|---|
| `enableAddFavorite` | `boolean` | `false` | Renders a heart-icon toggle button on the image |
| `onToggleFavorite` | `(cluster: Cluster, isFavorite: boolean) => void` | -- | Called on every favourite state change. `isFavorite = true` means just added |

### Navigation

| Prop | Type | Description |
|---|---|---|
| `onClusterClick` | `(cluster: Cluster) => void` | Called when the name, image, or button is clicked. When provided, default `<a>` navigation is suppressed so you can use framework-specific routing |

### Pricing

| Prop | Type | Default | Description |
|---|---|---|---|
| `includeTax` | `boolean` | `false` | When `true`, shows `price.net` (incl. VAT). When `false`, shows `price.gross` (excl. VAT). If omitted, follows the global price toggle from `localStorage` |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function renderClusterCard(
  cluster: Cluster,
  options?: {
    language?: string;
    includeTax?: boolean;
    imageLabels?: string[];
    textLabels?: string[];
  }
): void
```

### Options

| Field | Type | Default | Maps to |
|---|---|---|---|
| `cluster` | `Cluster` | — | `cluster` prop |
| `language` | `string` | `'NL'` | `language` prop |
| `includeTax` | `boolean` | `false` | `includeTax` prop |
| `imageLabels` | `string[]` | `undefined` | `imageLabels` prop |
| `textLabels` | `string[]` | `undefined` | `textLabels` prop |

### Callbacks

| Callback | When it fires | What to implement |
|---|---|---|
| `onClusterClick` | Name, image, or button is clicked | Navigate to cluster detail page using `configuration.urls.getClusterUrl()` or your own routing |
| `onToggleFavorite` | Heart icon is toggled | Add or remove cluster from a wishlist via your preferred service |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `className`
- `columns`
- `showName`, `showImage`, `showSku`, `showShortDescription`, `showManufacturer`, `showStock`, `showAvailability`
- `enableAddFavorite`
- `labels`, `stockLabels`

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

Pass UI string overrides via the `labels` prop:

| Key | Default value | Used for |
|---|---|---|
| `addToFavorites` | `'Add to favourites'` | `aria-label` on the heart button (not yet favourited) |
| `removeFromFavorites` | `'Remove from favourites'` | `aria-label` on the heart button (already favourited) |
| `viewCluster` | `'View cluster'` | Text of the navigation button |
| `inStock` | `'In stock'` | Stock badge when `totalQuantity > 5` |
| `lowStock` | `'Low stock'` | Stock badge when `1 <= totalQuantity <= 5` |
| `outOfStock` | `'Out of stock'` | Stock badge when `totalQuantity === 0` |

Pass stock-specific label overrides via the `stockLabels` prop (forwarded to `ItemStock`):

| Key | Default value |
|---|---|
| `inStock` | `'In stock'` |
| `outOfStock` | `'Out of stock'` |
| `lowStock` | `'Low stock'` |
| `available` | `'Available'` |
| `notAvailable` | `'Not available'` |
| `pieces` | `'pieces'` |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const labels = {
  addToFavorites: 'Add to favourites',
  removeFromFavorites: 'Remove from favourites',
  viewCluster: 'View cluster',
  inStock: 'In stock',
  lowStock: 'Low stock',
  outOfStock: 'Out of stock',
};

const stockLabels = {
  inStock: 'In stock',
  outOfStock: 'Out of stock',
  lowStock: 'Low stock',
  available: 'Available',
  notAvailable: 'Not available',
  pieces: 'pieces',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Price toggle

The component supports the global price toggle pattern used across the application:

- When `includeTax` is explicitly passed as a prop, it takes precedence.
- When `includeTax` is omitted, the component reads from `localStorage` key `price_include_tax` and listens for the `priceToggleChanged` custom event to stay in sync with the `PriceToggle` component.
- `price.net` = price including VAT, `price.gross` = price excluding VAT. The price is formatted as `EUR X.XX`.

### Image handling

- When the default product has media, the first image variant URL is rendered inside an `object-contain` container.
- When no image URL is available, a grey SVG placeholder icon is rendered instead.
- In grid view, the image area uses `aspect-[4/3]` on small screens and `aspect-square` on larger screens.
- In row view, the image is a fixed 80x80px thumbnail.

### Cluster vs Product differences

A **cluster** groups multiple product variants (e.g., sizes, colors) under a single entity. The ClusterCard always shows data from the cluster's `defaultProduct` for fields like price, stock, images, and manufacturer. The cluster itself provides the name, SKU, short description, and URL slug, falling back to the default product's values when the cluster-level data is empty.

Unlike `ProductCard`, which links to a single product detail page, `ClusterCard` links to a cluster page where users can select among variants.

### Grid vs Row layout

- **Grid layout** (default): Vertical card with stacked image, details, and action button. Best for multi-column grids.
- **Row layout** (`columns={1}`): Compact horizontal layout with a small thumbnail, inline details, and right-aligned price and action button. Suitable for list views.

### Stock badge

The stock badge reads `defaultProduct.inventory.totalQuantity` and renders via the embedded `ItemStock` component:

| Condition | Color | Label key |
|---|---|---|
| `totalQuantity > 5` | Green | `inStock` |
| `1 <= totalQuantity <= 5` | Amber | `lowStock` |
| `totalQuantity === 0` | Red | `outOfStock` |
| Inventory not present | Hidden | -- |

### Favourite toggle

The component maintains an internal `isFavorite` boolean starting at `false`. Clicking the heart button toggles it and fires `onToggleFavorite(cluster, newState)`. There is no prop to set the initial favourite state -- manage pre-seeded state externally.

### Navigation

The cluster name, image, and "View cluster" button all render as `<a>` tags with the URL generated by `configuration.urls.getClusterUrl()`. If `onClusterClick` is provided, `e.preventDefault()` is called and routing is delegated to the callback, enabling SPA navigation without full page reloads.

## GraphQL Query Examples

### Fetching clusters for a category listing

```graphql
query Clusters($categoryId: Int!, $language: String) {
  clusters(
    input: {
      categoryId: $categoryId
      language: $language
      offset: 0
      limit: 20
    }
  ) {
    items {
      clusterId
      sku
      names { language value }
      slugs { language value }
      shortDescriptions { language value }
      defaultProduct {
        productId
        sku
        names { language value }
        slugs { language value }
        shortDescriptions { language value }
        manufacturer
        price { net gross }
        inventory { totalQuantity }
        media {
          images {
            items {
              imageVariants {
                url
              }
            }
          }
        }
        attributes {
          items {
            attributeDescription { name }
            value { value }
          }
        }
      }
    }
    itemsFound
  }
}
```

### Fetching a single cluster by ID

```graphql
query Cluster($clusterId: Int!, $language: String) {
  cluster(id: $clusterId, language: $language) {
    clusterId
    sku
    names { language value }
    slugs { language value }
    defaultProduct {
      productId
      price { net gross }
      inventory { totalQuantity }
      media {
        images {
          items {
            imageVariants { url }
          }
        }
      }
    }
  }
}
```

## SDK Services and Types

The component uses the following types from `propeller-sdk-v2`:

| Type | Usage |
|---|---|
| `Cluster` | The main cluster data object passed via `cluster` prop |
| `AttributeResult` | Used to resolve `imageLabels` and `textLabels` from `defaultProduct.attributes.items[]` |

### Key data paths on the `Cluster` type

| Data | Path | Notes |
|---|---|---|
| Name | `cluster.names[]` | Array of `{ language, value }`. Falls back to `defaultProduct.names[]` |
| SKU | `cluster.sku` | Falls back to `defaultProduct.sku` |
| Image | `defaultProduct.media.images.items[0].imageVariants[0].url` | First image variant of the default product |
| Price | `defaultProduct.price.net` / `defaultProduct.price.gross` | `net` = incl. VAT, `gross` = excl. VAT |
| URL slug | `cluster.slugs[]` | Falls back to `defaultProduct.slugs[]`. Resolved via `configuration.urls.getClusterUrl()` |
| Short description | `cluster.shortDescriptions[]` | Falls back to `defaultProduct.shortDescriptions[]` |
| Manufacturer | `defaultProduct.manufacturer` | Plain string |
| Stock | `defaultProduct.inventory.totalQuantity` | Integer; `undefined` means inventory data not loaded |
| Attributes | `defaultProduct.attributes.items[]` | Each item has `attributeDescription.name` and `value.value` |
