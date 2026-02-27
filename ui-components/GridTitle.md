# GridTitle

UI component that renders the main heading for category, search, or brand result pages. Supports configurable heading level (`h1` or `h2`) and an optional CSS class.

**Source:** `ui-components/GridTitle.lite.tsx`
**Compiled React:** `output/react/ui-components/GridTitle`
**Compiled Vue:** `output/vue/ui-components/GridTitle`

---

## Usage

### Minimal

```tsx
import GridTitle from "@/components/propeller/GridTitle";

<GridTitle title="Outdoor & Travel" language="NL" />;
```

### On a category page

```tsx
<GridTitle
  title={categoryName}
  language={process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || "NL"}
/>
```

### On a search page

```tsx
<GridTitle title={`Search results for "${term}"`} language="NL" />
```

### As h2 (embedded inside a page that already has an h1)

```tsx
<GridTitle title="Related products" language="NL" headingLevel="h2" />
```

### With custom class

```tsx
<GridTitle title="Brand: Fellowes" language="NL" className="border-b pb-4" />
```

---

## Props

### Required

| Prop       | Type     | Description                                                                               |
| ---------- | -------- | ----------------------------------------------------------------------------------------- |
| `title`    | `string` | The main heading text to display. Typically the category name, search term, or brand name |
| `language` | `string` | Language code for the content. Defaults to `'NL'`                                         |

### Optional

| Prop           | Type     | Default | Description                                                                                                 |
| -------------- | -------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `headingLevel` | `string` | `'h1'`  | Override the heading tag level. Use `'h2'` when the grid is embedded inside a page that already has an `h1` |
| `className`    | `string` | —       | Extra CSS class applied to the root element                                                                 |

---

## Internal behaviour

- Renders an `<h1>` by default; switches to `<h2>` when `headingLevel` is `'h2'`
- The root element has `mb-8` bottom margin
- Returns nothing when no `description` or `itemsFound` props are needed — the component is purely a heading wrapper
- No API calls, no state — this is a stateless presentational component
