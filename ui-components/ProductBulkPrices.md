# ProductBulkPrices Component

Displays volume/tiered pricing for a product in a table format with quantity ranges and corresponding prices.

## File Locations

- **Mitosis source**: `ui-components/ProductBulkPrices.lite.tsx`
- **React (active)**: `components/propeller/ProductBulkPrices.tsx`
- **Compiled output**: `output/react/ui-components/ProductBulkPrices.tsx`

## Usage

### Minimal

```tsx
<ProductBulkPrices bulkPrices={product?.bulkPrices || []} />
```

### Without title

```tsx
<ProductBulkPrices bulkPrices={product?.bulkPrices || []} labels={{ title: '' }} />
```

### Full

```tsx
<ProductBulkPrices
  bulkPrices={product?.bulkPrices || []}
  portalMode="open"
  user={authState.user}
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

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| bulkPrices | ProductPrice[] | Yes | — | Bulk price tiers from `product.bulkPrices` |
| includeTax | boolean | No | localStorage | Overrides PriceToggle state |
| portalMode | string | No | 'open' | 'semi-closed' hides component for anonymous users |
| user | Contact \| Customer | No | null | Authenticated user (for semi-closed mode) |
| taxZone | string | No | 'NL' | Tax zone code |
| labels | Record<string, string> | No | {} | UI string overrides |
| className | string | No | '' | Extra CSS class on root element |

## Labels

| Key | Default | Description |
|-----|---------|-------------|
| title | Volume pricing | Table title. Set to `''` to hide |
| quantityFrom | Qty from | Column header for quantity |
| price | Price | Column header for price |
| inclTax | incl. VAT | Tax label when showing inclusive prices |
| exclTax | excl. VAT | Tax label when showing exclusive prices |

## Quantity Range Display

Quantity ranges are computed from adjacent tiers using `discount.quantityFrom`:

| Tiers | Display |
|-------|---------|
| 10, 100 | `10–99`, `100+` |
| 1, 5, 25 | `1–4`, `5–24`, `25+` |
| 50 (single tier) | `50+` |

The threshold comes from `tier.discount.quantityFrom` (on `BulkPrice`/`BulkCostPrice`/`Discount`), not from `tier.quantity`.

## Data Source

Bulk prices are fetched as part of the product query. The `product` query must pass `userBulkPriceProductInput` for proper quantity thresholds:

```tsx
service.getProduct({
  productId: 123,
  userBulkPriceProductInput: {
    taxZone: 'NL',
    companyId: user?.company?.companyId,
    contactId: user?.contactId,
  },
  // ...other params
});
```

Without `userBulkPriceProductInput`, the API returns default quantity values (typically `1` for all tiers).

## Behavior

- **No bulk prices**: Component renders nothing
- **Semi-closed portal + anonymous user**: Component hidden
- **PriceToggle**: Listens for `priceToggleChanged` event, switches between `tier.net` (incl. VAT) and `tier.gross` (excl. VAT)
- **Price header**: Shows "(incl. VAT)" or "(excl. VAT)" based on current toggle state

## Compiled React Fix

The Mitosis-compiled `useEffect` has the `set_priceListener(() => {...})` bug — React treats the function as a state updater. The active React copy uses an inline listener with proper cleanup:

```tsx
useEffect(() => {
  const listener = () => { /* read localStorage, update state */ };
  window.addEventListener('priceToggleChanged', listener);
  return () => window.removeEventListener('priceToggleChanged', listener);
}, []);
```
