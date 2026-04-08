import { useStore, Show, For } from '@builder.io/mitosis';
import { Cart, CartService, Contact, Customer, GraphQLClient, Enums } from 'propeller-sdk-v2';

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

    /** GraphQL client — required for the default requestPurchaseAuthorization handler */
    graphqlClient?: GraphQLClient;

    /** Logged-in user — used to determine purchaser role and authorization limit */
    user?: Contact | Customer;

    /** Active company ID — used to look up the user's PAC for this company */
    companyId?: number;

    /**
     * Override the default CartService.requestPurchaseAuthorization() call.
     * Note: when this override is used, afterRequestAuthorization receives the original cart.
     */
    onRequestAuthorization?: (cart: Cart) => void;

    /** Fires after authorization request is sent; receives the updated cart */
    afterRequestAuthorization?: (cart: Cart) => void;

    /** Called when requestPurchaseAuthorization fails; receives the error */
    onError?: (err: Error) => void;
}

interface CartSummaryState {
    title: string;
    showSubtotal: boolean;
    showDiscount: boolean;
    showShippingCosts: boolean;
    showVATs: boolean;
    showTotalExclVat: boolean;
    showTotalVat: boolean;
    showCheckoutButton: boolean;
    showRequestAuthorizationButton: boolean;
    requestLoading: boolean;
    getLabel: (key: string, fallback: string) => string;
    formatItemPrice: (price: number) => string;
    subtotal: number;
    hasDiscount: boolean;
    discountAmount: number;
    hasShippingCosts: boolean;
    shippingCosts: number;
    totalExclVat: number;
    taxLevels: NonNullable<Cart['taxLevels']>;
    totalVat: number;
    totalInclVat: number;
    handleCheckoutClick: () => void;
    handleRequestAuthorizationClick: () => Promise<void>;
}

export default function CartSummary(props: CartSummaryProps) {
    const state = useStore<CartSummaryState>({
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

        getLabel(key: string, fallback: string): string {
            return props.labels?.[key] || fallback;
        },

        formatItemPrice(price: number): string {
            if (props.formatPrice) {
                return props.formatPrice(price);
            }
            return '\u20AC' + Number(price || 0).toFixed(2);
        },

        get subtotal(): number {
            return props.cart?.total?.subTotal || 0;
        },

        get hasDiscount(): boolean {
            const total = props.cart?.total;
            return (total?.discount || 0) > 0;
        },

        get discountAmount(): number {
            return props.cart?.total?.discount || 0;
        },

        get hasShippingCosts(): boolean {
            return (props.cart?.postageData?.price || 0) > 0;
        },

        get shippingCosts(): number {
            return Number(props.cart?.postageData?.price || 0);
        },

        get totalExclVat(): number {
            return props.cart?.total?.totalGross || 0;
        },

        get taxLevels() {
            const levels = props.cart?.taxLevels || [];
            return levels.filter((t) => t.taxPercentage > 0 && t.price > 0);
        },

        get totalVat(): number {
            const net = props.cart?.total?.totalNet || 0;
            const gross = props.cart?.total?.totalGross || 0;
            return net - gross;
        },

        get totalInclVat(): number {
            return props.cart?.total?.totalNet || 0;
        },

        handleCheckoutClick(): void {
            if (props.onCheckoutButtonClick) {
                props.onCheckoutButtonClick(props.cart);
            }
        },

        get showRequestAuthorizationButton(): boolean {
            if (!props.user || !('contactId' in props.user)) return false;
            if (!props.companyId) return false;
            const pacData = (props.user as any).purchaseAuthorizationConfigs;
            const items: any[] = pacData?.items ?? pacData?._items ?? [];
            const purchaserPAC = items.find((pac: any) => {
                const role = pac.purchaseRole ?? pac._purchaseRole;
                const pacCompanyId =
                    pac.company?.companyId ??
                    pac.company?._companyId ??
                    pac._company?.companyId ??
                    pac._company?._companyId;
                return role === Enums.PurchaseRole.PURCHASER && pacCompanyId === props.companyId;
            });
            if (!purchaserPAC) return false;
            const limit = purchaserPAC.authorizationLimit ?? purchaserPAC._authorizationLimit ?? 0;
            const totalGross = props.cart?.total?.totalGross ?? 0;
            return totalGross > limit;
        },

        requestLoading: false,

        async handleRequestAuthorizationClick(): Promise<void> {
            state.requestLoading = true;
            try {
                let updatedCart: any = props.cart;
                if (props.onRequestAuthorization) {
                    props.onRequestAuthorization(props.cart);
                } else if (props.graphqlClient) {
                    const cartService = new CartService(props.graphqlClient);
                    updatedCart = await cartService.requestPurchaseAuthorization({ id: props.cart.cartId });
                }
                if (props.afterRequestAuthorization) {
                    props.afterRequestAuthorization(updatedCart);
                }
            } catch (err: any) {
                if (props.onError) {
                    props.onError(err instanceof Error ? err : new Error(String(err)));
                }
            } finally {
                state.requestLoading = false;
            }
        },
    });

    return (
        <div className="w-full bg-white space-y-3">
            <h2 className="text-xl font-bold mb-4">{state.title}</h2>

            <Show when={state.showSubtotal}>
                <div className="flex justify-between text-gray-600">
                    <span>{state.getLabel('subtotal', 'Subtotal:')}</span>
                    <span>{state.formatItemPrice(state.subtotal)}</span>
                </div>
            </Show>

            <Show when={state.showDiscount && state.hasDiscount}>
                <div className="flex justify-between text-green-600">
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
                    {(tax, index: number) => (
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

            <Show when={state.showCheckoutButton && !state.showRequestAuthorizationButton}>
                <button
                    type="button"
                    onClick={() => state.handleCheckoutClick()}
                    className="block w-full bg-secondary text-white text-center py-3 rounded-lg hover:bg-secondary/90 transition font-semibold mt-4"
                >
                    {state.getLabel('checkoutButton', 'Continue to Checkout')}
                </button>
            </Show>

            <Show when={state.showRequestAuthorizationButton}>
                <button
                    type="button"
                    onClick={() => state.handleRequestAuthorizationClick()}
                    disabled={state.requestLoading}
                    className="block w-full bg-secondary text-white text-center py-3 rounded-lg hover:bg-secondary/90 transition font-semibold mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Show when={state.requestLoading}>
                        {state.getLabel('requestingAuthorization', 'Requesting...')}
                    </Show>
                    <Show when={!state.requestLoading}>
                        {state.getLabel('requestAuthorizationButton', 'Request Authorization')}
                    </Show>
                </button>
            </Show>
        </div>
    );
}
