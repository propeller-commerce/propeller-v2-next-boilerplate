import { useStore, Show, For, onMount, onUpdate } from '@builder.io/mitosis';
import {
    GraphQLClient,
    ProductService,
    Product,
    Cluster,
    Contact,
    Customer,
    Cart,
    CartMainItem,
    Enums,
} from 'propeller-sdk-v2';
import { CartChildItemInput } from 'propeller-sdk-v2/dist/service/CartService';

export interface ProductSliderProps {
    /** Propeller SDK GraphQL client */
    graphqlClient: GraphQLClient;

    /** Pre-loaded products or clusters to display. When provided, skips internal fetching. */
    products?: (Product | Cluster)[];

    /** Product IDs to fetch internally when `products` is not provided */
    productIds?: number[];

    /** Cluster IDs to fetch internally when `products` is not provided */
    clusterIds?: number[];

    /** Language code for API requests and localized content */
    language: string;

    /** Tax zone for price calculations */
    taxZone: string;

    /** Portal mode controlling add-to-cart visibility */
    portalMode?: string;

    /** Authenticated user for cart operations */
    user?: Contact | Customer | null;

    /** When true, show tax-inclusive prices */
    includeTax?: boolean;

    /** Validate stock before adding to cart */
    stockValidation?: boolean;

    /** Show increment/decrement buttons on add-to-cart */
    showIncrDecr?: boolean;

    /** Items visible per breakpoint */
    itemsPerView?: {
        mobile?: number;
        tablet?: number;
        desktop?: number;
    };

    /** Slider title */
    title?: string;

    /** Fallback image URL when product has no image */
    noImageUrl?: string;

    /** ID of an existing cart */
    cartId?: string;

    /** Auto-create cart if none exists */
    createCart?: boolean;

    /** Called after a new cart is created */
    onCartCreated?: (cart: Cart) => void;

    /** Called after successful add-to-cart */
    afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;

    /** Called when a product card is clicked */
    onProductClick?: (product: Product) => void;

    /** Called when a cluster card is clicked */
    onClusterClick?: (cluster: Cluster) => void;

    /** URL pattern for product links */
    urlPattern?: string;

    /** Configuration object for cards */
    configuration?: any;

    /** Labels for UI strings */
    labels?: Record<string, string>;

    /** Additional CSS class for the container */
    containerClassName?: string;
}

