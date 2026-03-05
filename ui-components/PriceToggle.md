# PriceToggle

A lightweight UI toggle that lets users switch between displaying prices including VAT or excluding VAT. The component does not perform price calculations — it informs the parent (or global context) to update how prices are rendered across the application.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | No | `'Prices:'` | Label text shown beside the toggle |
| `isOn` | `boolean` | No | `false` | Current toggle state. `true` = incl. VAT as leading price |
| `inclExclVatSwitched` | `(on: boolean) => void` | Yes | — | Callback fired when toggle is switched. Receives the new state |
| `className` | `string` | No | `''` | Extra CSS class on the root element |

## How It Works

- **Toggle ON** (`isOn=true`): Leading price = incl. VAT (`price.net` in Propeller SDK), secondary = excl. VAT (`price.gross`)
- **Toggle OFF** (`isOn=false`): Leading price = excl. VAT (`price.gross`), secondary = incl. VAT (`price.net`)

## Integration

The toggle state is managed globally via `PriceContext` (`context/PriceContext.tsx`):

```tsx
import { usePrice } from '@/context/PriceContext';
import PriceToggle from '@/components/propeller/PriceToggle';

function MyComponent() {
  const { includeTax, setIncludeTax } = usePrice();

  return (
    <PriceToggle
      isOn={includeTax}
      inclExclVatSwitched={setIncludeTax}
    />
  );
}
```

### PriceContext

- Persists to `localStorage` key `price_include_tax`
- Cross-tab sync via `StorageEvent`
- Hydration-safe via `useSyncExternalStore`
- Default: `true` (incl. VAT)

### Components that respect the toggle

| Component | Prop | Used in |
|-----------|------|---------|
| `ProductGrid` | `includeTax` | Category page, Search page |
| `ProductCard` | `includeTax` | Via ProductGrid |
| `ClusterCard` | `includeTax` | Via ProductGrid |
| `ProductPrice` | `includeTax` | Product detail page |
| `ProductBulkPrices` | `includeTax` | Product detail page |
| Cluster detail page | `usePrice()` | Inline `totalPrice` calculation |

### Visibility

The toggle visibility in the header is controlled by the CMS `showVatToggle` field in the Global content type (`CmsGlobal.showVatToggle`).
