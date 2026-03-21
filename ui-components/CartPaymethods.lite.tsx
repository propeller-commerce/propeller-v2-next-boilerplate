import { useStore, Show, For } from '@builder.io/mitosis';
import { Cart, CartPaymethod, Contact, Customer } from 'propeller-sdk-v2';

export interface CartPaymethodsProps {
    /** Shopping cart object from which the payment methods will be displayed */
    cart: Cart;

    /** Authenticated user — used for cart creation / lookup. */
    user: Contact | Customer | null;

    /** The CSS class for the payment methods container */
    paymentsContainerClass?: string;


    /** Display the on account payment method for anonymous users */
    showOnAccountForGuests?: boolean;

    /** Action when a payment method is selected */
    onPaymethodSelect?: (paymethod: CartPaymethod) => void;

    /** Custom price formatting function */
    formatPrice?: (price: number) => string;

    /** Labels for the component */
    labels?: Record<string, string>;
}

interface CartPaymethodsState {
    selectedCode: string;
    containerClass: string;
    showOnAccountForGuests: boolean;
    isGuest: boolean;
    payMethods: CartPaymethod[];
    isOnAccountMethod: (method: CartPaymethod) => boolean;
    getLabel: (key: string, fallback: string) => string;
    formatMethodPrice: (price: number) => string;
    handleSelect: (method: CartPaymethod) => void;
}

export default function CartPaymethods(props: CartPaymethodsProps) {
    const state = useStore<CartPaymethodsState>({
        selectedCode: '',

        get containerClass(): string {
            return props.paymentsContainerClass || 'cart-paymethods';
        },

        get showOnAccountForGuests(): boolean {
            return props.showOnAccountForGuests !== undefined ? props.showOnAccountForGuests : false;
        },

        get isGuest(): boolean {
            return !props.user;
        },

        get payMethods(): CartPaymethod[] {
            const methods: CartPaymethod[] = props.cart?.payMethods || [];
            return methods.filter((m: CartPaymethod) => {
                if (!m?.code) return false;
                if (!state.showOnAccountForGuests && state.isGuest && state.isOnAccountMethod(m)) {
                    return false;
                }
                return true;
            });
        },

        isOnAccountMethod(method: CartPaymethod): boolean {
            const code = (method.code || '').toLowerCase();
            return code === 'on_account' || code === 'onaccount' || code === 'on-account';
        },

        getLabel(key: string, fallback: string): string {
            return props.labels?.[key] || fallback;
        },

        formatMethodPrice(price: number): string {
            if (props.formatPrice) {
                return props.formatPrice(price);
            }
            return '\u20AC' + Number(price || 0).toFixed(2);
        },

        handleSelect(method: CartPaymethod): void {
            state.selectedCode = method.code;
            if (props.onPaymethodSelect) {
                props.onPaymethodSelect(method);
            }
        },
    });

    return (
        <div className={state.containerClass}>
            <Show when={state.payMethods.length > 0}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <For each={state.payMethods}>
                        {(method: CartPaymethod, index: number) => (
                            <div
                                key={method.code}
                                onClick={() => state.handleSelect(method)}
                                className={`cursor-pointer border border-gray-200 rounded-lg p-4 flex flex-col gap-2 transition-all ${state.selectedCode === method.code ? 'border-violet-600 bg-violet-50 shadow-sm' : 'hover:border-violet-300'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{method.name || method.code}</span>
                                    </div>
                                    <Show when={method.price > 0}>
                                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                            {state.formatMethodPrice(method.price)}
                                        </span>
                                    </Show>
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            </Show>

            <Show when={state.payMethods.length === 0}>
                <p className="text-gray-500 italic">
                    {state.getLabel('noMethods', 'No payment methods available.')}
                </p>
            </Show>
        </div>
    );
}