export default function ProductSlider(props: ProductSliderProps) {
    const state = useStore({
        _items: [] as any[],
        _isLoading: false,
        _scrollPosition: 0,
        _containerWidth: 0,
        _scrollWidth: 0,
        _includeTax: true,
        _priceListener: null as any,

        get items() {
            if (props.products && props.products.length > 0) {
                return props.products;
            }
            return state._items;
        },

        get mobileCount() {
            return props.itemsPerView?.mobile || 1;
        },

        get tabletCount() {
            return props.itemsPerView?.tablet || 2;
        },

        get desktopCount() {
            return props.itemsPerView?.desktop || 4;
        },

        get canScrollLeft() {
            return state._scrollPosition > 0;
        },

        get canScrollRight() {
            return state._scrollPosition < state._scrollWidth - state._containerWidth - 1;
        },

        get portalMode() {
            return props.portalMode || 'open';
        },

        get includeTax() {
            return props.includeTax !== undefined ? props.includeTax : state._includeTax;
        },

        get showIncrDecr() {
            return props.showIncrDecr !== undefined ? props.showIncrDecr : true;
        },

        get stockValidation() {
            return props.stockValidation !== undefined ? props.stockValidation : false;
        },

        getLabel(key: string, fallback: string) {
            return props.labels?.[key] || fallback;
        },

        isCluster(item: any): boolean {
            return 'clusterId' in item;
        },

        getItemId(item: any): number {
            return state.isCluster(item) ? item.clusterId : item.productId;
        },

        async fetchItems() {
            if (!props.graphqlClient) return;
            const hasProductIds = props.productIds && props.productIds.length > 0;
            const hasClusterIds = props.clusterIds && props.clusterIds.length > 0;
            if (!hasProductIds && !hasClusterIds) return;

            state._isLoading = true;
            try {
                const productService = new ProductService(props.graphqlClient);
                const response = await productService.getProducts({
                    input: {
                        productIds: props.productIds || [],
                        clusterIds: props.clusterIds || [],
                        language: props.language || 'NL',
                        page: 1,
                        offset: 50,
                    },
                    imageSearchFilters: { page: 1, offset: 1 },
                    imageVariantFilters: {
                        transformations: [{
                            name: 'grid',
                            transformation: {
                                format: Enums.Format.WEBP,
                                height: 300,
                                width: 300,
                                fit: Enums.Fit.BOUNDS,
                            },
                        }],
                    },
                    filterAvailableAttributeInput: { isSearchable: true },
                });
                state._items = response.items || [];
            } catch (e) {
                state._items = [];
            } finally {
                state._isLoading = false;
            }
        },

        scrollLeft() {
            const el = document.querySelector('[data-product-slider-track]') as HTMLElement;
            if (el) {
                const scrollAmount = el.clientWidth * 0.8;
                el.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            }
        },

        scrollRight() {
            const el = document.querySelector('[data-product-slider-track]') as HTMLElement;
            if (el) {
                const scrollAmount = el.clientWidth * 0.8;
                el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        },

        handleScroll(e: any) {
            const el = e.target as HTMLElement;
            state._scrollPosition = el.scrollLeft;
            state._containerWidth = el.clientWidth;
            state._scrollWidth = el.scrollWidth;
        },

        handleProductClick(product: Product) {
            if (props.onProductClick) {
                props.onProductClick(product);
            }
        },

        handleClusterClick(cluster: Cluster) {
            if (props.onClusterClick) {
                props.onClusterClick(cluster);
            }
        },
    });

    onMount(() => {
        if (!props.products || props.products.length === 0) {
            state.fetchItems();
        }

        // Initialize scroll dimensions after render
        setTimeout(() => {
            const el = document.querySelector('[data-product-slider-track]') as HTMLElement;
            if (el) {
                state._containerWidth = el.clientWidth;
                state._scrollWidth = el.scrollWidth;
            }
        }, 100);

        // Price toggle listener
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
        if (!props.products || props.products.length === 0) {
            state.fetchItems();
        }
    }, [props.productIds, props.clusterIds]);

    return (
        <div className={props.containerClassName || 'mb-12'}>
            {/* Header with title and navigation arrows */}
            <Show when={props.title || state.items.length > 0}>
                <div className="flex items-center justify-between mb-6">
                    <Show when={props.title}>
                        <h2 className="text-2xl font-bold">{props.title}</h2>
                    </Show>

                    <Show when={state.items.length > state.desktopCount}>
                        <div className="flex gap-2">
                            <button
                                onClick={() => state.scrollLeft()}
                                disabled={!state.canScrollLeft}
                                className="p-2 rounded-full bg-white shadow hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label={state.getLabel('scrollLeft', 'Scroll left')}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={() => state.scrollRight()}
                                disabled={!state.canScrollRight}
                                className="p-2 rounded-full bg-white shadow hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label={state.getLabel('scrollRight', 'Scroll right')}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </Show>
                </div>
            </Show>

            {/* Loading state */}
            <Show when={state._isLoading}>
                <div className="flex gap-6 overflow-hidden">
                    <div className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-lg animate-pulse" />
                    <div className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-lg animate-pulse" />
                </div>
            </Show>

            {/* Slider track */}
            <Show when={!state._isLoading && state.items.length > 0}>
                <div
                    data-product-slider-track
                    onScroll={(e) => state.handleScroll(e)}
                    className="flex gap-6 overflow-x-auto scroll-smooth pb-4"
                    style={{
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                    }}
                >
                    <For each={state.items}>
                        {(item: any, index: number) => (
                            <div
                                key={state.getItemId(item) + '-' + index}
                                className="flex-shrink-0"
                                style={{
                                    width: 'calc((100% - 4.5rem) / ' + state.desktopCount + ')',
                                }}
                            >
                                <Show when={state.isCluster(item)}>
                                    <div
                                        className="cursor-pointer"
                                        onClick={() => state.handleClusterClick(item as Cluster)}
                                    >
                                        <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                                            <div className="relative aspect-square bg-gray-50">
                                                <Show when={(item as Cluster).defaultProduct?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || props.noImageUrl}>
                                                    <img
                                                        src={(item as Cluster).defaultProduct?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || props.noImageUrl || ''}
                                                        alt={item.names?.[0]?.value || 'Cluster'}
                                                        className="w-full h-full object-contain p-2"
                                                    />
                                                </Show>
                                            </div>
                                            <div className="p-3">
                                                <div className="font-semibold text-sm truncate">{item.names?.[0]?.value || 'Cluster'}</div>
                                                <Show when={item.sku || (item as Cluster).defaultProduct?.sku}>
                                                    <div className="text-xs text-gray-500 mt-1">SKU: {item.sku || (item as Cluster).defaultProduct?.sku}</div>
                                                </Show>
                                                <Show when={(item as Cluster).defaultProduct?.price}>
                                                    <div className="text-sm font-bold text-blue-600 mt-2">
                                                        {'\u20AC' + Number(state.includeTax ? (item as Cluster).defaultProduct?.price?.net || 0 : (item as Cluster).defaultProduct?.price?.gross || 0).toFixed(2)}
                                                    </div>
                                                </Show>
                                                <div className="mt-2">
                                                    <span className="text-xs text-blue-600 font-medium">{state.getLabel('viewCluster', 'View options')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Show>
                                <Show when={!state.isCluster(item)}>
                                    <div
                                        className="cursor-pointer"
                                        onClick={() => state.handleProductClick(item as Product)}
                                    >
                                        <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                                            <div className="relative aspect-square bg-gray-50">
                                                <Show when={(item as Product).media?.images?.items?.[0]?.imageVariants?.[0]?.url || props.noImageUrl}>
                                                    <img
                                                        src={(item as Product).media?.images?.items?.[0]?.imageVariants?.[0]?.url || props.noImageUrl || ''}
                                                        alt={item.names?.[0]?.value || 'Product'}
                                                        className="w-full h-full object-contain p-2"
                                                    />
                                                </Show>
                                            </div>
                                            <div className="p-3">
                                                <div className="font-semibold text-sm truncate">{item.names?.[0]?.value || 'Product'}</div>
                                                <Show when={(item as Product).sku}>
                                                    <div className="text-xs text-gray-500 mt-1">SKU: {(item as Product).sku}</div>
                                                </Show>
                                                <Show when={(item as Product).price}>
                                                    <div className="text-sm font-bold text-blue-600 mt-2">
                                                        {'\u20AC' + Number(state.includeTax ? (item as Product).price?.net || 0 : (item as Product).price?.gross || 0).toFixed(2)}
                                                    </div>
                                                </Show>
                                            </div>
                                        </div>
                                    </div>
                                </Show>
                            </div>
                        )}
                    </For>
                </div>
            </Show>

            {/* Empty state */}
            <Show when={!state._isLoading && state.items.length === 0 && !props.products}>
                <div className="text-center text-gray-500 py-8">
                    {state.getLabel('noProducts', 'No products found')}
                </div>
            </Show>
        </div>
    );
}
