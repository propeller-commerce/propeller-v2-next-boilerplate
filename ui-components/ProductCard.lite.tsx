import {
    useStore,
    Show,
    For,
    onMount,
} from '@builder.io/mitosis';
import {
    GraphQLClient,
    Product,
    Contact,
    Customer,
    Cart,
    CartMainItem,
    CartChildItemInput,
    AttributeResult,
} from 'propeller-sdk-v2';
import AddToCart from './AddToCart.lite';
import ItemStock from './ItemStock.lite';

export interface ProductCardProps {
    // === Core ===

    /** The product object to display */
    product: Product;

    // === Display toggles ===

    /** Show the product name. Defaults to true. */
    showName?: boolean;

    /** Show the product image. Defaults to true. */
    showImage?: boolean;

    /** Show the product short description. Defaults to false. */
    showShortDescription?: boolean;

    /** Show the product SKU. Defaults to true. */
    showSku?: boolean;

    /** Show the product manufacturer. Defaults to false. */
    showManufacturer?: boolean;

    /**
     * Show the stock / availability widget below the product name.
     * Uses the embedded `ItemStock` component driven by `product.inventory`.
     * Defaults to false.
     */
    showStock?: boolean;

    /**
     * Show only the availability indicator (Available / Not available) inside ItemStock.
     * Only relevant when `showStock` is true.
     * Defaults to true.
     */
    showAvailability?: boolean;

    /**
     * Label overrides forwarded to the embedded ItemStock component.
     * Keys: inStock, outOfStock, lowStock, available, notAvailable, pieces
     */
    stockLabels?: Record<string, string>;

    // === Attribute labels ===

    /**
     * Attribute codes/names to look up and display as badge overlays on the product image.
     * Each code is resolved against `product.attributes.items[].attributeDescription.code`
     * (or `.name`). Attributes with no matching value are silently omitted.
     * Example: ['new', 'sale']
     */
    imageLabels?: string[];

    /**
     * Attribute codes/names to look up and display as extra text rows below the product name.
     * Resolved the same way as `imageLabels`.
     * Example: ['brand', 'color']
     */
    textLabels?: string[];

    // === UI string overrides ===

    /**
     * Override any UI string.
     * Available keys: addToFavorites, removeFromFavorites
     */
    labels?: Record<string, string>;

    // === Favourites ===

    /** Renders a heart-icon toggle button on the product image. Defaults to false. */
    enableAddFavorite?: boolean;

    /**
     * Called whenever the favourite state is toggled.
     * The second argument indicates the new state: `true` = added, `false` = removed.
     */
    onToggleFavorite?: (product: Product, isFavorite: boolean) => void;

    // === Navigation ===

    /**
     * Called when the product name or image is clicked.
     * When provided, the default `<a>` navigation is prevented so the consumer
     * can use framework-specific routing (e.g. Next.js `router.push`).
     */
    onProductClick?: (product: Product) => void;

    // === Pricing ===

    /**
     * When true, tax-inclusive price (net) is the leading price.
     * When false, tax-exclusive price (gross) is shown.
     * Defaults to false.
     */
    includeTax?: boolean;

    // === Appearance ===

    /** Number of grid columns — when 1 the card renders as a compact horizontal row. */
    columns?: number;

    /** Extra CSS class applied to the root element. */
    className?: string;

    /**
     * URL pattern controlling which segments appear in product links.
     * Tokens: page → 'product', id → productId, slug → slug value.
     * Examples: 'page/id/slug' (default) | 'page/slug' | 'page/id'
     * Defaults to 'page/id/slug' when omitted.
     */
    urlPattern?: string;

    // === AddToCart pass-through props ===

    /** Initialised Propeller SDK GraphQL client (required by embedded AddToCart). */
    graphqlClient: GraphQLClient;

    /** Authenticated user — used for cart creation / lookup. */
    user: Contact | Customer | null;

    /** ID of an existing cart to add items to. */
    cartId?: string;

    /** Config object providing imageSearchFiltersGrid and imageVariantFiltersSmall. */
    configuration?: any;

    /** Cluster ID for configurable products. */
    clusterId?: number;

    /** Product IDs of selected cluster child options. */
    childItems?: number[];

    /** Free-text notes attached to the cart item. */
    notes?: string;

    /** Custom unit price override. Omit to use calculated price. */
    price?: number;

