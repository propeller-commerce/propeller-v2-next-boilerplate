import {
    useStore,
    Show,
    For,
    onUpdate,
} from '@builder.io/mitosis';
import {
    Contact,
    Customer,
    AttributeFilter,
} from 'propeller-sdk-v2';

export interface GridFiltersProps {
    /**
     * Attribute filter definitions from the ProductGrid API response.
     * Each entry describes one filterable attribute (e.g. colour, brand, size).
     */
    filters: AttributeFilter[];

    /**
     * Price bounds { min, max } from the current product set.
     * When absent the price section is hidden.
     */
    priceMin?: number;
    priceMax?: number;

    /** Language code. Defaults to 'NL'. */
    language?: string;

    /** Notification called after every filter change. */
    getSelectedFilters?: () => void;

    /**
     * Called on every checkbox toggle.
     * `filter` is the AttributeFilter; `value` is the toggled option string.
     */
    onFilterChange: (filter: AttributeFilter, value: string | number) => void;

    /**
     * Called when the price range changes (on blur / slider release).
     */
    onPriceChange?: (minPrice: number, maxPrice: number) => void;

    /** Called when "Clear all" is clicked. */
    onClearFilters?: () => void;

    /** Enable mobile-specific behaviour (drops sticky positioning). */
    isMobile?: boolean;

    /**
     * 'open' — show price filter for all users.
     * 'semi-closed' — hide price filter for unauthenticated users.
     */
    portalMode?: string;

    /** Authenticated user — price filter visibility depends on this in semi-closed mode. */
    user?: Contact | Customer | null;

    /**
     * Whether filter accordions start collapsed.
     * Defaults to true.
     */
    collapsed?: boolean;

    /** Increment this counter to reset all selected filters and price inputs externally. */
    clearSignal?: number;

    /** Currently active text filters (URL-driven). Syncs internal checkbox state when filters are removed externally. */
    activeTextFilters?: Record<string, string[]>;

    /** Extra CSS class on the root element. */
    className?: string;
}

interface GridFiltersState {
    selectedFilters: Record<string, string[]>;
    currentMin: number;
    currentMax: number;
    expandedFilters: Record<string, boolean>;
    showPriceFilter: () => boolean;
    getFilterName: (filter: AttributeFilter) => string;
    getFilterTitle: (filter: AttributeFilter) => string;
    getFilteredFilters: () => AttributeFilter[];
    getValidOptions: (filter: AttributeFilter) => any[];
    getSelectedCount: () => number;
    hasActiveFilters: () => boolean;
    isSelected: (filterName: string, value: string) => boolean;
    isExpanded: (filterName: string) => boolean;
    toggleAccordion: (filterName: string) => void;
    handleCheckbox: (filter: AttributeFilter, value: string, checked: boolean) => void;
    handleMinChange: (value: number) => void;
    handleMaxChange: (value: number) => void;
    applyPrice: () => void;
    clearAll: () => void;
    getCount: (option: any) => number;
    getMinBound: () => number;
    getMaxBound: () => number;
}

