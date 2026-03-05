import {
    useStore,
    Show,
    onMount,
} from '@builder.io/mitosis';
import {
    ProductPrice,
    Contact,
    Customer,
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

    /**
     * Override any UI string.
     * Available keys: inclTax, exclTax, loginToSeePrices
     */
    labels?: Record<string, string>;

    /** Extra CSS class applied to the root element. */
    className?: string;
}

interface ProductPriceState {
    _includeTax: boolean;
    _priceListener: any;
    isHidden: () => boolean;
    getIncludeTax: () => boolean;
    getLeadingPrice: () => string;
    getSecondaryPrice: () => string;
    getTaxLabel: () => string;
    getSecondaryTaxLabel: () => string;
    getLabel: (key: string, fallback: string) => string;
    formatPrice: (value: number | null | undefined) => string;
}

export default function ProductPriceDisplay(props: ProductPriceProps) {
    const state = useStore<ProductPriceState>({
        _includeTax: true,
        _priceListener: null as any,

        isHidden(): boolean {
            return (props.portalMode as string) === 'semi-closed' && !props.user;
        },

        getIncludeTax(): boolean {
            return props.includeTax !== undefined ? !!(props.includeTax) : state._includeTax;
        },

        formatPrice(value: number | null | undefined): string {
            if (value === null || value === undefined) return '';
            const currency = (props.currency as string) || '\u20AC';
            return `${currency}${Number(value).toFixed(2)}`;
        },

        getLeadingPrice(): string {
            const price = props.price as ProductPrice;
            if (!price) return '';
            const useTax: boolean = state.getIncludeTax();
            const value: number | undefined = useTax ? price.net : price.gross;
            return this.formatPrice(value);
        },

        getSecondaryPrice(): string {
            const price = props.price as ProductPrice;
            if (!price) return '';
            const useTax: boolean = state.getIncludeTax();
            const value: number | undefined = useTax ? price.gross : price.net;
            return this.formatPrice(value);
        },

        getTaxLabel(): string {
            const useTax: boolean = state.getIncludeTax();
            return useTax
                ? this.getLabel('inclTax', 'incl. VAT')
                : this.getLabel('exclTax', 'excl. VAT');
        },

        getSecondaryTaxLabel(): string {
            const useTax: boolean = state.getIncludeTax();
            return useTax
                ? this.getLabel('exclTax', 'excl. VAT')
                : this.getLabel('inclTax', 'incl. VAT');
        },

        getLabel(key: string, fallback: string): string {
            return (props.labels as Record<string, string>)?.[key] || fallback;
        },
    });

    onMount(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('price_include_tax');
            state._includeTax = stored === null ? true : stored === 'true';
            state._priceListener = () => {
                const val = localStorage.getItem('price_include_tax');
                state._includeTax = val === null ? true : val === 'true';
            };
            window.addEventListener('priceToggleChanged', state._priceListener);
        }
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
                        <span className="text-3xl font-bold text-primary">
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