    /**
     * When true and no cartId is available, the embedded AddToCart automatically
     * looks up or creates a cart. Always pair with onCartCreated.
     */
    createCart?: boolean;

    /** Called after a new cart is created internally by AddToCart. */
    onCartCreated?: (cart: Cart) => void;

    /**
     * Fully replaces the internal CartService.addItemToCart call inside AddToCart.
     * Must return a Cart object.
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

    /** Called after every successful add-to-cart. Receives the updated cart and the added item. */
    afterAddToCart?: (cart: Cart, item?: CartMainItem) => void;

    /**
     * When true the embedded AddToCart shows a modal after a successful add
     * instead of the default toast notification. Defaults to false.
     */
    showModal?: boolean;

    /**
     * Renders − and + buttons beside the quantity input in AddToCart.
     * Defaults to true.
     */
    allowIncrDecr?: boolean;

    /** Validate stock before adding to cart. Defaults to false. */
    enableStockValidation?: boolean;

    /** Language code forwarded to CartService operations. Defaults to 'NL'. */
    language?: string;

    /** Called when the user clicks "Proceed to checkout" inside the AddToCart modal. */
    onProceedToCheckout?: () => void;

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
    addToCartLabels?: Record<string, string>;
}

interface ProductCardState {
    isFavorite: boolean;
    includeTax: boolean;
    priceListener: any;
    getProductName: () => string;
    getProductSku: () => string;
    getProductImageUrl: () => string;
    getProductPrice: () => string;
    getProductUrl: () => string;
    getProductShortDescription: () => string;
    getProductManufacturer: () => string;
    getLabel: (key: string, fallback: string) => string;
    getAttributeValue: (code: string) => string;
    handleProductClick: (e: any) => void;
    handleToggleFavorite: (e: any) => void;
    isRow: () => boolean;
    computedImageLabels: () => string[];
    computedTextLabels: () => { name: string; value: string }[];
}

