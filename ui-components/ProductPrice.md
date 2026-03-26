import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ProductPrice

Displays a product's price with automatic VAT toggle support, secondary price line, cluster option price aggregation, and semi-closed portal mode for catalog-only storefronts.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic — Single Product Price

```tsx
import ProductPriceDisplay from '@/components/propeller/ProductPrice';

<ProductPriceDisplay
  price={product.price}
  includeTax={true}
/>
```

Renders the incl. VAT price as the leading (large) value and excl. VAT as the secondary (small) line below it.

### With VAT Toggle Integration

```tsx
const [includeTax, setIncludeTax] = useState(true);

useEffect(() => {
  const stored = localStorage.getItem('price_include_tax');
  if (stored !== null) setIncludeTax(stored === 'true');

  const handler = (e: CustomEvent) => setIncludeTax(e.detail);
  window.addEventListener('priceToggleChanged', handler as EventListener);
  return () => window.removeEventListener('priceToggleChanged', handler as EventListener);
}, []);

<ProductPriceDisplay
  price={product.price}
  includeTax={includeTax}
/>
```

When a `PriceToggle` component fires the `priceToggleChanged` event, the leading and secondary prices swap automatically.

### Custom Currency and Size

```tsx
<ProductPriceDisplay
  price={product.price}
  includeTax={true}
  currency="$"
  priceSize="text-xl"
/>
```

### Semi-Closed Portal (Catalog Mode)

```tsx
<ProductPriceDisplay
  price={product.price}
  portalMode="semi-closed"
  user={currentUser}
  labels={{ loginToSeePrices: 'Sign in for pricing' }}
/>
```

When `portalMode` is `"semi-closed"` and no `user` is provided, the price is hidden and replaced with a login prompt.

### Cluster Product with Options

```tsx
<ProductPriceDisplay
  price={cluster.price}
  includeTax={true}
  options={cluster.options}
  selectedOptionProducts={Object.values(selectedOptions)}
/>
```

The component automatically sums the base price with prices from selected option products. For required options where the user has not yet made a selection, the default product's price is included.

### Custom Labels

```tsx
<ProductPriceDisplay
  price={product.price}
  includeTax={true}
  labels={{
    inclTax: 'inc. BTW',
    exclTax: 'ex. BTW',
    loginToSeePrices: 'Inloggen voor prijzen',
  }}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

If you need price display logic beyond what this component provides (e.g., original price strikethrough, discount badges, tier pricing), you can build a custom component using the same SDK data:

```tsx
import { ProductPrice } from 'propeller-sdk-v2';

interface CustomPriceProps {
  price: ProductPrice;
  includeTax: boolean;
  currency?: string;
}

function CustomPrice({ price, includeTax, currency = '€' }: CustomPriceProps) {
  const format = (val: number) => `${currency}${val.toFixed(2)}`;

  const currentPrice = includeTax ? price.net : price.gross;
  const originalPrice = includeTax ? price.originalNet : price.originalGross;
  const hasDiscount = originalPrice && originalPrice > (currentPrice || 0);

  return (
    <div className="flex items-baseline gap-2">
      {hasDiscount && (
        <span className="text-sm text-muted-foreground line-through">
          {format(originalPrice)}
        </span>
      )}
      <span className="text-2xl font-bold">
        {currentPrice != null ? format(currentPrice) : ''}
      </span>
      {hasDiscount && price.discount && (
        <span className="text-sm font-semibold text-red-600">
          -{price.discount}%
        </span>
      )}
    </div>
  );
}
```

Key considerations when building your own:

- **Always read `price.net` for incl. VAT and `price.gross` for excl. VAT** -- the SDK naming is inverted from what you might expect.
- **Handle `null`/`undefined`** gracefully. Not all products have both price values populated.
- **Listen to `priceToggleChanged`** if you want to integrate with the app-wide VAT switch.
- **Cluster options** require iterating `ClusterOption[]` and summing selected/default product prices. Refer to the `getOptionsTotal` logic in the component for the complete algorithm.
- **Semi-closed mode** is a simple guard: check for user presence before rendering prices.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Core

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `price` | `ProductPrice` | **required** | The price object from `product.price`. Contains `net` (incl. VAT) and `gross` (excl. VAT) values. |
| `includeTax` | `boolean` | `false` | When `true`, the incl. VAT price (`price.net`) is the leading price. When `false`, the excl. VAT price (`price.gross`) leads. |
| `currency` | `string` | `'€'` | Currency symbol prepended to all displayed prices. |

### Cluster Options

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `options` | `ClusterOption[]` | `undefined` | Cluster option groups from `cluster.options`. Used to calculate the total price including option selections. |
| `selectedOptionProducts` | `Product[]` | `undefined` | Currently selected option products. Pass `Object.values(selectedOptionProducts)` from your selection state. The displayed price recalculates whenever this array changes. |

### Portal / Visibility

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `portalMode` | `string` | `'open'` | `'open'` shows prices to everyone. `'semi-closed'` hides prices for anonymous visitors and shows a login prompt instead. |
| `user` | `Contact \| Customer \| null` | `undefined` | The authenticated user. Required for semi-closed mode to determine whether to show or hide prices. |

### Labels and Styling

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `labels` | `Record<string, string>` | `undefined` | Override UI strings. Available keys: `inclTax` (default `'incl. VAT'`), `exclTax` (default `'excl. VAT'`), `loginToSeePrices` (default `'Log in to see prices'`). |
| `priceSize` | `string` | `'text-3xl'` | Tailwind text-size class applied to the leading price. |
| `className` | `string` | `undefined` | Extra CSS class applied to the root `<div>`. |
| `taxZone` | `string` | `'NL'` | Tax zone code (reserved for future use). |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function renderProductPrice(options: {
  price: ProductPrice;
  includeTax?: boolean;
  currency?: string;
  portalMode?: string;
  user?: Contact | Customer | null;
  options?: ClusterOption[];
  selectedOptionProducts?: Product[];
}): void
```

