import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ProductSpecifications

Renders product attributes/specifications as a table or stacked list, with optional grouping by attribute group. The component can fetch attributes autonomously via the SDK or accept pre-fetched data.

---

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Self-contained: fetch by product ID

```tsx
import ProductSpecifications from '@/components/propeller/ProductSpecifications';
import { graphqlClient } from '@/lib/graphql';

<ProductSpecifications
  graphqlClient={graphqlClient}
  productId={12345}
  language="EN"
/>
```

### Pre-fetched attributes (no SDK client needed)

```tsx
import ProductSpecifications from '@/components/propeller/ProductSpecifications';

// attributes already available from a parent query
<ProductSpecifications
  attributes={product.attributeResults}
  language="EN"
/>
```

### List layout

```tsx
<ProductSpecifications
  graphqlClient={graphqlClient}
  productId={12345}
  layout="list"
/>
```

### Grouped by attribute group

```tsx
<ProductSpecifications
  graphqlClient={graphqlClient}
  productId={12345}
  grouping={true}
/>
```

### Grouped list layout with custom class

```tsx
<ProductSpecifications
  graphqlClient={graphqlClient}
  productId={12345}
  layout="list"
  grouping={true}
  className="mt-8"
/>
```

### Static attributes without grouping (e.g., quick-view modal)

```tsx
<ProductSpecifications
  attributes={selectedProduct.attributeResults}
  language="NL"
  layout="list"
  className="text-sm"
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom specifications component, you need:

1. **Fetch attributes** using `ProductService.getAttributeResultByProductId(productId, filter)` or include `attributeResults` in your product query.

2. **Filter to public attributes** by checking `attributeDescription.isPublic === true`.

3. **Resolve labels** by matching `attributeDescription.descriptions` against your target language, falling back to `attributeDescription.name`.

4. **Extract values by type** using `value.type` to determine which field holds the actual data:
   - `TEXT` -- find the matching language in `textValues`, join the `values` array
   - `ENUM` -- join `enumValues` array
   - `INT` -- read `intValue`
   - `DECIMAL` -- read `decimalValue`
   - `DATETIME` -- read `dateTimeValue`
   - `COLOR` -- read `colorValue`
   - Fallback -- read `value.value`, convert booleans to readable strings

5. **Group attributes** (optional) by reading `attributeDescription.group`. Collect unique groups in encounter order and partition attributes accordingly.

### Fetch attributes via the SDK

```ts
import { ProductService, AttributeResult } from 'propeller-sdk-v2';

// pseudo-code: call on initialization and when productId changes
async function fetchSpecs(graphqlClient: GraphQLClient, productId: number): Promise<AttributeResult[]> {
  const service = new ProductService(graphqlClient);
  const res = await service.getAttributeResultByProductId(productId, {
    attributeDescription: { isPublic: true },
    page: 1,
    offset: 500,
  });
  return res?.items || [];
}
```

### Map attributes to display data

```ts
function mapAttribute(attr: AttributeResult, language: string): { label: string; value: string } | null {
  // Resolve label
  const label = attr.attributeDescription?.descriptions?.find(
    (d) => d.language === language
  )?.value || attr.attributeDescription?.name || '';

  // Extract value by type
  let value: string;
  switch (attr.value?.type) {
    case 'TEXT':
      value = attr.value.textValues?.find((t) => t.language === language)?.values?.join(', ') || '';
      break;
    case 'ENUM':
      value = attr.value.enumValues?.join(', ') || '';
      break;
    case 'INT':
      value = String(attr.value.intValue ?? '');
      break;
    case 'DECIMAL':
      value = String(attr.value.decimalValue ?? '');
      break;
    case 'DATETIME':
      value = attr.value.dateTimeValue || '';
      break;
    case 'COLOR':
      value = attr.value.colorValue || '';
      break;
    default:
      value = typeof attr.value?.value === 'boolean'
        ? (attr.value.value ? 'Yes' : 'No')
        : String(attr.value?.value ?? '');
  }

  if (!value || value === '0') return null;
  return { label, value };
}
```

From there, render the mapped attributes however you like -- table rows, cards, accordion panels, definition lists, comparison tables, etc. For grouped display, partition attributes by `attributeDescription.group` in encounter order.

### Pre-fetched attributes

```ts
// When attributes are already available from a parent query,
// skip the fetch and pass them directly to your rendering logic:
const specs = product.attributeResults
  .filter((attr) => attr.attributeDescription?.isPublic)
  .map((attr) => mapAttribute(attr, 'EN'))
  .filter(Boolean);
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Data

| Prop | Type | Default | Description |
|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | `undefined` | Initialized Propeller SDK client. Required when `productId` is set. |
| `productId` | `number` | `undefined` | Product ID to fetch attributes for. When set, the component fetches its own data and ignores `attributes`. |
| `attributes` | `AttributeResult[]` | `undefined` | Pre-fetched attribute results. Used as fallback when `productId` is not provided. |

### Display

| Prop | Type | Default | Description |
|---|---|---|---|
| `layout` | `'table' \| 'list'` | `'table'` | `'table'` renders a two-column table (name / value). `'list'` renders vertically stacked label + value rows. |
| `grouping` | `boolean` | `false` | When `true`, groups attributes by their `attributeDescription.group` field and renders a heading per section. |

