import {
    useStore,
    Show,
    For,
} from '@builder.io/mitosis';
import {
    CartService,
    CartChildItemInput,
    GraphQLClient,
    Product,
    Cart,
    Contact,
    Customer,
    CartSearchInput,
    TransformationsInput,
    MediaImageProductSearchInput,
    CartStartInput,
    CartStartVariables,
    Address,
    Enums,
    CartMainItem,
    CartBaseItem,
    Cluster
} from 'propeller-sdk-v2';

export interface AddToCartProps {
    /** GraphQL client for the Propeller SDK */
    graphqlClient: GraphQLClient;

    /** The authenticated user (Contact or Customer) */
    user: Contact | Customer | null;

    /** The product to be added to cart */
    product: Product;

    /** Cart ID — required when onAddToCart is not provided */
    cartId?: string;

    /** The cluster to be added to cart */
    cluster?: Cluster;

    /** IDs of the cluster child items, e.g. cluster options */
    childItems?: number[];

    /** Called before adding to cart. Return false to abort (e.g. failed validation). */
    beforeAddToCart?: () => boolean;

    /** Notes for the cart item */
    notes?: string;

    /** Custom price for the product (overrides calculated price) */
    price?: number;

    /** Label overrides for UI strings
     *
     * available labels:
     * - outOfStock
     * - noCartId
     * - errorAdding
     * - addedToCart
     * - modalTitle
     * - quantity
     * - continueShopping
     * - proceedToCheckout
     * - add
     * - adding
    */
    labels?: Record<string, string>;

    /**
     * If true a new cart is created if no cart ID is provided.
     * Defaults to false.
     */
    createCart?: boolean;

    /**
     * Callback to handle a new cart being created.
     * WARNING: If not provided the component create new carts on every add-to-cart.
     */
    onCartCreated?: (cart: Cart) => void;

    /**
     * Callback to handle adding the product to cart.
     * If not provided the component calls CartService.addItemToCart internally.
     */
    onAddToCart?: (
        product: Product,
        clusterId?: number,
        quantity?: number,
        childItems?: CartChildItemInput[],
        notes?: string,
        price?: number,
        showModal?: boolean,
    ) => Cart;


    /**
     * Callback triggered after adding the product to cart.
     */
    afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;

    /**
     * When true a modal popup is shown after a successful add-to-cart
     * with buttons to continue shopping or proceed to checkout.
     * Defaults to false (only a brief inline success message is shown).
     */
    showModal?: boolean;

    /**
     * Renders − and + buttons beside the quantity input.
     * Defaults to true.
     */
    allowIncrDecr?: boolean;

    /**
     * Validates available stock via InventoryService before adding.
     * Defaults to false.
     */
    enableStockValidation?: boolean;

    /** Language code passed to CartService operations. Defaults to 'en'. */
    language?: string;

    /** Additional CSS class for the root element */
    className?: string;

    /** Callback fired when the "Proceed to checkout" modal button is clicked */
    onProceedToCheckout?: () => void;

    /** Configuration object passed to the component */
    configuration?: any;
}

/**
 * Cart query variables interface
 Variables for the cart query
 */
export interface CartQueryVariables {
    /** Cart ID to fetch */
    cartId: string;
    /** Language for localized content */
    language: string;
    /** Image search filters */
    imageSearchFilters: MediaImageProductSearchInput;
    /** Image transformation filters */
    imageVariantFilters: TransformationsInput;
}

interface AddToCartState {
    quantity: number;
    loading: boolean;
    success: boolean;
    modalVisible: boolean;
    activeCartId: string;
    toastMessage: string;
    toastType: string;
    toastVisible: boolean;
    increment: () => void;
    decrement: () => void;
    showToast: (message: string, type: string) => void;
    dismissToast: () => void;
    getProductName: () => string;
    getProductUrl: () => string;
    getProductImageUrl: () => string;
    getProductSku: () => string;
    getProductPrice: () => string;
    addedCartItem: CartMainItem | null;
    getModalImageUrl: () => string;
    getModalName: () => string;
    getModalPrice: () => string;
    getModalSku: () => string;
    getChildItems: () => CartBaseItem[];
    initCart: () => Promise<string>;
    handleAddToCart: () => Promise<void>;
    closeModal: () => void;
    getLabel: (key: string, fallback: string) => string;
}

