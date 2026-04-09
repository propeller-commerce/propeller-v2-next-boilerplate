import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ProductDownloads

Renders a list of downloadable documents associated with a product. Each item is displayed as a styled link that opens in a new tab with a native download prompt. When no documents are available, an empty-state message is shown instead.

---

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic usage on a product detail page

```tsx
import ProductDownloads from '@/components/propeller/ProductDownloads';

<ProductDownloads
  downloads={product.media.documents}
  language="EN"
/>
```

### With custom labels

```tsx
<ProductDownloads
  downloads={product.media.documents}
  language="NL"
  labels={{
    title: 'Bestanden',
    empty: 'Geen bestanden beschikbaar',
  }}
/>
```

### With a custom CSS class

```tsx
<ProductDownloads
  downloads={product.media.documents}
  language="EN"
  className="mt-6 border-t pt-4"
/>
```

### Conditionally rendering only when documents exist

```tsx
{product.media?.documents?.items?.length > 0 && (
  <ProductDownloads
    downloads={product.media.documents}
    language="EN"
    labels={{ title: 'Product Documents' }}
  />
)}
```

### Inside a tabbed product detail layout

```tsx
<Tabs>
  <Tab label="Description">
    <ProductDescription product={product} />
  </Tab>
  <Tab label="Downloads">
    <ProductDownloads
      downloads={product.media.documents}
      language={currentLanguage}
      labels={{ title: 'Technical Documents', empty: 'No documents for this product.' }}
      className="p-4"
    />
  </Tab>
</Tabs>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

If you need a custom downloads component, here is what to keep in mind:

1. **Accept `PaginatedMediaDocumentResponse` as input.** This is the shape returned by the Propeller API for `product.media.documents`. Working with this type directly avoids unnecessary data transformation.

2. **Resolve localized fields by language.** Both the document URL (`LocalizedDocument.originalUrl`) and the display name (`LocalizedString.value`) are arrays keyed by language. Search for a match on the provided language code first, then fall back to the first array entry.

3. **Skip items without a URL.** Some `MediaDocument` entries may have metadata but no downloadable file. Filter these out or hide them to avoid broken links.

4. **Use `target="_blank"` and the `download` attribute.** Opening in a new tab prevents navigation away from the product page. The `download` attribute signals the browser to download instead of displaying the file inline.

5. **Handle the empty state.** When `downloads.items` is empty or undefined, show a meaningful message rather than rendering an empty container.

6. **MIME type is available if needed.** Each `LocalizedDocument` includes a `mimeType` field (e.g. `"application/pdf"`). You can use this to display file type icons or badges. The default component resolves it but does not render it.

### Resolving localized document fields

```ts
import type {
  PaginatedMediaDocumentResponse,
  MediaDocument,
  LocalizedDocument,
  LocalizedString,
} from 'propeller-sdk-v2';

function resolveDocumentUrl(doc: MediaDocument, language: string): string {
  const match = doc.documents?.find(
    (d: LocalizedDocument) => d.language === language
  );
  return match?.originalUrl || doc.documents?.[0]?.originalUrl || '';
}

function resolveDocumentName(doc: MediaDocument, language: string): string {
  const match = doc.alt?.find(
    (a: LocalizedString) => a.language === language
  );
  return match?.value || doc.alt?.[0]?.value || 'Download';
}

// Iterate over items
const items = downloads?.items || [];
for (const doc of items) {
  const url = resolveDocumentUrl(doc, 'EN');
  const name = resolveDocumentName(doc, 'EN');
  if (!url) continue; // skip items without a URL
  // Render a link: <a href={url} target="_blank" download>{name}</a>
}
```

### Conditional rendering

```ts
const hasDocuments = (downloads?.items?.length ?? 0) > 0;
// Only render the downloads section when hasDocuments is true
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Data

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `downloads` | `PaginatedMediaDocumentResponse` | Yes | The media documents object from the product. Pass `product.media.documents` directly. |
| `language` | `string` | Yes | Two-letter language code (e.g. `"EN"`, `"NL"`) used to resolve the correct localized document URL and display name. |

### Customization

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `labels` | `Record<string, string>` | No | See below | Override any UI string. Available keys: `title`, `empty`. |
| `className` | `string` | No | `""` | Extra CSS class applied to the root `<div>` element. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function renderProductDownloads(
  downloads: PaginatedMediaDocumentResponse,
  language: string
): void
```

All types are imported from `propeller-sdk-v2`.

### Options table

| Field | Type | Default | Maps to |
|---|---|---|---|
| `downloads` | `PaginatedMediaDocumentResponse` | *(required)* | `downloads` prop |
| `language` | `string` | *(required)* | `language` prop |

### UI-only props

The following props are purely presentational and are not part of the SDK layer. They are the developer's responsibility to implement:

- `labels` — override UI strings (`title`, `empty`)
- `className` — extra CSS class on the root element

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default |
|-----|---------|
| `title` | `"Downloads"` |
| `empty` | `"No downloads"` |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  title: 'Downloads',
  empty: 'No downloads',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

- **Language matching**: The component matches the `language` prop against `LocalizedDocument.language` and `LocalizedString.language`. If no match is found, the first entry in each array is used as a fallback. If the array is empty, safe defaults are applied (empty string for URL, `"Download"` for name).

- **Empty state**: When `downloads.items` is empty, undefined, or has zero length, the title heading is hidden and the empty-state message is displayed.

- **Hidden links**: Individual list items where the resolved URL is an empty string are not rendered. This prevents broken download links from appearing.

- **Styling**: The component uses Tailwind CSS utility classes. Each download link is rendered as a bordered row with a file icon on the left, a truncated document name in the middle, and a download arrow icon on the right. Hover states change the border and icon colors.

- **No pagination**: The component renders all items present in `downloads.items` at once. If you need pagination, handle it at the query level by adjusting the `page` and `offset` arguments on the `documents` field in your GraphQL query.

---

## GraphQL Query Example

To fetch the data this component needs, include `media.documents` in your product query:

```graphql
query ProductWithDownloads($productId: Int!, $language: String) {
  product(id: $productId, language: $language) {
    productId
    name {
      value
      language
    }
    media {
      documents(page: 1, offset: 100) {
        items {
          alt {
            language
            value
          }
          documents {
            language
            originalUrl
            mimeType
          }
        }
        itemsFound
        page
        pages
        offset
      }
    }
  }
}
```

Pass the result as:

```tsx
<ProductDownloads
  downloads={product.media.documents}
  language="EN"
/>
```

---

## SDK Services

This component does not call any SDK service directly. It is a pure presentational component that receives pre-fetched data via the `downloads` prop.

### Required product fields

The component reads from the `product.media.documents` portion of a product query response. The relevant SDK types are:

| Type | Fields used |
|------|-------------|
| `PaginatedMediaDocumentResponse` | `items` (array of `MediaDocument`) |
| `MediaDocument` | `documents` (array of `LocalizedDocument`), `alt` (array of `LocalizedString`) |
| `LocalizedDocument` | `language`, `originalUrl`, `mimeType` |
| `LocalizedString` | `language`, `value` |

All four types are imported from `propeller-sdk-v2`.

### Field resolution logic

- **Document URL**: Finds the first entry in `doc.documents` matching the provided `language`. Falls back to the first entry in the array. Returns an empty string if nothing is available (the link is hidden in that case).
- **Document name**: Finds the first entry in `doc.alt` matching the provided `language`. Falls back to the first entry, then to the string `"Download"`.
- **MIME type**: Resolved the same way as the URL (language match, then first entry). Currently resolved internally but not displayed in the UI.
