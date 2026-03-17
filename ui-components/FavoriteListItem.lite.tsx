import {
    useStore,
    Show,
    onMount,
} from '@builder.io/mitosis';
import {
    Product,
    Cluster,
    GraphQLClient,
    Contact,
    Customer,
    Cart,
    CartMainItem,
    CartChildItemInput,
    ProductPrice,
} from 'propeller-sdk-v2';
import AddToCart from './AddToCart.lite';
import ItemStock from './ItemStock.lite';
import ProductPriceDisplay from './ProductPrice.lite';

export interface FavoriteListItemProps {
    /** Product or Cluster to be listed as a favorite list item */
    item: Product | Cluster;

    /** Should the item title be a link to the PDP (default: true) */
    titleLinkable?: boolean;

    /** Should the stock be displayed in the favorite list item (default: false) */
    showStockComponent?: boolean;

    /** Display the SKU of the item beneath the item name (default: true) */
    showSku?: boolean;

    /** Enables the add to cart functionality for products. Clusters show a "View cluster" button instead (default: true) */
    allowAddToCart?: boolean;

    /** Display a delete button that removes the favorite list item from the list (default: true) */
    showDelete?: boolean;

    /** Action callback fired when a favorite list item is deleted from the list */
    onDelete?: (itemId: string) => void;

    /** Callback when the item title or image is clicked. Prevents default <a> navigation when provided */
    onItemClick?: (item: Product | Cluster) => void;

    /** Extra CSS class applied to the root element */
    className?: string;

    /** Configuration object for URL generation */
    configuration?: any;

    /** UI string overrides */
    labels?: Record<string, string>;

    // === AddToCart pass-through props (only used for products) ===

    /** Initialised Propeller SDK GraphQL client (required by embedded AddToCart) */
    graphqlClient?: GraphQLClient;

    /** Authenticated user — used for cart creation / lookup */
    user?: Contact | Customer | null;

    /** ID of an existing cart to add items to */
    cartId?: string;

    /** When true and no cartId is available, AddToCart automatically creates a cart */
    createCart?: boolean;

    /** Called after a new cart is created internally by AddToCart */
    onCartCreated?: (cart: Cart) => void;

    /** Fully replaces the internal CartService.addItemToCart call */
    onAddToCart?: (
        product: Product,
        clusterId?: number,
        quantity?: number,
        childItems?: CartChildItemInput[],
        notes?: string,
        price?: number,
        showModal?: boolean,
    ) => Cart;

    /** Called after every successful add-to-cart */
    afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;

    /** Show modal after successful add (default: false) */
    showModal?: boolean;

    /** Renders increment/decrement buttons beside quantity input (default: true) */
    allowIncrDecr?: boolean;

    /** Validate stock before adding to cart (default: false) */
    enableStockValidation?: boolean;

    /** Language code forwarded to CartService (default: 'NL') */
    language?: string;

    /** Called when "Proceed to checkout" is clicked in AddToCart modal */
    onProceedToCheckout?: () => void;

    /** Label overrides for AddToCart UI strings */
    addToCartLabels?: Record<string, string>;

    /** Label overrides for ItemStock UI strings */
    stockLabels?: Record<string, string>;
}

interface FavoriteListItemState {
    _includeTax: boolean;
    _priceListener: (() => void) | null;
    isProduct: () => boolean;
    getProduct: () => Product;
    getCluster: () => Cluster;
    getName: () => string;
    getSku: () => string;
    getImageUrl: () => string;
    getItemUrl: () => string;
    getItemId: () => string;
    getLabel: (key: string, fallback: string) => string;
    handleItemClick: (e: Event) => void;
    handleDelete: () => void;
}

