# ClusterCard

A self-contained Mitosis UI component that renders a complete cluster card: default product image with optional label overlays, cluster details (name, SKU, manufacturer, short description, price, stock), a favourite toggle, and a **View cluster** navigation button.

**Source:** `ui-components/ClusterCard.lite.tsx`
**Compiled React:** `output/react/ui-components/ClusterCard`
**Compiled Vue:** `output/vue/ui-components/ClusterCard`

---

## Visual layout

```
┌─────────────────────────────────┐
│  [badge]          [♡ fav btn]   │  ← image area (aspect-square)
│                                 │
│       [ default product img ]   │
│                                 │
├─────────────────────────────────┤
│  SKU-1234                       │  ← SKU (cluster sku → fallback to defaultProduct.sku)
│  Cluster name that may wrap     │  ← name (link)
│  Extra attribute value          │  ← textLabels
│  Manufacturer name              │  ← showManufacturer
│  Short description text…        │  ← showShortDescription
│                     € 29.99     │  ← price (from defaultProduct)
│  ● In stock (42)                │  ← showStock badge + quantity
├─────────────────────────────────┤
│       [ View cluster ]          │  ← navigation button
└─────────────────────────────────┘
```

---

## Usage

### Minimal

```tsx
import ClusterCard from '@/output/react/ui-components/ClusterCard';

<ClusterCard cluster={cluster} />
```

### With SPA routing

```tsx
<ClusterCard
  cluster={cluster}
  onClusterClick={(c) => router.push(`/cluster/${c.clusterId}`)}
/>
```

### With image badge labels and text attribute labels

```tsx
<ClusterCard
  cluster={cluster}
  imageLabels={['new', 'sale']}
  textLabels={['brand', 'color']}
/>
```

Each string in `imageLabels` / `textLabels` is matched against
`defaultProduct.attributes.items[].attributeDescription.name`.
Attributes with no matching value are silently omitted.

### With favourite toggle

```tsx
<ClusterCard
  cluster={cluster}
  enableAddFavorite={true}
  onToggleFavorite={(cluster, isFavorite) => {
    isFavorite
      ? wishlistService.add(cluster.clusterId)
      : wishlistService.remove(cluster.clusterId);
  }}
/>
```

### All display options

```tsx
<ClusterCard
  cluster={cluster}
  showName={true}
  showImage={true}
  showSku={true}
  showManufacturer={true}
  showShortDescription={true}
  showStock={true}
/>
```

### Fully localised (Dutch)

```tsx
<ClusterCard
  cluster={cluster}
  labels={{
    addToFavorites: 'Toevoegen aan favorieten',
    removeFromFavorites: 'Verwijderen uit favorieten',
    viewCluster: 'Bekijk cluster',
    inStock: 'Op voorraad',
    lowStock: 'Weinig voorraad',
    outOfStock: 'Niet op voorraad',
  }}
/>
```

---

## Props

### Core

| Prop | Type | Required | Description |
|---|---|---|---|
| `cluster` | `Cluster` | ✓ | The Propeller cluster object to display |

### Display toggles

| Prop | Default | Description |
|---|---|---|
| `showName` | `true` | Renders the cluster name as a link |
| `showImage` | `true` | Renders the default product image (aspect-square container) |
| `showShortDescription` | `false` | Renders the first localised short description (cluster, then defaultProduct fallback) |
| `showSku` | `true` | Renders the SKU — uses `cluster.sku`, falls back to `defaultProduct.sku` |
| `showManufacturer` | `false` | Renders `defaultProduct.manufacturer` |
| `showStock` | `true` | Renders a stock badge + quantity from `defaultProduct.inventory.totalQuantity` |

### Attribute labels

| Prop | Type | Description |
|---|---|---|
| `imageLabels` | `string[]` | Attribute names whose values are shown as violet badge overlays on the image |
| `textLabels` | `string[]` | Attribute names whose values are shown as extra text rows below the cluster name |

Attribute lookup is performed against `defaultProduct.attributes.items[n].attributeDescription.name`.
The resolved `value.value` string is rendered. Entries with no match (empty string) are dropped.

### Behaviour

| Prop | Type | Default | Description |
|---|---|---|---|
| `enableAddFavorite` | `boolean` | `false` | Renders a heart-icon toggle button in the top-right corner of the image |
| `onToggleFavorite` | `(cluster, isFavorite) => void` | — | Called on every favourite state change. `isFavorite = true` means just added |
| `onClusterClick` | `(cluster) => void` | — | Called when the name, image, or button is clicked. When provided, default `<a>` navigation is suppressed |
| `className` | `string` | — | Extra CSS class applied to the root `<div>` |

### Labels

| Key | Default value | Used for |
|---|---|---|
| `addToFavorites` | `'Add to favourites'` | `aria-label` on the heart button when not yet favourited |
| `removeFromFavorites` | `'Remove from favourites'` | `aria-label` on the heart button when already favourited |
| `viewCluster` | `'View cluster'` | Text of the navigation button at the bottom |
| `inStock` | `'In stock'` | Stock badge when `totalQuantity > 5` |
| `lowStock` | `'Low stock'` | Stock badge when `1 ≤ totalQuantity ≤ 5` |
| `outOfStock` | `'Out of stock'` | Stock badge when `totalQuantity === 0` |

---

## Internal behaviour

### Data access

All fields are accessed with optional chaining to tolerate partial GraphQL responses:

| Data | Source |
|---|---|
| Name | `cluster.names[0].value` → fallback `defaultProduct.names[0].value` |
| SKU | `cluster.sku` → fallback `defaultProduct.sku` |
| Image URL | `defaultProduct.media.images.items[0].imageVariants[0].url` |
| Price | `defaultProduct.price.gross` — formatted as `€X.XX` |
| URL | `/cluster/{clusterId}/{slugs[0].value}` (cluster slug first, defaultProduct slug as fallback) |
| Short description | `cluster.shortDescriptions[0].value` → fallback `defaultProduct.shortDescriptions[0].value` |
| Manufacturer | `defaultProduct.manufacturer` |
| Stock quantity | `defaultProduct.inventory.totalQuantity` |
| Attributes | `defaultProduct.attributes.items[n].attributeDescription.name` → `value.value` |

### Image fallback

When `defaultProduct.media` is absent or the URL is empty, a grey placeholder SVG (image icon) is rendered.

### Stock badge

The badge reads `defaultProduct.inventory.totalQuantity`:

| Condition | Badge colour | Label key |
|---|---|---|
| `totalQuantity > 5` | Green | `inStock` |
| `1 ≤ totalQuantity ≤ 5` | Amber | `lowStock` |
| `totalQuantity === 0` | Red | `outOfStock` |
| inventory not present (`totalQuantity` is `undefined`) | Hidden | — |

When `totalQuantity > 0`, the quantity number is shown in parentheses next to the badge.
The badge is hidden entirely when `showStock={false}` or when `inventory` data is not present in the response.

### Favourite toggle

The component keeps an internal `isFavorite` boolean (starts as `false`). Clicking the heart button flips it and fires `onToggleFavorite(cluster, newState)`. There is no initial-state prop — manage pre-seeded favourite state externally via the `onToggleFavorite` callback.

### Navigation

The cluster name, image, and "View cluster" button all render as `<a href="/cluster/{id}/{slug}">` links. If `onClusterClick` is provided, `e.preventDefault()` is called and the callback handles routing instead, enabling Next.js/SPA navigation without a full page reload.
