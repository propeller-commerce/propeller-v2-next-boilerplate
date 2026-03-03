import {
    useStore,
    Show,
    onMount,
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
     * Passed to ProductSpecifications for internal attribute fetching
     * when the product object does not have pre-loaded attributes.
     */
    graphqlClient?: GraphQLClient;

    /**
     * Display layout for the specifications.
     * 'table' — two-column table (name | value). Default.
     * 'list'  — vertical label + value stacked rows.
     * Passed as `layout` to ProductSpecifications.
     */
    specificationsLayout?: string;

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
    isTabVisible: (tab: string) => boolean;
    isActive: (tab: string) => boolean;
    selectTab: (tab: string) => void;
    getLabel: (key: string, fallback: string) => string;
}

export default function ProductTabs(props: ProductTabsProps) {
    const state = useStore<ProductTabsState>({
        activeTab: 'description',

        isTabVisible(tab: string): boolean {
            if (tab === 'description') return props.showDescription !== false;
            if (tab === 'specifications') return props.showSpecifications !== false;
            if (tab === 'downloads') return props.showDownloads !== false;
            if (tab === 'videos') return props.showVideos !== false;
            return false;
        },

        isActive(tab: string): boolean {
            return this.activeTab === tab;
        },

        selectTab(tab: string): void {
            this.activeTab = tab;
        },

        getLabel(key: string, fallback: string): string {
            return (props.labels as Record<string, string>)?.[key] || fallback;
        },
    });

    onMount(() => {
        // Set the first visible tab as active
        if (props.showDescription !== false) {
            state.activeTab = 'description';
        } else if (props.showSpecifications !== false) {
            state.activeTab = 'specifications';
        } else if (props.showDownloads !== false) {
            state.activeTab = 'downloads';
        } else {
            state.activeTab = 'videos';
        }
    });

    return (
        <div className={`product-tabs ${(props.className as string) || ''}`}>
            {/* Tab button bar */}
            <div className="flex border-b border-border">
                <Show when={state.isTabVisible('description')}>
                    <button
                        type="button"
                        onClick={() => state.selectTab('description')}
                        className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${state.isActive('description') ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
                    >
                        {state.getLabel('description', 'Description')}
                    </button>
                </Show>

                <Show when={state.isTabVisible('specifications')}>
                    <button
                        type="button"
                        onClick={() => state.selectTab('specifications')}
                        className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${state.isActive('specifications') ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
                    >
                        {state.getLabel('specifications', 'Specifications')}
                    </button>
                </Show>

                <Show when={state.isTabVisible('downloads')}>
                    <button
                        type="button"
                        onClick={() => state.selectTab('downloads')}
                        className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${state.isActive('downloads') ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
                    >
                        {state.getLabel('downloads', 'Downloads')}
                    </button>
                </Show>

                <Show when={state.isTabVisible('videos')}>
                    <button
                        type="button"
                        onClick={() => state.selectTab('videos')}
                        className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${state.isActive('videos') ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
                    >
                        {state.getLabel('videos', 'Videos')}
                    </button>
                </Show>
            </div>

            {/* Tab content panels */}
            <div className="pt-6">
                <Show when={state.isActive('description') && state.isTabVisible('description')}>
                    <ProductDescription
                        product={props.product}
                        language={props.language}
                        collapsed={props.descriptionCollapsed}
                        maxLength={props.descriptionMaxLength}
                    />
                </Show>

                <Show when={state.isActive('specifications') && state.isTabVisible('specifications')}>
                    <ProductSpecifications
                        attributes={(props.product as Product).attributes?.items as AttributeResult[]}
                        productId={(props.product as Product).productId}
                        graphqlClient={props.graphqlClient}
                        language={props.language}
                        layout={props.specificationsLayout}
                    />
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
    );
}