export default function FavoriteListItem(props: FavoriteListItemProps) {
    const state = useStore<FavoriteListItemState>({
        _includeTax: true,
        _priceListener: null as (() => void) | null,

        isProduct(): boolean {
            return 'productId' in props.item;
        },

        getProduct(): Product {
            return props.item as Product;
        },

        getCluster(): Cluster {
            return props.item as Cluster;
        },

        getName(): string {
            if (state.isProduct()) {
                return state.getProduct()?.names?.[0]?.value || 'Product';
            }
            return state.getCluster()?.names?.[0]?.value ||
                state.getCluster()?.defaultProduct?.names?.[0]?.value || 'Cluster';
        },

        getSku(): string {
            if (state.isProduct()) {
                return state.getProduct()?.sku || '';
            }
            return state.getCluster()?.sku ||
                state.getCluster()?.defaultProduct?.sku || '';
        },

        getImageUrl(): string {
            if (state.isProduct()) {
                return state.getProduct()?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
            }
            return state.getCluster()?.defaultProduct?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
        },

        getItemUrl(): string {
            if (state.isProduct()) {
                return props.configuration?.urls?.getProductUrl?.(props.item) || '';
            }
            return props.configuration?.urls?.getClusterUrl?.(props.item) || '';
        },

        getItemId(): string {
            if (state.isProduct()) {
                return String(state.getProduct()?.productId || '');
            }
            return String(state.getCluster()?.clusterId || '');
        },

        getLabel(key: string, fallback: string): string {
            return props.labels?.[key] || fallback;
        },

        handleItemClick(e: Event): void {
            if (props.onItemClick) {
                e.preventDefault();
                props.onItemClick(props.item);
            }
        },

        handleDelete(): void {
            if (props.onDelete) {
                props.onDelete(state.getItemId());
            }
        },
    });

    onMount(() => {
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

    return (
        <div className={`group flex flex-row items-center gap-4 p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${props.className || ''}`}>
            {/* ── Image ──────────────────────────────────── */}
            <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-50 p-2">
                <Show when={props.titleLinkable !== false}>
                    <a
                        href={state.getItemUrl()}
                        onClick={(e) => state.handleItemClick(e as unknown as Event)}
                        className="block h-full w-full"
                    >
                        <Show when={!!state.getImageUrl()}>
                            <img
                                src={state.getImageUrl()}
                                alt={state.getName()}
                                className="h-full w-full object-contain"
                            />
                        </Show>
                        <Show when={!state.getImageUrl()}>
                            <div className="flex h-full w-full items-center justify-center text-gray-200">
                                <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </Show>
                    </a>
                </Show>
                <Show when={props.titleLinkable === false}>
                    <div className="block h-full w-full">
                        <Show when={!!state.getImageUrl()}>
                            <img
                                src={state.getImageUrl()}
                                alt={state.getName()}
                                className="h-full w-full object-contain"
                            />
                        </Show>
                        <Show when={!state.getImageUrl()}>
                            <div className="flex h-full w-full items-center justify-center text-gray-200">
                                <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </Show>
                    </div>
                </Show>
            </div>

            {/* ── Content ─────────────────────────────────── */}
            <div className="flex flex-1 flex-col gap-1 min-w-0">
                {/* SKU */}
                <Show when={props.showSku !== false && !!state.getSku()}>
                    <div className="font-mono text-xs text-gray-400">
                        {state.getSku()}
                    </div>
                </Show>

                {/* Name */}
                <Show when={props.titleLinkable !== false}>
                    <a
                        href={state.getItemUrl()}
                        onClick={(e) => state.handleItemClick(e as unknown as Event)}
                        className="text-sm font-medium leading-tight text-gray-900 transition-colors hover:text-violet-600 line-clamp-2"
                    >
                        {state.getName()}
                    </a>
                </Show>
                <Show when={props.titleLinkable === false}>
                    <span className="text-sm font-medium leading-tight text-gray-900 line-clamp-2">
                        {state.getName()}
                    </span>
                </Show>

                {/* Cluster badge */}
                <Show when={!state.isProduct()}>
                    <span className="inline-flex items-center self-start px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                        {state.getLabel('clusterBadge', 'Cluster')}
                    </span>
                </Show>

                {/* Stock — Product: uses ItemStock component */}
                <Show when={props.showStockComponent && state.isProduct() && !!state.getProduct().inventory}>
                    <ItemStock
                        inventory={state.getProduct().inventory!}
                        showAvailability={true}
                        showStock={true}
                        labels={props.stockLabels}
                    />
                </Show>

                {/* Stock — Cluster: uses inline badge like ClusterCard */}
                <Show when={props.showStockComponent && !state.isProduct()}>
                    <Show when={state.getCluster()?.defaultProduct?.inventory?.totalQuantity !== undefined}>
                        <div className="flex items-center gap-1.5">
                            <Show when={(state.getCluster()?.defaultProduct?.inventory?.totalQuantity || 0) > 5}>
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-green-600 bg-green-50">
                                    {state.getLabel('inStock', 'In stock')}
                                </span>
                                <span className="text-xs text-gray-400">
                                    ({state.getCluster()?.defaultProduct?.inventory?.totalQuantity})
                                </span>
                            </Show>
                            <Show when={(state.getCluster()?.defaultProduct?.inventory?.totalQuantity || 0) > 0 && (state.getCluster()?.defaultProduct?.inventory?.totalQuantity || 0) <= 5}>
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-amber-600 bg-amber-50">
                                    {state.getLabel('lowStock', 'Low stock')}
                                </span>
                                <span className="text-xs text-gray-400">
                                    ({state.getCluster()?.defaultProduct?.inventory?.totalQuantity})
                                </span>
                            </Show>
                            <Show when={(state.getCluster()?.defaultProduct?.inventory?.totalQuantity || 0) === 0}>
                                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-red-600 bg-red-50">
                                    {state.getLabel('outOfStock', 'Out of stock')}
                                </span>
                            </Show>
                        </div>
                    </Show>
                </Show>

                {/* Price — Product */}
                <Show when={state.isProduct() && !!state.getProduct()?.price}>
                    <div>
                        <ProductPriceDisplay
                            price={state.getProduct().price as ProductPrice}
                            includeTax={state._includeTax}
                            priceSize="text-sm"
                        />
                    </div>
                </Show>

                {/* Price — Cluster (via defaultProduct, same as ClusterCard) */}
                <Show when={!state.isProduct() && !!state.getCluster()?.defaultProduct?.price}>
                    <div>
                        <ProductPriceDisplay
                            price={state.getCluster().defaultProduct?.price as ProductPrice}
                            includeTax={state._includeTax}
                            options={state.getCluster().options}
                            priceSize="text-sm"
                        />
                    </div>
                </Show>
            </div>

            {/* ── Actions ─────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {/* Add to cart — Products only */}
                <Show when={props.allowAddToCart !== false && state.isProduct() && !!props.graphqlClient}>
                    <div className="flex-shrink-0">
                        <AddToCart
                            graphqlClient={props.graphqlClient!}
                            user={props.user || null}
                            product={state.getProduct()}
                            cartId={props.cartId}
                            configuration={props.configuration}
                            createCart={props.createCart}
                            onCartCreated={props.onCartCreated}
                            onAddToCart={props.onAddToCart}
                            afterAddToCart={props.afterAddToCart}
                            showModal={props.showModal}
                            allowIncrDecr={props.allowIncrDecr}
                            enableStockValidation={props.enableStockValidation}
                            language={props.language}
                            onProceedToCheckout={props.onProceedToCheckout}
                            labels={props.addToCartLabels}
                            className="flex items-center gap-2"
                        />
                    </div>
                </Show>

                {/* View cluster — Clusters only */}
                <Show when={!state.isProduct()}>
                    <a
                        href={state.getItemUrl()}
                        onClick={(e) => state.handleItemClick(e as unknown as Event)}
                        className="inline-flex items-center justify-center rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 whitespace-nowrap"
                    >
                        {state.getLabel('viewCluster', 'View cluster')}
                    </a>
                </Show>

                {/* Delete button */}
                <Show when={props.showDelete !== false}>
                    <button
                        type="button"
                        onClick={() => state.handleDelete()}
                        className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                        title={state.getLabel('delete', 'Remove from list')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                </Show>
            </div>
        </div>
    );
}
