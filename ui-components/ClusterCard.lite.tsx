import {
    useStore,
    Show,
    For,
    onMount,
} from '@builder.io/mitosis';
import {
    Cluster,
    AttributeResult,
    ProductPrice,
} from 'propeller-sdk-v2';
import ProductPriceDisplay from './ProductPrice.lite';

export interface ClusterCardProps {
    // === Core ===

    /** The cluster object to display */
    cluster: Cluster;

    // === Display toggles ===

    /** Show the cluster name. Defaults to true. */
    showName?: boolean;

    /** Show the default product image. Defaults to true. */
    showImage?: boolean;

    /** Show the cluster short description. Defaults to false. */
    showShortDescription?: boolean;

    /**
     * Show the SKU. Displays the cluster SKU; falls back to the default product SKU
     * if the cluster SKU is empty. Defaults to true.
     */
    showSku?: boolean;

    /** Show the default product manufacturer. Defaults to false. */
    showManufacturer?: boolean;

    /**
     * Show default product stock information (quantity badge).
     * Reads `defaultProduct.inventory.totalQuantity`. Defaults to true.
     */
    showStock?: boolean;

    // === Attribute labels ===

    /**
     * Attribute codes/names to look up on the default product and display as
     * badge overlays on the image. Resolved against
     * `defaultProduct.attributes.items[].attributeDescription.name`.
     * Attributes with no matching value are silently omitted.
     * Example: ['new', 'sale']
     */
    imageLabels?: string[];

    /**
     * Attribute codes/names to look up on the default product and display as
     * extra text rows below the cluster name. Resolved the same way as `imageLabels`.
     * Example: ['brand', 'color']
     */
    textLabels?: string[];

    // === Favourites ===

    /** Renders a heart-icon toggle button on the cluster image. Defaults to false. */
    enableAddFavorite?: boolean;

    /**
     * Called whenever the favourite state is toggled.
     * The second argument indicates the new state: `true` = added, `false` = removed.
     */
    onToggleFavorite?: (cluster: Cluster, isFavorite: boolean) => void;

    // === Navigation ===

    /**
     * Called when the cluster name, image, or "View cluster" button is clicked.
     * When provided, the default `<a>` navigation is prevented so the consumer
     * can use framework-specific routing (e.g. Next.js `router.push`).
     */
    onClusterClick?: (cluster: Cluster) => void;

    // === UI string overrides ===

    /**
     * Override any UI string.
     * Available keys: addToFavorites, removeFromFavorites, viewCluster,
     *                 inStock, lowStock, outOfStock
     */
    labels?: Record<string, string>;

    /** Number of grid columns — when 1 the card renders as a compact horizontal row. */
    columns?: number;

    /** Extra CSS class applied to the root element. */
    className?: string;

    /** Configuration object passed to the component */
    configuration?: any;

    /** Include tax in the price display */
    includeTax?: boolean;
}

interface ClusterCardState {
    isFavorite: boolean;
    _includeTax: boolean;
    _priceListener: any;
    isRow: () => boolean;
    getClusterName: () => string;
    getClusterSku: () => string;
    getClusterImageUrl: () => string;
    getClusterUrl: () => string;
    getClusterShortDescription: () => string;
    getClusterManufacturer: () => string;
    getStockQuantity: () => number;
    getStockStatusLabel: () => string;
    getStockStatusClass: () => string;
    getLabel: (key: string, fallback: string) => string;
    handleClusterClick: (e: any) => void;
    handleToggleFavorite: (e: any) => void;
    computedImageLabels: () => string[];
    computedTextLabels: () => { name: string; value: string }[];
}

