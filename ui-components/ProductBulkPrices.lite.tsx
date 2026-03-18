import {
    useStore,
    Show,
    For,
    onMount,
} from '@builder.io/mitosis';
import {
    ProductPrice,
    Contact,
    Customer,
} from 'propeller-sdk-v2';
import type { IDiscount } from 'propeller-sdk-v2/dist/type/IDiscount';

export interface ProductBulkPricesProps {
    /**
     * Bulk price tiers from the product.
     * Obtain from `product.bulkPrices`.
     */
    bulkPrices: ProductPrice[];

    /**
     * When true, net price (incl. tax) is the leading price.
     * Defaults to false — gross (excl. VAT) is shown.
     * Note: in the Propeller SDK `price.gross` = excl. VAT, `price.net` = incl. VAT.
     */
    includeTax?: boolean;

    /**
     * Controls portal visibility mode.
     * 'semi-closed' — component is hidden for anonymous users.
     * Defaults to 'open'.
     */
    portalMode?: string;

    /** Authenticated user — used for semi-closed visibility. */
    user?: Contact | Customer | null;

    /** Tax zone code. Defaults to 'NL'. */
    taxZone?: string;

    /**
     * Override any UI string.
     * Available keys: title, quantityFrom, price, inclTax, exclTax
     */
    labels?: Record<string, string>;

    /** Extra CSS class applied to the root element. */
    className?: string;
}

interface ProductBulkPricesState {
    includeTax: boolean;
    priceListener: any;
    isHidden: () => boolean;
    hasItems: () => boolean;
    getIncludeTax: () => boolean;
    getBulkPrices: () => ProductPrice[];
    getPrice: (tier: ProductPrice) => string;
    getQuantityLabel: (tier: ProductPrice, index: number) => string;
    getLabel: (key: string, fallback: string) => string;
}

export default function ProductBulkPrices(props: ProductBulkPricesProps) {
    const state = useStore<ProductBulkPricesState>({
        includeTax: true,
        priceListener: null as any,

        isHidden(): boolean {
            return (props.portalMode as string) === 'semi-closed' && !props.user;
        },

        getIncludeTax(): boolean {
            return props.includeTax !== undefined ? !!(props.includeTax) : state.includeTax;
        },

        getBulkPrices(): ProductPrice[] {
            return (props.bulkPrices as ProductPrice[]) || [];
        },

        hasItems(): boolean {
            return this.getBulkPrices().length > 0;
        },

        getPrice(tier: ProductPrice): string {
            const useTax: boolean = state.getIncludeTax();
            const value: number | undefined = useTax ? tier.net : tier.gross;
            if (value === null || value === undefined) return '';
            return `\u20AC${Number(value).toFixed(2)}`;
        },

        getQuantityLabel(tier: ProductPrice, index: number): string {
            const prices = state.getBulkPrices();
            const discount = tier.discount as IDiscount & { quantityFrom?: number } | undefined;
            const qty = discount?.quantityFrom || tier.quantity || 1;
            const nextTier = prices[index + 1];
            const nextDiscount = nextTier?.discount as IDiscount & { quantityFrom?: number } | undefined;
            const nextQty = nextDiscount?.quantityFrom || nextTier?.quantity;
            if (nextQty) {
                return `${qty}\u2013${nextQty - 1}`;
            }
            return `${qty}+`;
        },

        getLabel(key: string, fallback: string): string {
            const val = (props.labels as Record<string, string>)?.[key];
            return val !== undefined ? val : fallback;
        },
    });

    return (
        <Show when={!state.isHidden() && state.hasItems()}>
            <div className={`product-bulk-prices ${(props.className as string) || ''}`}>
                <Show when={state.getLabel('title', 'Volume pricing')}>
                    <h3 className="text-base font-semibold text-foreground mb-3">
                        {state.getLabel('title', 'Volume pricing')}
                    </h3>
                </Show>
                <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                                    {state.getLabel('quantityFrom', 'Qty from')}
                                </th>
                                <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                                    {state.getLabel('price', 'Price')}
                                    {' '}
                                    <span className="font-normal text-xs">
                                        ({state.getIncludeTax()
                                            ? state.getLabel('inclTax', 'incl. VAT')
                                            : state.getLabel('exclTax', 'excl. VAT')})
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            <For each={state.getBulkPrices()}>
                                {(tier: ProductPrice, index: number) => (
                                    <tr key={index} className="bg-white hover:bg-muted/20 transition-colors">
                                        <td className="px-4 py-2 text-foreground font-medium">
                                            {state.getQuantityLabel(tier, index)}
                                        </td>
                                        <td className="px-4 py-2 text-right text-primary font-semibold">
                                            {state.getPrice(tier)}
                                        </td>
                                    </tr>
                                )}
                            </For>
                        </tbody>
                    </table>
                </div>
            </div>
        </Show>
    );
}