### Localization

| Prop | Type | Default | Description |
|---|---|---|---|
| `language` | `string` | `'NL'` | Language code used to resolve localized attribute labels and text-type values. |

### Styling

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` | `undefined` | Extra CSS class applied to the root wrapper element. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
import { ProductService, AttributeResult } from 'propeller-sdk-v2';

async function fetchSpecs(
  graphqlClient: GraphQLClient,
  productId: number
): Promise<AttributeResult[]>
```

Returns an array of `AttributeResult` objects from `ProductService.getAttributeResultByProductId()`.

### Options table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `graphqlClient` | `GraphQLClient` | *(required for fetch mode)* | `graphqlClient` prop |
| `productId` | `number` | -- | `productId` prop |
| `attributes` | `AttributeResult[]` | -- | `attributes` prop (pre-fetched fallback) |
| `language` | `string` | `'NL'` | `language` prop |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `layout` — table or list display mode
- `grouping` — whether to group attributes by `attributeDescription.group`
- `className` — extra CSS class on the root element

  </TabItem>
</Tabs>

---

## Behavior

- **Auto-hide when empty**: The component renders nothing when there are no public attributes or while loading. There is no empty-state message.
- **Filtering**: Only attributes where `attributeDescription.isPublic === true` are shown. Attributes with empty, null, or `'0'` values are excluded.
- **Data priority**: When `productId` is provided, the component fetches its own data and ignores the `attributes` prop entirely. When `productId` is absent, it falls back to `attributes`.
- **Re-fetch on product change**: Changing the `productId` prop triggers a new fetch automatically.
- **Localization resolution**: For labels, the component searches `attributeDescription.descriptions` for a matching `language` entry. If none is found, it falls back to `attributeDescription.name`. For `TEXT`-type values, it filters `textValues` by language.
- **Attribute type handling**: Each attribute type (`TEXT`, `ENUM`, `INT`, `DECIMAL`, `DATETIME`, `COLOR`) has dedicated extraction logic. Unknown types fall back to `value.value`, with booleans rendered as "Yes"/"No".
- **Group ordering**: Groups appear in the order they are first encountered in the attribute list (insertion order, not alphabetical).
- **Group headings**: In grouped mode, a heading is rendered for each group that has a non-empty group name. Attributes with no group are rendered without a heading.
- **Loading state**: A loading flag is set during fetch but no spinner is shown; the component simply renders nothing until data arrives.
- **Error handling**: Fetch errors are caught silently. The component remains hidden if no data is available.

---

## GraphQL Query

If you need to fetch product specifications/attributes outside the component (e.g., in a server component or parent query), use the following query structure:

```graphql
query ProductAttributes($productId: Int!) {
  product(id: $productId) {
    attributeResults(
      filter: { attributeDescription: { isPublic: true } }
      page: 1
      offset: 100
    ) {
      items {
        attributeDescription {
          name
          isPublic
          group
          descriptions {
            language
            value
          }
        }
        value {
          type
          ... on AttributeTextValue {
            textValues {
              language
              values
            }
          }
          ... on AttributeEnumValue {
            enumValues
          }
          ... on AttributeIntValue {
            intValue
          }
          ... on AttributeDecimalValue {
            decimalValue
          }
          ... on AttributeDateTimeValue {
            dateTimeValue
          }
          ... on AttributeColorValue {
            colorValue
          }
        }
      }
    }
  }
}
```

Pass the returned `items` array to the `attributes` prop:

```tsx
<ProductSpecifications attributes={data.product.attributeResults.items} />
```

---

## SDK Services

The component uses `ProductService.getAttributeResultByProductId()` to fetch attributes when `productId` is provided.

### Product fields read

The component works with the `AttributeResult` type from the SDK. Each attribute result contains:

| Field path | Usage |
|---|---|
| `attributeDescription.isPublic` | Filters to only public attributes |
| `attributeDescription.name` | Fallback label when no localized description matches |
| `attributeDescription.descriptions[]` | Array of `LocalizedString` objects; matched by `language` to resolve the display label |
| `attributeDescription.group` | Used to section attributes when `grouping={true}` |
| `value.type` | Determines how to extract the display value (`TEXT`, `ENUM`, `INT`, `DECIMAL`, `DATETIME`, `COLOR`) |
| `value.textValues[]` | For `TEXT` type: array with `language` and `values` fields |
| `value.enumValues[]` | For `ENUM` type: string array |
| `value.intValue` | For `INT` type: numeric value |
| `value.decimalValue` | For `DECIMAL` type: numeric value |
| `value.dateTimeValue` | For `DATETIME` type: string value |
| `value.colorValue` | For `COLOR` type: string value |
| `value.value` | Generic fallback; booleans render as "Yes"/"No" |

### Fetch parameters

When fetching autonomously, the component calls:

```ts
service.getAttributeResultByProductId(productId, {
  attributeDescription: { isPublic: true },
  page: 1,
  offset: 2000,
});
```

This requests up to 2000 public attributes in a single call.