export default function AddToCart(props: AddToCartProps) {
    const state = useStore<AddToCartState>({
        quantity: 1,
        loading: false,
        success: false,
        modalVisible: false,
        activeCartId: '',
        toastMessage: '',
        toastType: '',
        toastVisible: false,
        addedCartItem: null as CartMainItem | null,

        increment() {
            state.quantity = state.quantity + 1;
        },

        decrement() {
            if (state.quantity > 1) {
                state.quantity = state.quantity - 1;
            }
        },

        showToast(message: string, type: string) {
            state.toastMessage = message;
            state.toastType = type;
            state.toastVisible = true;
            setTimeout(() => {
                state.toastVisible = false;
            }, 3000);
        },

        dismissToast() {
            state.toastVisible = false;
        },

        getProductName() {
            return (props.product as any)?.names?.[0]?.value || 'Product';
        },

        getProductUrl() {
            return props.configuration.urls.getProductUrl(props.product, props.language);
        },

        getProductImageUrl() {
            return (props.product as any)?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
        },

        getProductSku() {
            return (props.product as any)?.sku || '';
        },

        getProductPrice() {
            const price = props.price !== undefined ? props.price : (props.product as any)?.price?.gross;
            if (!price && price !== 0) return '';
            return `\u20AC${Number(price).toFixed(2)}`;
        },

        async initCart(): Promise<string> {
            const cartService = new CartService(props.graphqlClient);
            // 1. Check for existing carts for this user first
            if (props.user) {
                try {
                    const searchInput: CartSearchInput = {
                        offset: 100
                    };

                    if ('contactId' in props.user && props.user.contactId) {
                        searchInput.contactIds = [props.user.contactId];
                        if (props.user.company && 'companyId' in props.user.company && props.user.company.companyId) {
                            searchInput.companyIds = [props.user.company.companyId];
                        }
                    } else if ('customerId' in props.user && props.user.customerId) {
                        searchInput.customerIds = [props.user.customerId];
                    }

                    const carts = await cartService.getCarts(searchInput);

                    if (carts && carts.items && carts.items.length > 0) {
                        const existingCartId = carts.items[carts.items.length - 1].cartId;

                        const cartVariables: CartQueryVariables = {
                            cartId: existingCartId,
                            imageSearchFilters: props.configuration.imageSearchFiltersGrid,
                            imageVariantFilters: props.configuration.imageVariantFiltersSmall,
                            language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
                        };

                        const cart = await cartService.getCart(cartVariables);

                        state.activeCartId = cart.cartId;

                        if (props.onCartCreated) {
                            props.onCartCreated(cart);
                        }

                        return cart.cartId;
                    }
                } catch (e) {
                    console.error("Failed to check existing carts", e);
                }
            }

            // 2. Start a new cart
            const language = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL';
            const startCartInput: CartStartInput = { language };

            if (props.user) {
                if ('contactId' in props.user && props.user.contactId) {
                    startCartInput.contactId = props.user.contactId;
                    if ('companyId' in props.user && props.user.companyId) {
                        startCartInput.companyId = props.user.companyId as number;
                    }
                } else if ('customerId' in props.user && props.user.customerId) {
                    startCartInput.customerId = props.user.customerId;
                }
            }

            const cartStartVars: CartStartVariables = {
                input: startCartInput,
                imageSearchFilters: props.configuration.imageSearchFiltersGrid,
                imageVariantFilters: props.configuration.imageVariantFiltersSmall,
                language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
            };

            let newCart = await cartService.startCart(cartStartVars);

            // 3. Assign Default Addresses
            if (newCart && props.user) {
                const addresses = 'company' in props.user ? props.user.company?.addresses : (props.user as Customer).addresses;

                if (addresses && Array.isArray(addresses)) {
                    const defaultInvoice = addresses.find((addr: Address) => addr.isDefault === 'Y' && addr.type === 'invoice');
                    const defaultDelivery = addresses.find((addr: Address) => addr.isDefault === 'Y' && addr.type === 'delivery');

                    if (defaultInvoice) {
                        newCart = await cartService.updateCartAddress({
                            id: newCart.cartId,
                            input: {
                                type: Enums.CartAddressType.INVOICE,
                                firstName: defaultInvoice.firstName || '',
                                lastName: defaultInvoice.lastName || '',
                                street: defaultInvoice.street || '',
                                postalCode: defaultInvoice.postalCode || '',
                                city: defaultInvoice.city || '',
                                country: defaultInvoice.country || 'NL',
                                company: defaultInvoice.company || '',
                                gender: defaultInvoice.gender || Enums.Gender.U,
                                middleName: defaultInvoice.middleName || '',
                                number: defaultInvoice.number || '',
                                numberExtension: defaultInvoice.numberExtension || '',
                                email: defaultInvoice.email || '',
                                mobile: defaultInvoice.mobile || '',
                                phone: defaultInvoice.phone || '',
                                notes: defaultInvoice.notes || ''
                            },
                            imageSearchFilters: props.configuration.imageSearchFiltersGrid,
                            imageVariantFilters: props.configuration.imageVariantFiltersSmall,
                            language: language
                        });
                    }

                    if (defaultDelivery) {
                        newCart = await cartService.updateCartAddress({
                            id: newCart.cartId,
                            input: {
                                type: Enums.CartAddressType.DELIVERY,
                                firstName: defaultDelivery.firstName || '',
                                lastName: defaultDelivery.lastName || '',
                                street: defaultDelivery.street || '',
                                postalCode: defaultDelivery.postalCode || '',
                                city: defaultDelivery.city || '',
                                country: defaultDelivery.country || 'NL',
                                company: defaultDelivery.company || '',
                                gender: defaultDelivery.gender || Enums.Gender.U,
                                middleName: defaultDelivery.middleName || '',
                                number: defaultDelivery.number || '',
                                numberExtension: defaultDelivery.numberExtension || '',
                                email: defaultDelivery.email || '',
                                mobile: defaultDelivery.mobile || '',
                                phone: defaultDelivery.phone || '',
                                notes: defaultDelivery.notes || ''
                            },
                            imageSearchFilters: props.configuration.imageSearchFiltersGrid,
                            imageVariantFilters: props.configuration.imageVariantFiltersSmall,
                            language: language
                        });
                    }
                }
            }

            state.activeCartId = newCart.cartId;

            if (props.onCartCreated) {
                props.onCartCreated(newCart);
            }

            return newCart.cartId;
        },

        async handleAddToCart() {
            if (!props.graphqlClient) return;
            if (props.beforeAddToCart && !props.beforeAddToCart()) return;

            state.loading = true;
            state.success = false;

            try {
                // Optional stock validation
                if (props.enableStockValidation) {
                    const inventory = props.product.inventory;

                    const available = inventory?.totalQuantity || 0;

                    if (available < state.quantity) {
                        state.showToast(state.getLabel('outOfStock', 'Insufficient stock available'), 'error');
                        return;
                    }
                }

                // Map raw child-item IDs → CartChildItemInput[]
                const childItems: CartChildItemInput[] | undefined = props.childItems
                    ? props.childItems.map((id: number) => ({ productId: id, quantity: state.quantity }))
                    : undefined;

                if (props.onAddToCart) {
                    // Consumer-provided handler
                    const cart = props.onAddToCart(
                        props.product,
                        props.cluster?.clusterId,
                        state.quantity,
                        childItems,
                        props.notes,
                        props.price,
                        props.showModal,
                    );
                    const addedItem = cart.items?.find((item) => item.productId === props.product.productId);
                    state.addedCartItem = addedItem || null;
                    props.afterAddToCart?.(cart, addedItem);
                } else {
                    // Internal CartService fallback — resolve cart ID
                    let cartId = props.cartId || state.activeCartId;

                    if (!cartId) {
                        if (props.createCart) {
                            cartId = await state.initCart();
                        }

                        if (!cartId) {
                            state.showToast(state.getLabel('noCartId', 'No cart ID provided'), 'error');
                            return;
                        }
                    }

                    const cartService = new CartService(props.graphqlClient);
                    const cart = await cartService.addItemToCart({
                        id: cartId,
                        input: {
                            productId: props.product.productId,
                            quantity: state.quantity,
                            ...(props.cluster?.clusterId !== undefined && { clusterId: props.cluster?.clusterId }),
                            ...(childItems && { childItems }),
                            ...(props.notes && { notes: props.notes }),
                            ...(props.price !== undefined && { price: props.price }),
                        },
                        language: props.language || 'NL',
                        imageSearchFilters: props.configuration.imageSearchFiltersGrid,
                        imageVariantFilters: props.configuration.imageVariantFiltersSmall,
                    });

                    const addedItem = cart.items?.find((item) => item.productId === props.product.productId);
                    state.addedCartItem = addedItem || null;
                    props.afterAddToCart?.(cart, addedItem);
                }

                state.success = true;

                if (props.showModal) {
                    state.modalVisible = true;
                } else {
                    state.showToast(`${state.getProductName()} ${state.getLabel('addedToCart', 'added to cart')}`, 'success');
                }
            } catch (error) {
                console.error('Error adding to cart:', error);
                state.showToast(state.getLabel('errorAdding', 'Failed to add item to cart'), 'error');
            } finally {
                state.loading = false;
            }
        },

        getModalImageUrl() {
            if (state.addedCartItem) {
                const img = state.addedCartItem.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
                if (img) return img;
            }
            return state.getProductImageUrl();
        },

        getModalName() {
            if (state.addedCartItem) {
                return state.addedCartItem.product?.names?.[0]?.value || state.getProductName();
            }
            return state.getProductName();
        },

        getModalPrice() {
            if (state.addedCartItem) {
                return '\u20AC' + Number(state.addedCartItem.totalSumNet).toFixed(2);
            }
            return state.getProductPrice();
        },

        getModalSku() {
            if (state.addedCartItem) return state.addedCartItem.product?.sku || '';
            return state.getProductSku();
        },

        getChildItems(): CartBaseItem[] {
            const children = state.addedCartItem?.childItems;
            if (!children || !Array.isArray(children)) return [];
            return children;
        },

        closeModal() {
            state.modalVisible = false;
            state.success = false;
            state.addedCartItem = null;
        },

        getLabel(key: string, fallback: string) {
            return (props.labels as any)?.[key] || fallback;
        },
    });

    return (
        <div className={props.className}>
            {/* Add-to-cart row */}
            <div className="flex items-center gap-2 w-full">

                {/* Quantity with +/− controls */}
                <Show when={props.allowIncrDecr !== false}>
                    <div className="flex items-center border border-gray-300 rounded-md bg-white h-10">
                        <button
                            type="button"
                            onClick={() => state.decrement()}
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
                                if (val >= 1) state.quantity = val;
                            }}
                            className="w-10 text-center text-sm bg-transparent border-none focus:ring-0 focus:outline-none h-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                            type="button"
                            onClick={() => state.increment()}
                            disabled={state.loading}
                            className="px-3 h-full text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-r-md select-none"
                        >
                            +
                        </button>
                    </div>
                </Show>

                {/* Plain quantity input (no +/− buttons) */}
                <Show when={props.allowIncrDecr === false}>
                    <input
                        type="number"
                        min={1}
                        value={state.quantity}
                        onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (val >= 1) state.quantity = val;
                        }}
                        className="w-16 h-10 text-center text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-violet-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </Show>

                {/* Add button */}
                <button
                    type="button"
                    onClick={() => state.handleAddToCart()}
                    disabled={state.loading}
                    className="flex-1 inline-flex justify-center items-center h-10 px-6 border border-transparent text-sm font-medium rounded-md text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Show when={state.loading}>
                        {state.getLabel('adding', 'Adding...')}
                    </Show>
                    <Show when={!state.loading}>
                        {state.getLabel('add', 'Add')}
                    </Show>
                </button>
            </div>

            {/* Toast notification — fixed top-right, auto-dismisses after 3 s */}
            <Show when={state.toastVisible}>
                <div className={`fixed top-4 right-4 z-50 flex items-start gap-3 w-80 rounded-lg shadow-lg p-4 ${state.toastType === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className={`flex-shrink-0 w-5 h-5 mt-0.5 ${state.toastType === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                        <Show when={state.toastType === 'success'}>
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        </Show>
                        <Show when={state.toastType === 'error'}>
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                            </svg>
                        </Show>
                    </div>
                    <p className={`flex-1 text-sm font-medium ${state.toastType === 'success' ? 'text-green-800' : 'text-red-800'}`}>
                        {state.toastMessage}
                    </p>
                    <button
                        type="button"
                        onClick={() => state.dismissToast()}
                        className={`flex-shrink-0 rounded focus:outline-none ${state.toastType === 'success' ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'}`}
                    >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </Show>

            {/* Success modal */}
            <Show when={state.modalVisible}>
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                    {/* Slightly opaque backdrop */}
                    <div className="fixed inset-0 bg-gray-500/20" onClick={() => state.closeModal()} />

                    {/* Panel */}
                    <div className="relative w-full max-w-lg bg-white rounded-lg shadow-2xl overflow-hidden">

                        {/* Title bar */}
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
                            <svg className="h-5 w-5 flex-shrink-0 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <h3 className="flex-1 text-base font-semibold text-gray-900">
                                {state.getLabel('modalTitle', 'Added to cart')}
                            </h3>
                            <button
                                type="button"
                                onClick={() => state.closeModal()}
                                className="flex-shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Product info */}
                        <div className="px-6 py-5">
                            <div className="flex items-start gap-4">
                                <Show when={!!state.getModalImageUrl()}>
                                    <img
                                        src={state.getModalImageUrl()}
                                        alt={state.getModalName()}
                                        className="w-16 h-16 object-contain rounded border border-gray-100 flex-shrink-0"
                                    />
                                </Show>
                                <Show when={!state.getModalImageUrl()}>
                                    <div className="w-16 h-16 flex items-center justify-center rounded border border-gray-100 flex-shrink-0 bg-gray-50">
                                        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                        </svg>
                                    </div>
                                </Show>
                                <div className="flex-1 min-w-0">
                                    <a
                                        href={state.getProductUrl()}
                                        className="text-sm font-medium text-violet-600 leading-tight hover:underline line-clamp-2"
                                    >
                                        {state.getModalName()}
                                    </a>
                                    <Show when={!!state.getModalSku()}>
                                        <p className="text-xs text-gray-400 mt-0.5">SKU: {state.getModalSku()}</p>
                                    </Show>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <p className="text-xs text-gray-500">
                                        {state.getLabel('quantity', 'Quantity')}: {state.quantity}
                                    </p>
                                    <Show when={!!state.getModalPrice()}>
                                        <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                            {state.getModalPrice()}
                                        </p>
                                    </Show>
                                </div>
                            </div>
                            {/* Cluster child items */}
                            <Show when={state.getChildItems().length > 0}>
                                <div className="mt-3 ml-20 space-y-1 border-l-2 border-gray-100 pl-2">
                                    <For each={state.getChildItems()}>
                                        {(child: CartBaseItem, idx: number) => (
                                            <div className="flex justify-between items-center text-xs text-gray-600" key={idx}>
                                                <span className="line-clamp-1">
                                                    {child.product?.names?.[0]?.value || 'Option'}
                                                </span>
                                                <span className="text-gray-400 whitespace-nowrap ml-2">
                                                    {'\u20AC' + (child.totalSum?.toFixed(2) || '0.00')}
                                                </span>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => state.closeModal()}
                                className="flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                            >
                                {state.getLabel('continueShopping', 'Continue shopping')}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    state.closeModal();
                                    if (props.onProceedToCheckout) props.onProceedToCheckout();
                                }}
                                className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                            >
                                {state.getLabel('proceedToCheckout', 'Proceed to checkout')}
                            </button>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    );
}
