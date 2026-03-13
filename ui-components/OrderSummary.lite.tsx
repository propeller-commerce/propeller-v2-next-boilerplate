import { useStore, Show } from '@builder.io/mitosis';

export interface OrderSummaryProps {
    /** The order object from propeller-sdk-v2 */
    order: any;

    /** The CSS class for the order summary container */
    orderSummaryContainerClass?: string;

    /** Title of the order summary */
    title?: string;

    /** Show the order number */
    showOrderNumber?: boolean;

    /** Show the order date */
    showOrderDate?: boolean;

    /** Show the order status */
    showOrderStatus?: boolean;

    /** Show the order total */
    showOrderTotal?: boolean;

    /** Custom price formatting function */
    formatPrice?: (price: number) => string;

    /** Show the invoice address */
    showInvoiceAddress?: boolean;

    /** Show the delivery address */
    showDeliveryAddress?: boolean;

    /** Show payment, carrier, and delivery date info */
    showDeliveryInfo?: boolean;

    /** Show order remarks and reference */
    showRemarks?: boolean;

    /** Custom date formatting function */
    formatDate?: (dateString: string) => string;

    /** Labels for the component */
    labels?: Record<string, string>;
}

export default function OrderSummary(props: OrderSummaryProps) {
    const state = useStore({
        get containerClass() {
            return props.orderSummaryContainerClass || 'order-summary';
        },

        get showOrderNumber() {
            return props.showOrderNumber !== undefined ? props.showOrderNumber : true;
        },

        get showOrderDate() {
            return props.showOrderDate !== undefined ? props.showOrderDate : true;
        },

        get showOrderStatus() {
            return props.showOrderStatus !== undefined ? props.showOrderStatus : true;
        },

        get showInvoiceAddress() {
            return props.showInvoiceAddress !== undefined ? props.showInvoiceAddress : true;
        },

        get showDeliveryAddress() {
            return props.showDeliveryAddress !== undefined ? props.showDeliveryAddress : true;
        },

        get showOrderTotal() {
            return props.showOrderTotal !== undefined ? props.showOrderTotal : true;
        },

        formatItemPrice(price: number) {
            if (props.formatPrice) {
                return props.formatPrice(price);
            }
            return '\u20AC' + Number(price || 0).toFixed(2);
        },

        get showDeliveryInfo() {
            return props.showDeliveryInfo !== undefined ? props.showDeliveryInfo : true;
        },

        get showRemarks() {
            return props.showRemarks !== undefined ? props.showRemarks : true;
        },

        get orderReference() {
            return props.order?.reference || '';
        },

        get orderRemarks() {
            return props.order?.remarks || '';
        },

        getLabel(key: string, fallback: string) {
            return props.labels?.[key] || fallback;
        },

        formatOrderDate(dateString: string) {
            if (props.formatDate) {
                return props.formatDate(dateString);
            }
            try {
                return new Date(dateString).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                });
            } catch {
                return dateString;
            }
        },

        get orderNumber() {
            return props.order?.id || '';
        },

        get orderDate() {
            return props.order?.createdAt || '';
        },

        get orderStatus() {
            return props.order?.status || '';
        },

        get orderTotal() {
            return Number(props.order?.total?.net || 0);
        },

        get invoiceAddress() {
            const addresses = props.order?.addresses || [];
            return addresses.find((a: any) => a.type === 'invoice') || null;
        },

        get deliveryAddress() {
            const addresses = props.order?.addresses || [];
            return addresses.find((a: any) => a.type === 'delivery') || null;
        },

        get paymentMethod() {
            return props.order?.paymentData?.method || '';
        },

        get carrierName() {
            return props.order?.postageData?.carrier || '';
        },

        get requestDate() {
            const date = props.order?.postageData?.requestDate;
            if (!date) return '';
            return state.formatOrderDate(date);
        },
    });

    return (
        <div className={state.containerClass}>
            <Show when={props.title}>
                <h2 className="text-xl font-bold mb-4">{props.title}</h2>
            </Show>

            {/* Order Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-5 border-b border-gray-200 mb-5">
                <Show when={state.showOrderNumber && state.orderNumber}>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">{state.getLabel('orderNumber', 'Order Number')}</p>
                        <p className="font-semibold">{state.orderNumber}</p>
                    </div>
                </Show>
                <Show when={state.showOrderDate && state.orderDate}>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">{state.getLabel('orderDate', 'Order Date')}</p>
                        <p className="font-semibold">{state.formatOrderDate(state.orderDate)}</p>
                    </div>
                </Show>
                <Show when={state.showOrderStatus && state.orderStatus}>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">{state.getLabel('status', 'Status')}</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                            {state.orderStatus}
                        </span>
                    </div>
                </Show>
                <Show when={state.showOrderTotal}>
                    <div>
                        <p className="text-sm text-gray-500 mb-1">{state.getLabel('total', 'Total')}</p>
                        <p className="font-bold text-lg">{state.formatItemPrice(state.orderTotal)}</p>
                    </div>
                </Show>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-5">
                <Show when={state.showInvoiceAddress}>
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                            {state.getLabel('invoiceAddress', 'Invoice Address')}
                        </h3>
                        <Show when={state.invoiceAddress && state.invoiceAddress.street}>
                            <div className="text-sm space-y-1">
                                <Show when={state.invoiceAddress.company}>
                                    <p className="font-medium">{state.invoiceAddress.company}</p>
                                </Show>
                                <p>
                                    {[state.invoiceAddress.firstName, state.invoiceAddress.middleName, state.invoiceAddress.lastName].filter(Boolean).join(' ')}
                                </p>
                                <p>
                                    {[state.invoiceAddress.street, state.invoiceAddress.number, state.invoiceAddress.numberExtension].filter(Boolean).join(' ')}
                                </p>
                                <p>
                                    {[state.invoiceAddress.postalCode, state.invoiceAddress.city].filter(Boolean).join(' ')}
                                </p>
                                <Show when={state.invoiceAddress.country}>
                                    <p>{state.invoiceAddress.country}</p>
                                </Show>
                                <Show when={state.invoiceAddress.email}>
                                    <p className="text-gray-500">{state.invoiceAddress.email}</p>
                                </Show>
                            </div>
                        </Show>
                    </div>
                </Show>
                <Show when={state.showDeliveryAddress}>
                    <div className="space-y-2">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                            {state.getLabel('deliveryAddress', 'Delivery Address')}
                        </h3>
                        <Show when={state.deliveryAddress && state.deliveryAddress.street}>
                            <div className="text-sm space-y-1">
                                <Show when={state.deliveryAddress.company}>
                                    <p className="font-medium">{state.deliveryAddress.company}</p>
                                </Show>
                                <p>
                                    {[state.deliveryAddress.firstName, state.deliveryAddress.middleName, state.deliveryAddress.lastName].filter(Boolean).join(' ')}
                                </p>
                                <p>
                                    {[state.deliveryAddress.street, state.deliveryAddress.number, state.deliveryAddress.numberExtension].filter(Boolean).join(' ')}
                                </p>
                                <p>
                                    {[state.deliveryAddress.postalCode, state.deliveryAddress.city].filter(Boolean).join(' ')}
                                </p>
                                <Show when={state.deliveryAddress.country}>
                                    <p>{state.deliveryAddress.country}</p>
                                </Show>
                                <Show when={state.deliveryAddress.email}>
                                    <p className="text-gray-500">{state.deliveryAddress.email}</p>
                                </Show>
                            </div>
                        </Show>
                    </div>
                </Show>
            </div>

            {/* Payment / Carrier / Delivery Date */}
            <Show when={state.showDeliveryInfo && (state.paymentMethod || state.carrierName || state.requestDate)}>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200 space-y-2 text-sm">
                    <Show when={state.paymentMethod}>
                        <div className="flex justify-between">
                            <span className="font-medium">{state.getLabel('payment', 'Payment:')}</span>
                            <span>{state.paymentMethod}</span>
                        </div>
                    </Show>
                    <Show when={state.carrierName}>
                        <div className="flex justify-between">
                            <span className="font-medium">{state.getLabel('carrier', 'Carrier:')}</span>
                            <span>{state.carrierName}</span>
                        </div>
                    </Show>
                    <Show when={state.requestDate}>
                        <div className="flex justify-between">
                            <span className="font-medium">{state.getLabel('deliveryDate', 'Delivery Date:')}</span>
                            <span>{state.requestDate}</span>
                        </div>
                    </Show>
                </div>
            </Show>

            {/* Reference / Remarks */}
            <Show when={state.showRemarks && (state.orderReference || state.orderRemarks)}>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200 space-y-2 text-sm mt-4">
                    <Show when={state.orderReference}>
                        <div className="flex justify-between">
                            <span className="font-medium">{state.getLabel('reference', 'Reference:')}</span>
                            <span>{state.orderReference}</span>
                        </div>
                    </Show>
                    <Show when={state.orderRemarks}>
                        <div className="flex justify-between">
                            <span className="font-medium">{state.getLabel('remarks', 'Remarks:')}</span>
                            <span>{state.orderRemarks}</span>
                        </div>
                    </Show>
                </div>
            </Show>
        </div>
    );
}
