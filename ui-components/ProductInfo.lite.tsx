import {
    useStore,
    Show,
    onMount,
    onUpdate,
} from '@builder.io/mitosis';
import {
    GraphQLClient,
    Product,
    ProductService,
    LocalizedString,
    Contact,
    Customer,
    OrderlistService,
    Orderlist,
} from 'propeller-sdk-v2';

export interface ProductInfoProps {
    // ── Data source ──────────────────────────────────────────────────────────
    /** The authenticated user (Contact or Customer) */
    user: Contact | Customer | null;

    /** Active company ID from the company switcher. 
     * Overrides default company for price calculation. 
     * Triggers a re-fetch when changed. */
    companyId?: number;

    /**
     * Pre-fetched product object to display.
     * When provided the component skips internal fetching.
     */
    product?: Product;

    /**
     * Product ID to fetch data for when no `product` prop is provided.
     * Requires `graphqlClient` to be set.
     */
    productId?: number;

    /**
     * Initialised Propeller SDK GraphQL client.
     * Required when `productId` is provided for internal data fetching.
     */
    graphqlClient?: GraphQLClient;

    /**
     * Image search filter passed to ProductService.getProduct().
     * Controls how many image items are returned.
     * Example: { page: 1, offset: 20 }
     */
    imageSearchFilters?: any;

    /**
     * Image variant transformation filter passed to ProductService.getProduct().
     * Controls image size/format variants returned with the product.
     * Example: imageVariantFiltersLarge from @/data/defaults
     * Defaults to { transformations: [] } when omitted.
     */
    imageVariantFilters?: any;

    /**
     * Tax zone to use for price calculation.
     */
    taxZone?: string;

    /**
     * Called once the product data is loaded — either immediately (when
     * `product` prop is supplied) or after the internal fetch completes.
     * Use this to hydrate sibling components (gallery, price, descriptions, etc.).
     */
    onProductLoaded?: (product: Product) => void;

    // ── Display toggles ───────────────────────────────────────────────────────

    /** Show the product name. Defaults to true. */
    showTitle?: boolean;

    /** Show the product SKU. Defaults to true. */
    showSku?: boolean;

    // ── Locale ────────────────────────────────────────────────────────────────

    /** Language code used to resolve localised names. Defaults to 'NL'. */
    language?: string;

    /** Extra CSS class applied to the root element. */
    className?: string;

    /**
     * Config object providing imageSearchFiltersGrid and imageVariantFiltersSmall.
     */
    configuration?: any;

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
}

interface ProductInfoState {
    internalProduct: Product | null;
    loading: boolean;
    getProduct: () => Product | null;
    getProductName: () => string;
    getProductSku: () => string;
}

export default function ProductInfo(props: ProductInfoProps) {
    const state = useStore<ProductInfoState>({
        internalProduct: null,
        loading: false,

        getProduct(): Product | null {
            return (props.product as Product) || this.internalProduct;
        },

        getProductName(): string {
            const product = this.getProduct();
            if (!product) return '';
            const lang = (props.language as string) || 'NL';
            const match = product.names?.find(
                (n: LocalizedString) => n.language === lang
            );
            return match?.value || product.names?.[0]?.value || '';
        },

        getProductSku(): string {
            return this.getProduct()?.sku || '';
        },
    });

    onUpdate(() => {
        if (props.product) {
            if (props.onProductLoaded) {
                props.onProductLoaded(props.product);
            }
            return;
        }
        if (!props.productId || !props.graphqlClient) return;
        state.loading = true;
        const service = new ProductService(props.graphqlClient as GraphQLClient);
        const taxZone = props.taxZone || 'NL';

        let orderListsPromise: Promise<number[]> = Promise.resolve([]);
        if (props.user && props.companyId) {
            const orderlistService = new OrderlistService(props.graphqlClient as GraphQLClient);
            orderListsPromise = orderlistService.getOrderlists({
                companyIds: [props.companyId]
            }).then((orderlists: any) => {
                return orderlists.items?.map((orderList: Orderlist) => orderList.id) || [];
            });
        }

        orderListsPromise.then((orderLists: number[]) => {
        service
            .getProduct({
                productId: props.productId as number,
                language: (props.language as string) || 'NL',
                applyOrderlists: true,
                orderlistIds: orderLists,
                imageSearchFilters: props.imageSearchFilters || props.configuration.imageSearchFilters,
                imageVariantFilters: props.imageVariantFilters || props.configuration.imageVariantFiltersLarge,
                priceCalculateProductInput: {
                    taxZone: taxZone,
                    ...(props.companyId && {
                        companyId: (props.companyId as number),
                    }),
                    ...(props.user && 'contactId' in props.user && { contactId: (props.user as Contact)?.contactId }),
                    ...(props.user && 'customerId' in props.user && { customerId: (props.user as Customer)?.customerId })
                },
                userBulkPriceProductInput: {
                    taxZone: taxZone,
                    ...(props.companyId && {
                        companyId: (props.companyId as number),
                    }),
                    ...(props.user && 'contactId' in props.user && { contactId: (props.user as Contact)?.contactId }),
                    ...(props.user && 'customerId' in props.user && { customerId: (props.user as Customer)?.customerId })
                },
                ...(props.configuration.productTrackAttributes && props.configuration.productTrackAttributes.length > 0 && {
                    attributeResultSearchInput: {
                        attributeDescription: {
                            names: props.configuration.productTrackAttributes
                        }
                    }
                })
            })
            .then((product: Product) => {
                state.internalProduct = product;
                state.loading = false;
                if (props.onProductLoaded) {
                    props.onProductLoaded(product);
                }
            })
            .catch(() => {
                state.loading = false;
            });
        });
    }, [props.productId, props.product, props.language, props.user, props.companyId]);

    return (
        <div className={`product-info ${(props.className as string) || ''}`}>
            {/* Skeleton while loading */}
            <Show when={state.loading && !props.product}>
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-1/4" />
                    <div className="h-8 bg-slate-100 rounded w-3/4" />
                </div>
            </Show>

            {/* Content */}
            <Show when={!state.loading || !!props.product}>
                <Show when={props.showSku !== false && !!state.getProductSku()}>
                    <div className="text-sm font-mono text-muted-foreground mb-2">
                        SKU: {state.getProductSku()}
                    </div>
                </Show>

                <Show when={props.showTitle !== false && !!state.getProductName()}>
                    <h1 className="text-4xl font-bold tracking-tight text-foreground mb-4">
                        {state.getProductName()}
                    </h1>
                </Show>
            </Show>
        </div>
    );
}
