import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# PriceToggle

A lightweight UI toggle that lets users switch between displaying prices including VAT or excluding VAT. The component does not perform price calculations — it broadcasts the user's preference so other components can adjust which price they display.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic toggle in the header

```tsx
import PriceToggle from '@/components/propeller/PriceToggle';

function Header() {
  return (
    <PriceToggle
      inclExclVatSwitched={(on) => {
        localStorage.setItem('price_include_tax', String(on));
      }}
    />
  );
}
```

### With a custom label and initial state

```tsx
<PriceToggle
  label="Show prices:"
  initialState={false}
  inclExclVatSwitched={(on) => {
    localStorage.setItem('price_include_tax', String(on));
  }}
/>
```

### Reading the persisted value on mount

```tsx
function HeaderToggle() {
  const stored = typeof window !== 'undefined'
    ? localStorage.getItem('price_include_tax') !== 'false'
    : true;

  return (
    <PriceToggle
      initialState={stored}
      inclExclVatSwitched={(on) => {
        localStorage.setItem('price_include_tax', String(on));
      }}
    />
  );
}
```

### Styled with extra class

```tsx
<PriceToggle
  className="bg-gray-100 rounded px-2 py-1"
  inclExclVatSwitched={(on) => {
    localStorage.setItem('price_include_tax', String(on));
  }}
/>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Custom VAT toggle

If you need a toggle with different styling or behavior, replicate these two essentials:

1. **Persist to localStorage** under the key `price_include_tax`
2. **Dispatch the custom event** `priceToggleChanged` with the boolean value as `detail`

```ts
// pseudo-code

// Read the current value from localStorage (default to true)
function readIncludeTax(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('price_include_tax') !== 'false';
}

// Toggle the VAT preference
function toggleVat(currentValue: boolean): void {
  const next = !currentValue;
  localStorage.setItem('price_include_tax', String(next));
  window.dispatchEvent(new CustomEvent('priceToggleChanged', { detail: next }));
}

// Render a toggle button that displays "Incl. VAT" or "Excl. VAT"
// based on the current value. On click, call `toggleVat(currentValue)`.
```

### Listening for the toggle in another component

Any component that displays prices should listen for the `priceToggleChanged` event and read the initial value from localStorage on mount:

```ts
// pseudo-code

// On component initialization:
let includeTax = true; // default must be true to avoid SSR mismatches
const stored = localStorage.getItem('price_include_tax');
if (stored !== null) {
  includeTax = (stored !== 'false');
}

// Register an event listener for live updates:
function onToggle(e: Event) {
  includeTax = (e as CustomEvent).detail;
  // Re-render your component with the new value
}
window.addEventListener('priceToggleChanged', onToggle);

// On component teardown, remove the listener:
window.removeEventListener('priceToggleChanged', onToggle);

// To display the correct price:
// price.net = incl. VAT, price.gross = excl. VAT
const displayPrice = includeTax ? price.net : price.gross;
const label = includeTax ? 'incl. VAT' : 'excl. VAT';
```

Key points for the listener pattern:

- Initialize `includeTax` to `false` (excl. VAT) to match the default and avoid SSR/hydration mismatches.
- If an explicit `includeTax` prop is passed, let it take precedence over the localStorage/event value.
- Always clean up the event listener when the component is destroyed.

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Display

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `label` | `string` | No | `'Prices:'` | Label text shown beside the toggle. Hidden on small screens (`hidden sm:inline`). |
| `className` | `string` | No | `''` | Extra CSS class applied to the root element. |

### State & Callbacks

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `initialState` | `boolean` | No | `true` | Initial toggle position. `true` = incl. VAT, `false` = excl. VAT. |
| `inclExclVatSwitched` | `(on: boolean) => void` | Yes | — | Callback fired when the toggle is switched. Receives the new state. |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function createPriceToggle(options?: PriceToggleOptions): void
```

### Options

| Field | Type | Default | Maps to |
|-------|------|---------|---------|
| `label` | `string` | `'Prices:'` | Label text beside the toggle |
| `initialState` | `boolean` | `true` | Starting toggle position (`true` = incl. VAT) |
| `onToggle` | `(on: boolean) => void` | — | Callback when the toggle is switched |

### Callbacks

| Callback | Signature | Description |
|----------|-----------|-------------|
| `onToggle` | `(on: boolean) => void` | Fired when the toggle is switched. Receives the new state. |

### UI-only props

The following props are purely visual and have no SDK equivalent: `label`, `className`.

  </TabItem>
</Tabs>

---

## Behavior

### localStorage persistence

The toggle value is persisted under the localStorage key `price_include_tax` as a string (`'true'` or `'false'`). The parent component is responsible for writing to localStorage inside the `inclExclVatSwitched` callback. Listening components read this key on mount to initialize their state.

### Custom event dispatch

Every time the toggle is switched, the component dispatches a global custom event:

```ts
window.dispatchEvent(new CustomEvent('priceToggleChanged', { detail: newValue }));
```

`detail` is a boolean: `true` for incl. VAT, `false` for excl. VAT. This event fires automatically — the parent does not need to dispatch it.

### Default state

The default state is `true` (incl. VAT). This matches the initialization value used by all listening components, which prevents hydration mismatches. If you override `initialState` to `false`, make sure localStorage already contains `'false'` before the page renders, or listening components will briefly show incl. VAT prices until they receive the event.

### Rendering

The toggle renders as a `<button>` with `role="switch"` and `aria-checked` for accessibility. It displays either "Incl. VAT" or "Excl. VAT" as text. The label is hidden on screens smaller than the `sm` breakpoint.

## SDK Services

PriceToggle does not call any SDK services directly. It is a pure UI control. However, it dispatches a `priceToggleChanged` custom event that other components listen for to decide which SDK price field to display.

### SDK price mapping

The Propeller SDK uses inverted naming for price fields:

| SDK field | Actual meaning |
|-----------|----------------|
| `price.net` | Price **including** VAT |
| `price.gross` | Price **excluding** VAT |

When the toggle is **on** (`true`), components should display `price.net` (incl. VAT) as the primary price. When the toggle is **off** (`false`), components should display `price.gross` (excl. VAT).

### Components that listen for the toggle

| Component | How it listens |
|-----------|---------------|
| ProductCard | Internal `priceToggleChanged` event listener + `_includeTax` state |
| ClusterCard | Internal `priceToggleChanged` event listener + `_includeTax` state |
| ProductPrice | Internal `priceToggleChanged` event listener + `_includeTax` state |
| ProductBulkPrices | Internal `priceToggleChanged` event listener + `_includeTax` state |
| FavoriteListItem | Internal `priceToggleChanged` event listener + `_includeTax` state |
| Cluster detail page | Inline `useState` + `useEffect` listener |
