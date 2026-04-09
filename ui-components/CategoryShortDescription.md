import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# CategoryShortDescription

Renders a category's short description. Resolves the correct language entry from the Propeller `Category` object and renders it as HTML. Unlike `CategoryDescription`, this component has no truncation or toggle -- it always renders the full short description.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic

```tsx
import CategoryShortDescription from "@/components/propeller/CategoryShortDescription";

<CategoryShortDescription category={category} language="NL" />
```

### Below a category title

```tsx
<GridTitle
  title={categoryName}
  language={process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "NL"}
/>
<CategoryShortDescription
  category={category}
  language={process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "NL"}
/>
```

### Custom styling

```tsx
<CategoryShortDescription
  category={category}
  language="NL"
  className="border-b pb-4"
/>
```

### Paired with CategoryDescription on a category page

```tsx
<CategoryShortDescription category={category} language="NL" />
<ProductGrid ... />
<CategoryDescription category={category} language="NL" maxLength={300} />
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To create a custom short description component:

1. Fetch the `Category` object with the `shortDescription` field included (see the GraphQL query below)
2. Resolve the correct language entry from `category.shortDescription` by matching the `language` field
3. Render the `value` as HTML (it may contain rich formatting from the Propeller backend)
4. Use `dangerouslySetInnerHTML` (React) or `v-html` (Vue) to render the HTML content

```tsx
function SimpleShortDescription({ category, language }: { category: Category; language: string }) {
  const match = category.shortDescription?.find((d) => d.language === language);
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

| Prop       | Type       | Required | Default | Description                                                                                              |
| ---------- | ---------- | -------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `category` | `Category` | No       | —       | Propeller `Category` object. The component reads the `shortDescription` array of `LocalizedString` items |
| `language` | `string`   | Yes      | —       | Language code (e.g. `"NL"`, `"EN"`) used to match the correct `LocalizedString` entry                    |

### Styling

| Prop        | Type     | Required | Default | Description                             |
| ----------- | -------- | -------- | ------- | --------------------------------------- |
| `className` | `string` | No       | —       | Extra CSS class applied to the root div |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function categoryShortDescription(category: Category, language: string): void
```

### Options

| Field | Type | Default | Maps to |
|---|---|---|---|
| `category` | `Category` | `undefined` | `category` prop |
| `language` | `string` | — | `language` prop |

### Category fields read

| Field              | SDK Type            | Description                                                                                                       |
| ------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `shortDescription` | `LocalizedString[]` | Array of `{ language: string; value: string }` entries. Find the entry matching the `language` parameter and render its `value` as HTML |

### UI-only props

The following props only affect visual presentation and have no BYO equivalent: `className`.

  </TabItem>
</Tabs>

---

## Behavior

### Language resolution

1. Reads `category.shortDescription` -- an array of `LocalizedString` objects (`{ language, value }`)
2. Finds the entry where `language` matches the `language` prop
3. Returns the `value` (HTML string), or an empty string if no match is found

### Empty state

When the short description is empty (no `category` prop, no matching language entry, or an empty value), the component renders **nothing** -- no wrapper element is added to the DOM.

### Styling details

- Root element: `mb-6` bottom margin
- Description text: `prose prose-slate max-w-none text-muted-foreground`

### Comparison with CategoryDescription

| Feature            | CategoryShortDescription    | CategoryDescription                                |
| ------------------ | --------------------------- | -------------------------------------------------- |
| Source field        | `category.shortDescription` | `category.description`                             |
| Truncation         | No                          | Yes (configurable via `collapsed` and `maxLength`) |
| "Read more" toggle | No                          | Yes                                                |
| Use case           | Brief summary below title   | Full description with expand/collapse              |

## SDK Services

This component does not call any SDK service directly. It expects a `Category` object to be passed via props (typically fetched by `CategoryService.getCategory()` or a direct GraphQL query).

### Category fields read

| Field              | SDK Type            | Description                                                                                                       |
| ------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `shortDescription` | `LocalizedString[]` | Array of `{ language: string; value: string }` entries. The component finds the entry matching the `language` prop and renders its `value` as HTML |

## GraphQL Queries and Mutations

When fetching a category, include the `shortDescription` field to supply this component with data:

```graphql
query GetCategory($categoryId: Int!, $language: String) {
  category(id: $categoryId) {
    categoryId
    name(language: $language) {
      language
      value
    }
    shortDescription(language: $language) {
      language
      value
    }
  }
}
```

The returned `shortDescription` array is passed directly as `category.shortDescription`.
