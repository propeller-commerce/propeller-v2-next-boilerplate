# CategoryShortDescription

UI component that renders the short category description. It reads the `shortDescription` field from a Propeller `Category` object, resolves the matching language entry, and renders it as HTML. Unlike `CategoryDescription`, this component has no truncation or "Read more" toggle — it always renders the full short description.

**Source:** `ui-components/CategoryShortDescription.lite.tsx`
**Compiled React:** `output/react/ui-components/CategoryShortDescription`
**Compiled Vue:** `output/vue/ui-components/CategoryShortDescription`

---

## Usage

### Minimal

```tsx
import CategoryShortDescription from "@/components/propeller/CategoryShortDescription";

<CategoryShortDescription category={category} language="NL" />;
```

### On a category page (below the title)

```tsx
<GridTitle
  title={categoryName}
  language={process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'}
/>
<CategoryShortDescription
  category={category}
  language={process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'}
/>
```

### With custom class

```tsx
<CategoryShortDescription
  category={category}
  language="NL"
  className="border-b pb-4"
/>
```

---

## Props

### Required

| Prop       | Type     | Description                                                                                            |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `language` | `string` | Language code used to resolve the correct localised short description from `category.shortDescription` |

### Optional

| Prop        | Type       | Default | Description                                                                                                                                                  |
| ----------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `category`  | `Category` | —       | Propeller `Category` object. The component reads `category.shortDescription` (an array of `LocalizedString`) and renders the matching language entry as HTML |
| `className` | `string`   | —       | Extra CSS class applied to the root element                                                                                                                  |

---

## Internal behaviour

### Language resolution

1. Reads `category.shortDescription` — an array of `LocalizedString` objects (`{ language, value }`)
2. Finds the entry where `language` matches the `language` prop
3. Returns the `value` (HTML string) or an empty string if no match

### Empty state

- When the short description is empty (no category, no matching language, or empty value), the component renders **nothing** — no wrapper `<div>` is output to the DOM

### Styling

- Root element: `mb-6` bottom margin
- Description text: `prose prose-slate max-w-none text-muted-foreground`

---

## Comparison with CategoryDescription

| Feature            | CategoryShortDescription    | CategoryDescription                                |
| ------------------ | --------------------------- | -------------------------------------------------- |
| Source field       | `category.shortDescription` | `category.description`                             |
| Truncation         | No                          | Yes (configurable via `collapsed` and `maxLength`) |
| "Read more" toggle | No                          | Yes                                                |
| Use case           | Brief summary below title   | Full description with expand/collapse              |
