import { useStore, Show, For, onUpdate } from '@builder.io/mitosis';
import { Cart, CartCarrier } from 'propeller-sdk-v2';

export interface CartCarriersProps {
    /** Shopping cart object from which the carriers will be displayed */
    cart: Cart;

    /** The CSS class for the carriers container */
    carriersContainerClass?: string;

    /** Display the carrier logo */
    showCarrierLogo?: boolean;

    /** Action when a carrier is selected */
    onCarrierSelect?: (carrier: CartCarrier) => void;

    /** Custom price formatting function */
    formatPrice?: (price: number) => string;

    /** Show carrier price (default: true) */
    showPrice?: boolean;

    /** Labels for the component */
    labels?: Record<string, string>;
}

interface CartCarriersState {
    selectedName: string;
    containerClass: string;
    showLogo: boolean;
    carriers: CartCarrier[];
    getLabel: (key: string, fallback: string) => string;
    formatCarrierPrice: (price: number) => string;
    getLogoUrl: (carrier: CartCarrier) => string;
    handleSelect: (carrier: CartCarrier) => void;
}

export default function CartCarriers(props: CartCarriersProps) {
    const state = useStore<CartCarriersState>({
        selectedName: '',

        get containerClass(): string {
            return props.carriersContainerClass || 'cart-carriers';
        },

        get showLogo(): boolean {
            return props.showCarrierLogo !== undefined ? props.showCarrierLogo : true;
        },

        get carriers(): CartCarrier[] {
            return props.cart?.carriers || [];
        },

        getLabel(key: string, fallback: string): string {
            return props.labels?.[key] || fallback;
        },

        formatCarrierPrice(price: number): string {
            if (props.formatPrice) {
                return props.formatPrice(price);
            }
            return '\u20AC' + Number(price || 0).toFixed(2);
        },

        getLogoUrl(carrier: CartCarrier): string {
            return carrier.logo || '';
        },

        handleSelect(carrier: CartCarrier): void {
            state.selectedName = carrier.name;
            if (props.onCarrierSelect) {
                props.onCarrierSelect(carrier);
            }
        },
    });

    onUpdate(() => {
        if (!state.selectedName && props.cart?.postageData?.carrier) {
            state.selectedName = props.cart.postageData.carrier as string;
            if (props.onCarrierSelect) {
                const match = state.carriers.find((c: CartCarrier) => c.name === state.selectedName);
                if (match) props.onCarrierSelect(match);
            }
        }
    }, [props.cart]);

    return (
        <div className={state.containerClass}>
            <Show when={state.carriers.length > 0}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <For each={state.carriers}>
                        {(carrier: CartCarrier, index: number) => (
                            <div
                                key={`${carrier.name}-${index}`}
                                onClick={() => state.handleSelect(carrier)}
                                className={`cursor-pointer border border-gray-200 rounded-lg p-4 flex flex-col gap-2 transition-all ${state.selectedName === carrier.name ? 'border-secondary bg-secondary/5 shadow-sm' : 'hover:border-secondary/30'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Show when={state.showLogo && state.getLogoUrl(carrier)}>
                                            <img
                                                src={state.getLogoUrl(carrier)}
                                                alt={carrier.name}
                                                className="h-6 w-auto"
                                            />
                                        </Show>
                                        <span className="font-medium">{carrier.name}</span>
                                    </div>
                                    <Show when={props.showPrice !== false}>
                                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                            {state.formatCarrierPrice(carrier.price)}
                                        </span>
                                    </Show>
                                </div>
                                <Show when={carrier.deliveryDeadline}>
                                    <p className="text-xs text-gray-500">
                                        {state.getLabel('deliveryDeadline', 'Delivery deadline:')} {carrier.deliveryDeadline}
                                    </p>
                                </Show>
                            </div>
                        )}
                    </For>
                </div>
            </Show>

            <Show when={state.carriers.length === 0}>
                <p className="text-gray-500 italic">
                    {state.getLabel('noCarriers', 'No carriers available.')}
                </p>
            </Show>
        </div>
    );
}
