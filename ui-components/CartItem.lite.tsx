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
    BundleItem,
    Cart,
    ProductInventory,
    CrossupsellSearchInput,
    Crossupsell,
    Product,
    Cluster,
    Enums,
    CrossupsellsQueryVariables,
    Contact,
    Customer,
} from 'propeller-sdk-v2';

export interface CartItemProps {
    /** GraphQL client for the Propeller SDK */
    graphqlClient: GraphQLClient;

    /** The shopping cart unique identifier */
    cartId: string;

    /** Tax zone for price calculations */
    taxZone?: string;

    /** Authenticated user for cart operations */
    user?: Contact | Customer | null;

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
    onCrossupsellClick?: (product: Product | Cluster) => void;

    /** Additional CSS class for the root element */
    className?: string;

    /** Include tax in price. Defaults to false. */
    includeTax?: boolean;
}

interface CartItemState {
    quantity: number;
    notes: string;
    loading: boolean;
    deleting: boolean;
    notesTimeout: any;
    crossupsells: Crossupsell[];
    crossupsellsLoading: boolean;
    getLabel: (key: string, fallback: string) => string;
    getProductName: () => string;
    getProductUrl: () => string;
    getProductImageUrl: () => string;
    getProductSku: () => string;
    getInventory: () => ProductInventory | null;
    getFormattedPrice: () => string;
    isBundleItem: () => boolean;
    getBundleName: () => string;
    getBundlePrice: () => string;
    getBundleLeaderName: () => string;
    getBundleLeaderPrice: () => string;
    getBundleNonLeaders: () => BundleItem[];
    getBundleItemName: (bundleItem: BundleItem) => string;
    getBundleItemPrice: (bundleItem: BundleItem) => string;
    handleQuantityChange: (newQuantity: number) => void;
    handleNoteChange: (note: string) => void;
    handleDelete: () => void;
    fetchCrossupsells: () => void;
    getCrossupsellName: (item: Crossupsell) => string;
    getCrossupsellImageUrl: (item: Crossupsell) => string;
    getCrossupsellUrl: (item: Crossupsell) => string;
    getVisibleCrossupsells: () => Crossupsell[];
}

