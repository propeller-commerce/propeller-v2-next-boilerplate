import { useStore, Show, For, onMount, onUpdate } from '@builder.io/mitosis';
import {
    GraphQLClient,
    BundleService,
    CartService,
    BundleQueryVariables,
    Contact,
    Customer,
    Cart,
    Enums,
    CartAddBundleVariables,
    CartSearchInput,
    Bundle,
    BundleItem,
    Product,
    CartQueryVariables,
    CartStartInput,
    CartStartVariables,
    Address,
} from 'propeller-sdk-v2';

export interface ProductBundlesProps {
    // === Core ===

    /** GraphQL client instance used to fetch bundle data. */
    graphqlClient: GraphQLClient;

    /** ID of the product whose bundles should be fetched. */
    productId: number;

    /** Language code used for content (e.g. 'NL', 'EN'). */
    language: string;

    /** Tax zone code used for pricing (e.g. 'NL'). */
    taxZone: string;

    // === Pricing ===

    /**
     * When true, net price (incl. tax) is the leading price.
     * Note: in the Propeller SDK `price.gross` = excl. VAT, `price.net` = incl. VAT.
     */
    includeTax?: boolean;

    // === Portal / visibility ===

    /**
     * Controls portal visibility mode.
     * 'semi-closed' — prices and add-to-cart are hidden for anonymous users.
     * Defaults to 'open'.
     */
    portalMode?: string;

    /** Authenticated user — used for semi-closed visibility check. */
    user?: Contact | Customer | null;

    /** Cart ID — required when onAddToCart is not provided */
    cartId?: string;

    /**
     * Callback to handle a new cart being created.
     * WARNING: If not provided the component create new carts on every add-to-cart.
     */
    onCartCreated?: (cart: Cart) => void;

    /**
     * If true a new cart is created if no cart ID is provided.
     * Defaults to false.
     */
    createCart?: boolean;

    // === Display options ===

    /** When true, stock availability is validated before adding to cart. */
    stockValidation?: boolean;

    /**
     * When true, the individual bundle items are listed inside each bundle card.
     * Defaults to true.
     */
    showIndividualItems?: boolean;

    /** Additional configuration object passed through to the component. */
    configuration?: any;

    /**
     * Layout variant for the bundle display.
     * - 'vertical' — stacked layout
     * - 'horizontal' — side-by-side (default)
     * - 'compact' — condensed, hides individual items
     */
    layout?: 'vertical' | 'horizontal' | 'compact';

    /**
     * Override any UI string.
     * Available keys: title, condition_ALL, condition_EP, leaderItem,
     * youSave, adding, addToCart, loginToSeePrices, addedToCart,
     * modalTitle, continueShopping, proceedToCheckout, noCartId
     */
    labels?: Record<string, string>;

    // === Modal / feedback ===

    /**
     * When true a modal popup is shown after a successful add-to-cart
     * with buttons to continue shopping or proceed to checkout.
     * Defaults to false (only a brief inline toast is shown).
     */
    showModal?: boolean;

    /** Callback fired when the "Proceed to checkout" modal button is clicked */
    onProceedToCheckout?: () => void;

    // === Callbacks ===

    /**
     * Callback triggered before adding the bundle to cart.
     */
    beforeBundleAddToCart?: (bundleId: string, quantity: number) => boolean;

    /** Called when the user clicks "Add bundle to cart". Receives bundleId and quantity (always 1). */
    onAddBundleToCart?: (bundleId: string, quantity: number) => void;

    /**
     * Callback triggered after adding the bundle to cart.
     */
    afterBundleAddToCart?: (cart: Cart, bundle?: Bundle) => void;

    /** Extra CSS class applied to the root wrapper element. */
    className?: string;
}

interface ProductBundlesState {
    bundles: Bundle[];
    isLoading: boolean;
    includeTax: boolean;
    isMounted: boolean;
    addingBundleId: string | null;
    lastAddedBundle: Bundle | null;
    activeCartId: string;
    toastMessage: string;
    toastType: string;
    toastVisible: boolean;
    modalVisible: boolean;

    getIncludeTax: () => boolean;
    getShowItems: () => boolean;
    getLayout: () => string;
    getIsAnonymous: () => boolean;
    getHidePrices: () => boolean;
    getLabel: (key: string, fallback: string) => string;
    formatPrice: (value: number) => string;
    getBundlePrice: (bundle: Bundle) => number;
    getOriginalPrice: (bundle: Bundle) => number;
    getItemPrice: (item: BundleItem) => number;
    hasDiscount: (bundle: Bundle) => boolean;
    getDiscountPercentage: (bundle: Bundle) => number;
    getProductImage: (product: Product) => string;
    getProductName: (product: Product) => string;
    showToast: (message: string, type: string) => void;
    dismissToast: () => void;
    closeModal: () => void;
    fetchBundles: () => Promise<void>;
    handleAddToCart: (bundle: Bundle) => Promise<void>;
    initCart: () => Promise<void>;
}