export default function GridFilters(props: GridFiltersProps) {
    const state = useStore<GridFiltersState>({
        selectedFilters: {},
        currentMin: 0,
        currentMax: 9999,
        expandedFilters: {},

        showPriceFilter(): boolean {
            const mode = (props.portalMode as string) || 'open';
            if (mode === 'open') return true;
            return !!props.user;
        },

        getFilterName(filter: AttributeFilter): string {
            return (filter as AttributeFilter)?.attributeDescription?.name || '';
        },

        getFilterTitle(filter: AttributeFilter): string {
            return (
                (filter as AttributeFilter)?.attributeDescription?.descriptions?.[0]?.value ||
                (filter as AttributeFilter)?.attributeDescription?.name ||
                ''
            );
        },

        getFilteredFilters(): AttributeFilter[] {
            const list = (props.filters as AttributeFilter[]) || [];
            return list.filter((f: AttributeFilter) => {
                const opts = (f?.textFilters as any[]) || [];
                return opts.some((o: any) => (o?.count || 0) > 0 || (o?.countActive || 0) > 0);
            });
        },

        getValidOptions(filter: AttributeFilter): any[] {
            return ((filter as AttributeFilter)?.textFilters as any[] || []).filter(
                (o: any) => (o?.count || 0) > 0 || (o?.countActive || 0) > 0,
            );
        },

        getSelectedCount(): number {
            let n = 0;
            const sel = state.selectedFilters as Record<string, string[]>;
            Object.keys(sel).forEach((k: string) => { n += (sel[k] || []).length; });
            return n;
        },

        hasActiveFilters(): boolean {
            const sel = state.selectedFilters as Record<string, string[]>;
            return Object.keys(sel).some((k: string) => (sel[k] || []).length > 0);
        },

        isSelected(filterName: string, value: string): boolean {
            return ((state.selectedFilters as Record<string, string[]>)[filterName] || []).includes(value);
        },

        isExpanded(filterName: string): boolean {
            const stored = (state.expandedFilters as Record<string, boolean>)[filterName];
            if (stored === undefined) return props.collapsed === false;
            return !!stored;
        },

        toggleAccordion(filterName: string) {
            const cur = !!(state.expandedFilters as Record<string, boolean>)[filterName];
            state.expandedFilters = { ...state.expandedFilters, [filterName]: !cur };
        },

        handleCheckbox(filter: AttributeFilter, value: string, checked: boolean) {
            const name = (filter as AttributeFilter)?.attributeDescription?.name || '';
            const cur = (state.selectedFilters as Record<string, string[]>)[name] || [];
            const next = checked
                ? [...cur, value]
                : cur.filter((v: string) => v !== value);
            state.selectedFilters = { ...state.selectedFilters, [name]: next };
            if (next.length === 0) {
                state.expandedFilters = { ...state.expandedFilters, [name]: false };
            }
            props.onFilterChange(filter, value);
            if (props.getSelectedFilters) props.getSelectedFilters();
        },

        handleMinChange(value: number) {
            const n = value > state.currentMax ? state.currentMax : value;
            state.currentMin = n;
        },

        handleMaxChange(value: number) {
            const n = value < state.currentMin ? state.currentMin : value;
            state.currentMax = n;
        },

        applyPrice() {
            if (props.onPriceChange) props.onPriceChange(state.currentMin, state.currentMax);
            if (props.getSelectedFilters) props.getSelectedFilters();
        },

        clearAll() {
            state.selectedFilters = {};
            state.currentMin = (props.priceMin as number) || 0;
            state.currentMax = (props.priceMax as number) || 9999;
            if (props.onClearFilters) props.onClearFilters();
            if (props.getSelectedFilters) props.getSelectedFilters();
        },

        getCount(option: any): number {
            const c = option?.count || 0;
            const ca = option?.countActive || 0;
            return c === 0 && ca > 0 ? ca : c;
        },

        getMinBound(): number {
            return (props.priceMin as number) || 0;
        },

        getMaxBound(): number {
            return (props.priceMax as number) || 9999;
        },
    });

    // When the filter list changes (arrives from ProductGrid re-fetch), initialise
    // any NEW filter keys to collapsed while keeping existing accordion states.
    // Also collapse any filter that currently has no selections.
    // onUpdate fires on initial mount too, so no separate onMount is needed.
    onUpdate(() => {
        const currentExp = state.expandedFilters as Record<string, boolean>;
        const open = props.collapsed === false;
        const nextExp: Record<string, boolean> = { ...currentExp };
        let changed = false;
        ((props.filters as AttributeFilter[]) || []).forEach((f: AttributeFilter) => {
            const n = f?.attributeDescription?.name;
            if (n && nextExp[n] === undefined) {
                nextExp[n] = open;
                changed = true;
            }
        });
        const sel = state.selectedFilters as Record<string, string[]>;
        Object.keys(nextExp).forEach((k: string) => {
            if (nextExp[k] && !(sel[k] || []).length) {
                nextExp[k] = false;
                changed = true;
            }
        });
        if (changed) state.expandedFilters = nextExp;
    }, [props.filters]);

    // Sync price bounds when parent updates them (e.g. after a new fetch)
    onUpdate(() => {
        state.currentMin = (props.priceMin as number) || 0;
        state.currentMax = (props.priceMax as number) || 9999;
    }, [props.priceMin, props.priceMax]);

    // External clear signal — resets checkboxes and price inputs without a page reload.
    // Fired when GridToolbar's "Clear All" is clicked via the parent's clearSignal counter.
    onUpdate(() => {
        if (props.clearSignal === undefined) return;
        state.selectedFilters = {};
        state.currentMin = (props.priceMin as number) || 0;
        state.currentMax = (props.priceMax as number) || 9999;
        state.expandedFilters = {};
    }, [props.clearSignal]);

    // Sync internal checkbox state when active filters change externally (e.g. filter chip removed in toolbar)
    onUpdate(() => {
        if (!props.activeTextFilters) return;
        state.selectedFilters = props.activeTextFilters as Record<string, string[]>;
    }, [props.activeTextFilters]);

    return (
        <div className={`space-y-4 ${(props.isMobile as boolean) ? 'pb-8' : 'sticky top-24'} ${(props.className as string) || ''}`}>

            {/* ── Active filter count + clear ─────────────────────── */}
            {/* <Show when={state.hasActiveFilters()}>
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-700">
                        {state.getSelectedCount()} active
                    </span>
                    <button
                        type="button"
                        onClick={() => state.clearAll()}
                        className="text-xs font-medium text-secondary hover:text-secondary transition-colors"
                    >
                        Clear all
                    </button>
                </div>
            </Show> */}

            {/* ── Price range ─────────────────────────────────────── */}
            <Show when={state.showPriceFilter() && (props.priceMin !== undefined || props.priceMax !== undefined)}>
                <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Price Range
                    </h3>

                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
                            <input
                                type="number"
                                value={state.currentMin}
                                min={state.getMinBound()}
                                max={state.getMaxBound()}
                                onChange={(e: any) => state.handleMinChange(parseFloat(e.target.value) || 0)}
                                onBlur={() => state.applyPrice()}
                                className="w-full pl-6 pr-2 h-8 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                            />
                        </div>
                        <span className="text-gray-400 text-sm select-none">–</span>
                        <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">€</span>
                            <input
                                type="number"
                                value={state.currentMax}
                                min={state.getMinBound()}
                                max={state.getMaxBound()}
                                onChange={(e: any) => state.handleMaxChange(parseFloat(e.target.value) || 0)}
                                onBlur={() => state.applyPrice()}
                                className="w-full pl-6 pr-2 h-8 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                            />
                        </div>
                    </div>

                    {/* Dual range slider */}
                    <div className="relative h-4 pt-1">
                        <input
                            type="range"
                            min={state.getMinBound()}
                            max={state.getMaxBound()}
                            value={state.currentMin}
                            onChange={(e: any) => { state.handleMinChange(parseFloat(e.target.value)); state.applyPrice(); }}
                            className="absolute w-full h-1.5 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:cursor-pointer z-20"
                        />
                        <input
                            type="range"
                            min={state.getMinBound()}
                            max={state.getMaxBound()}
                            value={state.currentMax}
                            onChange={(e: any) => { state.handleMaxChange(parseFloat(e.target.value)); state.applyPrice(); }}
                            className="absolute w-full h-1.5 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:cursor-pointer z-20"
                        />
                        <div className="absolute top-1.5 left-0 right-0 h-1.5 bg-gray-200 rounded z-10" />
                    </div>
                </div>

                <div className="h-px bg-gray-100" />
            </Show>

            {/* ── No filters message ───────────────────────────── */}
            <Show when={(props.filters as AttributeFilter[]).length === 0}>
                <p className="text-sm text-gray-400 italic">No filters available</p>
            </Show>

            {/* ── Attribute filter accordions ──────────────────── */}
            <For each={state.getFilteredFilters()}>
                {(filter: AttributeFilter) => (
                    <div key={state.getFilterName(filter)} className="border-b border-gray-100 pb-3 last:border-b-0">
                        {/* Header */}
                        <button
                            type="button"
                            onClick={() => state.toggleAccordion(state.getFilterName(filter))}
                            className="w-full flex items-center justify-between gap-2 text-left py-1 hover:text-secondary transition-colors"
                        >
                            <span className="text-sm font-semibold text-gray-700 truncate">
                                {state.getFilterTitle(filter)}
                            </span>
                            <svg
                                className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${state.isExpanded(state.getFilterName(filter)) ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Options */}
                        <Show when={state.isExpanded(state.getFilterName(filter))}>
                            <div className="pt-2 space-y-1.5">
                                <For each={state.getValidOptions(filter)}>
                                    {(option: any) => (
                                        <label key={option.value} className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={state.isSelected(state.getFilterName(filter), option.value)}
                                                onChange={(e: any) => state.handleCheckbox(filter, option.value, e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary cursor-pointer flex-shrink-0"
                                            />
                                            <span className="flex-1 text-sm text-gray-600 leading-none select-none group-hover:text-gray-900">
                                                {option.value}
                                                <span className="ml-1 text-xs text-gray-400">
                                                    ({state.getCount(option)})
                                                </span>
                                            </span>
                                        </label>
                                    )}
                                </For>
                            </div>
                        </Show>
                    </div>
                )}
            </For>
        </div>
    );
}
