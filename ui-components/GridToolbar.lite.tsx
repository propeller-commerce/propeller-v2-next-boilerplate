import {
    useStore,
    Show,
    For,
    onUpdate,
} from '@builder.io/mitosis';
import {
    Contact,
    Customer,
    Enums
} from 'propeller-sdk-v2';

// Default sort field keys shown in the dropdown when sortOptions is not provided.
const ALL_SORT_FIELDS: string[] = [
    Enums.ProductSortField.CATEGORY_ORDER,
    Enums.ProductSortField.NAME,
    Enums.ProductSortField.PRICE,
    Enums.ProductSortField.SKU,
    Enums.ProductSortField.SUPPLIER_CODE,
    Enums.ProductSortField.CREATED_AT,
    Enums.ProductSortField.LAST_MODIFIED_AT,
    Enums.ProductSortField.RELEVANCE,
    Enums.ProductSortField.PRIORITY,
];

// Built-in label defaults (can be overridden via the labels prop).
const DEFAULT_LABELS: Record<string, string> = {
    [Enums.ProductSortField.CATEGORY_ORDER]: 'Default Sorting',
    [Enums.ProductSortField.NAME]: 'Name',
    [Enums.ProductSortField.PRICE]: 'Price',
    [Enums.ProductSortField.SKU]: 'SKU',
    [Enums.ProductSortField.SUPPLIER_CODE]: 'Supplier Code',
    [Enums.ProductSortField.CREATED_AT]: 'Created Date',
    [Enums.ProductSortField.LAST_MODIFIED_AT]: 'Last Modified Date',
    [Enums.ProductSortField.RELEVANCE]: 'Relevance',
    [Enums.ProductSortField.PRIORITY]: 'Priority',
    [Enums.SortOrder.ASC]: 'Low to High',
    [Enums.SortOrder.DESC]: 'High to Low',
    clearAll: 'Clear All',
    products: ' Products',
    from: 'from',
    results: 'results',
    perPage: ' per page',
    price: 'Price',
    switchToList: 'Switch to list view',
    switchToGrid: 'Switch to grid view',
};

export interface GridToolbarProps {
    /**
     * Sort field keys to show in the sort dropdown.
     * Accepts keys of the ProductSortField enum (e.g. 'NAME', 'PRICE').
     * Defaults to all available sort fields.
     */
    sortOptions?: string[];

    /**
     * Active sort — first element is used.
     * Defaults to [{ field: 'CATEGORY_ORDER', order: 'ASC' }].
     */
    defaultSort?: { field: string; order: string }[];

    /**
     * Layout mode: 'grid' or 'list'.
     * Controls which icon the view-toggle button shows.
     * Defaults to 'grid'.
     */
    viewMode?: string;

    /**
     * Available page-size options shown in the per-page dropdown.
     * Defaults to [12, 24, 48].
     */
    offset?: number[];

    /**
     * Initially selected page size.
     * Defaults to 12.
     */
    defaultOffset?: number;

    /**
     * Called when the sort field or sort direction changes.
     * Receives the new field key and direction ('ASC'|'DESC').
     */
    onSortChange?: (field: string, order: string) => void;

    /**
     * Called when the user selects a different per-page value.
     * Receives the new page size number.
     */
    onOffsetChange?: (offset: number) => void;

    /**
     * Called when the user clicks the view-mode toggle button.
     * Receives the new mode: 'grid' or 'list'.
     */
    onViewChange?: (mode: string) => void;

    /**
     * Total products found — displayed as a result count on the left side.
     * Pass 0 or undefined to hide the count.
     */
    itemsFound?: number;

    /**
     * Current page number. Used together with `pageSize` and `itemsFound`
     * to display a range indicator (e.g. "1–10 from 594 results").
     * When omitted the component falls back to a simple total count.
     */
    page?: number;

    /**
     * Items per page. Used together with `page` and `itemsFound`
     * to compute the result range. Defaults to 12.
     */
    pageSize?: number;

    /**
     * Actual number of items visible on the current page.
     * When provided, overrides `pageSize` for the range end calculation.
     */
    pageItemCount?: number;

    /**
     * Currently active attribute filter selections.
     * Key = attribute name, value = array of selected values.
     * Used to render removable filter badges.
     */
    activeTextFilters?: Record<string, string[]>;

    /**
     * Currently active price filter lower bound.
     * When defined (together with or without priceFilterMax), renders a price badge.
     */
    priceFilterMin?: number;

    /**
     * Currently active price filter upper bound.
     */
    priceFilterMax?: number;

    /**
     * Called when an attribute filter badge × is clicked.
     * Receives the attribute name and the specific value to remove.
     */
    onFilterRemove?: (filterName: string, value: string) => void;

    /**
     * Called when the price filter badge × is clicked.
     */
    onPriceFilterRemove?: () => void;

