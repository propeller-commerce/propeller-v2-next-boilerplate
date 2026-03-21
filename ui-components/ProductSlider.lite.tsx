import { useStore, Show, For, onMount, onUpdate } from '@builder.io/mitosis';
import {
    GraphQLClient,
    ProductService,
    CrossupsellService,
    Product,
    Cluster,
    Contact,
    Customer,
    Cart,
    CartMainItem,
    Enums,
    CrossupsellsQueryVariables,
    Crossupsell,
} from 'propeller-sdk-v2';
import ProductCard from './ProductCard.lite';
import ClusterCard from './ClusterCard.lite';

export interface ProductSliderProps {
    // === Data source ===

    /** Propeller SDK GraphQL client */
    graphqlClient: GraphQLClient;

    /** Pre-loaded products or clusters to display. When provided, skips internal fetching. */
    products?: (Product | Cluster)[];

    /** Product IDs to fetch internally when `products` is not provided */
    productIds?: number[];

    /** Cluster IDs to fetch internally when `products` is not provided */
    clusterIds?: number[];

    /**
     * Cross-upsell types to fetch. When provided, fetches cross-upsells for the given
     * productId/clusterId instead of fetching products by IDs.
     * Values: 'ACCESSORIES' | 'ALTERNATIVES' | 'RELATED' | 'OPTIONS' | 'PARTS'
     */
    crossUpsellTypes?: Enums.CrossupsellType[];

    /** Source product ID for cross-upsell lookup. Required when crossUpsellTypes is set. */
    productId?: number;

    /** Source cluster ID for cross-upsell lookup. Required when crossUpsellTypes is set. */
    clusterId?: number;

    // === Locale / pricing ===

    /** Language code for API requests and localized content */
    language: string;

    /** Tax zone for price calculations */
    taxZone: string;

    /**
     * When true, net price (incl. tax) is the leading price.
     * Forwarded to each ProductCard / ClusterCard.
     */
    includeTax?: boolean;

    // === Portal / visibility ===

    /**
     * Controls portal visibility mode.
     * 'open' — AddToCart is shown on product cards.
     * 'semi-closed' — AddToCart is hidden (catalog-only view).
     * Defaults to 'open'.
     */
    portalMode?: string;

    /** Authenticated user for cart operations */
    user?: Contact | Customer | null;

    // === Layout ===

    /** Items visible per breakpoint */
    itemsPerView?: {
        mobile?: number;
        tablet?: number;
        desktop?: number;
    };

    /** Slider title displayed above the track */
    title?: string;

    /** Additional CSS class for the outer container */
    containerClassName?: string;

    // === Card stock display ===

    /**
     * Show the stock / availability widget on each product card.
     * Forwarded to `ProductCard.showStock`.
     * Defaults to false.
     */
    showStock?: boolean;

    /**
     * Show only the availability indicator (Available / Not available) inside the stock widget.
     * Forwarded to `ProductCard.showAvailability`.
     * Defaults to true.
     */
    showAvailability?: boolean;

    /**
     * Label overrides forwarded to the embedded ItemStock component inside each card.
     * Keys: inStock, outOfStock, lowStock, available, notAvailable, pieces
     */
    stockLabels?: Record<string, string>;

    // === Card favourites ===

    /** Show a heart-icon favourite toggle on each card. Defaults to false. */
    enableAddFavorite?: boolean;

    /**
     * Called when a favourite is toggled on any card.
     * Receives the full Product or Cluster object and the new favourite state.
     */
    onToggleFavorite?: (item: Product | Cluster, isFavorite: boolean) => void;

    // === Card navigation ===

    /** Called when a product card is clicked — use for SPA-style routing. */
    onProductClick?: (product: Product) => void;

    /** Called when a cluster card is clicked — use for SPA-style routing. */
    onClusterClick?: (cluster: Cluster) => void;

    // === AddToCart pass-through ===

    /** Validate stock before adding to cart. Defaults to false. */
    stockValidation?: boolean;

    /** Show increment/decrement stepper buttons in AddToCart. Defaults to true. */
    showIncrDecr?: boolean;

    /** ID of an existing cart to add items to. */
    cartId?: string;

    /** Auto-create a cart when none is available. Pair with onCartCreated. */
    createCart?: boolean;

    /** Called after AddToCart creates a new cart internally. */
    onCartCreated?: (cart: Cart) => void;

    /** Called after every successful add-to-cart. Receives the updated cart and the added item. */
    afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;

    /**
     * When true, AddToCart shows a success modal instead of a toast.
     * Defaults to false.
     */
    showModal?: boolean;

    /** Called when "Proceed to checkout" is clicked in the AddToCart modal. */
    onProceedToCheckout?: () => void;

