import {
    useStore,
    Show,
} from '@builder.io/mitosis';
import {
    ProductPrice,
    Product,
    ClusterOption,
    Contact,
    Customer,
    Enums,
} from 'propeller-sdk-v2';

export interface ProductPriceProps {
    /**
     * ProductPrice object from the product.
     * Obtain from `product.price`.
     */
    price: ProductPrice;

    /** Currency symbol to display. Defaults to '€'. */
    currency?: string;

    /**
     * Controls portal visibility mode.
     * 'open'        — full e-commerce; price is always visible.
     * 'semi-closed' — catalog-only; price is hidden for anonymous users.
     * Defaults to 'open'.
     */
    portalMode?: string;

    /** Authenticated user — used for semi-closed visibility. */
    user?: Contact | Customer | null;

    /**
     * When true, net price (incl. tax) is the leading price.
     * When false (default), gross price (excl. tax) is the leading price.
     * Note: in the Propeller SDK `price.gross` = excl. VAT, `price.net` = incl. VAT.
     */
    includeTax?: boolean;

    /** Tax zone code. Defaults to 'NL'. */
    taxZone?: string;

    /** Cluster options (cluster.options). Required option default prices are added even without an active selection. */
    options?: ClusterOption[];

    /** Active option product selections — pass Object.values(selectedOptionProducts). Price updates on every change. */
    selectedOptionProducts?: Product[];

    /**
     * Override any UI string.
     * Available keys: inclTax, exclTax, loginToSeePrices
     */
    labels?: Record<string, string>;

    /** Tailwind text-size class for the leading price. Defaults to 'text-3xl'. */
    priceSize?: string;

    /** Extra CSS class applied to the root element. */
    className?: string;
}

interface ProductPriceState {
    isHidden: () => boolean;
    getOptionsTotal: (useNet: boolean) => number;
    getLeadingPrice: () => string;
    getSecondaryPrice: () => string;
    getTaxLabel: () => string;
    getSecondaryTaxLabel: () => string;
    getLabel: (key: string, fallback: string) => string;
    formatPrice: (value: number | null | undefined) => string;
}

export default function ProductPriceDisplay(props: ProductPriceProps) {
    const state = useStore<ProductPriceState>({
        isHidden(): boolean {
            return (props.portalMode as string) === 'semi-closed' && !props.user;
        },

        formatPrice(value: number | null | undefined): string {
            if (value === null || value === undefined) return '';
            const currency = (props.currency as string) || '\u20AC';
            return `${currency}${Number(value).toFixed(2)}`;
        },

        getOptionsTotal(useNet: boolean): number {
            const options = (props.options as ClusterOption[]) || [];
            const selected = (props.selectedOptionProducts as Product[]) || [];
            let total = 0;

            options.forEach((option: ClusterOption) => {
                if (option.hidden === Enums.YesNo.Y) return;

                // Find whether the user has selected a product in this option
                const selectedProduct = selected.find((p: Product) =>
                    (option.products || []).some(
                        (op: Product) => op.productId === p.productId,
                    ),
                );

                if (selectedProduct) {
                    total += useNet
                        ? selectedProduct.price?.net || 0
                        : selectedProduct.price?.gross || 0;
                } else if (
                    option.isRequired === Enums.YesNo.Y &&
                    option.defaultProduct
                ) {
                    // option.defaultProduct may lack price data; look up the full
                    // product record from option.products (which always has prices).
                    const defaultId = (option.defaultProduct as Product).productId;
                    const fullDefault =
                        (option.products || []).find(
                            (p: Product) => p.productId === defaultId,
                        ) || option.defaultProduct;
                    total += useNet
                        ? (fullDefault as Product).price?.net || 0
                        : (fullDefault as Product).price?.gross || 0;
                }
            });

            return total;
        },

        getLeadingPrice(): string {
            const price = props.price as ProductPrice;
            if (!price) return '';
            const useNet = !!props.includeTax;
            const base = useNet ? price.net : price.gross;
            if (base === null || base === undefined) return '';
            return state.formatPrice(base + state.getOptionsTotal(useNet));
        },

        getSecondaryPrice(): string {
            const price = props.price as ProductPrice;
            if (!price) return '';
            const useNet = !props.includeTax; // opposite of leading
            const base = useNet ? price.net : price.gross;
            if (base === null || base === undefined) return '';
            return state.formatPrice(base + state.getOptionsTotal(useNet));
        },

        getTaxLabel(): string {
            return props.includeTax
                ? state.getLabel('inclTax', 'incl. VAT')
                : state.getLabel('exclTax', 'excl. VAT');
        },

        getSecondaryTaxLabel(): string {
            return props.includeTax
                ? state.getLabel('exclTax', 'excl. VAT')
                : state.getLabel('inclTax', 'incl. VAT');
        },

        getLabel(key: string, fallback: string): string {
            return (props.labels as Record<string, string>)?.[key] || fallback;
        },
    });

    return (
        <div className={`product-price ${(props.className as string) || ''}`}>
            {/* Hidden / login CTA for semi-closed mode */}
            <Show when={state.isHidden()}>
                <p className="text-sm text-muted-foreground italic">
                    {state.getLabel('loginToSeePrices', 'Log in to see prices')}
                </p>
            </Show>

            {/* Price display */}
            <Show when={!state.isHidden() && !!state.getLeadingPrice()}>
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-baseline gap-2">
                        <span className={`${(props.priceSize as string) || 'text-3xl'} font-bold text-foreground`}>
                            {state.getLeadingPrice()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                            {state.getTaxLabel()}
                        </span>
                    </div>
                    <Show when={!!state.getSecondaryPrice()}>
                        <div className="text-sm text-muted-foreground">
                            {state.getSecondaryPrice()} {state.getSecondaryTaxLabel()}
                        </div>
                    </Show>
                </div>
            </Show>
        </div>
    );
}