    /**
     * Called when "Clear All" is clicked.
     */
    onClearFilters?: () => void;

    /**
     * Label overrides. Supply any subset of DEFAULT_LABELS keys plus
     * any of the ProductSortField key strings to customise display text.
     */
    labels?: Record<string, string>;

    /**
     * Portal visibility mode.
     * 'open'        — price sorting is available for all users.
     * 'semi-closed' — price sorting is disabled for unauthenticated users.
     */
    portalMode?: string;

    /**
     * Authenticated user object.
     * When null/undefined in semi-closed mode the PRICE sort option is disabled.
     */
    user?: Contact | Customer | null;

    /** Extra CSS class applied to the root element. */
    className?: string;
}

/** Flat badge item used when rendering the active-filters bar. */
interface FilterBadge {
    key: string;
    value: string;
}

interface GridToolbarState {
    currentSortField: string;
    currentSortOrder: string;
    currentOffset: number;
    currentViewMode: string;
    getLabel: (key: string) => string;
    getSortOptions: () => string[];
    getOffsetOptions: () => number[];
    hasActiveFilters: () => boolean;
    getActiveFilterBadges: () => FilterBadge[];
    isPriceSortDisabled: () => boolean;
    handleSortFieldChange: (field: string) => void;
    handleSortOrderChange: (order: string) => void;
    handleOffsetChange: (offset: number) => void;
    handleViewChange: () => void;
}

