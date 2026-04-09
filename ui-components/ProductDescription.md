import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ProductDescription

Renders a product's HTML description with optional truncation and expand/collapse functionality. Resolves the correct localized description from the product's `descriptions` array and renders it as raw HTML using `dangerouslySetInnerHTML`.

---

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic usage

```tsx
import ProductDescription from '@/components/propeller/ProductDescription';

<ProductDescription product={product} />
```

### With a specific language

```tsx
<ProductDescription
  product={product}
  language="EN"
/>
```

### Collapsed with truncation

Show the first 300 characters with a "Read more" toggle to expand.

```tsx
<ProductDescription
  product={product}
  language="NL"
  collapsed={true}
  maxLength={300}
/>
```

### Collapsed with a short preview

```tsx
<ProductDescription
  product={product}
  collapsed={true}
  maxLength={150}
  className="my-8"
/>
```

### Cluster product

The component accepts both `Product` and `Cluster` objects. Both share the same `descriptions` field structure.

```tsx
<ProductDescription
  product={cluster}
  language="EN"
  collapsed={true}
  maxLength={500}
/>
```

### Custom styling

```tsx
<ProductDescription
  product={product}
  className="border-t pt-6 mt-6"
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

If you need custom rendering logic (e.g., sanitizing the HTML, rendering Markdown instead, or integrating a "show more" animation), you can extract the description from the product object directly:

### Basic usage

```ts
import type { Product, LocalizedString } from 'propeller-sdk-v2';

function getProductDescription(
  product: Product,
  language: string = 'NL'
): string {
  if (!product?.descriptions?.length) return '';

  const match = product.descriptions.find(
    (d: LocalizedString) => d.language === language
  );

  return match?.value || product.descriptions[0]?.value || '';
}

// pseudo-code
const html = getProductDescription(product, 'EN');
```

### With a specific language

```ts
const html = getProductDescription(product, 'EN');
// Render `html` as raw HTML in your template
```

### With HTML sanitization

You can sanitize the HTML before rendering using a library like DOMPurify:

```ts
import DOMPurify from 'dompurify';

const raw = getProductDescription(product, 'NL');
const clean = DOMPurify.sanitize(raw);
// Render `clean` as raw HTML in your template
```

### With truncation and expand/collapse

For truncation with expand/collapse, use a helper function and a boolean toggle:

```ts
// pseudo-code

function truncateHtml(html: string, maxChars: number): string {
  const plain = html.replace(/<[^>]*>/g, '');
  if (plain.length <= maxChars) return html;

  const cut = plain.substring(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.substring(0, lastSpace) : cut) + '\u2026';
}

const html = getProductDescription(product);
const plain = html.replace(/<[^>]*>/g, '');
const needsTruncation = plain.length > maxLength;

// Track an `expanded` boolean in your framework's state mechanism.
// When collapsed and truncation is needed, render `truncateHtml(html, maxLength)` as plain text.
// When expanded or no truncation is needed, render the full `html` as raw HTML.
// Show a "Read more" / "Read less" toggle button when `needsTruncation` is true.
```

### Cluster product

The same `getProductDescription` function works for both `Product` and `Cluster` objects, as both share the same `descriptions` field structure.

```ts
const clusterHtml = getProductDescription(cluster, 'EN');
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required

| Prop | Type | Description |
|---|---|---|
| `product` | `Product \| Cluster` | Product or Cluster object. The component reads the `descriptions` array to find the matching localized entry |

### Localization

| Prop | Type | Default | Description |
|---|---|---|---|
| `language` | `string` | `'NL'` | Language code used to resolve the correct entry from `product.descriptions`. Falls back to the first available description if no match is found |

### Truncation

| Prop | Type | Default | Description |
|---|---|---|---|
| `collapsed` | `boolean` | `false` | When `true`, the description is initially collapsed to `maxLength` characters with a "Read more" toggle |
| `maxLength` | `number` | `0` | Maximum number of plain-text characters shown when collapsed. `0` disables truncation entirely, even when `collapsed` is `true` |

### Appearance

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` | `string` | -- | Extra CSS class applied to the root `<div>` element |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function getProductDescription(
  product: Product,
  language?: string   // default: 'NL'
): string
```

Returns the resolved HTML description string from the product's `descriptions` array.

### Options table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `product` | `Product \| Cluster` | *(required)* | `product` prop |
| `language` | `string` | `'NL'` | `language` prop |
| `maxLength` | `number` | `0` | `maxLength` prop — used for truncation logic |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `className` — extra CSS class on the root element
- `collapsed` — controls whether the description starts in truncated state

  </TabItem>
</Tabs>

---

## Behavior

### HTML rendering

The description value is rendered as raw HTML via `dangerouslySetInnerHTML`. The rendered content is wrapped in a `div` with Tailwind typography classes (`prose prose-slate max-w-none text-muted-foreground`), so standard HTML elements like headings, paragraphs, lists, and links are styled automatically.

### Truncation

Truncation only activates when **all three** conditions are met:

1. `collapsed` is `true`
2. `maxLength` is greater than `0`
3. The plain-text length of the description exceeds `maxLength`

When truncating, the component:

- Strips all HTML tags to produce a plain-text version.
- Cuts the text at `maxLength` characters.
- Snaps backward to the last word boundary to avoid cutting mid-word.
- Appends an ellipsis character.

The truncated version is rendered as plain text (not HTML), so any formatting, links, or images from the original description are removed in the collapsed state.

### Expand / Collapse

When truncation is active, a toggle button appears below the description text:

- **"Read more"** -- Expands the description to show the full HTML content.
- **"Read less"** -- Collapses back to the truncated plain-text preview.

The toggle button is styled as a text link (`text-primary hover:underline`).

### Empty state

If the product has no `descriptions` array, or if no matching language entry is found and there is no fallback entry, the component renders nothing (the entire root element is hidden).

### Reactivity

The component re-evaluates the description whenever the `product` or `language` prop changes. Switching products or languages resets the resolved HTML and re-applies truncation rules.

---

## GraphQL Query

When fetching a product, include the `descriptions` field to supply this component with data:

```graphql
query Product(
  $productId: Int!
  $language: String
) {
  product(id: $productId) {
    productId
    sku
    names(language: $language) { value language }
    descriptions(language: $language) { value language }
  }
}
```

Variables:

```json
{
  "productId": 42,
  "language": "NL"
}
```

For a cluster:

```graphql
query Cluster(
  $clusterId: Int!
  $language: String
) {
  cluster(id: $clusterId) {
    clusterId
    names(language: $language) { value language }
    descriptions(language: $language) { value language }
  }
}
```

Note: Even when requesting a specific `language` in the query, the API may return multiple localized entries. The component performs its own language matching on the returned array.

---

## SDK Services

This component does not call any SDK services directly. It reads data from a `Product` or `Cluster` object that has already been fetched.

### Product fields used

| Field | Type | Purpose |
|---|---|---|
| `product.descriptions` | `LocalizedString[]` | Array of localized description entries. Each entry has `language` (string) and `value` (string, may contain HTML) |

The component resolves the description in this order:

1. Finds the first entry in `descriptions` where `language` matches the `language` prop.
2. If no match, falls back to `descriptions[0].value`.
3. If `descriptions` is empty or missing, renders nothing.
