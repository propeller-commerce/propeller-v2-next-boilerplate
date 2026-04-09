import {
    useStore,
    Show,
    For,
} from '@builder.io/mitosis';
import {
    Category,
    LocalizedString,
} from 'propeller-sdk-v2';

export interface BreadcrumbsProps {
    /**
     * The category path from the category, product or cluster response.
     * Obtain from `category.categoryPath` or `product.category.categoryPath`.
     */
    categoryPath: Category[];

    /**
     * When true (default), the last item in the path is displayed as the
     * current page (non-clickable, aria-current="page").
     * When false, the last item is omitted.
     */
    showCurrent?: boolean;

    /**
     * When true (default), a "Home" link is prepended to the trail.
     */
    showHome?: boolean;

    /**
     * URL for the Home link. Defaults to '/'.
     */
    homeUrl?: string;

    /**
     * Language code used to resolve localised category names and slugs.
     * Defaults to 'NL'.
     */
    language?: string;

    /**
     * Custom URL builder for category links.
     * Receives the Category object and its zero-based index in the path.
     * When omitted, URLs default to `/category/{categoryId}/{slug}`.
     */
    getUrl?: (category: Category, index: number) => string;

    /**
     * Override any UI string.
     * Available keys: home, separator
     */
    labels?: Record<string, string>;

    /** Extra CSS class applied to the root element. */
    className?: string;

    /** Configuration object passed to the component */
    configuration?: any;
}

interface BreadcrumbsState {
    getItems: () => Category[];
    getDisplayItems: () => Category[];
    getCategoryName: (cat: Category) => string;
    getCategorySlug: (cat: Category) => string;
    getCategoryUrl: (cat: Category, index: number) => string;
    isCurrentItem: (index: number) => boolean;
    showSeparatorBefore: (index: number) => boolean;
    getLabel: (key: string, fallback: string) => string;
}

export default function Breadcrumbs(props: BreadcrumbsProps) {
    const state = useStore<BreadcrumbsState>({
        getItems(): Category[] {
            const path = (props.categoryPath as Category[]) || [];
            const baseId = props.configuration?.baseCategoryId;
            if (!baseId) return path;
            return path.filter((cat: Category) => cat.categoryId !== baseId);
        },

        getDisplayItems(): Category[] {
            const items = this.getItems();
            if (props.showCurrent === false && items.length > 0) {
                return items.slice(0, items.length - 1);
            }
            return items;
        },

        getCategoryName(cat: Category): string {
            const lang = (props.language as string) || 'NL';
            const match = cat.name?.find((n: LocalizedString) => n.language === lang);
            return match?.value || cat.name?.[0]?.value || '';
        },

        getCategorySlug(cat: Category): string {
            const lang = (props.language as string) || 'NL';
            const match = cat.slug?.find((s: LocalizedString) => s.language === lang);
            return match?.value || cat.slug?.[0]?.value || '';
        },

        getCategoryUrl(cat: Category, index: number): string {
            if (props.getUrl) {
                return (props.getUrl as (cat: Category, index: number) => string)(cat, index);
            }
            return props.configuration.urls.getCategoryUrl(cat, props.language);
        },

        isCurrentItem(index: number): boolean {
            if (props.showCurrent === false) return false;
            return index === this.getDisplayItems().length - 1;
        },

        showSeparatorBefore(index: number): boolean {
            // Show separator when Home precedes this item, or when a previous category item exists.
            return props.showHome !== false || index > 0;
        },

        getLabel(key: string, fallback: string): string {
            return (props.labels as Record<string, string>)?.[key] || fallback;
        },
    });

    return (
        <nav aria-label="Breadcrumb" className={`breadcrumbs ${(props.className as string) || ''}`}>
            <ol className="flex flex-wrap items-center text-sm text-muted-foreground">
                {/* Home */}
                <Show when={props.showHome !== false}>
                    <li className="flex items-center">
                        <a
                            href={(props.homeUrl as string) || '/'}
                            className="hover:text-foreground transition-colors"
                        >
                            {state.getLabel('home', 'Home')}
                        </a>
                    </li>
                </Show>

                {/* Category items */}
                <For each={state.getDisplayItems()}>
                    {(cat: Category, index: number) => (
                        <li key={cat.categoryId || index} className="flex items-center">
                            {/* Separator */}
                            <Show when={state.showSeparatorBefore(index)}>
                                <span aria-hidden="true" className="mx-2 select-none text-muted-foreground/40">
                                    {state.getLabel('separator', '/')}
                                </span>
                            </Show>

                            {/* Current page — last item, non-clickable */}
                            <Show when={state.isCurrentItem(index)}>
                                {/* <span aria-current="page" className="font-medium text-foreground">
                                    {state.getCategoryName(cat)}
                                </span> */}
                                <a
                                    href={state.getCategoryUrl(cat, index)}
                                    className="hover:text-foreground transition-colors"
                                >
                                    {state.getCategoryName(cat)}
                                </a>
                            </Show>

                            {/* Ancestor link */}
                            <Show when={!state.isCurrentItem(index)}>
                                <a
                                    href={state.getCategoryUrl(cat, index)}
                                    className="hover:text-foreground transition-colors"
                                >
                                    {state.getCategoryName(cat)}
                                </a>
                            </Show>
                        </li>
                    )}
                </For>
            </ol>
        </nav>
    );
}
