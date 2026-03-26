import {
    useStore,
    Show,
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
} from 'propeller-sdk-v2';
import AddToCart from './AddToCart.lite';
import ItemStock from './ItemStock.lite';

export interface FavoriteListItemProps {
    /** Product or Cluster to be listed as a favorite list item */
    item: Product | Cluster;

    /** Should the item title be a link to the PDP (default: true) */
    titleLinkable?: boolean;

    /** Should the stock be displayed in the favorite list item (default: false) */
    showStockComponent?: boolean;

    /** Show availability status (e.g. "In stock") inside ItemStock (default: true) */
    showAvailability?: boolean;

    /** Show numeric stock quantity inside ItemStock (default: true) */
    showStock?: boolean;

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

    /** Include tax in the price display. When provided, overrides the internal PriceToggle state */
    includeTax?: boolean;

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
    isProduct: () => boolean;
    getProduct: () => Product;
    getCluster: () => Cluster;
    getName: () => string;
    getSku: () => string;
    getImageUrl: () => string;
    getItemUrl: () => string;
    getItemId: () => string;
    getItemPrice: () => string;
    getLabel: (key: string, fallback: string) => string;
    handleItemClick: (e: any) => void;
    handleDelete: () => void;
}

export default function FavoriteListItem(props: FavoriteListItemProps) {
    const state = useStore<FavoriteListItemState>({
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

        getItemPrice(): string {
            const useTax: boolean = props.includeTax !== undefined ? !!(props.includeTax) : true;
            let priceObj: any = null;
            if (state.isProduct()) {
                priceObj = state.getProduct()?.price;
            } else {
                priceObj = state.getCluster()?.defaultProduct?.price;
            }
            if (!priceObj) return '';
            const value: number | undefined = useTax ? priceObj?.net : priceObj?.gross;
            if (!value && value !== 0) return '';
            return `\u20AC${Number(value).toFixed(2)}`;
        },

        getLabel(key: string, fallback: string): string {
            return props.labels?.[key] || fallback;
        },

        handleItemClick(e: any): void {
            if (props.onItemClick) {
                e.preventDefault();
                props.onItemClick(props.item);
            } else if (state.getItemUrl()) {
                e.preventDefault();
                window.location.href = state.getItemUrl();
            }
        },

        handleDelete(): void {
            if (props.onDelete) {
                props.onDelete(state.getItemId());
            }
        },
    });

    return (
        <div
            className={`flex flex-row items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-secondary/20 hover:shadow-sm cursor-pointer ${props.className || ''}`}
            onClick={(e: any) => state.handleItemClick(e)}
        >
            {/* ── Image ──────────────────────────────────── */}
            <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden rounded-md bg-gray-50 p-1">
                <Show when={props.titleLinkable !== false}>
                    <a
                        href={state.getItemUrl()}
                        onClick={(e: any) => state.handleItemClick(e)}
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
                                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </Show>
                    </div>
                </Show>
            </div>

            {/* ── Name + SKU ─────────────────────────────────── */}
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <Show when={props.showSku !== false && !!state.getSku()}>
                    <span className="font-mono text-xs text-gray-400">
                        {state.getSku()}
                    </span>
                </Show>

                <Show when={props.titleLinkable !== false}>
                    <a
                        href={state.getItemUrl()}
                        onClick={(e: any) => state.handleItemClick(e)}
                        className="text-sm font-medium leading-tight text-gray-900 transition-colors hover:text-secondary line-clamp-1"
                    >
                        {state.getName()}
                    </a>
                </Show>
                <Show when={props.titleLinkable === false}>
                    <span className="text-sm font-medium leading-tight text-gray-900 line-clamp-1">
                        {state.getName()}
                    </span>
                </Show>

            </div>

            {/* ── Stock badge ─────────────────────────────── */}
            <Show when={props.showStockComponent && state.isProduct() && !!state.getProduct().inventory}>
                <div className="flex-shrink-0">
                    <ItemStock
                        inventory={state.getProduct().inventory!}
                        showAvailability={props.showAvailability !== false}
                        showStock={props.showStock !== false}
                        labels={props.stockLabels}
                    />
                </div>
            </Show>

            <Show when={props.showStockComponent && !state.isProduct()}>
                <Show when={state.getCluster()?.defaultProduct?.inventory?.totalQuantity !== undefined}>
                    <div className="flex-shrink-0">
                        <Show when={(state.getCluster()?.defaultProduct?.inventory?.totalQuantity || 0) > 5}>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-green-600 bg-green-50">
                                {state.getLabel('inStock', 'In stock')}
                            </span>
                        </Show>
                        <Show when={(state.getCluster()?.defaultProduct?.inventory?.totalQuantity || 0) > 0 && (state.getCluster()?.defaultProduct?.inventory?.totalQuantity || 0) <= 5}>
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium text-amber-600 bg-amber-50">
                                {state.getLabel('lowStock', 'Low stock')}
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

            {/* ── Price ─────────────────────────────────── */}
            <Show when={!!state.getItemPrice()}>
                <span className="text-base font-bold text-gray-900 whitespace-nowrap flex-shrink-0">
                    {state.getItemPrice()}
                </span>
            </Show>

            {/* ── Actions ─────────────────────────────────── */}
            <div className="flex items-center gap-2 flex-shrink-0" onClick={(e: any) => e.stopPropagation()}>
                <Show when={props.allowAddToCart !== false && state.isProduct() && !!props.graphqlClient}>
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
                </Show>

                <Show when={!state.isProduct()}>
                    <a
                        href={state.getItemUrl()}
                        onClick={(e: any) => state.handleItemClick(e)}
                        className="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-secondary/90 whitespace-nowrap"
                    >
                        {state.getLabel('viewCluster', 'View cluster')}
                    </a>
                </Show>

                <Show when={props.showDelete !== false}>
                    <button
                        type="button"
                        onClick={() => state.handleDelete()}
                        className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title={state.getLabel('delete', 'Remove from list')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                </Show>
            </div>
        </div>
    );
}
