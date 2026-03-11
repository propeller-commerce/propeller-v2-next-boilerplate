import { useStore, Show, For } from '@builder.io/mitosis';
import { Cart } from 'propeller-sdk-v2';

export interface CartSummaryProps {
    /** The shopping cart used to populate the cart summary data */
    cart: Cart;

    /** Cart summary block title */
    title?: string;

    /** Labels for the component */
    labels?: Record<string, string>;

    /** Display the subtotal of the shopping cart */
    showSubtotal?: boolean;

    /** Display the total discount of the shopping cart */
    showDiscount?: boolean;

    /** Display the shipping costs of the shopping cart */
    showShippingCosts?: boolean;

    /** Display all VATs of the shopping cart */
    showVATs?: boolean;

    /** Display the total of the shopping cart excluding the VAT */
    showTotalExclVat?: boolean;

    /** Display the total VAT of the shopping cart */
    showTotalVat?: boolean;

    /** Display the checkout button */
    showCheckoutButton?: boolean;

    /** Action handler when the checkout button is clicked */
    onCheckoutButtonClick?: (cart: Cart) => void;

    /** Custom price formatting function */
    formatPrice?: (price: number) => string;
}

export default function CartSummary(props: CartSummaryProps) {
    const state = useStore({
        get title() {
            return props.title || 'Order summary';
        },

        get showSubtotal() {
            return props.showSubtotal !== undefined ? props.showSubtotal : true;
        },

        get showDiscount() {
            return props.showDiscount !== undefined ? props.showDiscount : true;
        },

        get showShippingCosts() {
            return props.showShippingCosts !== undefined ? props.showShippingCosts : true;
        },

        get showVATs() {
            return props.showVATs !== undefined ? props.showVATs : true;
        },

        get showTotalExclVat() {
            return props.showTotalExclVat !== undefined ? props.showTotalExclVat : true;
        },

        get showTotalVat() {
            return props.showTotalVat !== undefined ? props.showTotalVat : true;
        },

        get showCheckoutButton() {
            return props.showCheckoutButton !== undefined ? props.showCheckoutButton : true;
        },

        getLabel(key: string, fallback: string) {
            return props.labels?.[key] || fallback;
        },

        formatItemPrice(price: number) {
            if (props.formatPrice) {
                return props.formatPrice(price);
            }
            return '\u20AC' + Number(price || 0).toFixed(2);
        },

        get subtotal() {
            return (props.cart as any)?.total?.subTotal || 0;
        },

        get hasDiscount() {
            const total = (props.cart as any)?.total;
            return total?.discount > 0;
        },

        get discountAmount() {
            return (props.cart as any)?.total?.discount || 0;
        },

        get hasShippingCosts() {
            return (props.cart as any)?.postageData?.price > 0;
        },

        get shippingCosts() {
            return Number((props.cart as any)?.postageData?.price || 0);
        },

        get totalExclVat() {
            return (props.cart as any)?.total?.totalGross || 0;
        },

        get taxLevels() {
            const levels = (props.cart as any)?.taxLevels || [];
            return levels.filter((t: any) => t.taxPercentage > 0 && t.price > 0);
        },

        get totalVat() {
            const net = (props.cart as any)?.total?.totalNet || 0;
            const gross = (props.cart as any)?.total?.totalGross || 0;
            return net - gross;
        },

        get totalInclVat() {
            return (props.cart as any)?.total?.totalNet || 0;
        },

        handleCheckoutClick() {
            if (props.onCheckoutButtonClick) {
                props.onCheckoutButtonClick(props.cart);
            }
        },
    });

    return (
        <div className="w-full bg-white p-6 rounded-lg shadow space-y-3">
            <h2 className="text-xl font-bold mb-4">{state.title}</h2>

            <Show when={state.showSubtotal}>
                <div className="flex justify-between text-gray-600">
                    <span>{state.getLabel('subtotal', 'Subtotal:')}</span>
                    <span>{state.formatItemPrice(state.subtotal)}</span>
                </div>
            </Show>

            <Show when={state.showDiscount && state.hasDiscount}>
                <div className="flex justify-between text-red-600">
                    <span>{state.getLabel('discount', 'Discount:')}</span>
                    <span>-{state.formatItemPrice(state.discountAmount)}</span>
                </div>
            </Show>

            <Show when={state.showShippingCosts && state.hasShippingCosts}>
                <div className="flex justify-between text-gray-600">
                    <span>{state.getLabel('shippingCosts', 'Shipping costs:')}</span>
                    <span>{state.formatItemPrice(state.shippingCosts)}</span>
                </div>
            </Show>

            <Show when={state.showTotalExclVat}>
                <div className="flex justify-between text-gray-600 pt-2 border-t">
                    <span>{state.getLabel('totalExclVat', 'Total excl. VAT:')}</span>
                    <span>{state.formatItemPrice(state.totalExclVat)}</span>
                </div>
            </Show>

            <Show when={state.showVATs && state.taxLevels.length > 0}>
                <For each={state.taxLevels}>
                    {(tax: any, index: number) => (
                        <div key={index} className="flex justify-between text-gray-600 text-sm">
                            <span>{tax.taxPercentage}% {state.getLabel('vat', 'VAT')}:</span>
                            <span>{state.formatItemPrice(Number(tax.price))}</span>
                        </div>
                    )}
                </For>
            </Show>

            <Show when={state.showTotalVat && state.totalVat > 0}>
                <div className="flex justify-between text-gray-600 text-sm">
                    <span>{state.getLabel('totalVat', 'Total VAT:')}</span>
                    <span>{state.formatItemPrice(state.totalVat)}</span>
                </div>
            </Show>

            <div className="flex justify-between text-xl font-bold pt-4 border-t text-gray-900 mt-2">
                <span>{state.getLabel('total', 'Total:')}</span>
                <span>{state.formatItemPrice(state.totalInclVat)}</span>
            </div>

            <Show when={state.showCheckoutButton}>
                <button
                    type="button"
                    onClick={() => state.handleCheckoutClick()}
                    className="block w-full bg-violet-600 text-white text-center py-3 rounded-lg hover:bg-violet-700 transition font-semibold mt-4"
                >
                    {state.getLabel('checkoutButton', 'Continue to Checkout')}
                </button>
            </Show>
        </div>
    );
}
