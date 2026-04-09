import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ClusterInfo

Displays the headline information for a product cluster (configurable product group): the cluster name and SKU. Supports two data modes -- pass a pre-fetched `Cluster` object or let the component fetch its own data via `clusterId` + `graphqlClient`.

---

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

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

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom cluster info component, you need:

### Fetch cluster config to discover configurable attributes

```ts
import { ClusterService, GraphQLClient } from 'propeller-sdk-v2';

const clusterService = new ClusterService(graphqlClient);
const config = await clusterService.getClusterConfig(clusterId);
const attributeNames = config.config?.settings?.map(s => s.name) || [];
```

### Fetch the full cluster with attribute filters

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

### Resolve localized names

Cluster names are stored as `LocalizedString[]`:

```ts
function getClusterName(cluster: Cluster, language: string): string {
  const match = cluster.names?.find(n => n.language === language);
  return match?.value || cluster.names?.[0]?.value || '';
}
```

### Access basic fields

```ts
const sku = cluster.sku;
const name = getClusterName(cluster, 'EN');
```

### Pre-fetched cluster mode

```ts
// When you already have a cluster object, skip fetching entirely:
const name = getClusterName(cluster, 'EN');
const sku = cluster.sku;
// Pass cluster to sibling components via the onClusterLoaded pattern,
// so the fetch only happens once and the gallery, configurator,
// and price panel all receive the same data.
```

### Self-fetching with image and attribute filters

```ts
const clusterService = new ClusterService(graphqlClient);

// Step 1: Get config for attribute names
const config = await clusterService.getClusterConfig(clusterId);
const attributeNames = config.config?.settings?.map(s => s.name) || [];

// Step 2: Fetch full cluster with filters
const cluster = await clusterService.getCluster({
  clusterId,
  language: 'EN',
  imageSearchFilters: { page: 1, offset: 20 },
  imageVariantFilters: { transformations: [{ name: 'medium', width: 400, height: 400 }] },
  priceCalculateProductInput: { taxZone: 'NL', companyId: 100, contactId: 200 },
  attributeResultSearchInput: {
    attributeDescription: { names: attributeNames },
  },
});

// Step 3: Render name and SKU, pass cluster to siblings
const name = getClusterName(cluster, 'EN');
const sku = cluster.sku;
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

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

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
import { ClusterService, Cluster, GraphQLClient } from 'propeller-sdk-v2';

const clusterService = new ClusterService(graphqlClient);

// Step 1: Get cluster config
async function getClusterConfig(clusterId: number): Promise<{ config: ClusterConfig }>

// Step 2: Get full cluster
async function getCluster(variables: {
  clusterId: number;
  language?: string;
  imageSearchFilters?: object;
  imageVariantFilters?: object;
  priceCalculateProductInput?: object;
  attributeResultSearchInput?: object;
}): Promise<Cluster>
```

### Options table

| Field | Type | Default | Maps to |
|------|------|---------|---------|
| `clusterId` | `number` | -- | `clusterId` parameter in `getClusterConfig` and `getCluster` |
| `language` | `string` | `'NL'` | `language` parameter in `getCluster` |
| `taxZone` | `string` | `'NL'` | `priceCalculateProductInput.taxZone` in `getCluster` |
| `user` | `Contact \| Customer \| null` | -- | Used to build `priceCalculateProductInput` (companyId/contactId or customerId) |
| `imageSearchFilters` | `object` | From `configuration.imageSearchFiltersGrid` | `imageSearchFilters` parameter in `getCluster` |
| `imageVariantFilters` | `object` | From `configuration.imageVariantFiltersMedium` | `imageVariantFilters` parameter in `getCluster` |
| `imageLabels` | `string[]` | `undefined` | Attribute codes for badge overlays on product images |
| `textLabels` | `string[]` | `undefined` | Attribute codes for extra text rows below product name |

### Callbacks table

| Callback | When it fires | What to implement |
|------|------|---------|
| `onClusterLoaded` | Cluster data is available (from prop or after fetch) | Pass the cluster to sibling components (gallery, configurator, price panel) |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `showTitle` -- show/hide cluster name heading
- `showSku` -- show/hide cluster SKU
- `className` -- CSS class for styling
- `configuration` -- app config for image filter fallbacks

  </TabItem>
</Tabs>

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
