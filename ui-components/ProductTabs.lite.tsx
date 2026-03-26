import {
    useStore,
    Show,
    onMount,
    onUpdate,
} from '@builder.io/mitosis';
import {
    Product,
    GraphQLClient,
    PaginatedMediaDocumentResponse,
    PaginatedMediaVideoResponse,
    AttributeResult,
} from 'propeller-sdk-v2';
import ProductDescription from './ProductDescription.lite';
import ProductSpecifications from './ProductSpecifications.lite';
import ProductDownloads from './ProductDownloads.lite';
import ProductVideos from './ProductVideos.lite';

export interface ProductTabsProps {
    /** Product for which to display the information. */
    product: Product;

    // ── Tab visibility ────────────────────────────────────────────────────────

    /** If true, displays the Description tab. Defaults to true. */
    showDescription?: boolean;

    /** If true, displays the Specifications tab. Defaults to true. */
    showSpecifications?: boolean;

    /** If true, displays the Downloads tab. Defaults to true. */
    showDownloads?: boolean;

    /** If true, displays the Videos tab. Defaults to true. */
    showVideos?: boolean;

    // ── Shared ────────────────────────────────────────────────────────────────

    /**
     * Language code passed to all sub-components.
     * Defaults to 'NL'.
     */
    language?: string;

    /**
     * Override the tab button labels.
     * Available keys: description, specifications, downloads, videos
     */
    labels?: Record<string, string>;

    // ── Description tab ───────────────────────────────────────────────────────

    /**
     * When true, the description is initially collapsed to `descriptionMaxLength` characters.
     * A "Read more" / "Read less" toggle is shown.
     * Passed as `collapsed` to ProductDescription. Defaults to false.
     */
    descriptionCollapsed?: boolean;

    /**
     * Maximum number of characters shown when the description is collapsed.
     * Passed as `maxLength` to ProductDescription. Defaults to 0 (no truncation).
     */
    descriptionMaxLength?: number;

    // ── Specifications tab ────────────────────────────────────────────────────

    /**
     * Initialised Propeller SDK GraphQL client.
     * Passed to ProductSpecifications for internal attribute fetching.
     */
    graphqlClient?: GraphQLClient;

    /**
     * Product ID to fetch attributes for.
     * Passed to ProductSpecifications for internal attribute fetching.
     */
    productId?: number;

    /**
     * Display layout for the specifications.
     * 'table' — two-column table (name | value). Default.
     * 'list'  — vertical label + value stacked rows.
     * Passed as `layout` to ProductSpecifications.
     */
    specificationsLayout?: string;

    /**
     * When true, groups specifications by their group field with a heading per section.
     * When false or omitted, displays a flat ungrouped table. Default: false.
     * Passed as `grouping` to ProductSpecifications.
     */
    specificationsGrouping?: boolean;

    // ── Downloads tab ─────────────────────────────────────────────────────────

    /**
     * Override UI strings for the Downloads section.
     * Available keys: title, download
     * Passed as `labels` to ProductDownloads.
     */
    downloadsLabels?: Record<string, string>;

    // ── Videos tab ───────────────────────────────────────────────────────────

    /**
     * Override UI strings for the Videos section.
     * Available key: title
     * Passed as `labels` to ProductVideos.
     */
    videosLabels?: Record<string, string>;

    // ── Root ─────────────────────────────────────────────────────────────────

    /** Extra CSS class applied to the root element. */
    className?: string;
}

interface ProductTabsState {
    activeTab: string;
    specsVisited: boolean;
    hasDescription: boolean;
    isTabVisible: (tab: string) => boolean;
    isActive: (tab: string) => boolean;
    selectTab: (tab: string) => void;
    getLabel: (key: string, fallback: string) => string;
}

