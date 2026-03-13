import { useStore, Show, For, onMount, onUpdate } from '@builder.io/mitosis';
import {
    GraphQLClient,
    BundleService,
    Contact,
    Customer,
} from 'propeller-sdk-v2';

export interface ProductBundlesProps {
    graphqlClient: GraphQLClient;
    productId: number;
    language: string;
    taxZone: string;
    includeTax?: boolean;
    portalMode?: string;
    user?: Contact | Customer | null;
    stockValidation?: boolean;
    showIndividualItems?: boolean;
    layout?: 'vertical' | 'horizontal' | 'compact';
    labels?: Record<string, string>;
    onAddBundleToCart: (bundleId: string, quantity: number) => void;
    className?: string;
}

export default function ProductBundles(props: ProductBundlesProps) {
    const state = useStore({
        _bundles: [] as any[],
        _isLoading: false,
        _includeTax: true,
        _priceListener: null as any,
        _isMounted: false,
        _addingBundleId: null as string | null,

        get includeTax() {
            return props.includeTax !== undefined ? props.includeTax : state._includeTax;
        },

        get showItems() {
            return props.showIndividualItems !== undefined ? props.showIndividualItems : true;
        },

        get layout() {
            return props.layout || 'horizontal';
        },

        get isAnonymous() {
            return !props.user;
        },

        get hidePrices() {
            return props.portalMode === 'semi-closed' && state.isAnonymous;
        },

        getLabel(key: string, fallback: string) {
            return props.labels?.[key] || fallback;
        },

        formatPrice(value: number) {
            return '\u20AC' + value.toFixed(2);
        },

        getBundlePrice(bundle: any) {
            return state.includeTax ? bundle.price?.net || 0 : bundle.price?.gross || 0;
        },

        getOriginalPrice(bundle: any) {
            return state.includeTax ? bundle.price?.originalNet || 0 : bundle.price?.originalGross || 0;
        },

        getItemPrice(item: any) {
            return state.includeTax ? item.price?.net || 0 : item.price?.gross || 0;
        },

        hasDiscount(bundle: any) {
            const current = state.getBundlePrice(bundle);
            const original = state.getOriginalPrice(bundle);
            return original > 0 && current < original;
        },

        getDiscountPercentage(bundle: any) {
            const original = state.getOriginalPrice(bundle);
            if (original <= 0) return 0;
            return Math.round(((original - state.getBundlePrice(bundle)) / original) * 100);
        },

        getProductImage(product: any) {
            return product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
        },

        getProductName(product: any) {
            return product?.names?.[0]?.value || '';
        },

        async fetchBundles() {
            if (!props.graphqlClient || !props.productId) return;
            state._isLoading = true;
            try {
                const bundleService = new BundleService(props.graphqlClient);
                // SDK bug workaround: getBundles() doesn't pass language/image variables
                const result = await (bundleService as any).executeQuery('bundles', {
                    input: {
                        productIds: [props.productId],
                        taxZone: props.taxZone || 'NL',
                        page: 1,
                        offset: 20,
                    },
                    language: props.language || 'NL',
                    imageSearchFilters: { page: 1, offset: 1 },
                    imageVariantFilters: {
                        transformations: [{
                            name: 'bundle',
                            transformation: { format: 'WEBP', height: 200, width: 200, fit: 'BOUNDS' },
                        }],
                    },
                });
                state._bundles = result?.data?.bundles?.items || [];
            } catch (e) {
                state._bundles = [];
            } finally {
                state._isLoading = false;
            }
        },

        handleAddToCart(bundleId: string) {
            if (state._addingBundleId) return;
            state._addingBundleId = bundleId;
            props.onAddBundleToCart(bundleId, 1);
            setTimeout(() => { state._addingBundleId = null; }, 1500);
        },
    });

    onMount(() => {
        state._isMounted = true;
        state.fetchBundles();

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

    onUpdate(() => {
        state.fetchBundles();
    }, [props.productId]);

    return (
        <Show when={state._isMounted && !state._isLoading && state._bundles.length > 0}>
            <div className={props.className || 'mb-12'}>
                <For each={state._bundles}>
                    {(bundle: any, bundleIdx: number) => (
                        <div key={bundle.id || bundleIdx} className="border rounded-lg overflow-hidden mb-6">
                            {/* Bundle header */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-lg font-bold">
                                        {bundle.name || state.getLabel('title', 'Combo deal')}
                                    </h3>
                                    <Show when={!state.hidePrices && state.hasDiscount(bundle)}>
                                        <span className="bg-red-100 text-red-700 text-sm font-semibold px-2 py-0.5 rounded">
                                            -{state.getDiscountPercentage(bundle)}%
                                        </span>
                                    </Show>
                                </div>
                                <Show when={bundle.condition}>
                                    <span className="text-xs text-gray-500">
                                        {bundle.condition === 'ALL'
                                            ? state.getLabel('condition_ALL', 'Discount on all items')
                                            : state.getLabel('condition_EP', 'Discount on extra items')}
                                    </span>
                                </Show>
                            </div>

                            {/* Bundle items */}
                            <Show when={state.showItems && state.layout !== 'compact' && bundle.items && bundle.items.length > 0}>
                                <div className="p-4">
                                    <For each={bundle.items}>
                                        {(item: any, idx: number) => (
                                            <div key={item.productId + '-' + idx} className="flex items-center gap-3 mb-3">
                                                <div className="w-16 h-16 bg-gray-50 rounded overflow-hidden flex-shrink-0">
                                                    <Show when={state.getProductImage(item.product)}>
                                                        <img
                                                            src={state.getProductImage(item.product)}
                                                            alt={state.getProductName(item.product)}
                                                            className="w-full h-full object-contain p-1"
                                                        />
                                                    </Show>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium truncate">
                                                        {state.getProductName(item.product) || 'Product ' + item.productId}
                                                    </div>
                                                    <Show when={item.product?.sku}>
                                                        <div className="text-xs text-gray-500">SKU: {item.product.sku}</div>
                                                    </Show>
                                                    <Show when={!state.hidePrices && item.price}>
                                                        <div className="text-sm text-gray-700 mt-0.5">
                                                            {state.formatPrice(state.getItemPrice(item))}
                                                        </div>
                                                    </Show>
                                                    <Show when={item.isLeader === 'Y'}>
                                                        <span className="text-xs text-blue-600 font-medium">
                                                            {state.getLabel('leaderItem', 'Main product')}
                                                        </span>
                                                    </Show>
                                                </div>
                                            </div>
                                        )}
                                    </For>
                                </div>
                            </Show>

                            {/* Bundle pricing + add to cart */}
                            <Show when={!state.hidePrices}>
                                <div className="flex items-center justify-between p-4 border-t bg-white">
                                    <div className="flex items-center gap-4">
                                        <Show when={state.hasDiscount(bundle)}>
                                            <span className="text-gray-400 line-through text-sm">
                                                {state.formatPrice(state.getOriginalPrice(bundle))}
                                            </span>
                                        </Show>
                                        <span className="text-xl font-bold text-blue-600">
                                            {state.formatPrice(state.getBundlePrice(bundle))}
                                        </span>
                                        <Show when={state.hasDiscount(bundle)}>
                                            <span className="text-sm text-green-600 font-medium">
                                                {state.getLabel('youSave', 'You save')} {state.formatPrice(state.getOriginalPrice(bundle) - state.getBundlePrice(bundle))}
                                            </span>
                                        </Show>
                                    </div>
                                    <button
                                        onClick={() => state.handleAddToCart(bundle.id)}
                                        disabled={state._addingBundleId === bundle.id}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {state._addingBundleId === bundle.id
                                            ? state.getLabel('adding', 'Adding...')
                                            : state.getLabel('addToCart', 'Add bundle to cart')}
                                    </button>
                                </div>
                            </Show>

                            {/* Semi-closed: login prompt */}
                            <Show when={state.hidePrices}>
                                <div className="p-4 border-t bg-gray-50 text-center text-sm text-gray-500">
                                    {state.getLabel('loginToSeePrices', 'Log in to see prices and add to cart')}
                                </div>
                            </Show>
                        </div>
                    )}
                </For>
            </div>
        </Show>
    );
}
