import { useStore, Show, onMount } from '@builder.io/mitosis';
import { GraphQLClient, CartService, Cart, CartActionCodeVariables } from 'propeller-sdk-v2';

export interface ActionCodeProps {
    /** GraphQL client for the Propeller SDK */
    graphqlClient: GraphQLClient;

    /** The shopping cart used to populate the cart summary data */
    cart: Cart;

    /** Action code block title */
    title?: string;

    /** Labels for the component */
    labels?: Record<string, string>;

    /** Display the option to remove the action code of the shopping cart. Defaults to true. */
    showRemoveCode?: boolean;

    /** Action handler when action code is added to the cart */
    onActionCodeApply?: (code: string, cart: Cart) => void;

    /** Action handler when action code is removed from the cart */
    onActionCodeRemove?: (code: string, cart: Cart) => void;

    /** Action callback method after action code is applied */
    afterActionCodeApply?: (cart: Cart) => void;

    /** Action callback method after action code is removed */
    afterActionCodeRemove?: (cart: Cart) => void;

    /** Configuration object for image filters */
    configuration?: any;

    /** Language code for CartService operations. Defaults to 'NL'. */
    language?: string;
}

interface ActionCodeState {
    code: string;
    loading: boolean;
    error: string;
    isMounted: boolean;
    getLabel: (key: string, fallback: string) => string;
    title: string;
    showRemoveCode: boolean;
    appliedCode: string;
    hasAppliedCode: boolean;
    handleApply: () => Promise<void>;
    handleRemove: () => Promise<void>;
    handleKeyDown: (e: any) => void;
}

export default function ActionCode(props: ActionCodeProps) {
    const state = useStore<ActionCodeState>({
        code: '',
        loading: false,
        error: '',
        isMounted: false,

        getLabel(key: string, fallback: string) {
            return props.labels?.[key] || fallback;
        },

        get title() {
            return props.title || 'Action code';
        },

        get showRemoveCode() {
            return props.showRemoveCode !== undefined ? props.showRemoveCode : true;
        },

        get appliedCode() {
            return props.cart?.actionCode || '';
        },

        get hasAppliedCode() {
            return !!props.cart?.actionCode;
        },

        async handleApply() {
            if (!state.code.trim() || state.loading) return;
            state.loading = true;
            state.error = '';

            if (props.onActionCodeApply) {
                props.onActionCodeApply(state.code.trim(), props.cart);
                state.loading = false;
                return;
            }

            const cartService = new CartService(props.graphqlClient);
            const cartActionCodeVariables: CartActionCodeVariables = {
                id: props.cart?.cartId,
                input: {
                    actionCode: state.code.trim()
                },
                language: props.language || 'NL',
                imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
                imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
            };
            await cartService.addActionCodeToCart(cartActionCodeVariables).then((updatedCart: Cart) => {
                state.loading = false;
                state.code = '';
                if (props.afterActionCodeApply) {
                    props.afterActionCodeApply(updatedCart);
                }
            }).catch((error: any) => {
                state.loading = false;
                state.error = state.getLabel('errorApply', 'Failed to apply action code. Please try again.');
                console.error('Failed to apply action code:', error);
            });
        },

        async handleRemove() {
            if (state.loading || !state.hasAppliedCode) return;
            state.loading = true;
            state.error = '';

            const code = state.appliedCode;

            if (props.onActionCodeRemove) {
                props.onActionCodeRemove(code, props.cart);
                state.loading = false;
                return;
            }

            const cartService = new CartService(props.graphqlClient);
            const cartActionCodeVariables: CartActionCodeVariables = {
                id: props.cart?.cartId,
                input: {
                    actionCode: code
                },
                language: props.language || 'NL',
                imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
                imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
            };

            await cartService.removeActionCodeFromCart(cartActionCodeVariables).then((updatedCart: Cart) => {
                state.loading = false;
                if (props.afterActionCodeRemove) {
                    props.afterActionCodeRemove(updatedCart);
                }
            }).catch((error: any) => {
                state.loading = false;
                state.error = state.getLabel('errorRemove', 'Failed to remove action code. Please try again.');
                console.error('Failed to remove action code:', error);
            });
        },

        handleKeyDown(e: any) {
            if (e.key === 'Enter') {
                state.handleApply();
            }
        },
    });

    onMount(() => {
        state.isMounted = true;
    });

    return (
        <div className="w-full bg-white p-6 rounded-lg shadow space-y-3">
            <h2 className="text-lg font-bold">{state.title}</h2>

            <Show when={state.isMounted}>
                {/* Applied action code display */}
                <Show when={state.hasAppliedCode}>
                    <div className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-md px-3 py-2">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm font-medium text-violet-700">{state.appliedCode}</span>
                        </div>
                        <Show when={state.showRemoveCode}>
                            <button
                                type="button"
                                onClick={() => state.handleRemove()}
                                disabled={state.loading}
                                className="text-violet-600 hover:text-violet-800 text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {state.getLabel('remove', 'Remove')}
                            </button>
                        </Show>
                    </div>
                </Show>

                {/* Input form - show when no code applied */}
                <Show when={!state.hasAppliedCode}>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={state.code}
                            onChange={(e) => { state.code = e.target.value; }}
                            onKeyDown={(e) => state.handleKeyDown(e)}
                            placeholder={state.getLabel('placeholder', 'Enter action code')}
                            disabled={state.loading}
                            className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50"
                        />
                        <button
                            type="button"
                            onClick={() => state.handleApply()}
                            disabled={state.loading || !state.code.trim()}
                            className="bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-md hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            <Show when={state.loading}>
                                {state.getLabel('applying', 'Applying...')}
                            </Show>
                            <Show when={!state.loading}>
                                {state.getLabel('apply', 'Apply')}
                            </Show>
                        </button>
                    </div>
                </Show>

                {/* Error message */}
                <Show when={!!state.error}>
                    <p className="text-sm text-red-600">{state.error}</p>
                </Show>
            </Show>
        </div>
    );
}
