'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import { Cart } from 'propeller-sdk-v2';

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
interface DeliveryDateState {
  selectedDate: string;
  modalOpen: boolean;
  customDateValue: string;
  upcomingDays: () => number;
  skipWeekends: () => boolean;
  showDatePicker: () => boolean;
  isCustomDateSelected: () => boolean;
  containerClass: () => string;
  upcomingDates: () => string[];
  minDate: () => string;
  getLabel: (key: string, fallback: string) => string;
  toApiDate: (date: Date) => string;
  formatDisplay: (isoDate: string) => string;
  handleSelect: (isoDate: string) => void;
  handleCustomDateChange: (value: string) => void;
  openModal: () => void;
  closeModal: () => void;
  handleBackdropClick: (event: Event) => void;
}
function DeliveryDate(props: DeliveryDateProps) {
  const [selectedDate, setSelectedDate] = useState<DeliveryDateState['selectedDate']>(() => '');
  const [modalOpen, setModalOpen] = useState<DeliveryDateState['modalOpen']>(() => false);
  const [customDateValue, setCustomDateValue] = useState<DeliveryDateState['customDateValue']>(
    () => ''
  );
  function upcomingDays(): ReturnType<DeliveryDateState['upcomingDays']> {
    return props.showUpcomingDays !== undefined ? props.showUpcomingDays : 3;
  }
  function skipWeekends(): ReturnType<DeliveryDateState['skipWeekends']> {
    return props.skipWeekends !== undefined ? props.skipWeekends : true;
  }
  function showDatePicker(): ReturnType<DeliveryDateState['showDatePicker']> {
    return props.showDatePicker !== undefined ? props.showDatePicker : true;
  }
  function isCustomDateSelected(): ReturnType<DeliveryDateState['isCustomDateSelected']> {
    return selectedDate !== '' && upcomingDates().indexOf(selectedDate) === -1;
  }
  function containerClass(): ReturnType<DeliveryDateState['containerClass']> {
    return props.containerClass || 'delivery-date';
  }
  function getLabel(key: string, fallback: string): ReturnType<DeliveryDateState['getLabel']> {
    return props.labels?.[key] || fallback;
  }
  function upcomingDates(): ReturnType<DeliveryDateState['upcomingDates']> {
    const days: string[] = [];
    const today = new Date();
    const current = new Date(today);
    current.setDate(current.getDate() + 1);
    while (days.length < upcomingDays()) {
      const dayOfWeek = current.getDay();
      if (!skipWeekends() || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
        days.push(toApiDate(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  }
  function toApiDate(date: Date): ReturnType<DeliveryDateState['toApiDate']> {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d + 'T00:00:00Z';
  }
  function formatDisplay(isoDate: string): ReturnType<DeliveryDateState['formatDisplay']> {
    if (props.formatDateDisplay) {
      return props.formatDateDisplay(isoDate);
    }
    const date = new Date(isoDate);
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return weekday + ', ' + months[date.getMonth()] + ' ' + date.getDate();
  }
  function minDate(): ReturnType<DeliveryDateState['minDate']> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  function handleSelect(isoDate: string): ReturnType<DeliveryDateState['handleSelect']> {
    setSelectedDate(isoDate);
    setModalOpen(false);
    if (props.onDateSelect) {
      props.onDateSelect(isoDate);
    }
  }
  function handleCustomDateChange(
    value: string
  ): ReturnType<DeliveryDateState['handleCustomDateChange']> {
    setCustomDateValue(value);
    if (value) {
      const date = new Date(value + 'T00:00:00');
      const isoDate = toApiDate(date);
      handleSelect(isoDate);
    }
  }
  function openModal(): ReturnType<DeliveryDateState['openModal']> {
    setModalOpen(true);
  }
  function closeModal(): ReturnType<DeliveryDateState['closeModal']> {
    setModalOpen(false);
  }
  function handleBackdropClick(event: Event): ReturnType<DeliveryDateState['handleBackdropClick']> {
    if (event.target === event.currentTarget) {
      setModalOpen(false);
    }
  }
  useEffect(() => {
    if (props.initialDate && !selectedDate) {
      // Normalize cart format "2026-04-17T00:00:00.000Z" → "2026-04-17T00:00:00Z"
      const dot = props.initialDate.lastIndexOf('.');
      const normalized = dot !== -1 ? props.initialDate.substring(0, dot) + 'Z' : props.initialDate;
      setSelectedDate(normalized);
      if (props.onDateSelect) {
        props.onDateSelect(normalized);
      }
    }
  }, [props.initialDate, props.cart]);
  return (
    <div className={`propeller-delivery-date ${containerClass()}`}>
      <div className="propeller-delivery-date__grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {upcomingDates()?.map((dateStr, index) => (
          <div
            key={index}
            onClick={(event) => handleSelect(dateStr)}
            data-selected={selectedDate === dateStr ? 'true' : 'false'}
            className={`propeller-delivery-date__option cursor-pointer border border-border rounded-container p-3 text-center transition-all ${selectedDate === dateStr ? 'border-secondary bg-secondary/5 shadow-sm' : 'hover:border-secondary/30'}`}
          >
            <div className="propeller-delivery-date__option-label font-semibold">{formatDisplay(dateStr)}</div>
          </div>
        ))}
        {showDatePicker() ? (
          <div
            onClick={(event) => openModal()}
            data-selected={isCustomDateSelected() ? 'true' : 'false'}
            data-custom="true"
            className={`propeller-delivery-date__option propeller-delivery-date__option--custom cursor-pointer border border-border rounded-container p-3 text-center transition-all ${isCustomDateSelected() ? 'border-secondary bg-secondary/5 shadow-sm' : 'hover:border-secondary/30'}`}
          >
            {isCustomDateSelected() ? (
              <div className="propeller-delivery-date__option-label font-semibold">{formatDisplay(selectedDate)}</div>
            ) : null}
            {!isCustomDateSelected() ? (
              <div className="propeller-delivery-date__option-label font-semibold">{getLabel('pickDate', 'Other date...')}</div>
            ) : null}
          </div>
        ) : null}
      </div>
      {modalOpen ? (
        <div
          className="propeller-delivery-date__modal fixed inset-0 z-50 flex items-center justify-center bg-foreground/50"
          onClick={(event) => handleBackdropClick(event as unknown as Event)}
        >
          <div className="propeller-delivery-date__modal-content bg-card rounded-container shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="propeller-delivery-date__modal-header flex justify-between items-center mb-4">
              <h3 className="propeller-delivery-date__modal-title text-lg font-semibold">
                {getLabel('modalTitle', 'Select a delivery date')}
              </h3>
              <button
                type="button"
                className="propeller-delivery-date__modal-close text-foreground-subtle hover:text-foreground transition-colors"
                onClick={(event) => closeModal()}
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
              className="propeller-delivery-date__input w-full border border-input rounded-control px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
              min={minDate()}
              value={customDateValue}
              onChange={(event) => handleCustomDateChange(event.target.value)}
            />
            <div className="propeller-delivery-date__modal-actions flex justify-end gap-3 mt-4">
              <button
                type="button"
                className="propeller-delivery-date__cancel-btn px-4 py-2 text-sm font-medium text-foreground bg-surface-hover rounded-control hover:bg-muted transition-colors"
                onClick={(event) => closeModal()}
              >
                {getLabel('cancel', 'Cancel')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default DeliveryDate;
