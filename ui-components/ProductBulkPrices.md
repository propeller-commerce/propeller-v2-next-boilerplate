import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# ProductBulkPrices

Displays volume/tiered pricing for a product in a table format, showing quantity ranges alongside their corresponding unit prices.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Minimal

```tsx
<ProductBulkPrices bulkPrices={product?.bulkPrices || []} />
```

### With VAT explicitly set

```tsx
<ProductBulkPrices
  bulkPrices={product?.bulkPrices || []}
  includeTax={false}
/>
```

### Without title

```tsx
<ProductBulkPrices
  bulkPrices={product?.bulkPrices || []}
  labels={{ title: '' }}
/>
```

### Semi-closed portal (hidden for anonymous users)

```tsx
<ProductBulkPrices
  bulkPrices={product?.bulkPrices || []}
  portalMode="semi-closed"
  user={authState.user}
/>
```

### Fully customized labels

```tsx
<ProductBulkPrices
  bulkPrices={product?.bulkPrices || []}
  portalMode="open"
  user={authState.user}
  className="my-4"
  labels={{
    title: 'Staffelprijzen',
    quantityFrom: 'Aantal vanaf',
    price: 'Prijs',
    inclTax: 'incl. BTW',
    exclTax: 'excl. BTW',
  }}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom bulk-prices display:

1. **Obtain bulk prices** -- they live on `product.bulkPrices` (an array of `ProductPrice` objects) returned by `ProductService.getProduct()`. Include `userBulkPriceProductInput` for user-specific tiers.

2. **Choose the price field** -- use `tier.net` for VAT-inclusive prices and `tier.gross` for VAT-exclusive prices. To support the global PriceToggle, read `localStorage.getItem('price_include_tax')` and listen for `priceToggleChanged` events.

3. **Filter and deduplicate tiers** -- group tiers by `quantityFrom` (or `tier.quantity` fallback). For each group, prefer a tier whose `discount.validFrom`/`validTo` window contains the current time; if none is active, fall back to a tier with both dates `null` (always valid). Skip the group entirely if neither applies.

4. **Compute quantity ranges** -- iterate over the sorted, filtered tiers. For each tier, read `tier.discount?.quantityFrom` (or fall back to `tier.quantity`). The upper bound of a range is one less than the next tier's threshold. The final tier has no upper bound.

5. **Hide single-row case** -- if filtering leaves exactly one tier and it starts at quantity `1`, render nothing (there is no useful bulk pricing to show).

6. **Handle empty state** -- if the array is empty or absent, render nothing.

7. **Handle semi-closed portal** -- if your store uses `portalMode: 'semi-closed'`, check for an authenticated `user` before rendering pricing.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Required

| Prop | Type | Description |
|------|------|-------------|
| bulkPrices | `ProductPrice[]` | Bulk price tiers from `product.bulkPrices` |

### Pricing

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| includeTax | `boolean` | `false` (excl. VAT) | When `true`, shows `tier.net` (incl. VAT). When `false`, shows `tier.gross` (excl. VAT). If omitted, defers to the PriceToggle state |
| taxZone | `string` | `'NL'` | Tax zone code passed to the product query |

### Visibility

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| portalMode | `string` | `'open'` | Set to `'semi-closed'` to hide the component for anonymous users |
| user | `Contact \| Customer \| null` | `null` | Authenticated user object. Required when `portalMode` is `'semi-closed'` |

### Appearance

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| labels | `Record<string, string>` | `{}` | Override any UI string (see Labels section below) |
| className | `string` | `''` | Extra CSS class applied to the root element |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function renderBulkPrices(bulkPrices: ProductPrice[], options?: BulkPriceOptions): void
```

### Options

| Field | Type | Default | Maps to |
|-------|------|---------|---------|
| `bulkPrices` | `ProductPrice[]` | — | `bulkPrices` prop |
| `includeTax` | `boolean` | `false` | `includeTax` prop |
| `taxZone` | `string` | `'NL'` | `taxZone` prop |
| `portalMode` | `string` | `'open'` | `portalMode` prop |
| `user` | `Contact \| Customer \| null` | `null` | `user` prop |

### UI-only props