export default function ProductTabs(props: ProductTabsProps) {
    const state = useStore<ProductTabsState>({
        activeTab: 'description',
        specsVisited: false,

        get hasDescription(): boolean {
            const lang = props.language || 'NL';
            const descriptions = props.product?.descriptions;
            if (!descriptions || descriptions.length === 0) return false;
            const match = descriptions.find((d) => d.language === lang);
            return !!(match?.value || descriptions[0]?.value);
        },

        isTabVisible(tab: string): boolean {
            if (tab === 'description') return props.showDescription !== false && state.hasDescription;
            if (tab === 'specifications') return props.showSpecifications !== false;
            if (tab === 'downloads') return props.showDownloads !== false;
            if (tab === 'videos') return props.showVideos !== false;
            return false;
        },

        isActive(tab: string): boolean {
            return this.activeTab === tab;
        },

        selectTab(tab: string): void {
            if (tab === 'specifications') {
                this.specsVisited = true;
            }
            this.activeTab = tab;
        },

        getLabel(key: string, fallback: string): string {
            return (props.labels as Record<string, string>)?.[key] || fallback;
        },
    });

    onMount(() => {
        // Set the first visible tab as active
        if (props.showDescription !== false && state.hasDescription) {
            state.activeTab = 'description';
        } else if (props.showSpecifications !== false) {
            state.activeTab = 'specifications';
            state.specsVisited = true;
        } else if (props.showDownloads !== false) {
            state.activeTab = 'downloads';
        } else {
            state.activeTab = 'videos';
        }
    });

    onUpdate(() => {
        // Re-evaluate first visible tab when product data or language changes
        if (props.showDescription !== false && state.hasDescription) {
            state.activeTab = 'description';
        }
    }, [props.product, props.language]);

    return (
        <Show when={props.product}>
        <div className={`product-tabs ${(props.className as string) || ''}`}>
            {/* ── Desktop: horizontal tabs ── */}
            <div className="hidden md:block">
                <div className="flex border-b border-border">
                    <Show when={state.isTabVisible('description')}>
                        <button
                            type="button"
                            onClick={() => state.selectTab('description')}
                            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${state.isActive('description') ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
                        >
                            {state.getLabel('description', 'Description')}
                        </button>
                    </Show>

                    <Show when={state.isTabVisible('specifications')}>
                        <button
                            type="button"
                            onClick={() => state.selectTab('specifications')}
                            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${state.isActive('specifications') ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
                        >
                            {state.getLabel('specifications', 'Specifications')}
                        </button>
                    </Show>

                    <Show when={state.isTabVisible('downloads')}>
                        <button
                            type="button"
                            onClick={() => state.selectTab('downloads')}
                            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${state.isActive('downloads') ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
                        >
                            {state.getLabel('downloads', 'Downloads')}
                        </button>
                    </Show>

                    <Show when={state.isTabVisible('videos')}>
                        <button
                            type="button"
                            onClick={() => state.selectTab('videos')}
                            className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${state.isActive('videos') ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
                        >
                            {state.getLabel('videos', 'Videos')}
                        </button>
                    </Show>
                </div>

                <div className="pt-6">
                    <Show when={state.isActive('description') && state.isTabVisible('description')}>
                        <ProductDescription
                            product={props.product}
                            language={props.language}
                            collapsed={props.descriptionCollapsed}
                            maxLength={props.descriptionMaxLength}
                        />
                    </Show>

                    <Show when={state.specsVisited && state.isTabVisible('specifications')}>
                        <div className={state.isActive('specifications') ? '' : 'hidden'}>
                            <ProductSpecifications
                                attributes={props.product.attributes?.items as AttributeResult[]}
                                productId={props.productId}
                                graphqlClient={props.graphqlClient}
                                language={props.language}
                                layout={props.specificationsLayout}
                                grouping={props.specificationsGrouping}
                            />
                        </div>
                    </Show>

                    <Show when={state.isActive('downloads') && state.isTabVisible('downloads')}>
                        <ProductDownloads
                            downloads={(props.product as Product).media?.documents as PaginatedMediaDocumentResponse}
                            language={(props.language as string) || 'NL'}
                            labels={props.downloadsLabels}
                        />
                    </Show>

                    <Show when={state.isActive('videos') && state.isTabVisible('videos')}>
                        <ProductVideos
                            videos={(props.product as Product).media?.videos as PaginatedMediaVideoResponse}
                            language={(props.language as string) || 'NL'}
                            labels={props.videosLabels}
                        />
                    </Show>
                </div>
            </div>

            {/* ── Mobile: accordion ── */}
            <div className="md:hidden divide-y divide-border border border-border rounded-lg">
                <Show when={state.isTabVisible('description')}>
                    <div>
                        <button
                            type="button"
                            onClick={() => { state.activeTab = state.activeTab === 'description' ? '' : 'description'; }}
                            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-left"
                        >
                            {state.getLabel('description', 'Description')}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`transition-transform ${state.isActive('description') ? 'rotate-180' : ''}`}
                            >
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </button>
                        <Show when={state.isActive('description')}>
                            <div className="px-4 pb-4">
                                <ProductDescription
                                    product={props.product}
                                    language={props.language}
                                    collapsed={props.descriptionCollapsed}
                                    maxLength={props.descriptionMaxLength}
                                />
                            </div>
                        </Show>
                    </div>
                </Show>

                <Show when={state.isTabVisible('specifications')}>
                    <div>
                        <button
                            type="button"
                            onClick={() => {
                                if (state.activeTab !== 'specifications') {
                                    state.specsVisited = true;
                                    state.activeTab = 'specifications';
                                } else {
                                    state.activeTab = '';
                                }
                            }}
                            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-left"
                        >
                            {state.getLabel('specifications', 'Specifications')}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`transition-transform ${state.isActive('specifications') ? 'rotate-180' : ''}`}
                            >
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </button>
                        <Show when={state.specsVisited && state.isActive('specifications')}>
                            <div className="px-4 pb-4">
                                <ProductSpecifications
                                    attributes={props.product.attributes?.items as AttributeResult[]}
                                    productId={props.productId}
                                    graphqlClient={props.graphqlClient}
                                    language={props.language}
                                    layout={props.specificationsLayout}
                                    grouping={props.specificationsGrouping}
                                />
                            </div>
                        </Show>
                    </div>
                </Show>

                <Show when={state.isTabVisible('downloads')}>
                    <div>
                        <button
                            type="button"
                            onClick={() => { state.activeTab = state.activeTab === 'downloads' ? '' : 'downloads'; }}
                            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-left"
                        >
                            {state.getLabel('downloads', 'Downloads')}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`transition-transform ${state.isActive('downloads') ? 'rotate-180' : ''}`}
                            >
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </button>
                        <Show when={state.isActive('downloads')}>
                            <div className="px-4 pb-4">
                                <ProductDownloads
                                    downloads={(props.product as Product).media?.documents as PaginatedMediaDocumentResponse}
                                    language={(props.language as string) || 'NL'}
                                    labels={props.downloadsLabels}
                                />
                            </div>
                        </Show>
                    </div>
                </Show>

                <Show when={state.isTabVisible('videos')}>
                    <div>
                        <button
                            type="button"
                            onClick={() => { state.activeTab = state.activeTab === 'videos' ? '' : 'videos'; }}
                            className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-left"
                        >
                            {state.getLabel('videos', 'Videos')}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`transition-transform ${state.isActive('videos') ? 'rotate-180' : ''}`}
                            >
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </button>
                        <Show when={state.isActive('videos')}>
                            <div className="px-4 pb-4">
                                <ProductVideos
                                    videos={(props.product as Product).media?.videos as PaginatedMediaVideoResponse}
                                    language={(props.language as string) || 'NL'}
                                    labels={props.videosLabels}
                                />
                            </div>
                        </Show>
                    </div>
                </Show>
            </div>
        </div>
        </Show>
    );
}