    /**
     * Label overrides forwarded to the embedded AddToCart component.
     * Keys: add, adding, addedToCart, outOfStock, noCartId, errorAdding,
     *       modalTitle, quantity, continueShopping, proceedToCheckout
     */
    addToCartLabels?: Record<string, string>;

    // === Misc ===

    /** Configuration object providing imageSearchFiltersGrid, imageVariantFiltersMedium, urls */
    configuration?: any;

    /**
     * Label overrides for the slider UI.
     * Available keys: scrollLeft, scrollRight, noProducts, viewCluster,
     *                 ACCESSORIES, ALTERNATIVES, RELATED, OPTIONS, PARTS
     */
    labels?: Record<string, string>;
}

interface ProductSliderState {
    loadedItems: any[];
    isLoading: boolean;
    scrollPosition: number;
    containerWidth: number;
    scrollWidth: number;
    items: () => (Product | Cluster)[];
    isCrossUpsellMode: () => boolean;
    crossUpsellTitle: () => string;
    sliderTitle: () => string | undefined;
    mobileCount: () => number;
    tabletCount: () => number;
    desktopCount: () => number;
    canScrollLeft: () => boolean;
    canScrollRight: () => boolean;
    portalMode: () => string;
    getLabel: (key: string, fallback: string) => string;
    isCluster: (item: any) => boolean;
    getItemId: (item: any) => number;
    fetchCrossUpsells: () => Promise<void>;
    fetchItems: () => Promise<void>;
    doFetch: () => void;
    sliderId: string;
    scrollLeft: () => void;
    scrollRight: () => void;
    getTrackEl: () => HTMLElement | null;
    handleScroll: (e: any) => void;
    handleProductClick: (product: Product) => void;
    handleClusterClick: (cluster: Cluster) => void;
}

