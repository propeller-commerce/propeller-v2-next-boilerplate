# CategoryDescription

UI component that renders the full category description with optional "Read more" / "Read less" truncation. It reads the `description` field from a Propeller `Category` object, resolves the matching language entry, and renders it as HTML.

**Source:** `ui-components/CategoryDescription.lite.tsx`
**Compiled React:** `output/react/ui-components/CategoryDescription`
**Compiled Vue:** `output/vue/ui-components/CategoryDescription`

---

## Usage

### Minimal

```tsx
import CategoryDescription from "@/components/propeller/CategoryDescription";

<CategoryDescription category={category} language="NL" />;
```

### With truncation (default behaviour)

```tsx
<CategoryDescription
  category={category}
  language="NL"
  collapsed={true}
  maxLength={200}
/>
```

The description is truncated at word boundaries after 200 characters and a **Read more** button is shown. Clicking it expands to the full HTML content; clicking **Read less** collapses it again.

### Without truncation

```tsx
<CategoryDescription category={category} language="NL" collapsed={false} />
```

### With custom max length

```tsx
<CategoryDescription category={category} language="NL" maxLength={400} />
```

### With custom class

```tsx
<CategoryDescription
  category={category}
  language="NL"
  className="border-b pb-4"
/>
```

---

## Props

### Required

| Prop       | Type     | Description                                                                                 |
| ---------- | -------- | ------------------------------------------------------------------------------------------- |
| `language` | `string` | Language code used to resolve the correct localised description from `category.description` |

### Optional

| Prop        | Type       | Default | Description                                                                                                                                             |
| ----------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `category`  | `Category` | —       | Propeller `Category` object. The component reads `category.description` (an array of `LocalizedString`) and renders the matching language entry as HTML |
| `collapsed` | `boolean`  | `true`  | When `true`, the description is truncated to `maxLength` characters and a "Read more" / "Read less" toggle is shown                                     |
| `maxLength` | `number`   | `200`   | Maximum number of characters to display before truncating. Only applies when `collapsed` is `true`                                                      |
| `className` | `string`   | —       | Extra CSS class applied to the root element                                                                                                             |

---

## Internal behaviour

### Language resolution

1. Reads `category.description` — an array of `LocalizedString` objects (`{ language, value }`)
2. Finds the entry where `language` matches the `language` prop
3. Returns the `value` (HTML string) or an empty string if no match

### Truncation (`collapsed: true`, default)

- Strips HTML tags from the description to measure plain-text length
- If plain-text length exceeds `maxLength`, truncates at the last word boundary before the limit and appends `…`
- The truncated view renders as plain text (no HTML); the expanded view renders the full HTML via `dangerouslySetInnerHTML` / `innerHTML`

### Empty state

- When the description is empty (no category, no matching language, or empty value), the component renders **nothing** — no wrapper `<div>` is output to the DOM

### Styling

- Root element: `mb-6` bottom margin
- Description text: `prose prose-slate max-w-none text-muted-foreground`
- Toggle button: `text-sm font-medium text-primary hover:underline`
