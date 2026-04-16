import { useStore, Show } from '@builder.io/mitosis';
import { Order, OrderService, GraphQLClient, Enums } from 'propeller-sdk-v2';

export interface QuoteActionsProps {
    /** GraphQL client for the Propeller SDK */
    graphqlClient?: GraphQLClient;

    /** The quotation for which the actions will take place */
    quote: Order;

    /** Labels used in the quote actions component */
    labels?: Record<string, string>;

    /** Action function triggered when the "Accept quotation" button is clicked.
     *  If not provided, the base implementation calls setOrderStatus on the SDK. */
    onAccept?: (quote: Order) => void;

    /** Action function triggered after the quote is accepted. Usually for navigating towards the thank you page. */
    afterAccept?: (quote: Order) => void;

    /** Show the terms and conditions acceptance */
    showTermsAndConditions?: boolean;

    /** Action when the "Terms and conditions" link is clicked */
    onTermsAndConditionsClick?: () => void;
}

interface QuoteActionsState {
    termsAccepted: boolean;
    loading: boolean;
    showTermsAndConditions: boolean;
    isAcceptDisabled: boolean;
    getLabel: (key: string, fallback: string) => string;
    handleTermsChange: (checked: boolean) => void;
    handleTermsLinkClick: (event: Event) => void;
    handleAcceptClick: () => Promise<void>;
}

export default function QuoteActions(props: QuoteActionsProps) {
    const state = useStore<QuoteActionsState>({
        termsAccepted: false,
        loading: false,

        get showTermsAndConditions(): boolean {
            return props.showTermsAndConditions !== undefined ? props.showTermsAndConditions : true;
        },

        get isAcceptDisabled(): boolean {
            if (state.showTermsAndConditions && !state.termsAccepted) return true;
            if (state.loading) return true;
            return false;
        },

        getLabel(key: string, fallback: string): string {
            return props.labels?.[key] || fallback;
        },

        handleTermsChange(checked: boolean): void {
            state.termsAccepted = checked;
        },

        handleTermsLinkClick(event: Event): void {
            event.preventDefault();
            if (props.onTermsAndConditionsClick) {
                props.onTermsAndConditionsClick();
            }
        },

        async handleAcceptClick() {
            if (state.isAcceptDisabled) return;

            state.loading = true;

            try {
                if (props.onAccept) {
                    props.onAccept(props.quote);
                } else if (props.graphqlClient && props.quote?.id) {
                    const orderService = new OrderService(props.graphqlClient);
                    await orderService.setOrderStatus({
                        orderId: props.quote.id,
                        status: 'NEW' as string,
                        sendOrderConfirmationEmail: true,
                        addPDFAttachment: true,
                        deleteCart: true,
                    });
                }

                if (props.afterAccept) {
                    props.afterAccept(props.quote);
                }
            } finally {
                state.loading = false;
            }
        },
    });

    return (
        <div className="quote-actions space-y-4">
            <Show when={state.showTermsAndConditions}>
                <div className="flex items-center space-x-2 pt-2">
                    <input
                        type="checkbox"
                        id="quote-actions-terms"
                        checked={state.termsAccepted}
                        onChange={(event) => state.handleTermsChange(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="quote-actions-terms" className="text-sm leading-none">
                        {state.getLabel('termsPrefix', 'I agree to the')}{' '}
                        <a
                            href="#"
                            onClick={(event) => state.handleTermsLinkClick(event as unknown as Event)}
                            className="text-primary hover:underline font-medium"
                        >
                            {state.getLabel('termsLink', 'Terms and Conditions')}
                        </a>
                    </label>
                </div>
            </Show>

            <button
                type="button"
                onClick={() => state.handleAcceptClick()}
                disabled={state.isAcceptDisabled}
                className="flex items-center justify-center gap-2 w-full bg-primary text-white text-center py-3 rounded-lg hover:bg-primary/80 transition font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
                <Show when={state.loading}>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </Show>
                <Show when={state.loading}>
                    {state.getLabel('processing', 'Processing...')}
                </Show>
                <Show when={!state.loading}>
                    {state.getLabel('acceptButton', 'Accept Quotation')}
                </Show>
            </button>
        </div>
    );
}