export default function ProductSlider(props: ProductSliderProps) {
    const state = useStore<ProductSliderState>({
        loadedItems: [] as any[],
        isLoading: false,
        scrollPosition: 0,
        containerWidth: 0,
        scrollWidth: 0,
        sliderId: '',

        items(): (Product | Cluster)[] {
            if (props.products && props.products.length > 0) {
                return props.products;
            }
            return state.loadedItems;
        },

        isCrossUpsellMode(): boolean {
            return !!(props.crossUpsellTypes && props.crossUpsellTypes.length > 0);
        },

        crossUpsellTitle(): string {
            if (!props.crossUpsellTypes || props.crossUpsellTypes.length === 0) return '';
            const typeLabels: Record<string, string> = {
                ACCESSORIES: 'Accessories',
                ALTERNATIVES: 'Alternatives',
                RELATED: 'Related products',
                OPTIONS: 'Options',
                PARTS: 'Parts',
            };
            return props.crossUpsellTypes
                .map((t: string) => props.labels?.[t.toLowerCase()] || typeLabels[t] || t)
                .join(' & ');
        },

        sliderTitle(): string | undefined {
            if (props.title !== undefined) return props.title;
            if (state.isCrossUpsellMode()) return state.crossUpsellTitle();
            return undefined;
        },

        mobileCount(): number {
            return props.itemsPerView?.mobile || 1;
        },

        tabletCount(): number {
            return props.itemsPerView?.tablet || 2;
        },

        desktopCount(): number {
            return props.itemsPerView?.desktop || 4;
        },

        canScrollLeft(): boolean {
            return state.scrollPosition > 0;
        },

        canScrollRight(): boolean {
            return state.scrollPosition < state.scrollWidth - state.containerWidth - 1;
        },

        portalMode(): string {
            return (props.portalMode as string) || 'open';
        },

        getLabel(key: string, fallback: string): string {
            const val = (props.labels as Record<string, string>)?.[key];
            return val !== undefined ? val : fallback;
        },

        isCluster(item: any): boolean {
            return 'clusterId' in item && !('productId' in item);
        },

        getItemId(item: any): number {
            return state.isCluster(item) ? item.clusterId : item.productId;
        },

        async fetchCrossUpsells(): Promise<void> {
            if (!props.graphqlClient) return;
            if (!props.crossUpsellTypes || props.crossUpsellTypes.length === 0) return;
            if (!props.productId && !props.clusterId) return;

            state.isLoading = true;
            try {
                const crossupsellService = new CrossupsellService(props.graphqlClient);
                const searchInput: CrossupsellsQueryVariables = {
                    input: {
                        types: props.crossUpsellTypes,
                        page: 1,
                        offset: 50,
                        ...(props.productId && { productIdsFrom: [props.productId] }),
                        ...(props.clusterId && { clusterIdsFrom: [props.clusterId] }),
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

                const result = await crossupsellService.getCrossupsells(searchInput);

                const crossupsells: Crossupsell[] = result?.items || [];
                const items: any[] = [];
                for (let i = 0; i < crossupsells.length; i++) {
                    const cu = crossupsells[i] as Crossupsell;
                    if (cu.productTo) {
                        items.push(cu.productTo);
                    } else if (cu.clusterTo) {
                        items.push(cu.clusterTo);
                    }
                }
                state.loadedItems = items;
            } catch (e) {
                state.loadedItems = [];
            } finally {
                state.isLoading = false;
            }
        },

        async fetchItems(): Promise<void> {
            if (!props.graphqlClient) return;
            const hasProductIds = props.productIds && props.productIds.length > 0;
            const hasClusterIds = props.clusterIds && props.clusterIds.length > 0;
            if (!hasProductIds && !hasClusterIds) return;

            state.isLoading = true;
            try {
                const productService = new ProductService(props.graphqlClient);
                const response = await productService.getProducts({
                    input: {
                        productIds: props.productIds || [],
                        clusterIds: props.clusterIds || [],
                        language: props.language || 'NL',
                        page: 1,
                        offset: 50,
                        statuses: [
                            Enums.ProductStatus.A,
                            Enums.ProductStatus.P,
                            Enums.ProductStatus.T,
                            Enums.ProductStatus.S,
                        ],
                    },
                    imageSearchFilters: props.configuration?.imageSearchFiltersGrid || { page: 1, offset: 1 },
                    imageVariantFilters: props.configuration?.imageVariantFiltersMedium || {
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
                state.loadedItems = response.items || [];
            } catch (e) {
                state.loadedItems = [];
            } finally {
                state.isLoading = false;
            }
        },

        doFetch(): void {
            if (props.products && props.products.length > 0) return;
            if (state.isCrossUpsellMode()) {
                state.fetchCrossUpsells();
            } else {
                state.fetchItems();
            }
        },

        getTrackEl(): HTMLElement | null {
            return document.querySelector(`[data-slider-id="${state.sliderId}"]`) as HTMLElement | null;
        },

        scrollLeft(): void {
            const el = state.getTrackEl();
            if (el) {
                const scrollAmount = el.clientWidth * 0.8;
                el.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
            }
        },

        scrollRight(): void {
            const el = state.getTrackEl();
            if (el) {
                const scrollAmount = el.clientWidth * 0.8;
                el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        },

        handleScroll(e: any): void {
            const el = e.target as HTMLElement;
            state.scrollPosition = el.scrollLeft;
            state.containerWidth = el.clientWidth;
            state.scrollWidth = el.scrollWidth;
        },

        handleProductClick(product: Product): void {
            if (props.onProductClick) {
                props.onProductClick(product);
            }
        },

        handleClusterClick(cluster: Cluster): void {
            if (props.onClusterClick) {
                props.onClusterClick(cluster);
            }
        },
    });

    onMount(() => {
        state.sliderId = 'slider-' + Math.random().toString(36).substring(2, 9);
        state.doFetch();
    });

    onUpdate(() => {
        state.doFetch();
        // NOTE: productIds/clusterIds are arrays — compare by value to avoid stale-reference refetches
    }, [JSON.stringify(props.productIds), JSON.stringify(props.clusterIds), props.language]);

    onUpdate(() => {
        state.doFetch();
        // NOTE: crossUpsellTypes is an array — compare by value to avoid stale-reference refetches
    }, [JSON.stringify(props.crossUpsellTypes), props.productId, props.clusterId, props.language]);

    onUpdate(() => {
        // Initialize scroll dimensions once sliderId is set and items are rendered
        if (state.sliderId && state.items().length > 0) {
            setTimeout(() => {
                const el = state.getTrackEl();
                if (el) {
                    state.containerWidth = el.clientWidth;
                    state.scrollWidth = el.scrollWidth;
                }
            }, 50);
        }
    }, [state.sliderId, state.items().length]);

    return (
        <Show when={!(state.isCrossUpsellMode() && !state.isLoading && state.items().length === 0)}>
            <div className={props.containerClassName || 'mb-12'}>
                {/* Header with title and navigation arrows */}
                <Show when={state.sliderTitle() || state.items().length > 0}>
                    <div className="flex items-center justify-between mb-6">
                        <Show when={state.sliderTitle()}>
                            <h2 className="text-2xl font-bold">{state.sliderTitle()}</h2>
                        </Show>

                        <Show when={state.items().length > state.desktopCount()}>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => state.scrollLeft()}
                                    disabled={!state.canScrollLeft()}
                                    className="p-2 rounded-full bg-white shadow hover:bg-gray-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                    aria-label={state.getLabel('scrollLeft', 'Scroll left')}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => state.scrollRight()}
                                    disabled={!state.canScrollRight()}
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

                {/* Loading skeleton */}
                <Show when={state.isLoading}>
                    <div className="flex gap-6 overflow-hidden">
                        <div className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-lg animate-pulse" />
                        <div className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-lg animate-pulse" />
                        <div className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-lg animate-pulse" />
                        <div className="flex-shrink-0 w-72 h-80 bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                </Show>

                {/* Slider track */}
                <Show when={!state.isLoading && state.items().length > 0}>
                    <div
                        data-slider-id={state.sliderId}
                        onScroll={(e) => state.handleScroll(e)}
                        className="flex gap-6 overflow-x-auto scroll-smooth pb-4"
                        style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                        }}
                    >
                        <For each={state.items()}>
                            {(item: any, index: number) => (
                                <div
                                    key={state.getItemId(item) + '-' + index}
                                    className="flex-shrink-0 w-[calc((100%_-_1.5rem)_/_1.5)] md:w-[calc((100%_-_3rem)_/_2.5)] lg:w-[calc((100%_-_4.5rem)_/_4)]"
                                >
                                    {/* Cluster card */}
                                    <Show when={state.isCluster(item)}>
                                        <ClusterCard
                                            cluster={item as Cluster}
                                            configuration={props.configuration}
                                            includeTax={props.includeTax}
                                            language={props.language}
                                            columns={3}
                                            enableAddFavorite={props.enableAddFavorite}
                                            showStock={props.showStock}
                                            showAvailability={props.showAvailability}
                                            stockLabels={props.stockLabels}
                                            labels={props.labels}
                                            onToggleFavorite={(cluster: Cluster, isFav: boolean) => {
                                                if (props.onToggleFavorite) {
                                                    props.onToggleFavorite(cluster, isFav);
                                                }
                                            }}
                                            onClusterClick={(cluster: Cluster) => state.handleClusterClick(cluster)}
                                        />
                                    </Show>

                                    {/* Product card — with AddToCart (open portal) */}
                                    <Show when={!state.isCluster(item) && state.portalMode() === 'open'}>
                                        <ProductCard
                                            product={item as Product}
                                            graphqlClient={props.graphqlClient}
                                            user={(props.user as Contact | Customer | null) || null}
                                            cartId={props.cartId}
                                            configuration={props.configuration}
                                            includeTax={props.includeTax}
                                            columns={3}
                                            createCart={props.createCart}
                                            onCartCreated={props.onCartCreated}
                                            afterAddToCart={props.afterAddToCart}
                                            showModal={props.showModal}
                                            allowIncrDecr={props.showIncrDecr !== false}
                                            enableStockValidation={props.stockValidation}
                                            language={props.language}
                                            onProceedToCheckout={props.onProceedToCheckout}
                                            addToCartLabels={props.addToCartLabels}
                                            enableAddFavorite={props.enableAddFavorite}
                                            showStock={props.showStock}
                                            showAvailability={props.showAvailability}
                                            stockLabels={props.stockLabels}
                                            labels={props.labels}
                                            onToggleFavorite={(product: Product, isFav: boolean) => {
                                                if (props.onToggleFavorite) {
                                                    props.onToggleFavorite(product, isFav);
                                                }
                                            }}
                                            onProductClick={(product: Product) => state.handleProductClick(product)}
                                        />
                                    </Show>

                                    {/* Product card — without AddToCart (semi-closed portal) */}
                                    <Show when={!state.isCluster(item) && state.portalMode() !== 'open'}>
                                        <ProductCard
                                            product={item as Product}
                                            graphqlClient={props.graphqlClient}
                                            user={(props.user as Contact | Customer | null) || null}
                                            configuration={props.configuration}
                                            includeTax={props.includeTax}
                                            language={props.language}
                                            columns={3}
                                            enableAddFavorite={props.enableAddFavorite}
                                            showStock={props.showStock}
                                            showAvailability={props.showAvailability}
                                            stockLabels={props.stockLabels}
                                            labels={props.labels}
                                            onToggleFavorite={(product: Product, isFav: boolean) => {
                                                if (props.onToggleFavorite) {
                                                    props.onToggleFavorite(product, isFav);
                                                }
                                            }}
                                            onProductClick={(product: Product) => state.handleProductClick(product)}
                                        />
                                    </Show>
                                </div>
                            )}
                        </For>
                    </div>
                </Show>

                {/* Empty state — hidden in cross-upsell mode (no results is normal) */}
                <Show when={!state.isLoading && state.items().length === 0 && !props.products && !state.isCrossUpsellMode()}>
                    <div className="text-center text-gray-500 py-8">
                        {state.getLabel('noProducts', 'No products found')}
                    </div>
                </Show>
            </div>
        </Show>
    );
}
