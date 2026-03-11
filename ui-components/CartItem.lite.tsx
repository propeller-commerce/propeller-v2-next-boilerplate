import {
    useStore,
    Show,
    onMount,
    onUpdate,
} from '@builder.io/mitosis';
import {
    GraphQLClient,
    CartService,
    CrossupsellService,
    CartMainItem,
    CartBaseItem,
    Cart,
    ProductInventory,
} from 'propeller-sdk-v2';

export interface CartItemProps {
    /** GraphQL client for the Propeller SDK */
    graphqlClient: GraphQLClient;

    /** The shopping cart unique identifier */
    cartId: string;

    /** A shopping cart item */
    cartItem: CartMainItem;

    /** Should the item title be a link to the PDP. Defaults to true. */
    titleLinkable?: boolean;

    /** Should the stock be displayed in the cart item. Defaults to false. */
    showStockComponent?: boolean;

    /** Display the SKU of the cart item beneath the item name. Defaults to true. */
    showSku?: boolean;

    /** +/- buttons on left and right of quantity input. Defaults to true. */
    enableIncrementDecrement?: boolean;

    /** Should the cart item notes field be displayed. Defaults to false. */
    showCartItemNotesField?: boolean;

    /** Action callback when a cart item quantity is changed */
    onQuantityChange?: (item: CartMainItem, quantity: number) => void;

    /** Action callback when a cart item note is changed */
    onNoteChange?: (item: CartMainItem, note: string) => void;

    /** Action callback when a cart item is deleted */
    onDelete?: (item: CartMainItem) => void;

    /** Callback with the updated cart after any cart mutation */
    afterCartUpdate?: (cart: Cart) => void;

    /** Label overrides for UI strings
     *
     * Available keys: remove, notes, notesPlaceholder, includedOptions, updating, deleting
     */
    labels?: Record<string, string>;

    /** Language code for CartService operations. Defaults to 'NL'. */
    language?: string;

    /** Configuration object for image filters and URL generation */
    configuration?: any;

    /** Show cross-sell/upsell product suggestions below the item. Defaults to false. */
    showCrossupsells?: boolean;

    /** Which cross-sell types to fetch. Defaults to ['ACCESSORIES']. Values: 'ACCESSORIES', 'ALTERNATIVES', 'OPTIONS', 'PARTS', 'RELATED' */
    crossupsellTypes?: string[];

    /** Maximum number of cross-sell products to display. Defaults to 3. */
    crossupsellLimit?: number;

    /** Callback when a cross-sell product is clicked */
    onCrossupsellClick?: (product: any) => void;

    /** Additional CSS class for the root element */
    className?: string;
}

interface CartItemState {
    _quantity: number;
    _notes: string;
    _loading: boolean;
    _deleting: boolean;
    _includeTax: boolean;
    _priceListener: any;
    _notesTimeout: any;
    _crossupsells: any[];
    _crossupsellsLoading: boolean;
    getLabel: (key: string, fallback: string) => string;
    getProductName: () => string;
    getProductUrl: () => string;
    getProductImageUrl: () => string;
    getProductSku: () => string;
    getInventory: () => ProductInventory | null;
    getFormattedPrice: () => string;
    handleQuantityChange: (newQuantity: number) => void;
    handleNoteChange: (note: string) => void;
    handleDelete: () => void;
    fetchCrossupsells: () => void;
    getCrossupsellName: (item: any) => string;
    getCrossupsellImageUrl: (item: any) => string;
    getCrossupsellUrl: (item: any) => string;
    getVisibleCrossupsells: () => any[];
}

