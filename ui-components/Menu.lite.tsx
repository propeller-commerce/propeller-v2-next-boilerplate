import {
    useStore,
    Show,
    For,
    onUpdate,
} from '@builder.io/mitosis';
import {
    GraphQLClient,
    Category,
    LocalizedString,
} from 'propeller-sdk-v2';

export interface MenuProps {
    /**
     * Initialised Propeller SDK GraphQL client.
     * Used internally to fetch the category hierarchy.
     */
    graphqlClient: GraphQLClient;

    /**
     * Base category ID for fetching all categories.
     * This is the root of the menu tree.
     */
    categoryId: number;

    /**
     * Language code for fetching localised category names and slugs.
     */
    language: string;

    /**
     * Maximum nesting depth of the menu hierarchy.
     * Defaults to 3.
     */
    depth?: number;

    /**
     * CSS class applied to the menu container element.
     */
    menuClass?: string;

    /**
     * Main menu display type.
     * - 'dropdown-vertical': nested flyout panels on hover (default)
     * - 'jumbotron': full-width mega-menu panel showing all subcategories
     */
    menuStyle?: string;

    /**
     * URL pattern for category links.
     * Use `{categoryId}` and `{slug}` as placeholders.
     * Defaults to 'category/{categoryId}/{slug}'.
     */
    menuLinkFormat?: string;

    /**
     * Called when a menu item is clicked.
     * Use for SPA-style routing instead of full-page navigation.
     */
    onMenuItemClick: (category: Category) => void;

    /**
     * Override any UI string.
     * Available keys: loading, error, empty
     */
    labels?: Record<string, string>;

    /**
     * Enable localStorage caching for the menu tree.
     * Useful for anonymous users to avoid re-fetching on every page load.
     * Defaults to false.
     */
    cacheEnabled?: boolean;

    /**
     * Cache duration in milliseconds.
     * Only used when cacheEnabled is true.
     * Defaults to 43200000 (12 hours).
     */
    cacheDuration?: number;

    /** Extra CSS class applied to the root element. */
    className?: string;
}

interface MenuState {
    rootCategory: Category | null;
    isLoading: boolean;
    hasError: boolean;
    hoveredL1Id: number | null;
    hoveredL2Id: number | null;
    fetchMenu: () => Promise<void>;
    getCacheKey: () => string;
    getCachedMenu: () => Category | null;
    cacheMenu: (data: Category) => void;
    getCategoryName: (cat: Category) => string;
    getCategorySlug: (cat: Category) => string;
    getCategoryUrl: (cat: Category) => string;
    getSubCategories: (cat: Category) => Category[];
    handleItemClick: (cat: Category, e: any) => void;
    setHoveredL1: (id: number | null) => void;
    setHoveredL2: (id: number | null) => void;
    getLabel: (key: string, fallback: string) => string;
    getMenuStyle: () => string;
    getLinkFormat: () => string;
}