export default function CartItem(props: CartItemProps) {
    const state = useStore<CartItemState>({
        quantity: 1,
        notes: '',
        loading: false,
        deleting: false,
        notesTimeout: null as unknown as ReturnType<typeof setTimeout>,
        crossupsells: [] as Crossupsell[],
        crossupsellsLoading: false,

        getLabel(key: string, fallback: string): string {
            return props.labels?.[key] || fallback;
        },

        getProductName(): string {
            return props.cartItem.product?.names?.[0]?.value || 'Product';
        },

        getProductUrl(): string {
            if (props.configuration && props.configuration.urls) {
                return props.configuration.urls.getProductUrl(props.cartItem.product);
            }
            return '#';
        },

        getProductImageUrl(): string {
            return props.cartItem.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
        },

        getProductSku(): string {
            return props.cartItem.product?.sku || '';
        },

        getInventory(): ProductInventory | null {
            const inv = props.cartItem.product?.inventory;
            return inv || null;
        },

        getFormattedPrice(): string {
            const item = props.cartItem;
            const price = props.includeTax ? (item?.totalSumNet || 0) : (item?.totalSum || 0);
            return `\u20AC${Number(price).toFixed(2)}`;
        },

        isBundleItem(): boolean {
            return !!props.cartItem.bundle;
        },

        getBundleName(): string {
            return props.cartItem.bundle?.name || 'Bundle';
        },

        getBundlePrice(): string {
            const price = props.cartItem.bundle?.price?.net;
            if (price === undefined || price === null) return '';
            return `\u20AC${Number(price).toFixed(2)}`;
        },

        getBundleLeaderName(): string {
            const items = props.cartItem.bundle?.items;
            if (!items) return '';
            const leader = items.find((bi: BundleItem) => bi.isLeader === Enums.YesNo.Y);
            if (!leader) return '';
            return leader.product.names?.[0]?.value || 'Product';
        },

        getBundleLeaderPrice(): string {
            const items = props.cartItem.bundle?.items;
            if (!items) return '';
            const leader = items.find((bi: BundleItem) => bi.isLeader === Enums.YesNo.Y);
            if (!leader) return '';
            const price = leader.price?.net;
            if (price === undefined || price === null) return '';
            return `\u20AC${Number(price).toFixed(2)}`;
        },

        getBundleNonLeaders(): BundleItem[] {
            const items = props.cartItem.bundle?.items;
            if (!items) return [];
            return items.filter((bi: BundleItem) => bi.isLeader !== Enums.YesNo.Y);
        },

        getBundleItemName(bundleItem: BundleItem): string {
            return bundleItem.product.names?.[0]?.value || 'Product';
        },

        getBundleItemPrice(bundleItem: BundleItem): string {
            const price = bundleItem.price?.net;
            if (price === undefined || price === null) return '';
            return `\u20AC${Number(price).toFixed(2)}`;
        },

        handleQuantityChange(newQuantity: number): void {
            if (newQuantity < 1 || state.loading) return;
            state.quantity = newQuantity;
            state.loading = true;

            if (props.onQuantityChange) {
                props.onQuantityChange(props.cartItem, newQuantity);
                state.loading = false;
                return;
            }

            const cartService = new CartService(props.graphqlClient);
            cartService.updateCartItem({
                id: props.cartId,
                itemId: props.cartItem.itemId.toString(),
                input: { quantity: newQuantity },
                language: props.language || 'NL',
                imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
                imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
            }).then((updatedCart: Cart) => {
                state.loading = false;
                if (props.afterCartUpdate) {
                    props.afterCartUpdate(updatedCart);
                }
            }).catch((error: Error) => {
                console.error('Failed to update cart item quantity:', error);
                state.quantity = props.cartItem.quantity;
                state.loading = false;
            });
        },

        handleNoteChange(note: string): void {
            state.notes = note;

            if (props.onNoteChange) {
                props.onNoteChange(props.cartItem, note);
                return;
            }

            if (state.notesTimeout) {
                clearTimeout(state.notesTimeout);
            }

            state.notesTimeout = setTimeout(() => {
                const cartService = new CartService(props.graphqlClient);
                cartService.updateCartItem({
                    id: props.cartId,
                    itemId: props.cartItem.itemId,
                    input: { notes: note },
                    language: props.language || 'NL',
                    imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
                    imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
                }).then((updatedCart: Cart) => {
                    if (props.afterCartUpdate) {
                        props.afterCartUpdate(updatedCart);
                    }
                }).catch((error: Error) => {
                    console.error('Failed to update cart item notes:', error);
                });
            }, 500);
        },

        handleDelete(): void {
            if (state.deleting) return;
            state.deleting = true;

            if (props.onDelete) {
                props.onDelete(props.cartItem);
                state.deleting = false;
                return;
            }

            const cartService = new CartService(props.graphqlClient);
            cartService.deleteCartItem({
                id: props.cartId,
                itemId: props.cartItem.itemId,
                input: { itemId: props.cartItem.itemId },
                language: props.language || 'NL',
                imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
                imageVariantFilters: props.configuration?.imageVariantFiltersSmall,
            }).then((updatedCart: Cart) => {
                state.deleting = false;
                if (props.afterCartUpdate) {
                    props.afterCartUpdate(updatedCart);
                }
            }).catch((error: Error) => {
                console.error('Failed to delete cart item:', error);
                state.deleting = false;
            });
        },

        fetchCrossupsells(): void {
            if (!props.showCrossupsells) return;
            const productId = props.cartItem?.productId;
            const clusterId = props.cartItem?.clusterId;
            if (!productId && !clusterId) return;

            state.crossupsellsLoading = true;
            const crossupsellService = new CrossupsellService(props.graphqlClient);

            const searchInput: CrossupsellsQueryVariables = {
                input: {
                    types: (props.crossupsellTypes || [Enums.CrossupsellType.ACCESSORIES]) as CrossupsellSearchInput['types'],
                    page: 1,
                    offset: 50,
                    ...(productId && !clusterId && { productIdsFrom: [productId] }),
                    ...(clusterId && { clusterIdsFrom: [clusterId] }),
                },
                language: props.language || 'NL',
                imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
                imageVariantFilters: props.configuration?.imageVariantFiltersMedium,
                priceCalculateProductInput: {
                    taxZone: props.taxZone || 'NL',
                    ...(props.user && 'company' in props.user && { companyId: (props.user as Contact)?.company?.companyId }),
                    ...(props.user && 'contactId' in props.user && { contactId: (props.user as Contact)?.contactId }),
                    ...(props.user && 'customerId' in props.user && { customerId: (props.user as Customer)?.customerId }),
                },
            };

            crossupsellService.getCrossupsells(searchInput).then((response) => {
                state.crossupsells = response?.items || [];
                state.crossupsellsLoading = false;
            }).catch(() => {
                state.crossupsells = [];
                state.crossupsellsLoading = false;
            });
        },

        getVisibleCrossupsells(): Crossupsell[] {
            const items = state.crossupsells || [];
            const limit = props.crossupsellLimit || 3;
            return items.slice(0, limit);
        },

        getCrossupsellName(item: Crossupsell): string {
            const product = item?.productTo || item?.clusterTo;
            return product?.names?.[0]?.value || 'Product';
        },

        getCrossupsellImageUrl(item: Crossupsell): string {
            const product = (item?.productTo || item?.clusterTo) as Product | undefined;
            return product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
        },

        getCrossupsellUrl(item: Crossupsell): string {
            const product = item?.productTo || item?.clusterTo;
            if (props.configuration && props.configuration.urls && product) {
                return props.configuration.urls.getProductUrl(product);
            }
            return '#';
        },
    });

    onMount(() => {
        state.quantity = props.cartItem.quantity || 1;
        state.notes = props.cartItem.notes || '';

        state.fetchCrossupsells();
    });

    onUpdate(() => {
        state.quantity = props.cartItem.quantity || 1;
        state.notes = props.cartItem.notes || '';
    }, [props.cartItem]);

    return (
        <div className={`flex gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200 ${props.className || ''}`}>
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

                {/* Bundle: title is the bundle name */}
                <Show when={state.isBundleItem()}>
                    <span className="font-semibold text-lg text-gray-900 line-clamp-2">
                        {state.getBundleName()}
                    </span>
                </Show>

                {/* Normal / cluster: title is the product name */}
                <Show when={!state.isBundleItem()}>
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
                </Show>

                {/* SKU — only for non-bundle items */}
                <Show when={!state.isBundleItem() && props.showSku !== false && !!state.getProductSku()}>
                    <p className="text-sm text-gray-500 mt-0.5">{state.getProductSku()}</p>
                </Show>

                {/* Stock */}
                <Show when={props.showStockComponent === true && !!state.getInventory()}>
                    <div className="mt-1">
                        {/* ItemStock is rendered by the parent React copy using the compiled component */}
                        <div data-cart-item-stock="true" data-inventory={JSON.stringify(state.getInventory())} />
                    </div>
                </Show>

                {/* Price — bundle price or item price */}
                <Show when={state.isBundleItem()}>
                    <Show when={!!state.getBundlePrice()}>
                        <p className="text-lg font-bold text-violet-600 mt-2">{state.getBundlePrice()}</p>
                    </Show>
                </Show>
                <Show when={!state.isBundleItem()}>
                    <p className="text-lg font-bold text-violet-600 mt-2">{state.getFormattedPrice()}</p>
                </Show>

                {/* Bundle items: leader first, then the rest */}
                <Show when={state.isBundleItem()}>
                    <div className="mt-3 space-y-1.5 border-l-2 border-violet-200 pl-3">
                        <Show when={!!state.getBundleLeaderName()}>
                            <div className="flex flex-wrap gap-x-2 text-sm text-gray-700">
                                <span className="font-semibold text-violet-700">{state.getBundleLeaderName()}</span>
                                <Show when={!!state.getBundleLeaderPrice()}>
                                    <div className="flex-1 border-b border-dotted border-gray-300 mx-1 mb-1" />
                                    <span className="font-semibold text-violet-600">{state.getBundleLeaderPrice()}</span>
                                </Show>
                            </div>
                        </Show>
                        {state.getBundleNonLeaders().map((bundleItem: BundleItem, idx: number) => (
                            <div key={idx} className="flex flex-wrap gap-x-2 text-sm text-gray-700">
                                <span className="font-medium">{state.getBundleItemName(bundleItem)}</span>
                                <Show when={!!state.getBundleItemPrice(bundleItem)}>
                                    <div className="flex-1 border-b border-dotted border-gray-300 mx-1 mb-1" />
                                    <span className="font-semibold text-violet-600">{state.getBundleItemPrice(bundleItem)}</span>
                                </Show>
                            </div>
                        ))}
                    </div>
                </Show>

                {/* Cluster child items */}
                <Show when={!!props.cartItem.clusterId && !!props.cartItem.childItems && props.cartItem.childItems.length > 0}>
                    <div className="mt-3 space-y-1.5 border-l-2 border-gray-200 pl-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            {state.getLabel('includedOptions', 'Included Options:')}
                        </p>
                        {(props.cartItem.childItems || []).map((child: CartBaseItem, idx: number) => (
                            <div key={idx} className="flex flex-wrap gap-x-2 text-sm text-gray-700">
                                <span className="font-medium">{child.product.names?.[0]?.value || 'Option'}</span>
                                <span className="text-gray-400 hidden sm:inline">-</span>
                                <span className="text-gray-400 text-xs self-center">{child.product.sku}</span>
                                <div className="flex-1 border-b border-dotted border-gray-300 mx-1 mb-1" />
                                <span className="font-semibold text-violet-600">{'\u20AC'}{child.totalSum.toFixed(2)}</span>
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
                            value={state.notes}
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
                            {state.getVisibleCrossupsells().map((item: Crossupsell, idx: number) => (
                                <a
                                    key={idx}
                                    href={state.getCrossupsellUrl(item)}
                                    onClick={(e) => {
                                        if (props.onCrossupsellClick) {
                                            e.preventDefault();
                                            props.onCrossupsellClick((item.productTo || item.clusterTo) as Product | Cluster);
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
                            onClick={() => state.handleQuantityChange(state.quantity - 1)}
                            disabled={state.quantity <= 1 || state.loading}
                            className="px-3 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-l-md select-none"
                        >
                            -
                        </button>
                        <input
                            type="number"
                            min={1}
                            value={state.quantity}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (val >= 1) state.handleQuantityChange(val);
                            }}
                            className="w-12 text-center text-sm bg-transparent border-x border-gray-300 h-full focus:ring-0 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                            type="button"
                            onClick={() => state.handleQuantityChange(state.quantity + 1)}
                            disabled={state.loading}
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
                        value={state.quantity}
                        onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (val >= 1) state.handleQuantityChange(val);
                        }}
                        className="w-16 h-10 text-center text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </Show>

                {/* Loading indicator */}
                <Show when={state.loading}>
                    <span className="text-xs text-gray-400">{state.getLabel('updating', 'Updating...')}</span>
                </Show>

                {/* Delete button */}
                <button
                    type="button"
                    onClick={() => state.handleDelete()}
                    disabled={state.deleting}
                    className="text-red-500 hover:text-red-700 text-sm font-medium transition-colors disabled:opacity-50"
                >
                    <Show when={state.deleting}>
                        {state.getLabel('deleting', 'Removing...')}
                    </Show>
                    <Show when={!state.deleting}>
                        {state.getLabel('remove', 'Remove')}
                    </Show>
                </button>
            </div>
        </div>
    );
}
