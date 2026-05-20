'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import { Cart } from 'propeller-sdk-v2';
import { getLabel } from '@/composables/shared/utils/labelHelpers';

export interface DeliveryDateProps {
  /** The cart to use for the delivery date */
  cart: Cart;

  /** Show the upcoming N days in the date selector */
  showUpcomingDays?: number;

  /** Skip weekends in the date selector */
  skipWeekends?: boolean;

  /** Show date picker as an option in the date selector */
  showDatePicker?: boolean;

  /** Action when a delivery date is selected */
  onDateSelect?: (date: string) => void;

  /** Custom date display formatting function */
  formatDateDisplay?: (date: string) => string;

  /** Labels for the component */
  labels?: Record<string, string>;

  /** The CSS class for the container */
  containerClass?: string;

  /** Pre-selected date from cart (e.g. cart.postageData.requestDate: "2026-04-17T00:00:00.000Z") */
  initialDate?: string;
}

// ── Pure date helpers (module scope — created once, not per render) ─────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function toApiDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00:00Z`;
}

/** Tomorrow as a YYYY-MM-DD string (the minimum selectable date). */
function getMinDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function computeUpcomingDates(count: number, skipWeekends: boolean): string[] {
  const days: string[] = [];
  const current = new Date();
  current.setDate(current.getDate() + 1);
  while (days.length < count) {
    const dayOfWeek = current.getDay();
    if (!skipWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
      days.push(toApiDate(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function DeliveryDate(props: DeliveryDateProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [customDateValue, setCustomDateValue] = useState('');
  const [customDateError, setCustomDateError] = useState('');

  const upcomingDays = props.showUpcomingDays !== undefined ? props.showUpcomingDays : 3;
  const skipWeekends = props.skipWeekends !== undefined ? props.skipWeekends : true;
  const showDatePicker = props.showDatePicker !== undefined ? props.showDatePicker : true;
  const containerClass = props.containerClass || 'delivery-date';
  const minDate = getMinDate();

  // Computed once per render (previously recomputed on every call — and
  // `upcomingDates()` was invoked once for the map plus 3× via
  // `isCustomDateSelected()`, each running a Date-math while loop).
  const upcomingDates = computeUpcomingDates(upcomingDays, skipWeekends);
  const isCustomDateSelected = selectedDate !== '' && upcomingDates.indexOf(selectedDate) === -1;

  function formatDisplay(isoDate: string): string {
    if (props.formatDateDisplay) {
      return props.formatDateDisplay(isoDate);
    }
    // Guard against bad input: invalid dates produce NaN/undefined and render
    // as "undefined, undefined NaN". Return an empty string so the caller can
    // decide what to show.
    if (!isoDate) return '';
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
    return `${WEEKDAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
  }

  function handleSelect(isoDate: string): void {
    setSelectedDate(isoDate);
    setModalOpen(false);
    if (props.onDateSelect) {
      props.onDateSelect(isoDate);
    }
  }

  function handleCustomDateChange(value: string): void {
    // Validate before committing. The native date input doesn't reliably enforce
    // the `min` attribute on typed input across browsers, and historical or
    // out-of-range dates parse to a real Date that crashes downstream rendering
    // ("undefined, undefined NaN"). On any failure we keep the typed value in
    // the input so the user can fix it, and surface a single error message.
    setCustomDateValue(value);
    if (!value) {
      setCustomDateError('');
      return;
    }
    const parsed = new Date(value + 'T00:00:00');
    const year = parsed.getFullYear();
    const isParseable = !isNaN(parsed.getTime()) && year >= 1900 && year <= 9999;
    if (!isParseable) {
      setCustomDateError(getLabel(props.labels, 'invalidDate', 'Please enter a valid date.'));
      return;
    }
    // Reject anything earlier than minDate (tomorrow). String comparison works
    // because both sides are ISO-formatted YYYY-MM-DD.
    if (value < minDate) {
      setCustomDateError(getLabel(props.labels, 'pastDate', 'Please select a date in the future.'));
      return;
    }
    setCustomDateError('');
    handleSelect(toApiDate(parsed));
  }

  function openModal(): void {
    setCustomDateError('');
    setModalOpen(true);
  }

  function closeModal(): void {
    setCustomDateError('');
    setModalOpen(false);
  }

  function handleBackdropClick(event: React.MouseEvent): void {
    if (event.target === event.currentTarget) {
      setCustomDateError('');
      setModalOpen(false);
    }
  }

  // Sync external `initialDate` (from cart.postageData.requestDate) into our
  // local selection state — but only once per `initialDate` change, and only
  // when the user hasn't already picked a date themselves. This propagates
  // the cart's stored delivery date back to the parent via onDateSelect on
  // initial cart load (parent stores selectedDeliveryDate in its own state,
  // which it needs for "Continue" validation).
  //
  // The React Compiler rule flags this as set-state-in-effect; in this case
  // it's intentional external-state sync (the textbook valid use of
  // useEffect) — derived-state-from-props won't work here because we also
  // need to fire props.onDateSelect as a side effect on adoption, and the
  // user can override the initial with handleSelect.
  useEffect(() => {
    if (props.initialDate && !selectedDate) {
      // Normalize cart format "2026-04-17T00:00:00.000Z" → "2026-04-17T00:00:00Z"
      const dot = props.initialDate.lastIndexOf('.');
      const normalized = dot !== -1 ? props.initialDate.substring(0, dot) + 'Z' : props.initialDate;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedDate(normalized);
      if (props.onDateSelect) {
        props.onDateSelect(normalized);
      }
    }
  }, [props.initialDate, props.cart, selectedDate, props.onDateSelect, props]);

  return (
    <div className={`propeller-delivery-date ${containerClass}`}>
      <div className="propeller-delivery-date__grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {upcomingDates.map((dateStr, index) => (
          <div
            key={index}
            onClick={() => handleSelect(dateStr)}
            data-selected={selectedDate === dateStr ? 'true' : 'false'}
            className={`propeller-delivery-date__option cursor-pointer border border-border rounded-container p-3 text-center transition-all ${selectedDate === dateStr ? 'border-secondary bg-secondary/5 shadow-sm' : 'hover:border-secondary/30'}`}
          >
            <div className="propeller-delivery-date__option-label font-semibold">
              {formatDisplay(dateStr)}
            </div>
          </div>
        ))}
        {showDatePicker ? (
          <div
            onClick={() => openModal()}
            data-selected={isCustomDateSelected ? 'true' : 'false'}
            data-custom="true"
            className={`propeller-delivery-date__option propeller-delivery-date__option--custom cursor-pointer border border-border rounded-container p-3 text-center transition-all ${isCustomDateSelected ? 'border-secondary bg-secondary/5 shadow-sm' : 'hover:border-secondary/30'}`}
          >
            <div className="propeller-delivery-date__option-label font-semibold">
              {isCustomDateSelected
                ? formatDisplay(selectedDate)
                : getLabel(props.labels, 'pickDate', 'Other date...')}
            </div>
          </div>
        ) : null}
      </div>
      {modalOpen ? (
        <div
          className="propeller-delivery-date__modal fixed inset-0 z-50 flex items-center justify-center bg-foreground/50"
          onClick={(event) => handleBackdropClick(event)}
        >
          <div className="propeller-delivery-date__modal-content bg-card rounded-container shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="propeller-delivery-date__modal-header flex justify-between items-center mb-4">
              <h3 className="propeller-delivery-date__modal-title text-lg font-semibold">
                {getLabel(props.labels, 'modalTitle', 'Select a delivery date')}
              </h3>
              <button
                type="button"
                className="propeller-delivery-date__modal-close text-foreground-subtle hover:text-foreground transition-colors"
                onClick={() => closeModal()}
              >
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input
              type="date"
              className={`propeller-delivery-date__input w-full border rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 ${customDateError ? 'border-destructive focus:ring-destructive focus:border-destructive' : 'border-input focus:ring-secondary focus:border-secondary'}`}
              min={minDate}
              value={customDateValue}
              onChange={(event) => handleCustomDateChange(event.target.value)}
            />
            {customDateError ? (
              <p
                className="propeller-delivery-date__input-error text-sm text-destructive mt-2"
                role="alert"
              >
                {customDateError}
              </p>
            ) : null}
            <div className="propeller-delivery-date__modal-actions flex justify-end gap-3 mt-4">
              <button
                type="button"
                className="propeller-delivery-date__cancel-btn px-4 py-2 text-sm font-medium text-foreground bg-surface-hover rounded-control hover:bg-muted transition-colors"
                onClick={() => closeModal()}
              >
                {getLabel(props.labels, 'cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DeliveryDate;
