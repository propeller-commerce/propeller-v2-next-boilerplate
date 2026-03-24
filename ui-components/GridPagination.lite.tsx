import {
    useStore,
    Show,
    For,
} from '@builder.io/mitosis';
import { ProductsResponse } from 'propeller-sdk-v2';

// Built-in label defaults (can be overridden via the labels prop).
const DEFAULT_LABELS: Record<string, string> = {
    previous: 'Previous',
    next: 'Next',
    page: 'Page',
    of: 'of',
};

export interface GridPaginationProps {
    /**
     * A ProductsResponse object for populating the pagination component.
     * Reads `page` (current page), `pages` (total pages) from the response.
     */
    products: ProductsResponse;

    /**
     * Called when the user navigates to a different page.
     * Receives the newly selected page number (1-based).
     */
    onPageChange: (page: number) => void;

    /**
     * Pagination display variant.
     * 'compact' — Previous / "Page X of Y" / Next.
     * 'full'    — numbered page buttons with ellipsis collapsing + Previous / Next.
     * Defaults to 'compact'.
     */
    variant?: string;

    /**
     * Number of visible page buttons rendered around the current page in 'full' style.
     * Defaults to 5.
     */
    siblingCount?: number;

    /**
     * Label overrides for the text inside the component.
     * Supported keys: previous, next, page, of
     */
    labels?: Record<string, string>;

    /** Extra CSS class applied to the root element. */
    className?: string;
}

/** Single item in the computed full-style page list. */
interface PageItem {
    /** 'page' renders a numbered button; 'dots' renders an ellipsis spacer. */
    type: string;
    /** Page number for 'page' items; negative unique sentinel for 'dots' items. */
    value: number;
}

interface GridPaginationState {
    getLabel: (key: string) => string;
    getTotalPages: () => number;
    getCurrentPage: () => number;
    showPagination: () => boolean;
    getFullPages: () => PageItem[];
    handlePageChange: (page: number) => void;
}

export default function GridPagination(props: GridPaginationProps) {
    const state = useStore<GridPaginationState>({

        getLabel(key: string): string {
            const labels = (props.labels as Record<string, string>) || {};
            return labels[key] !== undefined
                ? labels[key]
                : (DEFAULT_LABELS[key] || key);
        },

        getTotalPages(): number {
            return (props.products as ProductsResponse)?.pages || 1;
        },

        getCurrentPage(): number {
            return (props.products as ProductsResponse)?.page || 1;
        },

        showPagination(): boolean {
            return state.getTotalPages() > 1;
        },

        /**
         * Computes the ordered list of items (numbered buttons + ellipsis spacers)
         * to render in 'full' style.
         *
         * Algorithm:
         *   • Always show page 1 and the last page.
         *   • Show `siblingCount` pages centred on the current page.
         *   • Collapse gaps larger than 1 with a '...' spacer.
         *   • If all pages fit within siblingCount + 4 slots, show every page.
         */
        getFullPages(): PageItem[] {
            const total = state.getTotalPages();
            const current = state.getCurrentPage();
            const sibling = (props.siblingCount as number) || 5;

            // All pages fit without collapsing — show them all.
            if (total <= sibling + 4) {
                const items: PageItem[] = [];
                for (let i = 1; i <= total; i++) items.push({ type: 'page', value: i });
                return items;
            }

            // Compute sibling window, always staying inside [2, total-1].
            const halfSib = Math.floor(sibling / 2);
            let rangeStart = Math.max(2, current - halfSib);
            let rangeEnd = Math.min(total - 1, current + halfSib);

            // Stretch the range to ensure exactly siblingCount slots when near an edge.
            if (rangeEnd - rangeStart + 1 < sibling) {
                if (rangeStart === 2) {
                    rangeEnd = Math.min(total - 1, rangeStart + sibling - 1);
                } else {
                    rangeStart = Math.max(2, rangeEnd - sibling + 1);
                }
            }

            const items: PageItem[] = [];

            // First page
            items.push({ type: 'page', value: 1 });

            // Left ellipsis (value -1 is a unique sentinel)
            if (rangeStart > 2) items.push({ type: 'dots', value: -1 });

            // Sibling window
            for (let i = rangeStart; i <= rangeEnd; i++) {
                items.push({ type: 'page', value: i });
            }

            // Right ellipsis (value -2 is a unique sentinel)
            if (rangeEnd < total - 1) items.push({ type: 'dots', value: -2 });

            // Last page
            items.push({ type: 'page', value: total });

            return items;
        },

        handlePageChange(page: number) {
            if (props.onPageChange) props.onPageChange(page);
        },
    });

    return (
        <div className={`${(props.className as string) || ''}`}>
            <Show when={state.showPagination()}>

                {/* ── Compact style ──────────────────────────────────────────────── */}
                <Show when={((props.variant as string) || 'compact') === 'compact'}>
                    <div className="flex justify-center items-center gap-2">
                        <button
                            type="button"
                            disabled={state.getCurrentPage() === 1}
                            onClick={() => state.handlePageChange(state.getCurrentPage() - 1)}
                            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {state.getLabel('previous')}
                        </button>

                        <span className="px-2 text-sm font-medium text-gray-700">
                            {state.getLabel('page')}&nbsp;{state.getCurrentPage()}&nbsp;{state.getLabel('of')}&nbsp;{state.getTotalPages()}
                        </span>

                        <button
                            type="button"
                            disabled={state.getCurrentPage() === state.getTotalPages()}
                            onClick={() => state.handlePageChange(state.getCurrentPage() + 1)}
                            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {state.getLabel('next')}
                        </button>
                    </div>
                </Show>

                {/* ── Full style ─────────────────────────────────────────────────── */}
                <Show when={((props.variant as string) || 'compact') === 'full'}>
                    <div className="flex justify-center items-center gap-1 flex-wrap">
                        <button
                            type="button"
                            disabled={state.getCurrentPage() === 1}
                            onClick={() => state.handlePageChange(state.getCurrentPage() - 1)}
                            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {state.getLabel('previous')}
                        </button>

                        <For each={state.getFullPages()}>
                            {(item: PageItem, idx: number) => (
                                <div key={item.type === 'dots' ? `dots-${idx}` : `page-${item.value}`} className="inline-flex">
                                    <Show when={item.type === 'dots'}>
                                        <span className="inline-flex items-center justify-center min-w-[2rem] px-1 py-2 text-sm text-gray-500 select-none">
                                            ...
                                        </span>
                                    </Show>
                                    <Show when={item.type === 'page'}>
                                        <button
                                            type="button"
                                            onClick={() => state.handlePageChange(item.value)}
                                            className={
                                                item.value === state.getCurrentPage()
                                                    ? 'inline-flex items-center justify-center min-w-[2.25rem] rounded-md border border-primary bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm'
                                                    : 'inline-flex items-center justify-center min-w-[2.25rem] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50'
                                            }
                                        >
                                            {item.value}
                                        </button>
                                    </Show>
                                </div>
                            )}
                        </For>

                        <button
                            type="button"
                            disabled={state.getCurrentPage() === state.getTotalPages()}
                            onClick={() => state.handlePageChange(state.getCurrentPage() + 1)}
                            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {state.getLabel('next')}
                        </button>
                    </div>
                </Show>

            </Show>
        </div>
    );
}
