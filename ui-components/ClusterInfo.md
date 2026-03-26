# ClusterInfo

Displays the headline information for a product cluster (configurable product group): the cluster name and SKU. Supports two data modes — pass a pre-fetched `Cluster` object or let the component fetch its own data via `clusterId` + `graphqlClient`.

---

## Usage

### Pre-fetched cluster (simplest)

```tsx
<ClusterInfo
  cluster={cluster}
  user={user}
  language="EN"
/>
```

### Self-fetching by cluster ID

```tsx
<ClusterInfo
  clusterId={4821}
  graphqlClient={graphqlClient}
  user={user}
  language="EN"
  configuration={config}
  onClusterLoaded={(cluster) => {
    setCluster(cluster);
  }}
/>
```

### Hiding SKU, custom class

```tsx
<ClusterInfo
  cluster={cluster}
  user={user}
  showSku={false}
  className="mb-8"
/>
```

### With image and attribute filters (self-fetching)

```tsx
import { imageSearchFiltersGrid, imageVariantFiltersMedium } from '@/data/defaults';

<ClusterInfo
  clusterId={4821}
  graphqlClient={graphqlClient}
  user={user}
  language="EN"
  imageSearchFilters={{ page: 1, offset: 20 }}
  imageVariantFilters={imageVariantFiltersMedium}
  configuration={config}
  imageLabels={['new', 'sale']}
  textLabels={['brand', 'color']}
  onClusterLoaded={(cluster) => {
    // Hydrate sibling components: configurator, price panel, gallery
    setCluster(cluster);
  }}
/>
```

### On a cluster detail page with sibling components

```tsx
function ClusterDetailPage({ clusterId }: { clusterId: number }) {
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const { authState } = useAuth();

  return (
    <div>
      <ClusterInfo
        clusterId={clusterId}
        graphqlClient={graphqlClient}
        user={authState.user}
        language="EN"
        configuration={config}
        onClusterLoaded={setCluster}
      />

      {cluster && <ClusterGallery cluster={cluster} />}
      {cluster && <ClusterConfigurator cluster={cluster} />}
    </div>
  );
}
```

---

## Props

### Data Source

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `user` | `Contact \| Customer \| null` | **required** | The authenticated user. Used to build price calculation input (company, contact, or customer ID). |
| `cluster` | `Cluster` | `undefined` | Pre-fetched cluster object. When provided, the component skips internal fetching entirely. |
| `clusterId` | `number` | `undefined` | Cluster ID to fetch when no `cluster` prop is provided. Requires `graphqlClient`. |
| `graphqlClient` | `GraphQLClient` | `undefined` | Initialized Propeller SDK GraphQL client. Required when using `clusterId`. |
| `onClusterLoaded` | `(cluster: Cluster) => void` | `undefined` | Callback fired once cluster data is available, whether from the prop or after a fetch. Use this to hydrate sibling components (gallery, configurator, price panel). |

