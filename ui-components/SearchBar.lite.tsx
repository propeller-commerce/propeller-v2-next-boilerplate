import { useStore, Show, For, onMount, onUnMount } from '@builder.io/mitosis';
import {
    GraphQLClient,
    ProductService,
    Product,
    Cluster,
    Enums,
} from 'propeller-sdk-v2';

export interface SearchBarResult {
    /** Unique identifier */
    id: number | string;
    /** Display name */
    name: string;
    /** SKU code */
    sku?: string;
    /** Price value */
    price?: number;
    /** Image URL */
    imageUrl?: string;
    /** URL path to navigate to */
    url?: string;
    /** Whether this is a cluster (vs product) */
    isCluster?: boolean;
}

export interface SearchBarProps {
    /** Propeller SDK GraphQL client */
    graphqlClient: GraphQLClient;

    /** Language code for search requests */
    language?: string;

    /** Placeholder text for the search input */
    placeholder?: string;

    /** Minimum characters before search triggers */
    minSearchLength?: number;

    /** Debounce delay in milliseconds */
    debounceMs?: number;

    /** Maximum number of results to show in dropdown */
    maxResults?: number;

    /** Fallback image URL when product has no image */
    noImageUrl?: string;

    /** Fires when the search form is submitted (Enter key). Receives the search term. */
    onSubmit?: (term: string) => void;

    /** Fires when a result item is clicked. Receives the result object. */
    onResultClick?: (result: SearchBarResult) => void;

    /** Fires when "View all results" is clicked. Receives the search term. */
    onViewAllClick?: (term: string) => void;

    /** Custom price formatting function */
    formatPrice?: (price: number) => string;

    /** Labels for the component */
    labels?: Record<string, string>;

    /** Additional class name for the container */
    containerClassName?: string;
}

interface SearchBarState {
    searchTerm: string;
    results: SearchBarResult[];
    isLoading: boolean;
    showDropdown: boolean;
    itemsFound: number;
    debounceTimer: any;
    clickOutsideListener: any;
    placeholder: string;
    minLength: number;
    debounceMs: number;
    maxResults: number;
    noImageUrl: string;
    getLabel: (key: string, fallback: string) => string;
    formatItemPrice: (price: number) => string;
    mapProductToResult: (item: Product | Cluster) => SearchBarResult;
    handleInputChange: (value: string) => void;
    fetchResults: (term: string) => Promise<void>;
    handleSubmit: (e: any) => void;
    handleResultClick: (result: SearchBarResult) => void;
    handleViewAllClick: () => void;
}