export default function Menu(props: MenuProps) {
    const state = useStore<MenuState>({
        rootCategory: null,
        isLoading: true,
        hasError: false,
        hoveredL1Id: null,
        hoveredL2Id: null,

        async fetchMenu() {
            if (!props.graphqlClient) return;

            // Try cache first
            if (props.cacheEnabled) {
                const cached = state.getCachedMenu();
                if (cached) {
                    state.rootCategory = cached;
                    state.isLoading = false;
                    return;
                }
            }

            state.isLoading = true;
            state.hasError = false;
            try {
                const depth = (props.depth as number) || 3;
                const language = (props.language as string) || 'NL';

                const buildCategoriesQuery = (currentDepth: number): string => {
                    if (currentDepth === 0) return '';
                    return `
                        categories {
                            categoryId
                            name(language: $language) { value language }
                            slug(language: $language) { value }
                            ${buildCategoriesQuery(currentDepth - 1)}
                        }
                    `;
                };

                const gql = `
                    query Menu($categoryId: Float, $language: String) {
                        category(categoryId: $categoryId) {
                            categoryId
                            name(language: $language) { value language }
                            slug(language: $language) { value }
                            ${buildCategoriesQuery(depth)}
                        }
                    }
                `;

                const variables = { categoryId: props.categoryId as number, language };
                const response = await (props.graphqlClient as GraphQLClient).execute({ query: gql, variables });
                const menuData = (response as any)?.data || response;
                const root = (menuData as any)?.category || null;
                state.rootCategory = root as Category;

                if (props.cacheEnabled && root) {
                    state.cacheMenu(root as Category);
                }
            } catch {
                state.hasError = true;
                state.rootCategory = null;
            } finally {
                state.isLoading = false;
            }
        },

        getCacheKey(): string {
            const lang = (props.language as string) || 'NL';
            return `propeller_menu_${props.categoryId}_${lang}`;
        },

        getCachedMenu(): Category | null {
            if (typeof window === 'undefined') return null;
            try {
                const raw = localStorage.getItem(state.getCacheKey());
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                const duration = (props.cacheDuration as number) || 43200000;
                if (parsed.expires > Date.now()) {
                    return parsed.data as Category;
                }
                localStorage.removeItem(state.getCacheKey());
            } catch {
                // ignore
            }
            return null;
        },

        cacheMenu(data: Category) {
            if (typeof window === 'undefined') return;
            try {
                const duration = (props.cacheDuration as number) || 43200000;
                localStorage.setItem(state.getCacheKey(), JSON.stringify({
                    data,
                    expires: Date.now() + duration,
                }));
            } catch {
                // ignore — quota exceeded etc.
            }
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

        getCategoryUrl(cat: Category): string {
            const format = state.getLinkFormat();
            const slug = state.getCategorySlug(cat);
            return '/' + format
                .replace('{categoryId}', String(cat.categoryId))
                .replace('{slug}', slug);
        },

        getSubCategories(cat: Category): Category[] {
            const subs = (cat as any).categories || [];
            return subs.filter((sub: Category) => {
                const name = state.getCategoryName(sub);
                const slug = state.getCategorySlug(sub);
                return name && slug;
            });
        },

        handleItemClick(cat: Category, e: any) {
            if (props.onMenuItemClick) {
                e.preventDefault();
                (props.onMenuItemClick as (cat: Category) => void)(cat);
            }
        },

        setHoveredL1(id: number | null) {
            state.hoveredL1Id = id;
            state.hoveredL2Id = null;
        },

        setHoveredL2(id: number | null) {
            state.hoveredL2Id = id;
        },

        getLabel(key: string, fallback: string): string {
            return (props.labels as Record<string, string>)?.[key] || fallback;
        },

        getMenuStyle(): string {
            return (props.menuStyle as string) || 'dropdown-vertical';
        },

        getLinkFormat(): string {
            return (props.menuLinkFormat as string) || 'category/{categoryId}/{slug}';
        },
    });

    onUpdate(() => {
        state.fetchMenu();
    }, [props.graphqlClient, props.categoryId, props.language]);

    return (
        <div className={`propeller-menu ${(props.className as string) || ''}`}>

            {/* Loading */}
            <Show when={state.isLoading}>
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{state.getLabel('loading', 'Loading menu...')}</span>
                </div>
            </Show>

            {/* Error */}
            <Show when={!state.isLoading && state.hasError}>
                <div className="px-4 py-3 text-sm text-destructive">
                    {state.getLabel('error', 'Failed to load menu')}
                </div>
            </Show>

            {/* Empty */}
            <Show when={!state.isLoading && !state.hasError && state.rootCategory !== null && state.getSubCategories(state.rootCategory as Category).length === 0}>
                <div className="px-4 py-3 text-sm text-muted-foreground">
                    {state.getLabel('empty', 'No categories found')}
                </div>
            </Show>

            {/* ── Dropdown Vertical ─────────────────────────────────── */}
            <Show when={!state.isLoading && !state.hasError && state.rootCategory !== null && state.getSubCategories(state.rootCategory as Category).length > 0 && state.getMenuStyle() === 'dropdown-vertical'}>
                <nav className={`propeller-menu-dropdown ${(props.menuClass as string) || ''}`}>
                    <ul className="bg-popover border border-border shadow-lg w-64 py-1">
                        <For each={state.getSubCategories(state.rootCategory as Category)}>
                            {(l1: Category, idx: number) => (
                                <li
                                    key={l1.categoryId || idx}
                                    className="relative"
                                    onMouseEnter={() => state.setHoveredL1(l1.categoryId)}
                                    onMouseLeave={() => state.setHoveredL1(null)}
                                >
                                    <a
                                        href={state.getCategoryUrl(l1)}
                                        onClick={(e) => state.handleItemClick(l1, e)}
                                        className="flex items-center justify-between px-4 py-2.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                    >
                                        <span className="font-medium truncate">{state.getCategoryName(l1)}</span>
                                        <Show when={state.getSubCategories(l1).length > 0}>
                                            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </Show>
                                    </a>

                                    {/* Level 2 flyout */}
                                    <Show when={state.hoveredL1Id === l1.categoryId && state.getSubCategories(l1).length > 0}>
                                        <div className="absolute left-full top-0 bottom-0 -ml-1 pl-1 z-50">
                                            <ul className="bg-popover border border-border shadow-lg w-64 py-1 min-h-full">
                                                <For each={state.getSubCategories(l1)}>
                                                    {(l2: Category, idx2: number) => (
                                                        <li
                                                            key={l2.categoryId || idx2}
                                                            className="relative"
                                                            onMouseEnter={() => state.setHoveredL2(l2.categoryId)}
                                                            onMouseLeave={() => state.setHoveredL2(null)}
                                                        >
                                                            <a
                                                                href={state.getCategoryUrl(l2)}
                                                                onClick={(e) => state.handleItemClick(l2, e)}
                                                                className="flex items-center justify-between px-4 py-2.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                                            >
                                                                <span className="truncate">{state.getCategoryName(l2)}</span>
                                                                <Show when={state.getSubCategories(l2).length > 0}>
                                                                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                    </svg>
                                                                </Show>
                                                            </a>

                                                            {/* Level 3 flyout */}
                                                            <Show when={state.hoveredL2Id === l2.categoryId && state.getSubCategories(l2).length > 0}>
                                                                <div className="absolute left-full top-0 bottom-0 -ml-1 pl-1 z-50">
                                                                    <ul className="bg-popover border border-border shadow-lg w-64 py-1 min-h-full">
                                                                        <For each={state.getSubCategories(l2)}>
                                                                            {(l3: Category, idx3: number) => (
                                                                                <li key={l3.categoryId || idx3}>
                                                                                    <a
                                                                                        href={state.getCategoryUrl(l3)}
                                                                                        onClick={(e) => state.handleItemClick(l3, e)}
                                                                                        className="block px-4 py-2.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                                                                    >
                                                                                        {state.getCategoryName(l3)}
                                                                                    </a>
                                                                                </li>
                                                                            )}
                                                                        </For>
                                                                    </ul>
                                                                </div>
                                                            </Show>
                                                        </li>
                                                    )}
                                                </For>
                                            </ul>
                                        </div>
                                    </Show>
                                </li>
                            )}
                        </For>
                    </ul>
                </nav>
            </Show>

            {/* ── Jumbotron / Mega Menu ─────────────────────────────── */}
            <Show when={!state.isLoading && !state.hasError && state.rootCategory !== null && state.getSubCategories(state.rootCategory as Category).length > 0 && state.getMenuStyle() === 'jumbotron'}>
                <nav className={`propeller-menu-jumbotron ${(props.menuClass as string) || ''}`}>
                    {/* Top-level tabs */}
                    <div className="flex items-center border-b border-border">
                        <For each={state.getSubCategories(state.rootCategory as Category)}>
                            {(l1: Category, idx: number) => (
                                <button
                                    key={l1.categoryId || idx}
                                    className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${state.hoveredL1Id === l1.categoryId ? 'border-primary text-primary' : 'border-transparent text-foreground hover:text-primary hover:border-primary/50'}`}
                                    onMouseEnter={() => state.setHoveredL1(l1.categoryId)}
                                    onClick={(e) => state.handleItemClick(l1, e)}
                                >
                                    {state.getCategoryName(l1)}
                                </button>
                            )}
                        </For>
                    </div>

                    {/* Mega panel — shows subcategories in a grid */}
                    <For each={state.getSubCategories(state.rootCategory as Category)}>
                        {(l1: Category, idx: number) => (
                            <Show key={l1.categoryId || idx} when={state.hoveredL1Id === l1.categoryId && state.getSubCategories(l1).length > 0}>
                                <div
                                    className="bg-popover border border-border border-t-0 shadow-lg p-6"
                                    onMouseEnter={() => state.setHoveredL1(l1.categoryId)}
                                    onMouseLeave={() => state.setHoveredL1(null)}
                                >
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                        <For each={state.getSubCategories(l1)}>
                                            {(l2: Category, idx2: number) => (
                                                <div key={l2.categoryId || idx2}>
                                                    <a
                                                        href={state.getCategoryUrl(l2)}
                                                        onClick={(e) => state.handleItemClick(l2, e)}
                                                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                                                    >
                                                        {state.getCategoryName(l2)}
                                                    </a>

                                                    <Show when={state.getSubCategories(l2).length > 0}>
                                                        <ul className="mt-2 space-y-1">
                                                            <For each={state.getSubCategories(l2)}>
                                                                {(l3: Category, idx3: number) => (
                                                                    <li key={l3.categoryId || idx3}>
                                                                        <a
                                                                            href={state.getCategoryUrl(l3)}
                                                                            onClick={(e) => state.handleItemClick(l3, e)}
                                                                            className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                                                        >
                                                                            {state.getCategoryName(l3)}
                                                                        </a>
                                                                    </li>
                                                                )}
                                                            </For>
                                                        </ul>
                                                    </Show>
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            </Show>
                        )}
                    </For>
                </nav>
            </Show>
        </div>
    );
}
