import { useStore, Show, For } from '@builder.io/mitosis';
import { Cart, CartPaymethod } from 'propeller-sdk-v2';

export interface CartPaymethodsProps {
    /** Shopping cart object from which the payment methods will be displayed */
    cart: Cart;

    /** The CSS class for the payment methods container */
    paymentsContainerClass?: string;

    /** Display the payment method logo */
    showPaymentMethodLogo?: boolean;

    /** Display the on account payment method for anonymous users */
    showOnAccountForGuests?: boolean;

    /** Action when a payment method is selected */
    onPaymethodSelect?: (paymethod: CartPaymethod) => void;

    /** Custom price formatting function */
    formatPrice?: (price: number) => string;

    /** Labels for the component */
    labels?: Record<string, string>;
}

export default function CartPaymethods(props: CartPaymethodsProps) {
    const state = useStore({
        _selectedCode: '' as string,

        get containerClass() {
            return props.paymentsContainerClass || 'cart-paymethods';
        },

        get showLogo() {
            return props.showPaymentMethodLogo !== undefined ? props.showPaymentMethodLogo : true;
        },

        get showOnAccountForGuests() {
            return props.showOnAccountForGuests !== undefined ? props.showOnAccountForGuests : false;
        },

        get isGuest() {
            try {
                const user = localStorage.getItem('user');
                return !user;
            } catch {
                return true;
            }
        },

        get payMethods() {
            const methods = (props.cart as any)?.payMethods || [];
            return methods.filter((m: any) => {
                if (!m?.code) return false;
                if (!state.showOnAccountForGuests && state.isGuest && state.isOnAccountMethod(m)) {
                    return false;
                }
                return true;
            });
        },

        isOnAccountMethod(method: any) {
            const code = (method.code || '').toLowerCase();
            return code === 'on_account' || code === 'onaccount' || code === 'on-account';
        },

        getLabel(key: string, fallback: string) {
            return props.labels?.[key] || fallback;
        },

        formatMethodPrice(price: number) {
            if (props.formatPrice) {
                return props.formatPrice(price);
            }
            return '\u20AC' + Number(price || 0).toFixed(2);
        },

        getLogoUrl(method: any) {
            const code = (method.code || '').toLowerCase();
            const logoMap: Record<string, string> = {
                'ideal': 'https://cdn.propellor.cloud/payment-logos/ideal.svg',
                'bancontact': 'https://cdn.propellor.cloud/payment-logos/bancontact.svg',
                'creditcard': 'https://cdn.propellor.cloud/payment-logos/creditcard.svg',
                'paypal': 'https://cdn.propellor.cloud/payment-logos/paypal.svg',
                'klarna': 'https://cdn.propellor.cloud/payment-logos/klarna.svg',
                'sofort': 'https://cdn.propellor.cloud/payment-logos/sofort.svg',
                'giropay': 'https://cdn.propellor.cloud/payment-logos/giropay.svg',
                'eps': 'https://cdn.propellor.cloud/payment-logos/eps.svg',
            };
            return logoMap[code] || '';
        },

        handleSelect(method: any) {
            state._selectedCode = method.code;
            if (props.onPaymethodSelect) {
                props.onPaymethodSelect(method as CartPaymethod);
            }
        },
    });

    return (
        <div className={state.containerClass}>
            <Show when={state.payMethods.length > 0}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <For each={state.payMethods}>
                        {(method: any, index: number) => (
                            <div
                                key={method.code}
                                onClick={() => state.handleSelect(method)}
                                className={`cursor-pointer border border-gray-200 rounded-lg p-4 flex flex-col gap-2 transition-all ${state._selectedCode === method.code ? 'border-violet-600 bg-violet-50 shadow-sm' : 'hover:border-violet-300'}`}
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Show when={state.showLogo && state.getLogoUrl(method)}>
                                            <img
                                                src={state.getLogoUrl(method)}
                                                alt={method.name || method.code}
                                                className="h-6 w-auto"
                                            />
                                        </Show>
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