### Options

| Field | Type | Default | Maps to |
|-------|------|---------|---------|
| `price` | `ProductPrice` | **required** | `price` prop |
| `includeTax` | `boolean` | `false` | `includeTax` prop |
| `currency` | `string` | `'€'` | `currency` prop |
| `portalMode` | `string` | `'open'` | `portalMode` prop |
| `user` | `Contact \| Customer \| null` | `undefined` | `user` prop |
| `options` | `ClusterOption[]` | `undefined` | `options` prop |
| `selectedOptionProducts` | `Product[]` | `undefined` | `selectedOptionProducts` prop |

### UI-only props (React component only)

The following props control visual presentation and have no equivalent in a custom implementation:

- `priceSize` — Tailwind text-size class for the leading price
- `className` — Extra CSS class on the root element
- `taxZone` — Reserved for future use

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default | Description |
|-----|---------|-------------|
| `inclTax` | `'incl. VAT'` | Label shown next to the incl. VAT price |
| `exclTax` | `'excl. VAT'` | Label shown next to the excl. VAT price |
| `loginToSeePrices` | `'Log in to see prices'` | Message shown in semi-closed portal mode when no user is present |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  inclTax: 'incl. VAT',
  exclTax: 'excl. VAT',
  loginToSeePrices: 'Log in to see prices',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Price Toggle (VAT Switch)

The component itself is stateless regarding VAT preference -- it renders based on the `includeTax` prop. The app-wide VAT toggle pattern works as follows:

1. A `PriceToggle` component writes `'true'` or `'false'` to `localStorage` under the key `price_include_tax`.
2. It dispatches a `priceToggleChanged` custom event with the new boolean as `event.detail`.
3. Parent components listen for this event, update their local state, and pass it down as `includeTax`.

This decoupled pattern means ProductPrice works in any context -- with or without the toggle system.

### Leading and Secondary Prices

The component always shows two price lines when both values are available:

- **Leading price**: Large, bold. Controlled by `includeTax`. Shows the primary price with a tax label (e.g., "incl. VAT").
- **Secondary price**: Small, muted. Shows the opposite tax variant below the leading price (e.g., "excl. VAT").

If either `price.net` or `price.gross` is `null` or `undefined`, that line is omitted.

### Cluster Option Price Aggregation

When `options` and `selectedOptionProducts` are provided, the component adds option prices to the base price:

1. Iterates all non-hidden cluster options.
2. For each option, checks if a matching product exists in `selectedOptionProducts`.
3. If found, adds that product's price (net or gross, matching the current `includeTax` setting).
4. If no selection exists but the option is required (`isRequired === 'Y'`), the default product's price is added instead.
5. The total is summed with the base `price.net`/`price.gross` for the final displayed value.

### Semi-Closed Portal Mode

When `portalMode="semi-closed"`:

- **No user provided**: The entire price display is replaced with a login prompt message (customizable via `labels.loginToSeePrices`).
- **User provided**: Prices display normally.

When `portalMode="open"` (the default), prices are always visible regardless of user state.

### Price Formatting

All prices are formatted as `{currency}{value}` with exactly two decimal places. For example, `€99.17`. There are no thousands separators. The currency symbol defaults to `€` but can be overridden via the `currency` prop.

## SDK Services

### Product Price Fields

The `ProductPrice` type from `propeller-sdk-v2` contains two key numeric fields:

| Field | Meaning | Example |
|-------|---------|---------|
| `price.net` | Price **including** VAT | `120.00` |
| `price.gross` | Price **excluding** VAT | `99.17` |

This naming convention is counterintuitive but consistent across the Propeller SDK. The component abstracts this away via the `includeTax` prop:

- `includeTax={true}` shows `price.net` as the leading price and `price.gross` as secondary.
- `includeTax={false}` shows `price.gross` as the leading price and `price.net` as secondary.

Additional price fields that may be available on the `ProductPrice` object:

| Field | Purpose |
|-------|---------|
| `price.originalNet` | Original incl. VAT price before discount |
| `price.originalGross` | Original excl. VAT price before discount |
| `price.discount` | Discount percentage or amount |
| `price.taxCode` | Applied tax rate code |

### GraphQL Query Example

```graphql
query GetProduct($productId: Int!) {
  product(productId: $productId) {
    productId
    name {
      value
    }
    price {
      net
      gross
      originalNet
      originalGross
      discount
      taxCode
    }
  }
}
```

Using the SDK:

```typescript
import { ProductService } from 'propeller-sdk-v2';

const productService = new ProductService(graphqlClient);
const product = await productService.getProduct({ productId: 123 });

// product.price.net    → incl. VAT
// product.price.gross  → excl. VAT
```
