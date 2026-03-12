# DeliveryDate

Provides an interface for selecting a preferred delivery date during checkout.

## Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `showUpcomingDays` | `number` | No | `3` | Number of upcoming days to show in the selector |
| `skipWeekends` | `boolean` | No | `true` | Skip weekends in the date selector |
| `showDatePicker` | `boolean` | No | `true` | Show an "Other date..." option with a date picker |
| `onDateSelect` | `(date: string) => void` | No | — | Callback when a date is selected (ISO format: `YYYY-MM-DDT00:00:00Z`) |
| `formatDateDisplay` | `(date: string) => string` | No | — | Custom date display formatting function |
| `labels` | `Record<string, string>` | No | — | Label overrides (`pickDate`) |
| `containerClass` | `string` | No | `'delivery-date'` | CSS class for the container |

## Usage

```tsx
import DeliveryDate from '@/components/propeller/DeliveryDate';

// Basic usage — 3 upcoming weekdays + date picker
<DeliveryDate
  onDateSelect={(date) => setSelectedDate(date)}
/>

// 5 days including weekends, no date picker
<DeliveryDate
  showUpcomingDays={5}
  skipWeekends={false}
  showDatePicker={false}
  onDateSelect={(date) => setSelectedDate(date)}
/>
```

## Behavior

- Shows the next N working days (skipping weekends by default) starting from tomorrow
- Optionally shows an "Other date..." button that opens a native date picker
- Date picker has a minimum date of tomorrow
- Selected date is returned in ISO format: `YYYY-MM-DDT00:00:00Z`
- Default display format: `Wed, Mar 12`

## Files

- **Mitosis source**: `ui-components/DeliveryDate.lite.tsx`
- **Compiled React**: `output/react/ui-components/DeliveryDate.tsx`
- **Active copy**: `components/propeller/DeliveryDate.tsx`
