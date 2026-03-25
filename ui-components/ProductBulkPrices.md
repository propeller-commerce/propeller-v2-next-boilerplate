# ProductBulkPrices

Displays volume/tiered pricing for a product in a table format, showing quantity ranges alongside their corresponding unit prices.

## Usage

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

## Props

### Required

| Prop | Type | Description |
|------|------|-------------|
| bulkPrices | `ProductPrice[]` | Bulk price tiers from `product.bulkPrices` |

### Pricing

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| includeTax | `boolean` | `true` (or localStorage) | When `true`, shows `tier.net` (incl. VAT). When `false`, shows `tier.gross` (excl. VAT). If omitted, defers to the PriceToggle state |
| taxZone | `string` | `'NL'` | Tax zone code passed to the product query |

### Visibility

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| portalMode | `string` | `'open'` | Set to `'semi-closed'` to hide the component for anonymous users |
| user | `Contact \| Customer \| null` | `null` | Authenticated user object. Required when `portalMode` is `'semi-closed'` |

### Appearance

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| labels | `Record<string, string>` | `{}` | Override any UI string (see table below) |
| className | `string` | `''` | Extra CSS class applied to the root element |

### Label keys

| Key | Default | Description |
|-----|---------|-------------|
| `title` | `Volume pricing` | Table heading. Set to `''` to hide it entirely |
| `quantityFrom` | `Qty from` | Column header for the quantity range |
| `price` | `Price` | Column header for the unit price |
| `inclTax` | `incl. VAT` | Annotation shown when prices include tax |
| `exclTax` | `excl. VAT` | Annotation shown when prices exclude tax |

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

## Behavior

### Price toggle (VAT switch)

The component integrates with the global PriceToggle mechanism:

- On mount it reads `localStorage.getItem('price_include_tax')` to determine the initial VAT mode (default: `true`, meaning prices include VAT).
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

### Visibility rules

- **No bulk prices**: The component renders nothing.
- **Semi-closed portal + no user**: The component is hidden. Pass a `user` object to make it visible.

## Building Your Own

To build a custom bulk-prices display:

1. **Obtain bulk prices** -- they live on `product.bulkPrices` (an array of `ProductPrice` objects) returned by `ProductService.getProduct()`. Include `userBulkPriceProductInput` for user-specific tiers.

2. **Choose the price field** -- use `tier.net` for VAT-inclusive prices and `tier.gross` for VAT-exclusive prices. To support the global PriceToggle, read `localStorage.getItem('price_include_tax')` and listen for `priceToggleChanged` events.

3. **Compute quantity ranges** -- iterate over the sorted tiers. For each tier, read `tier.discount?.quantityFrom` (or fall back to `tier.quantity`). The upper bound of a range is one less than the next tier's threshold. The final tier has no upper bound.

4. **Handle empty state** -- if the array is empty or absent, render nothing.

5. **Handle semi-closed portal** -- if your store uses `portalMode: 'semi-closed'`, check for an authenticated `user` before rendering pricing.
