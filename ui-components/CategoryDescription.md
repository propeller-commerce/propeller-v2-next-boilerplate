import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# CategoryDescription

Renders a category's full description with optional "Read more" / "Read less" truncation. Resolves the correct language entry from the Propeller `Category` object and renders it as HTML.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic

```tsx
import CategoryDescription from "@/components/propeller/CategoryDescription";

<CategoryDescription category={category} language="NL" />
```

### With truncation (default behavior)

```tsx
<CategoryDescription
  category={category}
  language="NL"
  collapsed={true}
  maxLength={200}
/>
```

The description is truncated at word boundaries after 200 characters and a **Read more** button appears. Clicking it expands to the full HTML content; clicking **Read less** collapses it again.

### Without truncation

```tsx
<CategoryDescription category={category} language="NL" collapsed={false} />
```

### Custom max length

```tsx
<CategoryDescription category={category} language="NL" maxLength={400} />
```

### Custom styling

```tsx
<CategoryDescription
  category={category}
  language="NL"
  className="border-b pb-4"
/>
```

### Combined with GridTitle and CategoryShortDescription on a category page

```tsx
<GridTitle title={categoryName} language="NL" />
<CategoryShortDescription category={category} language="NL" />
<CategoryDescription category={category} language="NL" maxLength={300} />
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To create a custom category description component:

1. Fetch the `Category` object with the `description` field included (see the GraphQL query below)
2. Resolve the correct language entry from `category.description` by matching the `language` field
3. Render the `value` as HTML (it may contain rich formatting from the Propeller backend)
4. If you need truncation, strip HTML tags first to measure true text length, then truncate at a word boundary to avoid cutting words in half
5. Use `dangerouslySetInnerHTML` (React) or `v-html` (Vue) to render the HTML content

```tsx
function SimpleDescription({ category, language }: { category: Category; language: string }) {
  const match = category.description?.find((d) => d.language === language);
  if (!match?.value) return null;

  return (
    <div
      className="prose max-w-none"
      dangerouslySetInnerHTML={{ __html: match.value }}
    />
  );
}
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Data

| Prop       | Type       | Required | Default | Description                                                                                         |
| ---------- | ---------- | -------- | ------- | --------------------------------------------------------------------------------------------------- |
| `category` | `Category` | No       | —       | Propeller `Category` object. The component reads the `description` array of `LocalizedString` items |
| `language` | `string`   | Yes      | —       | Language code (e.g. `"NL"`, `"EN"`) used to match the correct `LocalizedString` entry               |

### Truncation

| Prop        | Type      | Required | Default | Description                                                                                      |
| ----------- | --------- | -------- | ------- | ------------------------------------------------------------------------------------------------ |
| `collapsed` | `boolean` | No       | `true`  | When `true`, the description is truncated to `maxLength` characters with a toggle button         |
| `maxLength` | `number`  | No       | `200`   | Maximum number of plain-text characters before truncation kicks in. Only used when `collapsed` is `true` |

### Styling

| Prop        | Type     | Required | Default | Description                             |
| ----------- | -------- | -------- | ------- | --------------------------------------- |
| `className` | `string` | No       | —       | Extra CSS class applied to the root div |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function categoryDescription(category: Category, language: string): void
```

### Options

| Field | Type | Default | Maps to |
|---|---|---|---|
| `category` | `Category` | `undefined` | `category` prop |
| `language` | `string` | — | `language` prop |
| `collapsed` | `boolean` | `true` | `collapsed` prop |
| `maxLength` | `number` | `200` | `maxLength` prop |

### Category fields read

| Field         | SDK Type                   | Description                                                  |
| ------------- | -------------------------- | ------------------------------------------------------------ |
| `description` | `LocalizedString[]`        | Array of `{ language: string; value: string }` entries. Find the entry matching the `language` parameter and render its `value` as HTML |

### UI-only props

The following props only affect visual presentation and have no BYO equivalent: `className`.

  </TabItem>
</Tabs>

---

## Behavior

### Language resolution

1. Reads `category.description` -- an array of `LocalizedString` objects (`{ language, value }`)
2. Finds the entry where `language` matches the `language` prop
3. Returns the `value` (HTML string), or an empty string if no match is found

### Truncation (collapsed: true, the default)

- Strips all HTML tags from the description to measure plain-text length
- If the plain-text length exceeds `maxLength`, truncates at the last word boundary before the limit and appends an ellipsis character
- The truncated view renders as plain text (no HTML); the expanded view renders the full HTML via `dangerouslySetInnerHTML`

### Empty state

When the description is empty (no `category` prop, no matching language entry, or an empty value), the component renders **nothing** -- no wrapper element is added to the DOM.

### Styling details

- Root element: `mb-6` bottom margin
- Full description: `prose prose-slate max-w-none text-muted-foreground`
- Toggle button: `text-sm font-medium text-primary hover:underline`

## SDK Services

This component does not call any SDK service directly. It expects a `Category` object to be passed via props (typically fetched by `CategoryService.getCategory()` or a direct GraphQL query).

### Category fields read

| Field         | SDK Type                   | Description                                                  |
| ------------- | -------------------------- | ------------------------------------------------------------ |
| `description` | `LocalizedString[]`        | Array of `{ language: string; value: string }` entries. The component finds the entry matching the `language` prop and renders its `value` as HTML |

## GraphQL Queries and Mutations

When fetching a category, include the `description` field to supply this component with data:

```graphql
query GetCategory($categoryId: Int!, $language: String) {
  category(id: $categoryId) {
    categoryId
    name(language: $language) {
      language
      value
    }
    description(language: $language) {
      language
      value
    }
  }
}
```

The returned `description` array is passed directly as `category.description`.
