import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# GridTitle

Renders the main heading for product grid pages -- category listings, search results, brand pages, or any context where a prominent title is needed above a product grid.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic category page

```tsx
import GridTitle from "@/components/propeller/GridTitle";

<GridTitle title="Outdoor & Travel" language="NL" />
```

### Dynamic category name from the SDK

```tsx
<GridTitle
  title={category.name[0]?.value ?? "Products"}
  language={process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "NL"}
/>
```

### Search results page

```tsx
<GridTitle title={`Search results for "${searchTerm}"`} language="NL" />
```

### As an h2 (page already has an h1)

Use `headingLevel="h2"` when the grid is embedded inside a page that already owns the h1, such as a brand landing page or a CMS page with its own title.

```tsx
<GridTitle title="Related products" language="NL" headingLevel="h2" />
```

### With extra styling

```tsx
<GridTitle
  title="Brand: Fellowes"
  language="NL"
  className="border-b pb-4"
/>
```

### Combined with other grid components

```tsx
<div>
  <GridTitle title={categoryName} language="NL" />
  <CategoryDescription description={categoryDescription} language="NL" />
  <GridToolbar ... />
  <ProductGrid ... />
  <GridPagination ... />
</div>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

GridTitle is intentionally minimal. To extend or replace it:

1. **Add a product count badge** -- Accept an `itemCount` prop and render it next to the title inside the existing `flex items-baseline gap-3` wrapper:
   ```tsx
   <span className="text-sm text-gray-500">{itemCount} products</span>
   ```

2. **Support additional heading levels** -- Replace the two `Show` blocks with a dynamic element. In React you can use `createElement`:
   ```tsx
   const Tag = (headingLevel || "h1") as keyof JSX.IntrinsicElements;
   return <Tag className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</Tag>;
   ```

3. **Add breadcrumbs** -- Render a breadcrumb trail above the heading inside the root `<div>`, using the category hierarchy from `CategoryService`.

4. **Integrate a subtitle or description** -- Add an optional `subtitle` prop and render it below the heading. For category descriptions, consider using the separate `CategoryDescription` component instead to keep concerns separated.

Keep the component stateless and free of data-fetching logic. Let the parent page handle SDK calls and pass resolved strings as props.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Content

| Prop       | Type     | Required | Default | Description                                                              |
| ---------- | -------- | -------- | ------- | ------------------------------------------------------------------------ |
| `title`    | `string` | Yes      | --      | The heading text. Typically a category name, search term, or brand name. |
| `language` | `string` | Yes      | --      | Language code for the content (e.g. `'NL'`, `'EN'`).                    |

### Appearance

| Prop           | Type     | Required | Default | Description                                                                 |
| -------------- | -------- | -------- | ------- | --------------------------------------------------------------------------- |
| `headingLevel` | `string` | No       | `'h1'`  | HTML heading level. Set to `'h2'` when the page already has its own `h1`.   |
| `className`    | `string` | No       | --      | Additional CSS class(es) applied to the root `<div>` wrapper.               |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function gridTitle(options: GridTitleOptions): void
```

### Options

| Field | Type | Default | Maps to |
|-------|------|---------|---------|
| `title` | `string` | (required) | `title` prop |
| `language` | `string` | (required) | `language` prop |
| `headingLevel` | `string` | `'h1'` | `headingLevel` prop |

### UI-only props

The following props are UI-specific and do not apply when building your own:

- `className` -- CSS class on root element

  </TabItem>
</Tabs>

---

## Behavior

- Renders an `<h1>` tag by default. When `headingLevel` is set to `'h2'`, it renders an `<h2>` instead. All other `headingLevel` values fall through to the `h1` default.
- The heading uses responsive font sizing: `text-3xl` on small screens, `text-4xl` on `sm:` breakpoint and above, with `font-bold` and `tracking-tight`.
- The root element applies `mb-8` bottom margin for spacing above the next grid section.
- Fully stateless -- no internal state, no side effects, no API calls. It re-renders only when props change.

## SDK Services

GridTitle is a **presentational component** -- it does not call any SDK service directly. The parent page is responsible for fetching category data and passing the title string.

When used on a category page, the title typically comes from a `Category` object returned by `CategoryService.getCategory()`. The relevant field is:

| Category field | Type                          | Usage                                         |
| -------------- | ----------------------------- | --------------------------------------------- |
| `name`         | `LocalizedString[]` (array)   | `category.name[0]?.value` provides the title. |

For search pages, the title is constructed from the user's search query string rather than an SDK field.
