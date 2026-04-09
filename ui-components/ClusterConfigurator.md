import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ClusterConfigurator

A variant selector for product clusters. Renders attribute-based configuration controls (dropdowns, radio pills, color swatches, image thumbnails) and resolves the matching product as the user makes selections. Supports drilldown filtering where each selection narrows the options available in subsequent attributes.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic usage on a cluster detail page

```tsx
import ClusterConfigurator from '@/components/propeller/ClusterConfigurator';

function ClusterDetailPage({ cluster }) {
  const [selectedProduct, setSelectedProduct] = useState(null);

  return (
    <ClusterConfigurator
      clusterId={cluster.clusterId}
      products={cluster.products}
      config={cluster.config}
      onConfigurationChange={(product) => setSelectedProduct(product)}
    />
  );
}
```

### Pre-selecting a default product

When landing on a cluster page via a direct product link, pass the product as `defaultProduct` to pre-populate all selectors on mount:

```tsx
<ClusterConfigurator
  clusterId={cluster.clusterId}
  products={cluster.products}
  config={cluster.config}
  defaultProduct={activeProduct}
  onConfigurationChange={(product) => setSelectedProduct(product)}
/>
```

### With custom labels

```tsx
<ClusterConfigurator
  clusterId={cluster.clusterId}
  products={cluster.products}
  config={cluster.config}
  labels={{ selectOption: '-- Choose an option --' }}
  onConfigurationChange={(product) => setSelectedProduct(product)}
/>
```

### Integrating with AddToCart

Pair the configurator with `AddToCart` so the resolved product can be added to the cart:

```tsx
function ClusterPage({ cluster }) {
  const [product, setProduct] = useState(cluster.products[0]);

  return (
    <div>
      <ClusterConfigurator
        clusterId={cluster.clusterId}
        products={cluster.products}
        config={cluster.config}
        defaultProduct={product}
        onConfigurationChange={setProduct}
      />
      {product && (
        <AddToCart
          product={product}
          graphqlClient={graphqlClient}
          cartId={cart?.cartId}
        />
      )}
    </div>
  );
}
```

### With custom styling