The following props are purely visual and have no SDK equivalent: `labels`, `className`.

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default | Description |
|-----|---------|-------------|
| `title` | `Volume pricing` | Table heading. Set to `''` to hide it entirely |
| `quantityFrom` | `Qty from` | Column header for the quantity range |
| `price` | `Price` | Column header for the unit price |
| `inclTax` | `incl. VAT` | Annotation shown when prices include tax |
| `exclTax` | `excl. VAT` | Annotation shown when prices exclude tax |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  title: 'Volume pricing',
  quantityFrom: 'Qty from',
  price: 'Price',
  inclTax: 'incl. VAT',
  exclTax: 'excl. VAT',
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

### Price toggle (VAT switch)

The component integrates with the global PriceToggle mechanism:

- On mount it reads `localStorage.getItem('price_include_tax')` to determine the initial VAT mode (default: `false`, meaning prices exclude VAT).
- It listens for the `priceToggleChanged` custom event. When the user flips the toggle elsewhere on the page, this component re-renders with the updated mode.
- The `includeTax` prop, when explicitly passed, takes precedence over the localStorage / event-driven value.
- The price column header dynamically shows "(incl. VAT)" or "(excl. VAT)" to reflect the active mode.

### Tier pricing display

Quantity ranges are computed automatically from adjacent tiers using `discount.quantityFrom` (falling back to `tier.quantity`):

| Tiers (quantityFrom) | Displayed ranges |
|-----------------------|------------------|
| 10, 100 | `10--99`, `100+` |
| 1, 5, 25 | `1--4`, `5--24`, `25+` |
| 50 (single tier) | `50+` |

Each tier's upper bound is one less than the next tier's `quantityFrom`. The last tier always displays with a `+` suffix.

Prices are formatted as EUR with two decimal places (e.g., `EUR 12.50`).

### Tier filtering and deduplication

Before rendering, the component filters the raw `bulkPrices` array to avoid showing duplicate or expired tiers:

1. **Group by quantity** — tiers are grouped by their `quantityFrom` value (or `tier.quantity` as fallback).
2. **Date validity check** — within each group, the component inspects `discount.validFrom` and `discount.validTo`:
   - Tiers with no `discount` field are kept as-is.
   - Tiers where both `validFrom` and `validTo` are `null` are treated as **always valid** (null-date tiers).
   - Tiers with date bounds are checked against the current time; only those currently in range are kept.
3. **Selection per group**:
   - If one or more date-bounded tiers are currently valid, the first valid tier is chosen.
   - Otherwise, the first null-date tier is used as a fallback.
4. **Sort** — the resulting tiers are sorted ascending by quantity.
5. **Single-row suppression** — if only one tier remains and its quantity is `1`, the table is hidden (bulk pricing with a single row starting at quantity 1 provides no useful information).

This mirrors the behaviour of the legacy PHP storefront so customers only see the currently applicable tier per quantity.

### Visibility rules

- **No bulk prices**: The component renders nothing.
- **Single tier starting at quantity 1**: The component is hidden (see above).
- **Semi-closed portal + no user**: The component is hidden. Pass a `user` object to make it visible.

## SDK Services

ProductBulkPrices is a display-only component -- it does not call any SDK service itself. It receives data that was already fetched as part of a product query.

### Product fields consumed

The component reads from `ProductPrice` objects (the items inside `product.bulkPrices`):

| Field | Type | Usage |
|-------|------|-------|
| `net` | `number` | Unit price including VAT. Displayed when `includeTax` is `true` |
| `gross` | `number` | Unit price excluding VAT. Displayed when `includeTax` is `false` |
| `quantity` | `number` | Fallback quantity threshold when `discount.quantityFrom` is absent |
| `discount.quantityFrom` | `number` | Primary quantity threshold used to compute the range label |
| `discount.validFrom` | `string` | ISO date when the tier becomes active. Used by the filtering step |
| `discount.validTo` | `string` | ISO date when the tier expires. Used by the filtering step |

### Fetching bulk prices

Bulk prices are returned as part of the product query. For correct per-user quantity thresholds, pass `userBulkPriceProductInput`:

```tsx
service.getProduct({
  productId: 123,
  userBulkPriceProductInput: {
    taxZone: 'NL',
    companyId: user?.company?.companyId,
    contactId: user?.contactId,
  },
});
```

Without `userBulkPriceProductInput`, the API returns default quantity values (typically `1` for every tier).