export default function ProductCard(props: ProductCardProps) {
    const state = useStore<ProductCardState>({
        isFavorite: false,
        includeTax: true,
        priceListener: null as any,

        isRow() {
            return (props.columns as number) === 1;
        },

        getProductName() {
            const lang = (props.language as string) || 'NL';
            const names = (props.product as Product)?.names;
            const match = names?.find((n: any) => n.language === lang);
            return match?.value || names?.[0]?.value || 'Product';
        },

        getProductSku() {
            return (props.product as Product)?.sku || '';
        },

        getProductImageUrl() {
            return (
                (props.product as Product)?.media?.images?.items?.[0]
                    ?.imageVariants?.[0]?.url || ''
            );
        },

        getProductPrice(): string {
            const priceObj = (props.product as Product)?.price;
            const useTax: boolean = props.includeTax !== undefined ? !!(props.includeTax) : state.includeTax;
            const value: number | undefined = useTax ? priceObj?.net : priceObj?.gross;
            if (!value && value !== 0) return '';
            return `\u20AC${Number(value).toFixed(2)}`;
        },

        getProductUrl() {
            return props.configuration.urls.getProductUrl(props.product, props.language);
        },

        getProductShortDescription() {
            const lang = (props.language as string) || 'NL';
            const descs = (props.product as Product)?.shortDescriptions;
            const match = descs?.find((d: any) => d.language === lang);
            return match?.value || descs?.[0]?.value || '';
        },

        getProductManufacturer() {
            return (props.product as Product)?.manufacturer || '';
        },

        getLabel(key: string, fallback: string) {
            return (props.labels as Record<string, string>)?.[key] || fallback;
        },

        getAttributeValue(code: string) {
            const attrs = (props.product as Product)?.attributes?.items || [];
            const found = attrs.find((a: AttributeResult) => a.attributeDescription?.name === code);
            return found?.value?.value || '';
        },

        handleProductClick(e: any) {
            if (props.onProductClick) {
                e.preventDefault();
                props.onProductClick(props.product);
            }
        },

        handleToggleFavorite(e: any) {
            e.preventDefault();
            e.stopPropagation();
            state.isFavorite = !state.isFavorite;
            if (props.onToggleFavorite) {
                props.onToggleFavorite(props.product, state.isFavorite);
            }
        },

        computedImageLabels(): string[] {
            if (
                !props.imageLabels ||
                (props.imageLabels as string[]).length === 0
            )
                return [];
            const attrs = (props.product as Product)?.attributes?.items || [];
            return (props.imageLabels as string[])
                .map((code: string) => {
                    const found = attrs.find((a: AttributeResult) => a.attributeDescription?.name === code);
                    return found?.value?.value || '';
                })
                .filter((v: string) => v.length > 0);
        },

        computedTextLabels(): { name: string; value: string }[] {
            if (
                !props.textLabels ||
                (props.textLabels as string[]).length === 0
            )
                return [];
            const attrs = (props.product as Product)?.attributes?.items || [];
            return (props.textLabels as string[])
                .map((code: string) => {
                    const found = attrs.find((a: AttributeResult) => a.attributeDescription?.name === code);
                    return { name: code, value: found?.value?.value || '' };
                })
                .filter(
                    (item: { name: string; value: string }) =>
                        item.value.length > 0,
                );
        },
    });

    return (
        <div
            className={`group relative flex h-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-secondary/20 ${state.isRow() ? 'flex-row flex-wrap md:flex-nowrap items-center' : 'flex-col'} ${props.className || ''}`}
        >
            {/* ── Image area ──────────────────────────────────── */}
            <Show when={props.showImage !== false}>
                <div className={`relative overflow-hidden bg-gray-50 ${state.isRow() ? 'w-20 h-20 flex-shrink-0 p-2' : 'aspect-[4/3] sm:aspect-square p-2 sm:p-4'}`}>
                    <a
                        href={state.getProductUrl()}
                        onClick={(e: any) => state.handleProductClick(e)}
                        className="block h-full w-full"
                    >
                        <Show when={!!state.getProductImageUrl()}>
                            <img
                                src={state.getProductImageUrl()}
                                alt={state.getProductName()}
                                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                        </Show>
                        <Show when={!state.getProductImageUrl()}>
                            <div className="flex h-full w-full items-center justify-center text-gray-200">
                                <svg
                                    className="h-16 w-16"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                            </div>
                        </Show>
                    </a>

                    {/* Image label badge overlays */}
                    <Show
                        when={
                            !!props.imageLabels &&
                            props.imageLabels.length > 0 &&
                            state.computedImageLabels().length > 0
                        }
                    >
                        <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1">
                            <For each={state.computedImageLabels()}>
                                {(label: string) => (
                                    <span className="inline-block rounded bg-secondary px-2 py-0.5 text-xs font-medium text-white shadow-sm">
                                        {label}
                                    </span>
                                )}
                            </For>
                        </div>
                    </Show>

                    {/* Favourite toggle button */}
                    <Show when={props.enableAddFavorite}>
                        <button
                            type="button"
                            onClick={(e: any) =>
                                state.handleToggleFavorite(e)
                            }
                            className={`absolute right-2 top-2 rounded-full border bg-white p-1.5 shadow-sm transition-colors ${state.isFavorite ? 'border-red-200 text-red-500' : 'border-gray-100 text-gray-300 hover:text-red-400'}`}
                            aria-label={
                                state.isFavorite
                                    ? state.getLabel(
                                        'removeFromFavorites',
                                        'Remove from favourites',
                                    )
                                    : state.getLabel(
                                        'addToFavorites',
                                        'Add to favourites',
                                    )
                            }
                        >
                            <svg
                                className="h-4 w-4"
                                fill={
                                    state.isFavorite ? 'currentColor' : 'none'
                                }
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                />
                            </svg>
                        </button>
                    </Show>
                </div>
            </Show>

            {/* ── Row view ─────────────────────────────────────── */}
            <Show when={state.isRow()}>
                {/* Top section: SKU + name */}
                <div className="flex flex-1 flex-row items-center gap-4 px-4 py-2 min-w-0">
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <Show when={props.showSku !== false && !!state.getProductSku()}>
                            <div className="font-mono text-xs text-gray-400">
                                {state.getProductSku()}
                            </div>
                        </Show>
                        <Show when={props.showName !== false}>
                            <a
                                href={state.getProductUrl()}
                                onClick={(e: any) => state.handleProductClick(e)}
                                className="text-sm font-medium leading-tight text-gray-900 transition-colors hover:text-primary line-clamp-1"
                            >
                                {state.getProductName()}
                            </a>
                        </Show>
                        <Show when={!!props.textLabels && props.textLabels.length > 0 && state.computedTextLabels().length > 0}>
                            <div className="flex flex-col gap-0.5">
                                <For each={state.computedTextLabels()}>
                                    {(item: { name: string; value: string }) => (
                                        <div className="text-xs text-gray-500">{item.value}</div>
                                    )}
                                </For>
                            </div>
                        </Show>
                        <Show when={props.showManufacturer && !!state.getProductManufacturer()}>
                            <div className="text-xs text-gray-500">{state.getProductManufacturer()}</div>
                        </Show>
                        <Show when={props.showShortDescription && !!state.getProductShortDescription()}>
                            <p className="line-clamp-2 text-xs text-gray-500">{state.getProductShortDescription()}</p>
                        </Show>
                    </div>
                </div>
                {/* Bottom section on mobile: stock + price + add-to-cart */}
                <div className="w-full md:w-auto flex items-center gap-3 px-4 py-2 md:py-0 border-t md:border-t-0 border-gray-100">
                    <Show when={props.showStock && !!props.product.inventory}>
                        <ItemStock
                            inventory={props.product.inventory!}
                            showAvailability={false}
                            showStock={true}
                            labels={props.stockLabels}
                        />
                    </Show>
                    <Show when={!!state.getProductPrice()}>
                        <span className="font-bold text-gray-900 text-sm whitespace-nowrap">
                            {state.getProductPrice()}
                        </span>
                    </Show>
                    <div className="flex-shrink-0 ml-auto">
                        <AddToCart
                            graphqlClient={props.graphqlClient}
                            user={props.user}
                            product={props.product}
                            cartId={props.cartId}
                            configuration={props.configuration}
                            childItems={props.childItems}
                            notes={props.notes}
                            price={props.price}
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
                            className="flex w-full items-center gap-2"
                        />
                    </div>
                </div>
            </Show>

            {/* ── Grid view ──────────────────────────────────────── */}
            <Show when={!state.isRow()}>
                <div className="flex flex-1 flex-col gap-1.5 p-3 sm:gap-2 sm:p-4">
                    <Show when={props.showSku !== false && !!state.getProductSku()}>
                        <div className="font-mono text-xs text-gray-400">{state.getProductSku()}</div>
                    </Show>
                    <Show when={props.showName !== false}>
                        <a
                            href={state.getProductUrl()}
                            onClick={(e: any) => state.handleProductClick(e)}
                            className="text-sm font-medium leading-tight text-gray-900 transition-colors hover:text-primary line-clamp-2"
                        >
                            {state.getProductName()}
                        </a>
                    </Show>
                    <Show when={!!props.textLabels && props.textLabels.length > 0 && state.computedTextLabels().length > 0}>
                        <div className="flex flex-col gap-0.5">
                            <For each={state.computedTextLabels()}>
                                {(item: { name: string; value: string }) => (
                                    <div className="text-xs text-gray-500">{item.value}</div>
                                )}
                            </For>
                        </div>
                    </Show>
                    <Show when={props.showStock && !!props.product.inventory}>
                        <ItemStock
                            inventory={props.product.inventory!}
                            showAvailability={props.showAvailability !== false}
                            showStock={true}
                            labels={props.stockLabels}
                        />
                    </Show>
                    <Show when={props.showManufacturer && !!state.getProductManufacturer()}>
                        <div className="text-xs text-gray-500">{state.getProductManufacturer()}</div>
                    </Show>
                    <Show when={props.showShortDescription && !!state.getProductShortDescription()}>
                        <p className="line-clamp-2 text-xs text-gray-500">{state.getProductShortDescription()}</p>
                    </Show>
                    <Show when={!!state.getProductPrice()}>
                        <div className="mt-auto pt-1">
                            <span className="font-bold text-gray-900 text-base sm:text-lg">
                                {state.getProductPrice()}
                            </span>
                        </div>
                    </Show>
                </div>
                <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                    <AddToCart
                        graphqlClient={props.graphqlClient}
                        user={props.user}
                        product={props.product}
                        cartId={props.cartId}
                        configuration={props.configuration}
                        childItems={props.childItems}
                        notes={props.notes}
                        price={props.price}
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
                        className="flex w-full items-center gap-2"
                    />
                </div>
            </Show>
        </div>
    );
}
