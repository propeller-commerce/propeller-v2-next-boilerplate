import { useStore, onMount } from '@builder.io/mitosis';

export interface PriceToggleProps {
    /**
     * Label text shown beside the toggle.
     * Defaults to 'Prices:'.
     */
    label?: string;

    /**
     * Initial state of the toggle.
     * Defaults to true (incl. VAT).
     */
    initialState?: boolean;

    /**
     * Required callback fired when the toggle is switched.
     * Receives the new state: true = incl. VAT, false = excl. VAT.
     */
    inclExclVatSwitched: (on: boolean) => void;

    /** Extra CSS class applied to the root element. */
    className?: string;
}

interface PriceToggleState {
    isOn: boolean;
    getLabel: () => string;
    getStatusText: () => string;
    handleToggle: () => void;
}

export default function PriceToggle(props: PriceToggleProps) {
    const state = useStore<PriceToggleState>({
        isOn: props.initialState ?? true,
        getLabel() {
            return (props.label as string) || 'Prices:';
        },
        getStatusText(): string {
            return state.isOn ? 'Incl. VAT' : 'Excl. VAT';
        },
        handleToggle() {
            const newValue = !state.isOn;
            state.isOn = newValue;

            if (props.inclExclVatSwitched) {
                props.inclExclVatSwitched(newValue);
            }

            window.dispatchEvent(new CustomEvent('priceToggleChanged', { detail: newValue }));
        },
    });

    onMount(() => {
        if (typeof window !== 'undefined') {
            state.isOn = props.initialState ?? true;
        }
    });

    return (
        <div
            className={`price-toggle flex items-center gap-2 ${(props.className as string) || ''}`}
        >
            <span className="hidden sm:inline text-xs">{state.getLabel()}</span>
            <button
                type="button"
                role="switch"
                aria-checked={state.isOn}
                onClick={() => state.handleToggle()}
                className="hover:opacity-80 transition-opacity text-xs font-medium"
            >
                {state.getStatusText()}
            </button>
        </div>
    );
}
