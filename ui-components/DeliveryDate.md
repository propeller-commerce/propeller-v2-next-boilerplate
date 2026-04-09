import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# DeliveryDate

Provides an interface for selecting a preferred delivery date during checkout. Displays a row of quick-select date tiles for upcoming days, plus an optional "Other date..." tile that opens a modal with a native date picker.

## Usage

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Basic -- show 3 upcoming weekdays with date picker

```tsx
import DeliveryDate from '@/components/propeller/DeliveryDate';

<DeliveryDate
  onDateSelect={(date) => setDeliveryDate(date)}
/>
```

### Show 5 days including weekends, no custom date picker

```tsx
<DeliveryDate
  showUpcomingDays={5}
  skipWeekends={false}
  showDatePicker={false}
  onDateSelect={(date) => setDeliveryDate(date)}
/>
```

### Custom date formatting and labels

```tsx
<DeliveryDate
  onDateSelect={(date) => setDeliveryDate(date)}
  formatDateDisplay={(iso) => {
    const d = new Date(iso);
    return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' });
  }}
  labels={{
    pickDate: 'Kies een andere datum...',
    modalTitle: 'Selecteer een leverdatum',
    cancel: 'Annuleren',
  }}
/>
```

### Inside a checkout form

```tsx
const [deliveryDate, setDeliveryDate] = useState('');

<form onSubmit={handleCheckout}>
  <h2>Choose delivery date</h2>
  <DeliveryDate
    showUpcomingDays={4}
    onDateSelect={(date) => setDeliveryDate(date)}
    containerClass="my-4"
  />
  <button type="submit" disabled={!deliveryDate}>Continue</button>
</form>
```

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

To build a custom delivery date selector, the key requirements are:

1. **Date generation**: Start from tomorrow (`today + 1`) and collect N valid dates, optionally skipping weekend days (Saturday = 6, Sunday = 0).

2. **ISO date format**: The Propeller API expects dates in `YYYY-MM-DDT00:00:00Z` format. Use this format when communicating with the backend.

3. **Display formatting**: Convert ISO strings to human-readable labels. The default uses short English weekday and month names (e.g., `Wed, Mar 12`). Override with a locale-aware formatter for other languages.

4. **Custom date picker**: For dates beyond the quick-select range, use a native `<input type="date">` with `min` set to tomorrow's date in `YYYY-MM-DD` format. Convert the selected value back to the full ISO format before passing it to the callback.

5. **Selection state**: Track which date is selected. Distinguish between quick-select dates and custom-picked dates to apply the correct visual highlight.

6. **Modal pattern**: The built-in date picker uses a modal overlay with backdrop click-to-close. If building your own, ensure the modal is rendered in a portal or at a high z-index to avoid stacking context issues.

### Sending the selected date to the backend

A common integration pattern is to pass the selected ISO date string to a cart update via the Propeller SDK's `CartService`:

```tsx
import { CartService } from 'propeller-sdk-v2';

const cartService = new CartService(graphqlClient);
await cartService.cartUpdate({
  cartId: cart.cartId,
  deliveryDate: selectedDate, // ISO string from onDateSelect
});
```

  </TabItem>
</Tabs>

## Configuration

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

### Date Selection

| Prop | Type | Default | Description |
|---|---|---|---|
| `showUpcomingDays` | `number` | `3` | Number of upcoming days to display as quick-select tiles |
| `skipWeekends` | `boolean` | `true` | Whether to skip Saturdays and Sundays when generating upcoming dates |
| `showDatePicker` | `boolean` | `true` | Show an "Other date..." tile that opens a modal with a native `<input type="date">` |

### Callbacks

| Prop | Type | Default | Description |
|---|---|---|---|
| `onDateSelect` | `(date: string) => void` | -- | Called when a date is selected. Receives the date in ISO format: `YYYY-MM-DDT00:00:00Z` |

### Display & Customization

