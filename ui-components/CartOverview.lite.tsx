import { useStore, Show } from '@builder.io/mitosis';
import { Cart, CartAddress, GraphQLClient } from 'propeller-sdk-v2';

export interface CartOverviewProps {
    /** GraphQL client for the Propeller SDK */
    graphqlClient: GraphQLClient;

    /** Shopping cart object from which the cart overview will be displayed */
    cart: Cart;

    /** The CSS class for the cart overview container */
    overviewContainerClass?: string;

    /** Title of the cart overview */
    title?: string;

    /** Labels for the cart overview form fields and buttons */
    labels?: Record<string, string>;

    /** Show the notes field for the cart */
    showNotes?: boolean;

    /** Show the reference field for the cart */
    showReference?: boolean;

    /** Show the terms and conditions acceptance */
    showTermsAndConditions?: boolean;

    /** Action when the "Terms and conditions" link is clicked */
    onTermsAndConditionsClick?: () => void;

    /** Show the "Purchase" button for placing an order */
    showPurchaseButton?: boolean;

    /** Action when the purchase button is clicked. Receives cart, reference, and notes */
    onPurchaseButtonClick?: (cart: Cart, reference: string, notes: string) => void;
}

export default function CartOverview(props: CartOverviewProps) {
    const state = useStore({
        _reference: '' as string,
        _notes: '' as string,
        _termsAccepted: false as boolean,
        _loading: false as boolean,

        get containerClass(): string {
            return props.overviewContainerClass || 'cart-overview';
        },

        get showNotes(): boolean {
            return props.showNotes !== undefined ? props.showNotes : true;
        },

        get showReference(): boolean {
            return props.showReference !== undefined ? props.showReference : true;
        },

        get showTermsAndConditions(): boolean {
            return props.showTermsAndConditions !== undefined ? props.showTermsAndConditions : true;
        },

        get showPurchaseButton(): boolean {
            return props.showPurchaseButton !== undefined ? props.showPurchaseButton : true;
        },

        getLabel(key: string, fallback: string): string {
            return props.labels?.[key] || fallback;
        },

        get invoiceAddress(): CartAddress {
            return props.cart?.invoiceAddress;
        },

        get deliveryAddress(): CartAddress {
            return props.cart?.deliveryAddress;
        },

        formatAddress(addr: CartAddress): string {
            if (!addr || !addr.street) return '';
            const parts: string[] = [];
            if (addr.company) parts.push(addr.company);
            const nameParts: string[] = [];
            if (addr.firstName) nameParts.push(addr.firstName);
            if (addr.middleName) nameParts.push(addr.middleName);
            if (addr.lastName) nameParts.push(addr.lastName);
            if (nameParts.length > 0) parts.push(nameParts.join(' '));
            const streetLine = [addr.street, addr.number, addr.numberExtension].filter(Boolean).join(' ');
            if (streetLine) parts.push(streetLine);
            const cityLine = [addr.postalCode, addr.city].filter(Boolean).join(' ');
            if (cityLine) parts.push(cityLine);
            if (addr.country) parts.push(addr.country);
            return parts.join(', ');
        },

        get paymentMethod(): string {
            return props.cart?.paymentData?.method || '';
        },

        get carrierName(): string {
            return props.cart?.postageData?.carrier || '';
        },

        get requestDate(): string {
            const date = props.cart?.postageData?.requestDate;
            if (!date) return '';
            try {
                return new Date(date).toLocaleDateString();
            } catch {
                return date;
            }
        },

        handleReferenceChange(value: string): void {
            state._reference = value;
        },

        handleNotesChange(value: string): void {
            state._notes = value;
        },

        handleTermsChange(checked: boolean): void {
            state._termsAccepted = checked;
        },

        handleTermsLinkClick(event: Event): void {
            event.preventDefault();
            if (props.onTermsAndConditionsClick) {
                props.onTermsAndConditionsClick();
            }
        },

        get isPurchaseDisabled(): boolean {
            if (state.showTermsAndConditions && !state._termsAccepted) return true;
            if (state._loading) return true;
            return false;
        },

        handlePurchaseClick(): void {
            if (state.isPurchaseDisabled) return;
            if (props.onPurchaseButtonClick) {
                props.onPurchaseButtonClick(props.cart, state._reference, state._notes);
            }
        },
    });

    return (
        <div className={state.containerClass}>
            <Show when={props.title}>
                <h2 className="text-xl font-bold mb-4">{props.title}</h2>
            </Show>

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-5">
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
            </div>

            {/* Payment / Carrier / Delivery Date summary */}
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

            {/* Reference & Notes */}
            <div className="space-y-4 mt-6">
                <Show when={state.showReference}>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            {state.getLabel('referenceLabel', 'Reference (Optional)')}
                        </label>
                        <input
                            type="text"
                            value={state._reference}
                            onChange={(event) => state.handleReferenceChange(event.target.value)}
                            placeholder={state.getLabel('referencePlaceholder', 'Your reference number')}
                            className="flex w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
                        />
                    </div>
                </Show>

                <Show when={state.showNotes}>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            {state.getLabel('notesLabel', 'Order Notes (Optional)')}
                        </label>
                        <textarea
                            value={state._notes}
                            onChange={(event) => state.handleNotesChange(event.target.value)}
                            placeholder={state.getLabel('notesPlaceholder', 'Special instructions or comments')}
                            className="flex w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500 min-h-[80px]"
                        />
                    </div>
                </Show>

                <Show when={state.showTermsAndConditions}>
                    <div className="flex items-center space-x-2 pt-2">
                        <input
                            type="checkbox"
                            id="cart-overview-terms"
                            checked={state._termsAccepted}
                            onChange={(event) => state.handleTermsChange(event.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                        />
                        <label htmlFor="cart-overview-terms" className="text-sm leading-none">
                            {state.getLabel('termsPrefix', 'I agree to the')}{' '}
                            <a
                                href="#"
                                onClick={(event) => state.handleTermsLinkClick(event as unknown as Event)}
                                className="text-violet-600 hover:underline font-medium"
                            >
                                {state.getLabel('termsLink', 'Terms and Conditions')}
                            </a>
                        </label>
                    </div>
                </Show>

                <Show when={state.showPurchaseButton}>
                    <button
                        type="button"
                        onClick={() => state.handlePurchaseClick()}
                        disabled={state.isPurchaseDisabled}
                        className="block w-full bg-violet-600 text-white text-center py-3 rounded-lg hover:bg-violet-700 transition font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {state.getLabel('purchaseButton', 'Place Order')}
                    </button>
                </Show>
            </div>
        </div>
    );
}