export default function SearchBar(props: SearchBarProps) {
    const state = useStore<SearchBarState>({
        searchTerm: '',
        results: [] as SearchBarResult[],
        isLoading: false,
        showDropdown: false,
        itemsFound: 0,
        debounceTimer: null as any,
        clickOutsideListener: null as any,

        get placeholder() {
            return props.placeholder || 'Search products...';
        },

        get minLength() {
            return props.minSearchLength !== undefined ? props.minSearchLength : 3;
        },

        get debounceMs() {
            return props.debounceMs !== undefined ? props.debounceMs : 300;
        },

        get maxResults() {
            return props.maxResults !== undefined ? props.maxResults : 8;
        },

        get noImageUrl() {
            return props.noImageUrl || '';
        },

        getLabel(key: string, fallback: string) {
            return props.labels?.[key] || fallback;
        },

        formatItemPrice(price: number) {
            if (props.formatPrice) {
                return props.formatPrice(price);
            }
            return '\u20AC' + Number(price || 0).toFixed(2);
        },

        mapProductToResult(item: Product | Cluster): SearchBarResult {
            const isCluster = 'clusterId' in item;
            const displayItem = isCluster ? (item as Cluster).defaultProduct : item;
            const id = isCluster ? (item as Cluster).clusterId : (item as Product).productId;
            const slug = item.slugs?.[0]?.value || '';
            const url = isCluster
                ? '/cluster/' + id + '/' + slug
                : '/product/' + id + '/' + slug;
            return {
                id: id,
                name: item.names?.[0]?.value || 'Product',
                sku: item.sku || displayItem?.sku || '',
                price: displayItem?.price?.gross || 0,
                imageUrl: displayItem?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '',
                url: url,
                isCluster: isCluster,
            } as SearchBarResult;
        },

        handleInputChange(value: string) {
            state.searchTerm = value;

            if (state.debounceTimer) {
                clearTimeout(state.debounceTimer);
            }

            if (value.length < state.minLength) {
                state.results = [];
                state.showDropdown = false;
                return;
            }

            state.debounceTimer = setTimeout(() => {
                state.fetchResults(value);
            }, state.debounceMs);
        },

        async fetchResults(term: string) {
            if (!props.graphqlClient) return;

            state.isLoading = true;
            try {
                const productService = new ProductService(props.graphqlClient);
                const response = await productService.getProducts({
                    input: {
                        term: term,
                        language: props.language || 'NL',
                        page: 1,
                        offset: state.maxResults,
                        statuses: [
                            Enums.ProductStatus.A,
                            Enums.ProductStatus.P,
                            Enums.ProductStatus.T,
                            Enums.ProductStatus.S,
                        ],
                        hidden: false,
                        sortInputs: [{
                            field: Enums.ProductSortField.RELEVANCE,
                            order: Enums.SortOrder.DESC,
                        }],
                    },
                    imageSearchFilters: { page: 1, offset: 1 },
                    imageVariantFilters: {
                        transformations: [{
                            name: 'thumb',
                            transformation: {
                                format: Enums.Format.WEBP,
                                height: 100,
                                width: 100,
                                fit: Enums.Fit.BOUNDS,
                            },
                        }],
                    },
                    filterAvailableAttributeInput: { isSearchable: true },
                });

                const items = response.items || [];
                const mapped: SearchBarResult[] = [];
                for (let i = 0; i < items.length && i < state.maxResults; i++) {
                    mapped.push(state.mapProductToResult(items[i] as Product | Cluster));
                }
                state.results = mapped;
                state.itemsFound = response.itemsFound || 0;
                state.showDropdown = true;
            } catch (e) {
                state.results = [];
                state.showDropdown = false;
            } finally {
                state.isLoading = false;
            }
        },

        handleSubmit(e: any) {
            e.preventDefault();
            const term = state.searchTerm.trim();
            if (term && props.onSubmit) {
                props.onSubmit(term);
                state.showDropdown = false;
            }
        },

        handleResultClick(result: SearchBarResult) {
            if (props.onResultClick) {
                props.onResultClick(result);
            }
            state.showDropdown = false;
            state.searchTerm = '';
        },

        handleViewAllClick() {
            if (props.onViewAllClick) {
                props.onViewAllClick(state.searchTerm);
            }
            state.showDropdown = false;
        },
    });

    onMount(() => {
        const listener = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target && !target.closest('[data-search-bar]')) {
                state.showDropdown = false;
            }
        };
        state.clickOutsideListener = listener;
        document.addEventListener('mousedown', listener);
    });

    onUnMount(() => {
        if (state.clickOutsideListener) {
            document.removeEventListener('mousedown', state.clickOutsideListener);
        }
        if (state.debounceTimer) {
            clearTimeout(state.debounceTimer);
        }
    });

    return (
        <div
            data-search-bar
            className={props.containerClassName || 'relative flex-1 max-w-2xl mx-8'}
        >
            <form onSubmit={(e) => state.handleSubmit(e)}>
                <div className="relative">
                    <svg
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.35-4.35" />
                    </svg>
                    <input
                        type="search"
                        placeholder={state.placeholder}
                        value={state.searchTerm}
                        onChange={(e) => state.handleInputChange((e.target as HTMLInputElement).value)}
                        className="w-full pl-10 pr-10 py-2 bg-white/95 border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400 placeholder:text-gray-500"
                        autoComplete="off"
                    />
                    <Show when={state.isLoading}>
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                        </div>
                    </Show>
                </div>
            </form>

            {/* Autocomplete Dropdown */}
            <Show when={state.showDropdown}>
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border max-h-96 overflow-y-auto z-50">
                    <Show when={state.results.length > 0}>
                        <For each={state.results}>
                            {(result: SearchBarResult, index: number) => (
                                <div
                                    key={result.id + '-' + index}
                                    onClick={() => state.handleResultClick(result)}
                                    className="flex items-center gap-4 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 last:border-b-0"
                                >
                                    <Show when={result.imageUrl || state.noImageUrl}>
                                        <div className="relative w-16 h-16 flex-shrink-0">
                                            <img
                                                src={result.imageUrl || state.noImageUrl}
                                                alt={result.name}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    </Show>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold truncate">{result.name}</div>
                                        <Show when={result.sku}>
                                            <div className="text-sm text-gray-500">SKU: {result.sku}</div>
                                        </Show>
                                    </div>
                                    <Show when={result.price !== undefined && result.price !== null}>
                                        <div className="text-sm font-semibold text-foreground flex-shrink-0">
                                            {state.formatItemPrice(result.price!)}
                                        </div>
                                    </Show>
                                </div>
                            )}
                        </For>
                        <Show when={state.itemsFound > state.maxResults}>
                            <div
                                onClick={() => state.handleViewAllClick()}
                                className="p-3 text-center text-primary hover:bg-primary/5 cursor-pointer font-semibold"
                            >
                                {state.getLabel('viewAll', 'View all results')} ({state.itemsFound})
                            </div>
                        </Show>
                    </Show>
                    <Show when={state.results.length === 0 && state.searchTerm.length >= state.minLength && !state.isLoading}>
                        <div className="p-4 text-center text-gray-500">
                            {state.getLabel('noResults', 'No products found for')} &quot;{state.searchTerm}&quot;
                        </div>
                    </Show>
                </div>
            </Show>
        </div>
    );
}
