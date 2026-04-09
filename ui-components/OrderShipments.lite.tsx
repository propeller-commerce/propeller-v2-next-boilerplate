import {
    useStore,
    Show,
    For,
} from '@builder.io/mitosis';
import {
    Order,
    Shipment,
    ShipmentItem,
    TrackAndTrace,
    OrderItem,
} from 'propeller-sdk-v2';

export interface OrderShipmentsProps {
    /** The current order the user is viewing */
    order: Order;

    /** Labels for the component */
    labels?: Record<string, string>;

    /** Additional CSS class for the root element */
    className?: string;
}

interface OrderShipmentsState {
    activeShipment: Shipment | null;
    getLabel: (key: string, fallback: string) => string;
    openModal: (shipment: Shipment) => void;
    closeModal: () => void;
    formatDate: (dateStr: string) => string;
    getOrderItemForShipmentItem: (shipmentItem: ShipmentItem) => OrderItem | null;
    buildTrackAndTraceUrl: (tat: TrackAndTrace) => string;
}

export default function OrderShipments(props: OrderShipmentsProps) {
    const state = useStore<OrderShipmentsState>({
        activeShipment: null,

        getLabel(key: string, fallback: string): string {
            return (props.labels as any)?.[key] || fallback;
        },

        openModal(shipment: Shipment): void {
            state.activeShipment = shipment;
        },

        closeModal(): void {
            state.activeShipment = null;
        },

        formatDate(dateStr: string): string {
            if (!dateStr) return '-';
            const d = new Date(dateStr);
            return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
        },

        getOrderItemForShipmentItem(shipmentItem: ShipmentItem): OrderItem | null {
            if (!props.order?.items || !shipmentItem.orderItemId) return null;
            return (props.order.items as OrderItem[]).find(
                (oi: OrderItem) => oi.id === shipmentItem.orderItemId
            ) || null;
        },

        buildTrackAndTraceUrl(tat: TrackAndTrace): string {
            const baseUrl = tat.carrier?.trackAndTraceURL || '';
            const code = tat.code || '';
            return `${baseUrl}${code}`;
        },
    });

    const shipments: Shipment[] = (props.order?.shipments as Shipment[]) || [];

    return (
        <div className={`order-shipments ${props.className || ''}`}>
            <Show when={shipments.length > 0}>
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold">
                        {state.getLabel('title', 'Shipping details')}
                    </h2>

                    <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                        {state.getLabel('colStatus', 'Status')}
                                    </th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                        {state.getLabel('colCreatedAt', 'Date')}
                                    </th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                        {state.getLabel('colExpectedDelivery', 'Expected delivery')}
                                    </th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                                        {state.getLabel('colItems', 'Items')}
                                    </th>
                                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                                        {state.getLabel('colActions', 'Actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                <For each={shipments}>
                                    {(shipment: Shipment, index: number) => (
                                        <tr key={index} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <Show when={!!shipment.status}>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                        {shipment.status}
                                                    </span>
                                                </Show>
                                                <Show when={!shipment.status}>
                                                    <span className="text-muted-foreground">-</span>
                                                </Show>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {state.formatDate(shipment.createdAt)}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                <Show when={!!shipment.expectedDeliveryAt}>
                                                    {state.formatDate(shipment.expectedDeliveryAt!)}
                                                </Show>
                                                <Show when={!shipment.expectedDeliveryAt}>
                                                    -
                                                </Show>
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {(shipment.items || []).length}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => state.openModal(shipment)}
                                                    className="text-primary hover:text-primary/80 text-sm font-medium hover:underline"
                                                >
                                                    {state.getLabel('details', 'Details')}
                                                </button>
                                            </td>
                                        </tr>
                                    )}
                                </For>
                            </tbody>
                        </table>
                    </div>
                </div>
            </Show>

            {/* Modal */}
            <Show when={!!state.activeShipment}>
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    onClick={() => state.closeModal()}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/50" />

                    {/* Panel */}
                    <div
                        className="relative z-10 w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-white rounded-lg shadow-xl"
                        onClick={(e: any) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h3 className="text-lg font-semibold">
                                {state.getLabel('modalTitle', 'Shipment details')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => state.closeModal()}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-4 space-y-4">
                            {/* Shipment meta */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-muted-foreground">
                                        {state.getLabel('labelStatus', 'Status')}
                                    </span>
                                    <p className="mt-0.5">
                                        <Show when={!!state.activeShipment?.status}>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {state.activeShipment?.status}
                                            </span>
                                        </Show>
                                        <Show when={!state.activeShipment?.status}>
                                            <span>-</span>
                                        </Show>
                                    </p>
                                </div>
                                <div>
                                    <span className="font-medium text-muted-foreground">
                                        {state.getLabel('labelExpectedDelivery', 'Expected delivery')}
                                    </span>
                                    <p className="mt-0.5">
                                        <Show when={!!state.activeShipment?.expectedDeliveryAt}>
                                            {state.formatDate(state.activeShipment?.expectedDeliveryAt!)}
                                        </Show>
                                        <Show when={!state.activeShipment?.expectedDeliveryAt}>
                                            -
                                        </Show>
                                    </p>
                                </div>
                            </div>

                            {/* Shipment items */}
                            <div>
                                <h4 className="text-sm font-semibold mb-2">
                                    {state.getLabel('itemsTitle', 'Items')}
                                </h4>
                                <Show when={(state.activeShipment?.items || []).length > 0}>
                                    <div className="rounded-lg border border-border overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/50 border-b border-border">
                                                <tr>
                                                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                                                        {state.getLabel('colProduct', 'Product')}
                                                    </th>
                                                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                                                        {state.getLabel('colSku', 'SKU')}
                                                    </th>
                                                    <th className="text-center px-4 py-2 font-medium text-muted-foreground">
                                                        {state.getLabel('colQuantity', 'Qty')}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                <For each={(state.activeShipment?.items as ShipmentItem[]) || []}>
                                                    {(shipmentItem: ShipmentItem, idx: number) => (
                                                        <tr key={idx} className="hover:bg-muted/20">
                                                            <td className="px-4 py-2">
                                                                <Show when={!!shipmentItem.name}>
                                                                    {shipmentItem.name}
                                                                </Show>
                                                                <Show when={!shipmentItem.name}>
                                                                    <Show when={!!state.getOrderItemForShipmentItem(shipmentItem)}>
                                                                        {(state.getOrderItemForShipmentItem(shipmentItem) as any)?.name || '-'}
                                                                    </Show>
                                                                    <Show when={!state.getOrderItemForShipmentItem(shipmentItem)}>
                                                                        -
                                                                    </Show>
                                                                </Show>
                                                            </td>
                                                            <td className="px-4 py-2 text-muted-foreground">
                                                                <Show when={!!shipmentItem.sku}>
                                                                    {shipmentItem.sku}
                                                                </Show>
                                                                <Show when={!shipmentItem.sku}>
                                                                    <Show when={!!state.getOrderItemForShipmentItem(shipmentItem)}>
                                                                        {(state.getOrderItemForShipmentItem(shipmentItem) as any)?.product?.sku || '-'}
                                                                    </Show>
                                                                    <Show when={!state.getOrderItemForShipmentItem(shipmentItem)}>
                                                                        -
                                                                    </Show>
                                                                </Show>
                                                            </td>
                                                            <td className="px-4 py-2 text-center">
                                                                {shipmentItem.quantity || '-'}
                                                            </td>
                                                        </tr>
                                                    )}
                                                </For>
                                            </tbody>
                                        </table>
                                    </div>
                                </Show>
                                <Show when={(state.activeShipment?.items || []).length === 0}>
                                    <p className="text-sm text-muted-foreground">
                                        {state.getLabel('noItems', 'No items in this shipment')}
                                    </p>
                                </Show>
                            </div>

                            {/* Track & Trace */}
                            <Show when={(state.activeShipment?.trackAndTraces || []).length > 0}>
                                <div>
                                    <h4 className="text-sm font-semibold mb-2">
                                        {state.getLabel('trackAndTraceTitle', 'Track & Trace')}
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                        <For each={(state.activeShipment?.trackAndTraces as TrackAndTrace[]) || []}>
                                            {(tat: TrackAndTrace, tatIdx: number) => (
                                                <Show key={tatIdx} when={!!tat.carrier?.trackAndTraceURL}>
                                                    <a
                                                        href={state.buildTrackAndTraceUrl(tat)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors"
                                                    >
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                                                        </svg>
                                                        <Show when={!!tat.carrier?.name}>
                                                            {state.getLabel('trackAndTrace', 'Track & Trace')} - {tat.carrier?.name}
                                                        </Show>
                                                        <Show when={!tat.carrier?.name}>
                                                            {state.getLabel('trackAndTrace', 'Track & Trace')} ({tat.code})
                                                        </Show>
                                                    </a>
                                                </Show>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            </Show>
                        </div>

                        {/* Footer */}
                        <div className="flex justify-end px-6 py-4 border-t">
                            <button
                                type="button"
                                onClick={() => state.closeModal()}
                                className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted transition-colors"
                            >
                                {state.getLabel('close', 'Close')}
                            </button>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
}
