import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ProductShortDescription

Renders a product's short description as HTML content, resolving the correct entry from the product's localized descriptions array.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic usage with a product

```tsx
import ProductShortDescription from '@/components/propeller/ProductShortDescription';

<ProductShortDescription product={product} />
```

### With a specific language

```tsx
<ProductShortDescription product={product} language="EN" />
```

### With a cluster

```tsx
<ProductShortDescription product={cluster} language="DE" />
```

### With custom styling

```tsx
<ProductShortDescription
  product={product}
  language="NL"
  className="mt-4 text-sm"
/>
```

### Conditional rendering on a product detail page

```tsx
function ProductDetail({ product }: { product: Product }) {
  return (
    <div>
      <h1>{product.name[0]?.value}</h1>
      <ProductShortDescription product={product} language="EN" />
      {/* Full description, specs, etc. */}
    </div>
  );
}
```

### Inside a product card layout

```tsx
<div className="border rounded-lg p-4">
  <img src={product.media?.[0]?.url} alt={product.name[0]?.value} />
  <h3>{product.name[0]?.value}</h3>
  <ProductShortDescription
    product={product}
    language="NL"
    className="line-clamp-3"
  />
  <AddToCart product={product} />
</div>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To create a custom short description display, you need to:

1. **Accept a product or cluster** and a language code as input.
2. **Resolve the localized value** from the `shortDescriptions` array by matching the language.
3. **Render HTML safely** since descriptions may contain markup.

```ts
import type { Product, Cluster } from 'propeller-sdk-v2';

function getShortDescription(product: Product | Cluster, language: string = 'NL'): string {
  const descriptions = (product as Product).shortDescriptions;
  if (!descriptions?.length) return '';
  const match = descriptions.find((d) => d.language === language);
  return match?.value || descriptions[0]?.value || '';
}

// pseudo-code
const html = getShortDescription(product, 'EN');
// If `html` is empty, hide the element entirely.
// Otherwise, render `html` as raw HTML in your template.
```

Key considerations:

- **Sanitization**: If you do not trust the HTML content source, consider using a library like `dompurify` before rendering.
- **Fallback language**: Always fall back to the first available description when the requested language is not found, so the user sees content rather than nothing.
- **Empty state**: Hide the element entirely when no description exists to avoid rendering empty containers that may affect layout spacing.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Data

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `product` | `Product \| Cluster` | Yes | — | The product or cluster object. The component reads the `shortDescriptions` field. |

### Localization

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `language` | `string` | No | `'NL'` | Language code used to resolve the correct localized short description (e.g., `'EN'`, `'DE'`, `'FR'`). |

### Appearance

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `className` | `string` | No | `''` | Additional CSS class(es) applied to the root `<div>`. Appended after the default Tailwind classes. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function getShortDescription(product: Product | Cluster, language?: string): string
```

### Options

| Field | Type | Default | Maps to |
|-------|------|---------|---------|
| `product` | `Product \| Cluster` | **required** | `product` prop |
| `language` | `string` | `'NL'` | `language` prop |

### UI-only props (React component only)

The following props control visual presentation and have no equivalent in a custom implementation:

- `className` — Additional CSS class(es) on the root element

  </TabItem>
</Tabs>

---

## Behavior

- **Conditional rendering**: The component renders nothing when there is no short description content. No empty wrapper element is added to the DOM.
- **HTML content**: The short description value is rendered as raw HTML using `dangerouslySetInnerHTML`. Content from the Propeller API may include HTML tags such as `<p>`, `<strong>`, `<ul>`, etc.
- **Reactivity**: The component recomputes the displayed description whenever `product` or `language` changes.
- **Default styling**: The root element includes Tailwind prose classes (`prose prose-slate max-w-none text-muted-foreground`) for consistent typography of HTML content. These can be extended or overridden via the `className` prop.
- **Type compatibility**: Accepts both `Product` and `Cluster` objects since both share the `shortDescriptions` field structure.

## SDK Services

This component does not call any SDK services directly. It reads data from a `Product` or `Cluster` object that has already been fetched.

### Required product fields

| Field | Type | Description |
|-------|------|-------------|
| `shortDescriptions` | `LocalizedString[]` | Array of localized short description entries. Each entry has a `language` (string) and `value` (string, may contain HTML). |

The `LocalizedString` type from `propeller-sdk-v2`:

```ts
interface LocalizedString {
  language: string;
  value: string;
}
```

### Language resolution order

1. Find an entry in `shortDescriptions` where `language` matches the `language` prop.
2. If no match is found, fall back to the first entry in the array (`shortDescriptions[0].value`).
3. If `shortDescriptions` is empty or missing, nothing is rendered.

## GraphQL Queries and Mutations

When fetching products, include the `shortDescriptions` field:

```graphql
query GetProduct($productId: Int!, $language: String) {
  product(productId: $productId, language: $language) {
    productId
    name {
      language
      value
    }
    shortDescriptions {
      language
      value
    }
  }
}
```

For clusters:

```graphql
query GetCluster($clusterId: Int!, $language: String) {
  cluster(clusterId: $clusterId, language: $language) {
    clusterId
    name {
      language
      value
    }
    shortDescriptions {
      language
      value
    }
  }
}
```
