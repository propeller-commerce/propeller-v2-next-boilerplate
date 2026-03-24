import {
    Show,
} from '@builder.io/mitosis';
import { ProductInventory } from 'propeller-sdk-v2';

export interface ItemStockProps {
    /**
     * Product inventory to display stock and availability for.
     * Required — drives all stock calculations and display logic.
     */
    inventory: ProductInventory;

    /**
     * Shows whether the product is available or not available.
     * Defaults to true.
     */
    showAvailability?: boolean;

    /**
     * Shows the actual stock quantity (`inventory.totalQuantity`).
     * Defaults to true.
     */
    showStock?: boolean;

    /**
     * UI string overrides.
     * Available keys: inStock, outOfStock, lowStock, available, notAvailable, pieces
     */
    labels?: Record<string, string>;

    /** Extra CSS class applied to the root element. */
    className?: string;
}

export default function ItemStock(props: ItemStockProps) {
    function getLabel(key: string, fallback: string): string {
        return (props.labels as Record<string, string>)?.[key] || fallback;
    }

    function getTotalQuantity(): number {
        const qty = (props.inventory as ProductInventory)?.totalQuantity;
        return qty !== undefined && qty !== null ? qty : -1;
    }

    function isAvailable(): boolean {
        return getTotalQuantity() > 0;
    }

    function getStockStatusLabel(): string {
        const qty = getTotalQuantity();
        if (qty < 0) return '';
        if (qty === 0) return getLabel('outOfStock', 'Out of stock');
        if (qty <= 5) return getLabel('lowStock', 'Low stock');
        return getLabel('inStock', 'In stock');
    }

    function getStockStatusClass(): string {
        const qty = getTotalQuantity();
        if (qty <= 0) return 'text-red-600 bg-red-50 border-red-100';
        if (qty <= 5) return 'text-amber-600 bg-amber-50 border-amber-100';
        return 'text-green-600 bg-green-50 border-green-100';
    }

    function getAvailabilityLabel(): string {
        return isAvailable()
            ? getLabel('available', 'Available')
            : getLabel('notAvailable', 'Not available');
    }

    function getAvailabilityClass(): string {
        return isAvailable()
            ? 'text-green-600 bg-green-50 border-green-100'
            : 'text-red-600 bg-red-50 border-red-100';
    }

    function getAvailabilityDotClass(): string {
        return isAvailable() ? 'bg-green-500' : 'bg-red-500';
    }

    function hasInventory(): boolean {
        return !!(props.inventory as ProductInventory) && getTotalQuantity() >= 0;
    }

    return (
        <Show when={hasInventory()}>
            <div className={`flex flex-wrap items-center gap-1.5 ${(props.className as string) || ''}`}>

                {/* ── Availability badge ─────────────────────────────────── */}
                <Show when={props.showAvailability !== false}>
                    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${getAvailabilityClass()}`}>
                        <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${getAvailabilityDotClass()}`} />
                        {getAvailabilityLabel()}
                    </span>
                </Show>

                {/* ── Stock quantity ─────────────────────────────────────── */}
                <Show when={props.showStock !== false && !!getStockStatusLabel()}>
                    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStockStatusClass()}`}>
                        {getStockStatusLabel()}
                        <Show when={getTotalQuantity() > 0}>
                            <span className="opacity-70">
                                ({getTotalQuantity()} {getLabel('pieces', 'pcs')})
                            </span>
                        </Show>
                    </span>
                </Show>

            </div>
        </Show>
    );
}
