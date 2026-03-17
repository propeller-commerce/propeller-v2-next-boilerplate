import { useStore, Show, For } from '@builder.io/mitosis';

export interface DeliveryDateProps {
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
}

export default function DeliveryDate(props: DeliveryDateProps) {
    const state = useStore({
        _selectedDate: '' as string,
        _modalOpen: false as boolean,
        _customDateValue: '' as string,

        get upcomingDays(): number {
            return props.showUpcomingDays !== undefined ? props.showUpcomingDays : 3;
        },

        get skipWeekends(): boolean {
            return props.skipWeekends !== undefined ? props.skipWeekends : true;
        },

        get showDatePicker(): boolean {
            return props.showDatePicker !== undefined ? props.showDatePicker : true;
        },

        get isCustomDateSelected(): boolean {
            return state._selectedDate !== '' && state.upcomingDates.indexOf(state._selectedDate) === -1;
        },

        get containerClass(): string {
            return props.containerClass || 'delivery-date';
        },

        getLabel(key: string, fallback: string): string {
            return props.labels?.[key] || fallback;
        },

        get upcomingDates(): string[] {
            const days: string[] = [];
            const today = new Date();
            const current = new Date(today);
            current.setDate(current.getDate() + 1);

            while (days.length < state.upcomingDays) {
                const dayOfWeek = current.getDay();
                if (!state.skipWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
                    days.push(state.toApiDate(current));
                }
                current.setDate(current.getDate() + 1);
            }
            return days;
        },

        toApiDate(date: Date): string {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return y + '-' + m + '-' + d + 'T00:00:00Z';
        },

        formatDisplay(isoDate: string): string {
            if (props.formatDateDisplay) {
                return props.formatDateDisplay(isoDate);
            }
            const date = new Date(isoDate);
            const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return weekday + ', ' + months[date.getMonth()] + ' ' + date.getDate();
        },

        get minDate(): string {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const y = tomorrow.getFullYear();
            const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
            const d = String(tomorrow.getDate()).padStart(2, '0');
            return y + '-' + m + '-' + d;
        },

        handleSelect(isoDate: string): void {
            state._selectedDate = isoDate;
            state._modalOpen = false;
            if (props.onDateSelect) {
                props.onDateSelect(isoDate);
            }
        },

        handleCustomDateChange(value: string): void {
            state._customDateValue = value;
            if (value) {
                const date = new Date(value + 'T00:00:00');
                const isoDate = state.toApiDate(date);
                state.handleSelect(isoDate);
            }
        },

        openModal(): void {
            state._modalOpen = true;
        },

        closeModal(): void {
            state._modalOpen = false;
        },

        handleBackdropClick(event: Event): void {
            if (event.target === event.currentTarget) {
                state._modalOpen = false;
            }
        },
    });

    return (
        <div className={state.containerClass}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <For each={state.upcomingDates}>
                    {(dateStr: string, index: number) => (
                        <div
                            key={index}
                            onClick={() => state.handleSelect(dateStr)}
                            className={`cursor-pointer border border-gray-200 rounded-lg p-3 text-center transition-all ${state._selectedDate === dateStr ? 'border-violet-600 bg-violet-50 shadow-sm' : 'hover:border-violet-300'}`}
                        >
                            <div className="font-semibold">{state.formatDisplay(dateStr)}</div>
                        </div>
                    )}
                </For>

                <Show when={state.showDatePicker}>
                    <div
                        onClick={() => state.openModal()}
                        className={`cursor-pointer border border-gray-200 rounded-lg p-3 text-center transition-all ${state.isCustomDateSelected ? 'border-violet-600 bg-violet-50 shadow-sm' : 'hover:border-violet-300'}`}
                    >
                        <Show when={state.isCustomDateSelected}>
                            <div className="font-semibold">{state.formatDisplay(state._selectedDate)}</div>
                        </Show>
                        <Show when={!state.isCustomDateSelected}>
                            <div className="font-semibold">{state.getLabel('pickDate', 'Other date...')}</div>
                        </Show>
                    </div>
                </Show>
            </div>

            {/* Date picker modal */}
            <Show when={state._modalOpen}>
                <div
                    onClick={(event) => state.handleBackdropClick(event as unknown as Event)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                >
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">{state.getLabel('modalTitle', 'Select a delivery date')}</h3>
                            <button
                                type="button"
                                onClick={() => state.closeModal()}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <input
                            type="date"
                            min={state.minDate}
                            value={state._customDateValue}
                            onChange={(event) => state.handleCustomDateChange(event.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                        />

                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                type="button"
                                onClick={() => state.closeModal()}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                {state.getLabel('cancel', 'Cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
}