### Display Toggles

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showTitle` | `boolean` | `true` | Show the cluster name as an `<h1>` heading. |
| `showSku` | `boolean` | `true` | Show the cluster SKU code. |

### Locale and Styling

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `language` | `string` | `'NL'` | Language code for resolving localized cluster names. |
| `className` | `string` | `''` | Extra CSS class applied to the root `<div>`. |
| `taxZone` | `string` | `'NL'` | Tax zone passed to the price calculation input when self-fetching. |

### Image and Attribute Filters

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `imageSearchFilters` | `object` | Falls back to `configuration.imageSearchFiltersGrid` | Controls how many image items are returned. Example: `{ page: 1, offset: 20 }`. |
| `imageVariantFilters` | `object` | Falls back to `configuration.imageVariantFiltersMedium` | Controls image size/format variants. Must include a `transformations` array (never an empty `{}`). |
| `configuration` | `object` | `undefined` | App config object providing `imageSearchFiltersGrid` and `imageVariantFiltersMedium` as fallbacks. |
| `imageLabels` | `string[]` | `undefined` | Attribute codes to display as badge overlays on product images. Resolved against `product.attributes.items[].attributeDescription.code`. Unmatched codes are silently skipped. |
| `textLabels` | `string[]` | `undefined` | Attribute codes to display as extra text rows below the product name. Resolved the same way as `imageLabels`. |

---

## SDK Services

The component uses two `ClusterService` methods when self-fetching:

### `ClusterService.getClusterConfig(clusterId)`

Called first to retrieve the cluster's configurable attribute settings. Reads:

| Field | Purpose |
|-------|---------|
| `config.settings[].name` | Attribute names from `ClusterConfigSetting`. Collected into an array and passed as `attributeResultSearchInput.attributeDescription.names` in the follow-up query so only relevant attributes are returned. |

### `ClusterService.getCluster(variables)`

Called second with a `ClusterQueryVariables` object built from props and the config settings. The component reads these fields from the returned `Cluster`:

| Field | Type | Purpose |
|-------|------|---------|
| `names` | `LocalizedString[]` | Array of localized name objects. The component matches against `language` to find the right translation. Falls back to the first entry if no match. |
| `sku` | `string` | The cluster's SKU code, displayed as a monospace label. |

### Price Calculation Input

When self-fetching, the component builds a `priceCalculateProductInput` from the `user` prop:

- **Contact (B2B)**: includes `companyId` and `contactId`
- **Customer (B2C)**: includes `customerId`
- Always includes `taxZone`

This ensures the fetched cluster data contains user-specific pricing.

---

## GraphQL Query Example

The underlying `ClusterService.getCluster()` call translates roughly to:

```graphql
query GetCluster(
  $clusterId: Int!
  $language: String
  $imageSearchFilters: ImageSearchInput
  $imageVariantFilters: ImageVariantFilterInput
  $priceCalculateProductInput: PriceCalculateProductInput
  $attributeResultSearchInput: AttributeResultSearchInput
) {
  cluster(
    clusterId: $clusterId
    language: $language
  ) {
    clusterId
    sku
    names {
      language
      value
    }
    products {
      items {
        productId
        sku
        names { language value }
        media(input: $imageSearchFilters) {
          images {
            items {
              url
              variants(input: $imageVariantFilters) {
                url
                width
                height
              }
            }
          }
        }
        price(input: $priceCalculateProductInput) {
          net
          gross
        }
        attributes(input: $attributeResultSearchInput) {
          items {
            attributeDescription { code name }
            textValue { language value }
          }
        }
      }
    }
    config {
      settings {
        name
        values { name value }
      }
    }
  }
}
```

Variables example:

```json
{
  "clusterId": 4821,
  "language": "EN",
  "imageSearchFilters": { "page": 1, "offset": 20 },
  "imageVariantFilters": { "transformations": [{ "name": "medium", "width": 400, "height": 400 }] },
  "priceCalculateProductInput": { "taxZone": "NL", "companyId": 100, "contactId": 200 },
  "attributeResultSearchInput": { "attributeDescription": { "names": ["color", "size"] } }
}
```

---

## Building Your Own

To build a custom cluster info component, you need:

1. **Fetch cluster config** to discover which attributes are configurable:
   ```ts
   const clusterService = new ClusterService(graphqlClient);
   const config = await clusterService.getClusterConfig(clusterId);
   const attributeNames = config.config?.settings?.map(s => s.name) || [];
   ```

2. **Fetch the full cluster** with those attribute names in the filter:
   ```ts
   const cluster = await clusterService.getCluster({
     clusterId,
     language: 'EN',
     imageSearchFilters: { page: 1, offset: 20 },
     imageVariantFilters: { transformations: [] },
     priceCalculateProductInput: { taxZone: 'NL' },
     attributeResultSearchInput: {
       attributeDescription: { names: attributeNames },
     },
   });
   ```

3. **Resolve localized names** — cluster names are stored as `LocalizedString[]`:
   ```ts
   function getClusterName(cluster: Cluster, language: string): string {
     const match = cluster.names?.find(n => n.language === language);
     return match?.value || cluster.names?.[0]?.value || '';
   }
   ```

4. **Access basic fields** directly:
   ```ts
   const sku = cluster.sku;
   const name = getClusterName(cluster, 'EN');
   ```

5. **Pass cluster to sibling components** via the `onClusterLoaded` pattern, so the fetch only happens once and the gallery, configurator, and price panel all receive the same data.

---

## Behavior

- **Two data modes**: When a `cluster` prop is provided, the component renders immediately and fires `onClusterLoaded` without making any network request. When only `clusterId` is provided, the component fetches data internally using `ClusterService`.

- **Two-step fetch**: Self-fetching mode first calls `getClusterConfig()` to discover configurable attribute names, then calls `getCluster()` with those names as an attribute filter. This ensures the response includes only the attributes needed for the configurator.

- **Loading skeleton**: While fetching, the component renders a pulsing placeholder (two gray bars mimicking SKU and title lines). The skeleton is hidden as soon as data arrives or when a `cluster` prop is present.

- **Language resolution**: The cluster name is resolved by matching `language` against the `names[]` array. If no match is found for the requested language, the first available name is used as a fallback. Defaults to `'NL'`.

- **Re-fetch triggers**: The component re-fetches only when `clusterId` changes. Language changes do **not** trigger a re-fetch — the existing cluster data is re-rendered using the new language for name resolution. When a `cluster` prop is provided, the component skips fetching entirely (early exit) and fires `onClusterLoaded` synchronously.

- **User-specific pricing**: The `priceCalculateProductInput` is built from the `user` prop, differentiating between B2B Contact users (company + contact IDs) and B2C Customer users (customer ID). This ensures the fetched cluster data includes the correct pricing tier.

- **Error handling**: If the fetch fails, the loading state is cleared silently. No error UI is rendered; the component simply stays empty. The `onClusterLoaded` callback is **not** called on error — only on successful data retrieval.

- **Configuration required for self-fetching**: When using self-fetching mode without explicit `imageSearchFilters` / `imageVariantFilters` props, the `configuration` prop is required (to provide `imageSearchFiltersGrid` and `imageVariantFiltersMedium` fallbacks). Omitting both will cause a runtime error. When a `cluster` prop is provided, image filters are not used.

- **Visible output**: The component renders only the cluster name (as an `<h1>`) and the SKU. Both can be independently toggled off. All other fetched data (products, images, prices, attributes) is surfaced only through the `onClusterLoaded` callback for use by sibling components.