export default function ProductBundles(props: ProductBundlesProps) {
    const state = useStore<ProductBundlesState>({
        bundles: [] as Bundle[],
        isLoading: false,
        includeTax: true,
        isMounted: false,
        addingBundleId: null as string | null,
        lastAddedBundle: null as Bundle | null,
        activeCartId: '',
        toastMessage: '',
        toastType: '',
        toastVisible: false,
        modalVisible: false,

        getIncludeTax(): boolean {
            return props.includeTax !== undefined ? !!(props.includeTax) : state.includeTax;
        },

        getShowItems(): boolean {
            return props.showIndividualItems !== undefined ? !!(props.showIndividualItems) : true;
        },

        getLayout(): string {
            return (props.layout as string) || 'horizontal';
        },

        getIsAnonymous(): boolean {
            return !props.user;
        },

        getHidePrices(): boolean {
            return (props.portalMode as string) === 'semi-closed' && state.getIsAnonymous();
        },

        getLabel(key: string, fallback: string): string {
            const val = (props.labels as Record<string, string>)?.[key];
            return val !== undefined ? val : fallback;
        },

        formatPrice(value: number): string {
            return '\u20AC' + Number(value).toFixed(2);
        },

        getBundlePrice(bundle: Bundle): number {
            return state.getIncludeTax() ? bundle.price?.net || 0 : bundle.price?.gross || 0;
        },

        getOriginalPrice(bundle: Bundle): number {
            return state.getIncludeTax() ? bundle.price?.originalNet || 0 : bundle.price?.originalGross || 0;
        },

        getItemPrice(item: BundleItem): number {
            return state.getIncludeTax() ? item.price?.net || 0 : item.price?.gross || 0;
        },

        hasDiscount(bundle: Bundle): boolean {
            const current: number = state.getBundlePrice(bundle);
            const original: number = state.getOriginalPrice(bundle);
            return original > 0 && current < original;
        },

        getDiscountPercentage(bundle: Bundle): number {
            const original: number = state.getOriginalPrice(bundle);
            if (original <= 0) return 0;
            return Math.round(((original - state.getBundlePrice(bundle)) / original) * 100);
        },

        getProductImage(product: Product): string {
            return product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
        },

        getProductName(product: Product): string {
            return product?.names?.[0]?.value || '';
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

        closeModal() {
            state.modalVisible = false;
            state.lastAddedBundle = null;
        },

        async initCart() {
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
                        const cartId = carts.items[carts.items.length - 1].cartId;

                        const cartVariables: CartQueryVariables = {
                            cartId: cartId,
                            imageSearchFilters: props.configuration.imageSearchFiltersGrid,
                            imageVariantFilters: props.configuration.imageVariantFiltersSmall,
                            language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
                        };

                        const cart = await cartService.getCart(cartVariables);

                        state.activeCartId = cart.cartId;

                        if (props.onCartCreated) {
                            props.onCartCreated(cart);
                        }
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
        },

        async fetchBundles(): Promise<void> {
            if (!props.graphqlClient || !props.productId) return;
            state.isLoading = true;
            try {
                const bundleService = new BundleService(props.graphqlClient);
                const productBundlesQueryVariables: BundleQueryVariables = {
                    input: {
                        productIds: [props.productId],
                        taxZone: props.taxZone || 'NL',
                        page: 1,
                        offset: 20,
                    },
                    language: props.language || 'NL',
                    imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
                    imageVariantFilters: props.configuration?.imageVariantFiltersMedium
                };

                const result = await bundleService.getBundles(productBundlesQueryVariables);

                state.bundles = result?.items || [];
            } catch (e) {
                state.bundles = [];
            } finally {
                state.isLoading = false;
            }
        },

        async handleAddToCart(bundle: Bundle): Promise<void> {
            if (state.addingBundleId) return;

            state.addingBundleId = bundle.id;

            try {
                if (props.onAddBundleToCart) {
                    props.onAddBundleToCart(bundle.id, 1);
                } else {
                    if (!props.graphqlClient) return;
                    if (props.beforeBundleAddToCart) {
                        props.beforeBundleAddToCart(bundle.id, 1);
                    }

                    // Internal CartService fallback — resolve cart ID
                    let cartId = props.cartId || state.activeCartId;

                    if (!cartId) {
                        if (props.createCart) {
                            await state.initCart();
                            cartId = state.activeCartId;
                        }

                        if (!cartId) {
                            state.showToast(state.getLabel('noCartId', 'No cart ID provided'), 'error');
                            return;
                        }
                    }

                    const cartService = new CartService(props.graphqlClient);
                    const cartAddBundleVariables: CartAddBundleVariables = {
                        id: cartId,
                        input: {
                            bundleId: bundle.id,
                            quantity: 1,
                        },
                        language: props.language || 'NL',
                        imageSearchFilters: props.configuration?.imageSearchFiltersGrid,
                        imageVariantFilters: props.configuration?.imageVariantFiltersSmall
                    };

                    const cart = await cartService.addBundleToCart(cartAddBundleVariables);

                    if (props.afterBundleAddToCart) {
                        props.afterBundleAddToCart(cart, bundle);
                    }
                }

                if (props.showModal) {
                    state.lastAddedBundle = bundle;
                    state.modalVisible = true;
                } else {
                    const bundleName = bundle.name || state.getLabel('title', 'Bundle');
                    state.showToast(`${bundleName} ${state.getLabel('addedToCart', 'added to cart')}`, 'success');
                }
            } catch (error) {
                console.error('Error adding bundle to cart:', error);
                state.showToast(state.getLabel('errorAdding', 'Failed to add bundle to cart'), 'error');
            } finally {
                state.addingBundleId = null;
            }
        },


    });

    onMount(() => {
        state.isMounted = true;
        state.fetchBundles();
    });

    onUpdate(() => {
        state.fetchBundles();
    }, [props.productId]);

    return (
        <Show when={state.isMounted && !state.isLoading && state.bundles.length > 0}>
            <div className={props.className || 'mb-12'}>
                <For each={state.bundles}>
                    {(bundle: Bundle, bundleIdx: number) => (
                        <div key={bundle.id || bundleIdx} className="border border-gray-200 rounded-xl bg-white shadow-sm mb-6 p-6">
                            <div className="flex flex-col lg:flex-row items-center gap-6">
                                {/* Bundle items — horizontal with + separators */}
                                <Show when={state.getShowItems() && state.getLayout() !== 'compact' && bundle.items && bundle.items.length > 0}>
                                    <div className="flex flex-wrap items-center justify-center gap-2 flex-1">
                                        <For each={bundle.items}>
                                            {(item: BundleItem, idx: number) => (
                                                <div key={item.productId + '-' + idx} className="flex items-center gap-2">
                                                    {/* + separator before item (skip first) */}
                                                    <Show when={idx > 0}>
                                                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                                            </svg>
                                                        </div>
                                                    </Show>
                                                    {/* Product card */}
                                                    <div className="flex flex-col items-center text-center w-40">
                                                        <div className="w-32 h-32 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0 mb-2">
                                                            <Show when={state.getProductImage(item.product)}>
                                                                <img
                                                                    src={state.getProductImage(item.product)}
                                                                    alt={state.getProductName(item.product)}
                                                                    className="w-full h-full object-contain p-2"
                                                                />
                                                            </Show>
                                                        </div>
                                                        <div className="text-sm font-medium text-gray-600 leading-tight mb-1">
                                                            {state.getProductName(item.product) || 'Product ' + item.productId}
                                                        </div>
                                                        <Show when={!state.getHidePrices() && item.price}>
                                                            <div className="text-sm font-semibold text-gray-900">
                                                                {state.formatPrice(state.getItemPrice(item))}
                                                                <span className="text-xs font-normal text-gray-500 ml-1">
                                                                    {state.getIncludeTax()
                                                                        ? state.getLabel('inclTax', 'incl. VAT')
                                                                        : state.getLabel('exclTax', 'excl. VAT')}
                                                                </span>
                                                            </div>
                                                        </Show>
                                                    </div>
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </Show>

                                {/* Discount separator */}
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5M3.75 7.5h16.5" />
                                    </svg>
                                </div>

                                {/* Summary panel */}
                                <div className="flex-shrink-0 w-full lg:w-72 pl-0 lg:pl-6">
                                    <h3 className="text-xl font-bold text-gray-700 mb-1">
                                        {bundle.name || state.getLabel('title', 'Combo deal')}
                                    </h3>
                                    <Show when={bundle.description}>
                                        <p className="text-sm text-gray-600 mb-3">{bundle.description}</p>
                                    </Show>
                                    <Show when={bundle.condition}>
                                        <p className="text-xs text-gray-500 mb-3">
                                            {bundle.condition === Enums.BundleCondition.ALL
                                                ? state.getLabel('condition_ALL', 'Discount on all items')
                                                : state.getLabel('condition_EP', 'Discount on extra items')}
                                        </p>
                                    </Show>

                                    <Show when={!state.getHidePrices()}>
                                        <div className="mb-3">
                                            <Show when={state.hasDiscount(bundle)}>
                                                <span className="text-gray-400 line-through text-sm">
                                                    {state.formatPrice(state.getOriginalPrice(bundle))}
                                                </span>
                                            </Show>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-bold text-gray-900">
                                                    {state.formatPrice(state.getBundlePrice(bundle))}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {state.getIncludeTax()
                                                        ? state.getLabel('inclTax', 'incl. VAT')
                                                        : state.getLabel('exclTax', 'excl. VAT')}
                                                </span>
                                            </div>
                                            <Show when={state.hasDiscount(bundle)}>
                                                <div className="mt-2 inline-block bg-green-100 text-green-700 text-sm font-medium px-3 py-1 rounded-md">
                                                    {state.getLabel('youSave', 'Your savings:')} {state.formatPrice(state.getOriginalPrice(bundle) - state.getBundlePrice(bundle))}
                                                </div>
                                            </Show>
                                        </div>
                                        <button
                                            onClick={() => state.handleAddToCart(bundle)}
                                            disabled={state.addingBundleId === bundle.id}
                                            className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-base"
                                        >
                                            {state.addingBundleId === bundle.id
                                                ? state.getLabel('adding', 'Adding...')
                                                : state.getLabel('addToCart', 'In cart')}
                                        </button>
                                    </Show>

                                    <Show when={state.getHidePrices()}>
                                        <div className="text-center text-sm text-gray-500 py-2">
                                            {state.getLabel('loginToSeePrices', 'Log in to see prices and add to cart')}
                                        </div>
                                    </Show>
                                </div>
                            </div>
                        </div>
                    )}
                </For>

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

                            {/* Bundle info */}
                            <div className="px-6 py-5">
                                <div className="flex items-start gap-4">
                                    <Show when={state.lastAddedBundle && state.lastAddedBundle.items && state.lastAddedBundle.items.length > 0 && state.getProductImage(state.lastAddedBundle.items[0].product)}>
                                        <img
                                            className="w-16 h-16 object-contain rounded border border-gray-100 flex-shrink-0"
                                            src={state.lastAddedBundle?.items?.[0] ? state.getProductImage(state.lastAddedBundle.items[0].product) : ''}
                                            alt={state.lastAddedBundle?.name || 'Bundle'}
                                        />
                                    </Show>
                                    <Show when={!state.lastAddedBundle || !state.lastAddedBundle.items || state.lastAddedBundle.items.length === 0 || !state.getProductImage(state.lastAddedBundle.items[0].product)}>
                                        <div className="w-16 h-16 flex items-center justify-center rounded border border-gray-100 flex-shrink-0 bg-gray-50">
                                            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                            </svg>
                                        </div>
                                    </Show>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900">
                                            {state.lastAddedBundle?.name || state.getLabel('title', 'Bundle')}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 text-right">
                                        <p className="text-xs text-gray-500">
                                            {state.getLabel('quantity', 'Quantity')}: 1
                                        </p>
                                        <Show when={!state.getHidePrices() && state.lastAddedBundle}>
                                            <p className="text-sm font-semibold text-gray-900 mt-0.5">
                                                {state.formatPrice(state.getBundlePrice(state.lastAddedBundle!))}
                                            </p>
                                        </Show>
                                    </div>
                                </div>
                                {/* Bundle sub-items */}
                                <Show when={state.lastAddedBundle && state.lastAddedBundle.items && state.lastAddedBundle.items.length > 0}>
                                    <div className="mt-3 ml-20 space-y-1 border-l-2 border-violet-100 pl-2">
                                        <For each={state.lastAddedBundle?.items}>
                                            {(item: BundleItem, idx: number) => (
                                                <div className="flex justify-between items-center text-xs text-gray-600" key={item.productId + '-' + idx}>
                                                    <span className="line-clamp-1">
                                                        {state.getProductName(item.product) || 'Product'}
                                                    </span>
                                                    <Show when={!state.getHidePrices() && item.price}>
                                                        <span className="text-gray-400 whitespace-nowrap ml-2">
                                                            {state.formatPrice(state.getItemPrice(item))}
                                                        </span>
                                                    </Show>
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
                                    className="flex-1 inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    {state.getLabel('continueShopping', 'Continue shopping')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        state.closeModal();
                                        if (props.onProceedToCheckout) props.onProceedToCheckout();
                                    }}
                                    className="flex-1 inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    {state.getLabel('proceedToCheckout', 'Proceed to checkout')}
                                </button>
                            </div>
                        </div>
                    </div>
                </Show>
            </div>
        </Show>
    );
}