export default function CartItem(props: CartItemProps) {
    const state = useStore<CartItemState>({
        _quantity: 1,
        _notes: '',
        _loading: false,
        _deleting: false,
        _includeTax: true,
        _priceListener: null as any,
        _notesTimeout: null as any,
        _crossupsells: [] as any[],
        _crossupsellsLoading: false,
        getLabel(key: string, fallback: string) {
            return (props.labels as any)?.[key] || fallback;
        },

        getProductName() {
            return (props.cartItem as any)?.product?.names?.[0]?.value || 'Product';
        },

        getProductUrl() {
            if (props.configuration && props.configuration.urls) {
                return props.configuration.urls.getProductUrl((props.cartItem as any)?.product);
            }
            return '#';
        },

        getProductImageUrl() {
            return (props.cartItem as any)?.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
        },

        getProductSku() {
            return (props.cartItem as any)?.product?.sku || '';
        },

        getInventory() {
            const inv = (props.cartItem as any)?.product?.inventory;
            return inv || null;
        },

        getFormattedPrice() {
            const item = props.cartItem as any;
            const price = state._includeTax ? (item?.totalSumNet || 0) : (item?.totalSum || 0);
            return `\u20AC${Number(price).toFixed(2)}`;
        },

        handleQuantityChange(newQuantity: number) {
            if (newQuantity < 1 || state._loading) return;
            state._quantity = newQuantity;
            state._loading = true;

            if (props.onQuantityChange) {
                props.onQuantityChange(props.cartItem, newQuantity);
                state._loading = false;
                return;
            }

            const cartService = new CartService(props.graphqlClient);
            cartService.updateCartItem({
                id: props.cartId,
                itemId: (props.cartItem as any).itemId.toString(),
                input: { quantity: newQuantity },
                language: props.language || 'NL',
                imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
                imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
            }).then((updatedCart: Cart) => {
                state._loading = false;
                if (props.afterCartUpdate) {
                    props.afterCartUpdate(updatedCart);
                }
            }).catch((error: any) => {
                console.error('Failed to update cart item quantity:', error);
                state._quantity = (props.cartItem as any).quantity;
                state._loading = false;
            });
        },

        handleNoteChange(note: string) {
            state._notes = note;

            if (props.onNoteChange) {
                props.onNoteChange(props.cartItem, note);
                return;
            }

            if (state._notesTimeout) {
                clearTimeout(state._notesTimeout);
            }

            state._notesTimeout = setTimeout(() => {
                const cartService = new CartService(props.graphqlClient);
                cartService.updateCartItem({
                    id: props.cartId,
                    itemId: (props.cartItem as any).itemId.toString(),
                    input: { notes: note },
                    language: props.language || 'NL',
                    imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
                    imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
                }).then((updatedCart: Cart) => {
                    if (props.afterCartUpdate) {
                        props.afterCartUpdate(updatedCart);
                    }
                }).catch((error: any) => {
                    console.error('Failed to update cart item notes:', error);
                });
            }, 500);
        },

        handleDelete() {
            if (state._deleting) return;
            state._deleting = true;

            if (props.onDelete) {
                props.onDelete(props.cartItem);
                state._deleting = false;
                return;
            }

            const cartService = new CartService(props.graphqlClient);
            cartService.deleteCartItem({
                id: props.cartId,
                itemId: (props.cartItem as any).itemId.toString(),
                input: { itemId: (props.cartItem as any).itemId.toString() },
                language: props.language || 'NL',
                imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
                imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
            }).then((updatedCart: Cart) => {
                state._deleting = false;
                if (props.afterCartUpdate) {
                    props.afterCartUpdate(updatedCart);
                }
            }).catch((error: any) => {
                console.error('Failed to delete cart item:', error);
                state._deleting = false;
            });
        },

        fetchCrossupsells() {
            if (!props.showCrossupsells) return;
            const productId = (props.cartItem as any)?.productId;
            if (!productId) return;

            state._crossupsellsLoading = true;
            const crossupsellService = new CrossupsellService(props.graphqlClient);
            const types = props.crossupsellTypes || ['ACCESSORIES'];
            crossupsellService.getCrossupsells({
                productIdsFrom: [productId],
                types: types as any,
                offset: 0,
                page: 1,
            }).then((response: any) => {
                state._crossupsells = response?.items || [];
                state._crossupsellsLoading = false;
            }).catch(() => {
                state._crossupsells = [];
                state._crossupsellsLoading = false;
            });
        },

        getVisibleCrossupsells() {
            const items = state._crossupsells || [];
            const limit = props.crossupsellLimit || 3;
            return items.slice(0, limit);
        },

        getCrossupsellName(item: any) {
            const product = item?.productTo || item?.clusterTo;
            return product?.names?.[0]?.value || 'Product';
        },

        getCrossupsellImageUrl(item: any) {
            const product = item?.productTo || item?.clusterTo;
            return product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
        },

        getCrossupsellUrl(item: any) {
            const product = item?.productTo || item?.clusterTo;
            if (props.configuration && props.configuration.urls && product) {
                return props.configuration.urls.getProductUrl(product);
            }
            return '#';
        },
    });

    onMount(() => {
        state._quantity = (props.cartItem as any)?.quantity || 1;
        state._notes = (props.cartItem as any)?.notes || '';

        const stored = localStorage.getItem('price_include_tax');
        state._includeTax = stored !== null ? stored === 'true' : true;

        state._priceListener = (e: any) => {
            state._includeTax = e.detail === true || e.detail === 'true';
        };
        window.addEventListener('priceToggleChanged', state._priceListener);

        state.fetchCrossupsells();
    });

    onUpdate(() => {
        state._quantity = (props.cartItem as any)?.quantity || 1;
        state._notes = (props.cartItem as any)?.notes || '';
    }, [props.cartItem]);

    return (
        <div className={`flex gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200 ${(props.className as string) || ''}`}>
            {/* Product image */}
            <div className="w-24 h-24 flex-shrink-0 bg-gray-50 rounded border border-gray-200 flex items-center justify-center overflow-hidden relative">
                <Show when={!!state.getProductImageUrl()}>
                    <img
                        src={state.getProductImageUrl()}
                        alt={state.getProductName()}
                        className="w-full h-full object-contain p-1"
                    />
                </Show>
                <Show when={!state.getProductImageUrl()}>
                    <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                </Show>
            </div>

            {/* Product info */}
            <div className="flex-1 min-w-0">
                {/* Title */}
                <Show when={props.titleLinkable !== false}>
                    <a href={state.getProductUrl()} className="font-semibold text-lg text-gray-900 hover:text-violet-600 transition-colors line-clamp-2">
                        {state.getProductName()}
                    </a>
                </Show>
                <Show when={props.titleLinkable === false}>
                    <span className="font-semibold text-lg text-gray-900 line-clamp-2">
                        {state.getProductName()}
                    </span>
                </Show>

                {/* SKU */}
                <Show when={props.showSku !== false && !!state.getProductSku()}>
                    <p className="text-sm text-gray-500 mt-0.5">{state.getProductSku()}</p>
                </Show>

                {/* Stock */}
                <Show when={props.showStockComponent === true && !!state.getInventory()}>
                    <div className="mt-1">
                        {/* ItemStock is rendered by the parent React copy using the compiled component */}
                        <div data-cart-item-stock="true" data-inventory={JSON.stringify(state.getInventory())} />
                    </div>
                </Show>

                {/* Price */}
                <p className="text-lg font-bold text-violet-600 mt-2">{state.getFormattedPrice()}</p>

                {/* Cluster child items */}
                <Show when={!!(props.cartItem as any)?.clusterId && !!(props.cartItem as any)?.childItems && (props.cartItem as any)?.childItems?.length > 0}>
                    <div className="mt-3 space-y-1.5 border-l-2 border-gray-200 pl-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            {state.getLabel('includedOptions', 'Included Options:')}
                        </p>
                        {((props.cartItem as any)?.childItems || []).map((child: CartBaseItem, idx: number) => (
                            <div key={idx} className="flex flex-wrap gap-x-2 text-sm text-gray-700">
                                <span className="font-medium">{(child as any).product?.names?.[0]?.value || 'Option'}</span>
                                <span className="text-gray-400 hidden sm:inline">-</span>
                                <span className="text-gray-400 text-xs self-center">{(child as any).product?.sku}</span>
                                <div className="flex-1 border-b border-dotted border-gray-300 mx-1 mb-1" />
                                <span className="font-semibold text-violet-600">{'\u20AC'}{((child as any).totalSum || 0).toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </Show>

                {/* Notes field */}
                <Show when={props.showCartItemNotesField === true}>
                    <div className="mt-3">
                        <label className="text-xs font-medium text-gray-500 block mb-1">
                            {state.getLabel('notes', 'Notes')}
                        </label>
                        <textarea
                            value={state._notes}
                            onChange={(e) => state.handleNoteChange(e.target.value)}
                            placeholder={state.getLabel('notesPlaceholder', 'Add a note for this item...')}
                            rows={2}
                            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                        />
                    </div>
                </Show>

                {/* Cross-sell / Upsell products */}
                <Show when={state.getVisibleCrossupsells().length > 0}>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            {state.getLabel('crossupsellTitle', 'You might also like')}
                        </p>
                        <div className="flex gap-3 overflow-x-auto">
                            {state.getVisibleCrossupsells().map((item: any, idx: number) => (
                                <a
                                    key={idx}
                                    href={state.getCrossupsellUrl(item)}
                                    onClick={(e) => {
                                        if (props.onCrossupsellClick) {
                                            e.preventDefault();
                                            props.onCrossupsellClick((item as any).productTo || (item as any).clusterTo);
                                        }
                                    }}
                                    className="flex-shrink-0 flex items-center gap-2 p-2 rounded-md border border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-colors max-w-[200px]"
                                >
                                    <Show when={!!state.getCrossupsellImageUrl(item)}>
                                        <img
                                            src={state.getCrossupsellImageUrl(item)}
                                            alt={state.getCrossupsellName(item)}
                                            className="w-10 h-10 object-contain rounded flex-shrink-0"
                                        />
                                    </Show>
                                    <span className="text-xs font-medium text-gray-700 line-clamp-2">
                                        {state.getCrossupsellName(item)}
                                    </span>
                                </a>
                            ))}
                        </div>
                    </div>
                </Show>

            </div>

            {/* Quantity and actions */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {/* Quantity with +/- controls */}
                <Show when={props.enableIncrementDecrement !== false}>
                    <div className="flex items-center border border-gray-300 rounded-md bg-white h-10">
                        <button
                            type="button"
                            onClick={() => state.handleQuantityChange(state._quantity - 1)}
                            disabled={state._quantity <= 1 || state._loading}
                            className="px-3 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-l-md select-none"
                        >
                            -
                        </button>
                        <input
                            type="number"
                            min={1}
                            value={state._quantity}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (val >= 1) state.handleQuantityChange(val);
                            }}
                            className="w-12 text-center text-sm bg-transparent border-x border-gray-300 h-full focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                            type="button"
                            onClick={() => state.handleQuantityChange(state._quantity + 1)}
                            disabled={state._loading}
                            className="px-3 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-r-md select-none"
                        >
                            +
                        </button>
                    </div>
                </Show>

                {/* Plain quantity input (no +/- buttons) */}
                <Show when={props.enableIncrementDecrement === false}>
                    <input
                        type="number"
                        min={1}
                        value={state._quantity}
                        onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (val >= 1) state.handleQuantityChange(val);
                        }}
                        className="w-16 h-10 text-center text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </Show>

                {/* Loading indicator */}
                <Show when={state._loading}>
                    <span className="text-xs text-gray-400">{state.getLabel('updating', 'Updating...')}</span>
                </Show>

                {/* Delete button */}
                <button
                    type="button"
                    onClick={() => state.handleDelete()}
                    disabled={state._deleting}
                    className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors disabled:opacity-50"
                >
                    <Show when={state._deleting}>
                        {state.getLabel('deleting', 'Removing...')}
                    </Show>
                    <Show when={!state._deleting}>
                        {state.getLabel('remove', 'Remove')}
                    </Show>
                </button>
            </div>
        </div>
    );
}
