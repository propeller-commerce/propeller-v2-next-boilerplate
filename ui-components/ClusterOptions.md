# ClusterOptions

Renders a set of option groups for a product cluster, each displayed as a dropdown selector. When a user picks a product from any option group, the component shows a preview card with the product thumbnail, name, and price. Required options are marked with a badge and validated on demand.

---

## Usage

### Basic usage on a cluster detail page

```tsx
import ClusterOptions from '@/components/propeller/ClusterOptions';

<ClusterOptions
  clusterId={42}
  options={cluster.options}
  onOptionSelect={(product) => console.log('Selected:', product.productId)}
/>
```

### With validation errors

Pass `showErrors={true}` to highlight required options that have no selection. Typically toggled before an add-to-cart action:

```tsx
const [showErrors, setShowErrors] = useState(false);

const validateBeforeAddToCart = (): boolean => {
  const hasUnfilled = cluster.options.some(
    opt => opt.hidden !== 'Y' && opt.isRequired === 'Y' && !(opt.id in selectedOptionProducts)
  );
  if (hasUnfilled) {
    setShowErrors(true);
    return false;
  }
  return true;
};

<ClusterOptions
  clusterId={clusterId}
  options={cluster.options}
  onOptionSelect={handleOptionSelect}
  showErrors={showErrors}
/>

<AddToCart beforeAddToCart={validateBeforeAddToCart} childItems={Object.values(selectedOptionProducts).map(p => p.productId)} />
```

### Tracking selected option products for add-to-cart

The parent page should maintain a map of selected option products and pass them as `childItems` to `AddToCart`:

```tsx
const [selectedOptionProducts, setSelectedOptionProducts] = useState<Record<number, Product>>({});

const handleOptionSelect = (product: Product) => {
  const option = cluster?.options?.find(opt =>
    opt.products?.some(p => p.productId === product.productId)
  );
  if (option) {
    setSelectedOptionProducts(prev => ({ ...prev, [option.id]: product }));
  }
};

<ClusterOptions
  clusterId={clusterId}
  options={cluster.options}
  onOptionSelect={handleOptionSelect}
  showErrors={showErrors}
/>
```

### Custom labels

```tsx
<ClusterOptions
  clusterId={clusterId}
  options={cluster.options}
  labels={{
    required: 'Verplicht',
    selectRequired: '— Maak een keuze —',
    selectOptional: '— Geen (optioneel) —',
    requiredError: 'Dit veld is verplicht',
  }}
/>
```

### With custom styling

```tsx
<ClusterOptions
  clusterId={clusterId}
  options={cluster.options}
  className="my-8 border-t pt-6"
/>
```

---

## Props

### Required

| Prop | Type | Description |
|------|------|-------------|
| `clusterId` | `number` | The cluster ID this options selector belongs to. |
| `options` | `ClusterOption[]` | Array of option groups from `cluster.options`. Hidden options (`option.hidden === 'Y'`) are filtered out automatically. |

### Callbacks

| Prop | Type | Description |
|------|------|-------------|
| `onOptionSelect` | `(optionProduct: Product) => void` | Fired when the user selects a product in any option group. Receives the full `Product` object. Use this to update a price display or track selected products for add-to-cart. |