export default function GridToolbar(props: GridToolbarProps) {
    const state = useStore<GridToolbarState>({
        currentSortField: Enums.ProductSortField.CATEGORY_ORDER,
        currentSortOrder: Enums.SortOrder.ASC,
        currentOffset: 12,
        currentViewMode: 'grid',

        getLabel(key: string): string {
            const labels = (props.labels as Record<string, string>) || {};
            return labels[key] !== undefined
                ? labels[key]
                : (DEFAULT_LABELS[key] || key);
        },

        getSortOptions(): string[] {
            const opts = (props.sortOptions as string[]) || [];
            return opts.length > 0 ? opts : ALL_SORT_FIELDS;
        },

        getOffsetOptions(): number[] {
            const opts = (props.offset as number[]) || [];
            return opts.length > 0 ? opts : [12, 24, 48];
        },

        hasActiveFilters(): boolean {
            const text = (props.activeTextFilters as Record<string, string[]>) || {};
            const hasText = Object.keys(text).some(
                (k) => ((text[k]) || []).length > 0
            );
            const hasPrice =
                props.priceFilterMin !== undefined ||
                props.priceFilterMax !== undefined;
            return hasText || hasPrice;
        },

        getActiveFilterBadges(): FilterBadge[] {
            const text = (props.activeTextFilters as Record<string, string[]>) || {};
            const badges: FilterBadge[] = [];
            Object.entries(text)
                .filter(([, values]) => ((values) || []).length > 0)
                .forEach(([key, values]) => {
                    ((values) || []).forEach((value: string) => {
                        badges.push({ key, value });
                    });
                });
            return badges;
        },

        isPriceSortDisabled(): boolean {
            return (props.portalMode as string) === 'semi-closed' && !props.user;
        },

        handleSortFieldChange(field: string) {
            state.currentSortField = field;
            if (props.onSortChange) props.onSortChange(field, state.currentSortOrder);
        },

        handleSortOrderChange(order: string) {
            state.currentSortOrder = order;
            if (props.onSortChange) props.onSortChange(state.currentSortField, order);
        },

        handleOffsetChange(offset: number) {
            state.currentOffset = offset;
            if (props.onOffsetChange) props.onOffsetChange(offset);
        },

        handleViewChange() {
            const next = state.currentViewMode === 'grid' ? 'list' : 'grid';
            state.currentViewMode = next;
            if (props.onViewChange) props.onViewChange(next);
        },
    });

    // Sync sort state from defaultSort prop (e.g. when URL-driven sort changes).
    // NOTE: compiled output patches dep to JSON.stringify(props.defaultSort) to avoid
    // reference instability when the parent passes an inline array literal.
    onUpdate(() => {
        const sort = (props.defaultSort as { field: string; order: string }[]) || [];
        state.currentSortField = sort.length > 0 ? (sort[0].field || Enums.ProductSortField.CATEGORY_ORDER) : Enums.ProductSortField.CATEGORY_ORDER;
        state.currentSortOrder = sort.length > 0 ? (sort[0].order || Enums.SortOrder.ASC) : Enums.SortOrder.ASC;
    }, [props.defaultSort]);

    // Sync per-page offset from defaultOffset prop.
    onUpdate(() => {
        state.currentOffset = (props.defaultOffset as number) || 12;
    }, [props.defaultOffset]);

    // Sync view mode from viewMode prop (controlled externally).
    onUpdate(() => {
        if (props.viewMode) {
            state.currentViewMode = (props.viewMode as string);
        }
    }, [props.viewMode]);

    return (
        <div className={`${(props.className as string) || ''}`}>

            {/* ── Toolbar row ────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">

                {/* Result count */}
                <div className="text-sm text-muted-foreground font-medium">
                    <Show when={(props.itemsFound as number) > 0}>
                        <span>
                            {(props.itemsFound as number)} {state.getLabel('products')}
                        </span>
                    </Show>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-3">

                    {/* Per-page select */}
                    <select
                        value={state.currentOffset}
                        onChange={(e) =>
                            state.handleOffsetChange(
                                parseInt((e.target as HTMLSelectElement).value)
                            )
                        }
                        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <For each={state.getOffsetOptions()}>
                            {(n: number) => (
                                <option key={n} value={n}>
                                    {n} {state.getLabel('perPage')}
                                </option>
                            )}
                        </For>
                    </select>

                    <div className="h-4 w-px bg-border hidden sm:block" />

                    {/* Sort field */}
                    <select
                        value={state.currentSortField}
                        onChange={(e) =>
                            state.handleSortFieldChange(
                                (e.target as HTMLSelectElement).value
                            )
                        }
                        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <For each={state.getSortOptions()}>
                            {(field: string) => (
                                <option
                                    key={field}
                                    value={field}
                                    disabled={
                                        field === 'PRICE' &&
                                        state.isPriceSortDisabled()
                                    }
                                >
                                    {state.getLabel(field)}
                                </option>
                            )}
                        </For>
                    </select>

                    {/* Sort direction */}
                    <select
                        value={state.currentSortOrder}
                        onChange={(e) =>
                            state.handleSortOrderChange(
                                (e.target as HTMLSelectElement).value
                            )
                        }
                        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                        <option value={Enums.SortOrder.ASC}>{state.getLabel('ASC')}</option>
                        <option value={Enums.SortOrder.DESC}>{state.getLabel('DESC')}</option>
                    </select>

                    {/* View-mode toggle */}
                    <button
                        type="button"
                        onClick={() => state.handleViewChange()}
                        title={
                            state.currentViewMode === 'grid'
                                ? state.getLabel('switchToList')
                                : state.getLabel('switchToGrid')
                        }
                        className="h-9 w-9 flex items-center justify-center rounded-md border border-input bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        {/* List icon — shown when grid mode is active (click to switch to list) */}
                        <Show when={state.currentViewMode === 'grid'}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="8" y1="6" x2="21" y2="6" />
                                <line x1="8" y1="12" x2="21" y2="12" />
                                <line x1="8" y1="18" x2="21" y2="18" />
                                <line x1="3" y1="6" x2="3.01" y2="6" />
                                <line x1="3" y1="12" x2="3.01" y2="12" />
                                <line x1="3" y1="18" x2="3.01" y2="18" />
                            </svg>
                        </Show>
                        {/* Grid icon — shown when list mode is active (click to switch to grid) */}
                        <Show when={state.currentViewMode === 'list'}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                        </Show>
                    </button>
                </div>
            </div>

            {/* ── Active filters bar ──────────────────────────────────────── */}
            <Show when={state.hasActiveFilters()}>
                <div className="flex flex-wrap gap-2 mb-4">

                    {/* Clear all */}
                    <button
                        type="button"
                        onClick={() => {
                            if (props.onClearFilters) props.onClearFilters();
                        }}
                        className="h-7 px-2 text-xs rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        {state.getLabel('clearAll')}
                    </button>

                    {/* Price filter badge */}
                    <Show
                        when={
                            props.priceFilterMin !== undefined ||
                            props.priceFilterMax !== undefined
                        }
                    >
                        <span
                            onClick={() => {
                                if (props.onPriceFilterRemove) props.onPriceFilterRemove();
                            }}
                            className="inline-flex items-center gap-1 cursor-pointer px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        >
                            {state.getLabel('price')}: €
                            {(props.priceFilterMin as number) ?? 0} –
                            €{(props.priceFilterMax as number) ?? '∞'}
                            {' '}<span>×</span>
                        </span>
                    </Show>

                    {/* Attribute filter badges */}
                    <For each={state.getActiveFilterBadges()}>
                        {(badge: FilterBadge) => (
                            <span
                                key={`${badge.key}-${badge.value}`}
                                onClick={() => {
                                    if (props.onFilterRemove)
                                        props.onFilterRemove(badge.key, badge.value);
                                }}
                                className="inline-flex items-center gap-1 cursor-pointer px-2.5 py-0.5 rounded-full text-xs font-semibold border border-input bg-background hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                            >
                                {badge.value} <span>×</span>
                            </span>
                        )}
                    </For>
                </div>
            </Show>
        </div>
    );
}
