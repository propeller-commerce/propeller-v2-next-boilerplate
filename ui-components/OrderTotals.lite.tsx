import { useStore, Show, For } from '@builder.io/mitosis';
import { Order, Enums } from 'propeller-sdk-v2';

export interface OrderTotalsProps {
    /** The order/quote used to populate the summary data */
    order: Order;

    /** Order summary block title */
    title?: string;

    /** Labels for the component */
    labels?: Record<string, string>;

    /** Display the subtotal of the order/quote */
    showSubtotal?: boolean;

    /** Display the total discount of the order/quote */
    showDiscount?: boolean;

    /** Display the shipping costs of the order/quote */
    showShippingCosts?: boolean;

    /** Display all VATs of the order/quote */
    showVATs?: boolean;

    /** Display the total of the order/quote excluding the VAT */
    showTotalExclVat?: boolean;

    /** Display the total VAT of the order/quote */
    showTotalVat?: boolean;

    /** Custom price formatting function */
    formatPrice?: (price: number) => string;
}

interface OrderTotalsState {
    title: string;
    showSubtotal: boolean;
    showDiscount: boolean;
    showShippingCosts: boolean;
    showVATs: boolean;
    showTotalExclVat: boolean;
    showTotalVat: boolean;
    getLabel: (key: string, fallback: string) => string;
    formatItemPrice: (price: number) => string;
    subtotal: number;
    hasDiscount: boolean;
    discountDisplay: string;
    subtotalWithDiscount: number;
    hasTransactionCosts: boolean;
    transactionCosts: number;
    hasShippingCosts: boolean;
    shippingCosts: number;
    totalExclVat: number;
    taxPercentages: any[];
    totalInclVat: number;
    totalVat: number;
}

export default function OrderTotals(props: OrderTotalsProps) {
    const state = useStore<OrderTotalsState>({
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

        getLabel(key: string, fallback: string) {
            return props.labels?.[key] || fallback;
        },

        formatItemPrice(price: number) {
            if (props.formatPrice) {
                return props.formatPrice(price);
            }
            return '€' + Number(price || 0).toFixed(2);
        },

        get subtotal() {
            return (props.order as any)?.total?.gross || 0;
        },

        get hasDiscount() {
            const total = (props.order as any)?.total;
            return total?.discountType
                && total.discountType !== Enums.OrderDiscountType.N
                && total.discountValue > 0;
        },

        get discountDisplay() {
            const total = (props.order as any)?.total;
            if (!total) return '';
            if (total.discountType === Enums.OrderDiscountType.A) {
                return '-' + state.formatItemPrice(total.discountValue);
            }
            if (total.discountType === Enums.OrderDiscountType.P) {
                return '- ' + total.discountValue + '%';
            }
            return '-' + state.formatItemPrice(total.discountValue);
        },

        get subtotalWithDiscount() {
            const total = (props.order as any)?.total;
            return (total?.gross || 0) - (total?.discountValue || 0);
        },

        get hasTransactionCosts() {
            return (props.order as any)?.paymentData?.gross > 0;
        },

        get transactionCosts() {
            return Number((props.order as any)?.paymentData?.gross || 0);
        },

        get hasShippingCosts() {
            return (props.order as any)?.postageData?.gross > 0;
        },

        get shippingCosts() {
            return Number((props.order as any)?.postageData?.gross || 0);
        },

        get totalExclVat() {
            return (props.order as any)?.total?.gross || 0;
        },

        get taxPercentages() {
            const taxes = (props.order as any)?.total?.taxPercentages || [];
            return taxes.filter((tax: any) => tax.percentage > 0 && tax.total > 0);
        },

        get totalInclVat() {
            return (props.order as any)?.total?.net || 0;
        },

        get totalVat() {
            let sum = 0;
            const taxes = state.taxPercentages;
            for (let i = 0; i < taxes.length; i++) {
                sum += Number(taxes[i].total || 0);
            }
            return sum;
        },
    });

    return (
        <div className="w-full md:w-80 bg-white p-6 rounded-lg shadow space-y-3">
            <Show when={state.showSubtotal}>
                <div className="flex justify-between text-gray-600">
                    <span>{state.getLabel('subtotal', 'Subtotal:')}</span>
                    <span>{state.formatItemPrice(state.subtotal)}</span>
                </div>
            </Show>

            <Show when={state.showDiscount && state.hasDiscount}>
                <div className="flex justify-between text-secondary">
                    <span>{state.getLabel('discount', 'Discount:')}</span>
                    <span>{state.discountDisplay}</span>
                </div>
                <div className="flex justify-between text-gray-600 border-t pt-2 border-dashed">
                    <span>{state.getLabel('subtotalWithDiscount', 'Subtotal with discount:')}</span>
                    <span>{state.formatItemPrice(state.subtotalWithDiscount)}</span>
                </div>
            </Show>

            <Show when={state.hasTransactionCosts}>
                <div className="flex justify-between text-gray-600">
                    <span>{state.getLabel('transactionCosts', 'Transaction costs:')}</span>
                    <span>{state.formatItemPrice(state.transactionCosts)}</span>
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

            <Show when={state.showVATs && state.taxPercentages.length > 0}>
                <For each={state.taxPercentages}>
                    {(tax: any, index: number) => (
                        <div key={index} className="flex justify-between text-gray-600 text-sm">
                            <span>{tax.percentage}% {state.getLabel('vat', 'VAT')}:</span>
                            <span>{state.formatItemPrice(Number(tax.total))}</span>
                        </div>
                    )}
                </For>
            </Show>

            <Show when={state.showTotalVat}>
                <div className="flex justify-between text-gray-600 text-sm">
                    <span>{state.getLabel('totalVat', 'Total VAT:')}</span>
                    <span>{state.formatItemPrice(state.totalVat)}</span>
                </div>
            </Show>

            <div className="flex justify-between text-xl font-bold pt-4 border-t text-gray-900 mt-2">
                <span>{state.getLabel('total', 'Total:')}</span>
                <span>{state.formatItemPrice(state.totalInclVat)}</span>
            </div>
        </div>
    );
}