```tsx
<ClusterConfigurator
  clusterId={cluster.clusterId}
  products={cluster.products}
  config={cluster.config}
  className="max-w-md mx-auto"
  onConfigurationChange={(product) => setSelectedProduct(product)}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom cluster configurator, you need three things from the Propeller API:

1. **Cluster products** with their attributes
2. **Cluster config settings** defining which attributes to use and their display order
3. **A matching algorithm** to resolve selections to a product

### Data flow and core logic

The configurator needs three inputs: `products` (all cluster products with attributes), `config` (the `ClusterConfig` with settings), and a `selections` map (attribute name to selected value).

```ts
// Sort settings by priority (ascending)
const settings = [...config.settings].sort(
  (a, b) => parseInt(a.priority) - parseInt(b.priority)
);
```

### Get available attribute values (with drilldown filtering)

```ts
function getValues(
  attrName: string,
  products: Product[],
  priorSelections: Record<string, string> | null
): string[] {
  // Filter products by all prior attribute selections
  const filtered = priorSelections
    ? products.filter((p) => matchesSelections(p, priorSelections))
    : products;

  const values = new Set<string>();
  for (const product of filtered) {
    for (const attr of product.attributes?.items || []) {
      if (attr.attributeDescription?.name === attrName) {
        // Extract value based on type -- see Attribute Value Extraction above
        values.add(extractValue(attr));
      }
    }
  }
  return [...values];
}
```

### Check if a product matches all selections

```ts
function matchesSelections(product: Product, sels: Record<string, string>): boolean {
  return Object.entries(sels).every(([name, value]) =>
    product.attributes?.items?.some(
      (attr) =>
        attr.attributeDescription?.name === name &&
        extractValue(attr) === value
    )
  );
}
```

### Handle a selection change

```ts
function handleSelect(
  selections: Record<string, string>,
  settings: ClusterConfigSetting[],
  products: Product[],
  name: string,
  value: string,
  index: number
): { newSelections: Record<string, string>; matchedProduct: Product | undefined } {
  const next = { ...selections, [name]: value };
  // Clear subsequent selections
  for (let i = index + 1; i < settings.length; i++) {
    delete next[settings[i].name];
  }

  // Check if all attributes are selected and resolve the matching product
  let matchedProduct: Product | undefined;
  if (settings.every((s) => next[s.name])) {
    matchedProduct = products.find((p) => matchesSelections(p, next));
  }
  return { newSelections: next, matchedProduct };
}
```

For each setting, build `priorSelections` from all settings before the current index and call `getValues()` to determine the available options. Disable a selector when any preceding attribute has not been selected. Render selectors according to `setting.displayType` (DROPDOWN, RADIO, COLOR, IMAGE, or default pills).

### Pre-selecting a default product

```ts
// Read attribute values from the default product and populate selections
function initFromDefaultProduct(
  defaultProduct: Product,
  settings: ClusterConfigSetting[],
  products: Product[]
): { selections: Record<string, string>; matchedProduct: Product | undefined } {
  const selections: Record<string, string> = {};
  for (const setting of settings) {
    const attr = defaultProduct.attributes?.items?.find(
      a => a.attributeDescription?.name === setting.name
    );
    if (attr) {
      selections[setting.name] = extractValue(attr);
    }
  }
  let matchedProduct: Product | undefined;
  if (settings.every(s => selections[s.name])) {
    matchedProduct = products.find(p => matchesSelections(p, selections));
  }
  return { selections, matchedProduct };
}
```

### Key considerations for custom implementations

- **Priority ordering matters** — Settings must be sorted by priority to ensure drilldown filtering works correctly. Higher-priority attributes (lower number) filter lower-priority ones.
- **Attribute format complexity** — The Propeller SDK uses multiple value formats across versions. Always handle at least `COLOR`, `TEXT`, `DECIMAL`, `INT`, and `ENUM` types plus fallback extraction.
- **Localised attribute names** — Config setting names may use internal names or localised labels. Check both `attributeDescription.name` and `attributeDescription.descriptions[].value` when matching.
- **Auto-selection UX** — Pre-selecting subsequent attributes after each change provides a smoother experience since most users only need to change one attribute at a time.
- **Immediate resolution** — Fire `onConfigurationChange` as soon as all attributes have values, not just when the user explicitly confirms. Combined with auto-selection, this means the parent component always has a resolved product.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required

| Prop | Type | Description |
|------|------|-------------|
| `clusterId` | `number` | The cluster ID this configurator belongs to. Used to namespace radio button groups. |
| `products` | `Product[]` | All products belonging to the cluster. The component scans their attributes to derive available values and to match the configured product. |
| `config` | `ClusterConfig` | The cluster configuration object (`cluster.config`). Provides the ordered list of attribute settings that define which selectors to render. |

### Callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onConfigurationChange` | `(product: Product) => void` | Fires when the user's selections uniquely identify a cluster product. Also fires on mount if `defaultProduct` is provided and all settings can be resolved. |

### Optional

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultProduct` | `Product` | — | A product to pre-populate all attribute selections on mount. The component reads its attributes to set initial values. |
| `labels` | `Record<string, string>` | `{}` | Override UI strings. Currently supported keys: `selectOption` (dropdown placeholder, defaults to `"-- Select --"`). |
| `className` | `string` | `''` | Extra CSS class applied to the root `<div>`. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
import { Product, ClusterConfig, ClusterConfigSetting } from 'propeller-sdk-v2';

function buildConfigurator(
  clusterId: number,
  products: Product[],
  config: ClusterConfig,
  defaultProduct?: Product
): {
  selections: Record<string, string>;
  matchedProduct: Product | undefined;
}
```

### Options table

| Field | Type | Default | Maps to |
|------|------|---------|---------|
| `clusterId` | `number` | -- | Namespace for radio button groups |
| `products` | `Product[]` | -- | All cluster products scanned for attribute values and product matching |
| `config` | `ClusterConfig` | -- | `config.settings` defines which attributes to render as selectors, sorted by `priority` |
| `defaultProduct` | `Product` | `undefined` | Pre-populates selections by reading its attributes on init |

### Callbacks table

| Callback | When it fires | What to implement |
|------|------|---------|
| `onConfigurationChange` | User's selections uniquely identify a cluster product (also on mount if `defaultProduct` resolves) | Update parent state with the resolved `Product` (e.g., update price display, enable add-to-cart) |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `labels` -- UI string overrides (e.g., `selectOption` for dropdown placeholder)
- `className` -- CSS class for styling

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default | Description |
|------|------|-------------|
| `selectOption` | `"-- Select --"` | Dropdown placeholder text |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  selectOption: '-- Select --',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Display Types

Each `ClusterConfigSetting` has a `displayType` that determines how the selector is rendered:

| Display Type | Rendering | Interaction |
|-------------|-----------|-------------|
| `DROPDOWN` | Standard `<select>` element with a placeholder option | Select from dropdown list |
| `RADIO` | Horizontal row of pill-shaped buttons | Click to select; selected pill gets accent border and background |
| `COLOR` | Circular color swatches using the attribute value as `backgroundColor` | Click to select; selected swatch gets ring highlight and slight scale-up |
| `IMAGE` | 64x64px thumbnail grid using the attribute value as image `src` | Click to select; selected thumbnail gets border highlight and a checkmark overlay |
| Any other value | Rectangular pill buttons (same as RADIO but without hidden radio inputs) | Click to select |

### Drilldown Filtering

Settings are sorted by `priority` (ascending) and rendered in that order. The component implements cascading drilldown logic:

1. **First attribute** — All unique values across all cluster products are shown.
2. **Subsequent attributes** — Only values that exist on products matching all prior selections are shown. This narrows options progressively.
3. **Disabled state** — An attribute selector is disabled when either no values are available or any preceding attribute has not been selected yet.

### Selection Cascading

When the user changes a selection:

1. The selected value is stored for that attribute.
2. All subsequent attribute selections are cleared.
3. The component automatically pre-selects the first available value for each subsequent attribute (cascading forward).
4. If all settings end up with a value (which is typical after any selection due to auto-fill), the matching product is resolved and `onConfigurationChange` fires.

This means that in most cases, a single user interaction resolves to a complete configuration immediately.

### Default Product Initialization

When `defaultProduct` is provided:

1. On mount, the component reads each setting's attribute value from the default product.
2. All matching selections are populated.
3. If all settings can be resolved, `onConfigurationChange` fires immediately with the matched product.

### Product Matching

The `findMatchingProduct` algorithm iterates over all cluster products and returns the first one whose attributes match every key/value pair in the current selections. Matching is done by comparing attribute values extracted from `AttributeResult` objects.

### Attribute Value Extraction

The component handles multiple Propeller SDK attribute value formats:

- **Current SDK format** — `AttributeType.COLOR`, `TEXT`, `DECIMAL`, `INT`, `ENUM` (accessed via `value.type` and `value.value`)
- **Legacy SDK format** — `colorValue`, `textValues`, `textValue`, `numericValue`, `booleanValue` (accessed directly on the value object)
- **Fallback** — Plain string values or generic object with a `values` array

### Attribute Name Resolution

Attribute names are matched flexibly. The component checks:

1. The first localised description value (`attributeDescription.descriptions[0].value`)
2. The internal SDK name (`attributeDescription.name`)
3. All localised descriptions for any match

This ensures the component works regardless of whether the `ClusterConfigSetting.name` uses the internal name or a localised label.

---

## GraphQL Query Examples

### Fetching a cluster with configuration and product attributes

```graphql
query GetCluster($clusterId: Int!, $language: String) {
  cluster(id: $clusterId, language: $language) {
    clusterId
    name {
      value
      language
    }
    config {
      settings {
        id
        name
        priority
        displayType
      }
    }
    products {
      items {
        productId
        sku
        name {
          value
          language
        }
        attributes {
          items {
            attributeDescription {
              name
              descriptions {
                value
                language
              }
            }
            value {
              type
              value
            }
          }
        }
        price {
          net
          gross
        }
        media {
          images {
            url
          }
        }
      }
    }
  }
}
```

### Fetching only the configuration settings (lightweight)

```graphql
query GetClusterConfig($clusterId: Int!) {
  cluster(id: $clusterId) {
    config {
      settings {
        id
        name
        priority
        displayType
      }
    }
  }
}
```

---

## SDK Services

This component does **not** call any SDK services directly. It is a pure presentation and logic component that receives all data through props.

The parent page is responsible for fetching the cluster and its products. Typically this involves:

- **`ClusterService.getCluster()`** — Fetches the cluster object including `config` (the `ClusterConfig` with settings) and `products` (all variant products with their attributes).

### Required data shape

The component expects products to carry their attributes in `product.attributes.items` as an array of `AttributeResult` objects. Each `AttributeResult` must include:

- `attributeDescription.name` — the internal attribute name (must match `ClusterConfigSetting.name`)
- `attributeDescription.descriptions[].value` — localised display names
- `value` — the attribute value in one of the supported SDK formats (see Attribute Value Extraction below)

The `ClusterConfig` must include:

- `settings[]` — array of `ClusterConfigSetting` objects, each with `id`, `name`, `priority`, and `displayType`