### Display & Validation

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showErrors` | `boolean` | `false` | When `true`, required options without a selection display a red border and error message. |
| `labels` | `Record<string, string>` | Built-in English defaults | Override UI strings. Keys: `required`, `selectRequired`, `selectOptional`, `requiredError`. |
| `className` | `string` | `''` | Extra CSS class applied to the root `<div>`. |

### Label keys and defaults

| Key | Default value | Where it appears |
|-----|---------------|------------------|
| `required` | `"Required"` | Badge next to required option names |
| `selectRequired` | `"-- Select an option --"` | Placeholder in required dropdowns |
| `selectOptional` | `"-- None (Optional) --"` | Placeholder in optional dropdowns |
| `requiredError` | `"This option is required"` | Error text below unfilled required dropdowns |

---

## SDK Services

ClusterOptions does not fetch data itself. It receives `ClusterOption[]` from the parent, which typically comes from a `ClusterService.getCluster()` call.

### ClusterOption fields read

| Field | Type | Usage |
|-------|------|-------|
| `option.id` | `number` | Unique key for each option group |
| `option.names` | `{ value: string }[]` | Display name (first entry used). Falls back to `"Option {id}"`. |
| `option.hidden` | `Enums.YesNo` | Options with `hidden === 'Y'` are excluded from rendering |
| `option.isRequired` | `Enums.YesNo` | `'Y'` marks the option as required (badge + validation) |
| `option.products` | `Product[]` | The selectable products within this option group |

### Product fields read (from each option product)

| Field | Type | Usage |
|-------|------|-------|
| `product.productId` | `number` | Unique identifier, used as `<option value>` and for lookup |
| `product.names` | `{ value: string }[]` | Display name (first entry). Falls back to `"Product {productId}"`. |
| `product.price.gross` | `number` | Price displayed in the dropdown label and preview card (formatted as EUR) |
| `product.media.images.items[].imageVariants[].url` | `string` | Thumbnail URL for the selected-product preview card |

---

## GraphQL Query

The component does not execute queries directly. The parent page fetches the cluster via `ClusterService.getCluster()`, which returns `cluster.options`. A typical query that includes the fields ClusterOptions needs:

```graphql
query GetCluster($clusterId: Int!, $language: String) {
  cluster(id: $clusterId, language: $language) {
    clusterId
    options {
      id
      hidden
      isRequired
      names {
        value
        language
      }
      products {
        productId
        names {
          value
          language
        }
        price {
          gross
          net
        }
        media {
          images(searchInput: { limit: 1 }) {
            items {
              imageVariants {
                url
              }
            }
          }
        }
      }
    }
  }
}
```

---

## Behavior

### Option selection flow

1. Each option group renders as a `<select>` dropdown. The default value is empty (placeholder text).
2. When the user picks a product, the component stores the selection internally (`selectedProductIds` state keyed by option ID).
3. If an `onOptionSelect` callback is provided, it fires with the full `Product` object of the selected item.
4. A preview card appears below the dropdown showing the selected product's thumbnail, name, and price.

### Visual presentation

- **Option header**: Option name in semibold text. Required options show a red "Required" badge.
- **Dropdown**: Full-width `<select>` with rounded borders. Required options have a slightly heavier border (`border-gray-300`); optional ones use `border-gray-200`. Focus ring uses the `secondary` theme color.
- **Validation errors**: When `showErrors` is `true` and a required option has no selection, the dropdown border turns red (`border-red-400`) and an error message appears below it.
- **Preview card**: A horizontal card with a 48x48px thumbnail (or an SVG placeholder if no image is available), the product name (truncated), and the price in the `secondary` theme color.
- **Price formatting**: All prices render as EUR with two decimal places (e.g., `€10.00`). The `price.gross` value (excl. VAT) is used in the dropdown labels and preview.

### Hidden options

Options where `option.hidden === 'Y'` are filtered out before rendering. They never appear in the UI.

### State management

The component manages its own selection state internally. There is no controlled mode -- the parent tracks selections through the `onOptionSelect` callback rather than passing selected values back in.

---

## Building Your Own

To create a custom cluster options component, you need to handle:

1. **Filter hidden options** -- Exclude any option where `hidden === 'Y'` from your rendered output.

2. **Render each option group** -- Loop through visible options, display `option.names[0].value` as the group label, and render each `option.products` entry as a selectable choice.

3. **Track selections** -- Maintain a `Record<number, string>` (option ID to product ID) for internal state. On each selection change, look up the full `Product` object from `option.products` and pass it to the parent via a callback.

4. **Validate required options** -- Check `option.isRequired === 'Y'`. When the parent signals validation (e.g., before add-to-cart), highlight unfilled required groups.

5. **Show a preview** -- After selection, display the product image from `product.media.images.items[0].imageVariants[0].url`, the name from `product.names[0].value`, and the price from `product.price.gross`.

6. **Pass child items to AddToCart** -- The parent should collect all selected product IDs (`Object.values(selectedOptionProducts).map(p => p.productId)`) and pass them as the `childItems` prop to `AddToCart`.

### Core logic

```ts
import { Product, ClusterOption } from 'propeller-sdk-v2';

// Filter out hidden options
function getVisibleOptions(options: ClusterOption[]): ClusterOption[] {
  return options.filter(opt => opt.hidden !== 'Y');
}

// Track selections as a map of option ID to selected Product
// pseudo-code: maintain a selections record, e.g. Record<number, Product>

// Handle a selection change
function handleSelect(
  selections: Record<number, Product>,
  option: ClusterOption,
  productId: number
): { updatedSelections: Record<number, Product>; selectedProduct: Product | undefined } {
  const product = option.products?.find(p => p.productId === productId);
  if (!product) return { updatedSelections: selections, selectedProduct: undefined };
  return {
    updatedSelections: { ...selections, [option.id]: product },
    selectedProduct: product,
  };
}

// Validate required options before add-to-cart
function validateRequired(
  options: ClusterOption[],
  selections: Record<number, Product>
): boolean {
  return !getVisibleOptions(options).some(
    opt => opt.isRequired === 'Y' && !(opt.id in selections)
  );
}

// Collect selected product IDs for AddToCart's childItems prop
function getChildItems(selections: Record<number, Product>): number[] {
  return Object.values(selections).map(p => p.productId);
}
```

For each visible option, render a dropdown with `option.names[0].value` as the label and each `option.products` entry as a selectable choice (showing `product.names[0].value` and `product.price.gross` formatted as EUR). Mark required options with a badge. When `showErrors` is true and a required option has no selection, highlight it with an error state. After selection, show a preview card with the product thumbnail from `product.media.images.items[0].imageVariants[0].url`, the product name, and the price.