export default function ClusterCard(props: ClusterCardProps) {
    const state = useStore<ClusterCardState>({
        isFavorite: false,
        _includeTax: true,
        _priceListener: null as any,

        isRow() {
            return (props.columns as number) === 1;
        },

        getClusterName() {
            return (
                (props.cluster as Cluster)?.names?.[0]?.value ||
                (props.cluster as Cluster)?.defaultProduct?.names?.[0]?.value ||
                'Cluster'
            );
        },

        getClusterSku() {
            return (
                (props.cluster as Cluster)?.sku ||
                (props.cluster as Cluster)?.defaultProduct?.sku ||
                ''
            );
        },

        getClusterImageUrl() {
            return (
                (props.cluster as Cluster)?.defaultProduct?.media?.images
                    ?.items?.[0]?.imageVariants?.[0]?.url || ''
            );
        },

        getClusterUrl() {
            return props.configuration.urls.getClusterUrl(props.cluster);
        },

        getClusterShortDescription() {
            return (
                (props.cluster as Cluster)?.shortDescriptions?.[0]?.value ||
                (props.cluster as Cluster)?.defaultProduct?.shortDescriptions?.[0]?.value ||
                ''
            );
        },

        getClusterManufacturer() {
            return (props.cluster as Cluster)?.defaultProduct?.manufacturer || '';
        },

        getStockQuantity() {
            const qty = (props.cluster as Cluster)?.defaultProduct?.inventory
                ?.totalQuantity;
            return qty !== undefined && qty !== null ? qty : -1;
        },

        getStockStatusLabel(): string {
            const qty = state.getStockQuantity();
            if (qty < 0) return '';
            if (qty === 0) return state.getLabel('outOfStock', 'Out of stock');
            if (qty <= 5) return state.getLabel('lowStock', 'Low stock');
            return state.getLabel('inStock', 'In stock');
        },

        getStockStatusClass(): string {
            const qty = state.getStockQuantity();
            if (qty <= 0) return 'text-red-600 bg-red-50';
            if (qty <= 5) return 'text-amber-600 bg-amber-50';
            return 'text-green-600 bg-green-50';
        },

        getLabel(key: string, fallback: string) {
            return (props.labels as Record<string, string>)?.[key] || fallback;
        },

        handleClusterClick(e: any) {
            if (props.onClusterClick) {
                e.preventDefault();
                props.onClusterClick(props.cluster);
            }
        },

        handleToggleFavorite(e: any) {
            e.preventDefault();
            e.stopPropagation();
            state.isFavorite = !state.isFavorite;
            if (props.onToggleFavorite) {
                props.onToggleFavorite(props.cluster, state.isFavorite);
            }
        },

        computedImageLabels(): string[] {
            if (
                !props.imageLabels ||
                (props.imageLabels as string[]).length === 0
            )
                return [];
            const attrs =
                (props.cluster as Cluster)?.defaultProduct?.attributes?.items ||
                [];
            return (props.imageLabels as string[])
                .map((code: string) => {
                    const found = attrs.find(
                        (a: AttributeResult) =>
                            a.attributeDescription?.name === code,
                    );
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
            const attrs =
                (props.cluster as Cluster)?.defaultProduct?.attributes?.items ||
                [];
            return (props.textLabels as string[])
                .map((code: string) => {
                    const found = attrs.find(
                        (a: AttributeResult) =>
                            a.attributeDescription?.name === code,
                    );
                    return { name: code, value: found?.value?.value || '' };
                })
                .filter(
                    (item: { name: string; value: string }) =>
                        item.value.length > 0,
                );
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
        <div
            className={`group relative flex h-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-violet-200 ${state.isRow() ? 'flex-row items-center' : 'flex-col'} ${props.className || ''}`}
        >
            {/* ── Image area ──────────────────────────────────── */}
            <Show when={props.showImage !== false}>
                <div className={`relative overflow-hidden bg-gray-50 ${state.isRow() ? 'w-20 h-20 flex-shrink-0 p-2' : 'aspect-square p-4'}`}>
                    <a
                        href={state.getClusterUrl()}
                        onClick={(e: any) => state.handleClusterClick(e)}
                        className="block h-full w-full"
                    >
                        <Show when={!!state.getClusterImageUrl()}>
                            <img
                                src={state.getClusterImageUrl()}
                                alt={state.getClusterName()}
                                className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                        </Show>
                        <Show when={!state.getClusterImageUrl()}>
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
                                    <span className="inline-block rounded bg-violet-600 px-2 py-0.5 text-xs font-medium text-white shadow-sm">
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

            {/* ── Text content ─────────────────────────────────── */}
            <div className={`flex flex-1 ${state.isRow() ? 'flex-row items-center gap-4 px-4 py-2 min-w-0' : 'flex-col gap-2 p-4'}`}>
                {/* SKU */}
                <Show
                    when={props.showSku !== false && !!state.getClusterSku()}
                >
                    <div className="font-mono text-xs text-gray-400">
                        {state.getClusterSku()}
                    </div>
                </Show>

                {/* Cluster name */}
                <Show when={props.showName !== false}>
                    <a
                        href={state.getClusterUrl()}
                        onClick={(e: any) => state.handleClusterClick(e)}
                        className={`text-sm font-medium leading-tight text-gray-900 transition-colors hover:text-violet-600 ${state.isRow() ? 'line-clamp-1 flex-1 min-w-0' : 'line-clamp-2'}`}
                    >
                        {state.getClusterName()}
                    </a>
                </Show>

                {/* Attribute text labels */}
                <Show
                    when={
                        !!props.textLabels &&
                        props.textLabels.length > 0 &&
                        state.computedTextLabels().length > 0
                    }
                >
                    <div className="flex flex-col gap-0.5">
                        <For each={state.computedTextLabels()}>
                            {(item: { name: string; value: string }) => (
                                <div className="text-xs text-gray-500">
                                    {item.value}
                                </div>
                            )}
                        </For>
                    </div>
                </Show>

                {/* Manufacturer */}
                <Show
                    when={
                        props.showManufacturer &&
                        !!state.getClusterManufacturer()
                    }
                >
                    <div className="text-xs text-gray-500">
                        {state.getClusterManufacturer()}
                    </div>
                </Show>

                {/* Short description */}
                <Show
                    when={
                        props.showShortDescription &&
                        !!state.getClusterShortDescription()
                    }
                >
                    <p className="line-clamp-2 text-xs text-gray-500">
                        {state.getClusterShortDescription()}
                    </p>
                </Show>

                {/* Price */}
                <Show when={!!(props.cluster as Cluster).defaultProduct?.price}>
                    <div className={state.isRow() ? '' : 'mt-auto pt-2'}>
                        <ProductPriceDisplay
                            includeTax={props.includeTax !== undefined ? props.includeTax : state._includeTax}
                            price={(props.cluster as Cluster).defaultProduct?.price as ProductPrice}
                            options={(props.cluster as Cluster).options}
                            priceSize={state.isRow() ? 'text-sm whitespace-nowrap' : 'text-lg'}
                        />
                    </div>
                </Show>

                {/* Stock badge */}
                <Show
                    when={
                        props.showStock !== false &&
                        state.getStockQuantity() >= 0
                    }
                >
                    <div className="flex items-center gap-1.5">
                        <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${state.getStockStatusClass()}`}
                        >
                            {state.getStockStatusLabel()}
                        </span>
                        <Show when={state.getStockQuantity() > 0}>
                            <span className="text-xs text-gray-400">
                                ({state.getStockQuantity()})
                            </span>
                        </Show>
                    </div>
                </Show>
            </div>

            {/* ── View cluster button ───────────────────────────── */}
            <div className={state.isRow() ? 'flex-shrink-0 pr-4' : 'px-4 pb-4'}>
                <a
                    href={state.getClusterUrl()}
                    onClick={(e: any) => state.handleClusterClick(e)}
                    className="flex w-full items-center justify-center rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
                >
                    {state.getLabel('viewCluster', 'View cluster')}
                </a>
            </div>
        </div>
    );
}