| Prop | Type | Default | Description |
|---|---|---|---|
| `formatDateDisplay` | `(date: string) => string` | -- | Custom function to format dates for display. Receives an ISO string, returns display text. Default format: `Wed, Mar 12` |
| `labels` | `Record<string, string>` | -- | Override default label strings. Supported keys: `pickDate` (default `"Other date..."`), `modalTitle` (default `"Select a delivery date"`), `cancel` (default `"Cancel"`) |
| `containerClass` | `string` | `'delivery-date'` | CSS class applied to the outermost container element |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

### Function signature

```ts
function deliveryDateSelector(options: DeliveryDateOptions): void
```

### Options

| Field | Type | Default | Maps to |
|---|---|---|---|
| `showUpcomingDays` | `number` | `3` | `showUpcomingDays` prop |
| `skipWeekends` | `boolean` | `true` | `skipWeekends` prop |
| `showDatePicker` | `boolean` | `true` | `showDatePicker` prop |
| `onDateSelect` | `(date: string) => void` | (required) | `onDateSelect` prop |
| `formatDateDisplay` | `(date: string) => string` | -- | `formatDateDisplay` prop |

### UI-only props

The following props are UI-specific and do not apply when building your own:

- `containerClass` -- CSS class for the outermost container
- `labels` -- UI string overrides for tile text, modal title, and cancel button

  </TabItem>
</Tabs>

## Labels

<Tabs groupId="implementation">
  <TabItem value="react" label="React">

| Key | Default | Description |
|-----|---------|-------------|
| `pickDate` | `"Other date..."` | Text on the custom date picker tile |
| `modalTitle` | `"Select a delivery date"` | Heading inside the date picker modal |
| `cancel` | `"Cancel"` | Cancel button text in the modal |

  </TabItem>
  <TabItem value="byo" label="Build Your Own">

```ts
const defaultLabels = {
  pickDate: "Other date...",
  modalTitle: "Select a delivery date",
  cancel: "Cancel",
};
```

These are suggested defaults. Override per-key to support localization.

  </TabItem>
</Tabs>

---

## Behavior

- Generates upcoming dates starting from **tomorrow** (never today).
- Weekends (Saturday and Sunday) are **skipped by default**. Set `skipWeekends={false}` to include them.
- The quick-select tiles are rendered in a responsive grid: 1 column on mobile, 2 on small screens, up to 4 on medium+ screens.
- Clicking a tile selects that date, applies a visual highlight (`border-secondary` + light background), and fires `onDateSelect`.
- The "Other date..." tile opens a modal with a native HTML date input. The minimum selectable date is tomorrow.
- When a custom date is picked, the modal closes automatically and `onDateSelect` fires with the ISO-formatted date.
- If a custom date was previously selected, the "Other date..." tile shows the formatted date instead of the placeholder text.
- Only one date can be selected at a time. Selecting a new date (quick-select or custom) replaces the previous selection.
- The modal closes when clicking the backdrop area outside the dialog, or by pressing the close (X) button or Cancel button.

## SDK Services

This component does **not** call any SDK services directly. It is a purely presentational date-selection UI. The parent component is responsible for sending the selected date to the backend, typically via the cart or order mutation.

A common integration pattern is to pass the selected ISO date string to a cart update mutation:

```graphql
mutation CartUpdate($input: CartUpdateInput!) {
  cartUpdate(input: $input) {
    cart {
      cartId
      deliveryDate
    }
  }
}
```

With variables:

```json
{
  "input": {
    "cartId": "abc-123",
    "deliveryDate": "2026-03-27T00:00:00Z"
  }
}
```

In practice, this is handled through the Propeller SDK's `CartService`:

```tsx
import { CartService } from 'propeller-sdk-v2';

const cartService = new CartService(graphqlClient);
await cartService.cartUpdate({
  cartId: cart.cartId,
  deliveryDate: selectedDate, // ISO string from onDateSelect
});
```
