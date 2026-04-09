'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import { GraphQLClient, Category, LocalizedString, Contact, Customer } from 'propeller-sdk-v2';

// Module-level deduplication: concurrent fetches for the same cache key share one API call.
// Prevents duplicate requests from React Strict Mode and multiple Menu instances.
const inflightFetches = new Map<string, Promise<Category | null>>();

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
   * Authenticated user object. When user changes (login/logout),
   * the menu cache is cleared and the menu is re-fetched.
   */
  user?: Contact | Customer | null;

  /** Extra CSS class applied to the root element. */
  className?: string;

  /** Configuration object passed to the component */
  configuration?: any;
}
interface MenuState {
  rootCategory: Category | null;
  isLoading: boolean;
  hasError: boolean;
  hoveredL1Id: number | null;
  hoveredL2Id: number | null;
  expandedL1: number | null;
  expandedL2: number | null;
  getUserKey: () => string;
  getCacheKey: () => string;
  getCachedMenu: () => Category | null;
  cacheMenu: (data: Category) => void;
  clearCache: () => void;
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
function Menu(props: MenuProps) {
  const [rootCategory, setRootCategory] = useState<MenuState['rootCategory']>(() => null);
  const [isLoading, setIsLoading] = useState<MenuState['isLoading']>(() => true);
  const [hasError, setHasError] = useState<MenuState['hasError']>(() => false);
  const [hoveredL1Id, setHoveredL1Id] = useState<MenuState['hoveredL1Id']>(() => null);
  const [hoveredL2Id, setHoveredL2Id] = useState<MenuState['hoveredL2Id']>(() => null);
  const [expandedL1, setExpandedL1] = useState<MenuState['expandedL1']>(() => null);
  const [expandedL2, setExpandedL2] = useState<MenuState['expandedL2']>(() => null);
  function getUserKey(): ReturnType<MenuState['getUserKey']> {
    if (!props.user) return '';
    if ('contactId' in (props.user as any)) return `c${(props.user as Contact).contactId}`;
    return `u${(props.user as Customer).customerId}`;
  }
  function getCacheKey(): ReturnType<MenuState['getCacheKey']> {
    const lang = (props.language as string) || 'NL';
    const userKey = getUserKey();
    return `propeller_menu_${props.categoryId}_${lang}${userKey ? `_${userKey}` : ''}`;
  }
  function getCachedMenu(): ReturnType<MenuState['getCachedMenu']> {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(getCacheKey());
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed.expires > Date.now()) {
        return parsed.data as Category;
      }
      localStorage.removeItem(getCacheKey());
    } catch {
      // ignore
    }
    return null;
  }
  function cacheMenu(data: Category): ReturnType<MenuState['cacheMenu']> {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        getCacheKey(),
        JSON.stringify({
          data,
          expires: Date.now() + 43200000,
        })
      );
    } catch {
      // ignore — quota exceeded etc.
    }
  }
  function clearCache(): ReturnType<MenuState['clearCache']> {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(getCacheKey());
  }
  function getCategoryName(cat: Category): ReturnType<MenuState['getCategoryName']> {
    const lang = (props.language as string) || 'NL';
    const match = cat.name?.find((n: LocalizedString) => n.language === lang);
    return match?.value || cat.name?.[0]?.value || '';
  }
  function getCategorySlug(cat: Category): ReturnType<MenuState['getCategorySlug']> {
    const lang = (props.language as string) || 'NL';
    const match = cat.slug?.find((s: LocalizedString) => s.language === lang);
    return match?.value || cat.slug?.[0]?.value || '';
  }
  function getCategoryUrl(cat: Category): ReturnType<MenuState['getCategoryUrl']> {
    return props.configuration.urls.getCategoryUrl(cat, props.language);
  }
  function getSubCategories(cat: Category): ReturnType<MenuState['getSubCategories']> {
    const subs = (cat as any).categories || [];
    return subs.filter((sub: Category) => {
      if ((sub as any).hidden === 'Y' || (sub as any).hidden === true) return false;
      const name = getCategoryName(sub);
      const slug = getCategorySlug(sub);
      return name && slug;
    });
  }
  function handleItemClick(cat: Category, e: any): ReturnType<MenuState['handleItemClick']> {
    if (props.onMenuItemClick) {
      e.preventDefault();
      (props.onMenuItemClick as (cat: Category) => void)(cat);
    }
  }
  function setHoveredL1(id: number | null): ReturnType<MenuState['setHoveredL1']> {
    setHoveredL1Id(id);
    setHoveredL2Id(null);
  }
  function setHoveredL2(id: number | null): ReturnType<MenuState['setHoveredL2']> {
    setHoveredL2Id(id);
  }
  function getLabel(key: string, fallback: string): ReturnType<MenuState['getLabel']> {
    return (props.labels as Record<string, string>)?.[key] || fallback;
  }
  function getMenuStyle(): ReturnType<MenuState['getMenuStyle']> {
    return (props.menuStyle as string) || 'dropdown-vertical';
  }
  function getLinkFormat(): ReturnType<MenuState['getLinkFormat']> {
    return props.configuration.urls.pattern;
  }
  useEffect(() => {
    let cancelled = false;
    if (!props.graphqlClient) return;

    // Try cache first
    const cached = getCachedMenu();
    if (cached) {
      setRootCategory(cached);
      setIsLoading(false);
      return;
    }

    const key = getCacheKey();

    setIsLoading(true);
    setHasError(false);

    // Deduplicate: if an identical fetch is already in flight, reuse it
    if (!inflightFetches.has(key)) {
      const depth = (props.depth as number) || 3;
      const language = (props.language as string) || 'NL';
      const buildCategoriesQuery = (currentDepth: number): string => {
        if (currentDepth === 0) return '';
        return `
                        categories {
                            categoryId
                            hidden
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
                            hidden
                            name(language: $language) { value language }
                            slug(language: $language) { value }
                            ${buildCategoriesQuery(depth)}
                        }
                    }
                `;
      const variables: Record<string, any> = {
        categoryId: props.categoryId as number,
        language,
      };
      if (props.user) {
        if ('contactId' in (props.user as any)) {
          variables.contactId = (props.user as Contact).contactId;
        } else {
          variables.customerId = (props.user as Customer).customerId;
        }
      }

      const fetchPromise = (props.graphqlClient as GraphQLClient)
        .execute({ query: gql, variables })
        .then((response) => {
          const menuData = (response as any)?.data || response;
          return ((menuData as any)?.category || null) as Category | null;
        })
        .finally(() => {
          inflightFetches.delete(key);
        });

      inflightFetches.set(key, fetchPromise);
    }

    inflightFetches.get(key)!
      .then((root) => {
        if (cancelled) return;
        setRootCategory(root as Category);
        if (root) {
          cacheMenu(root as Category);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setHasError(true);
        setRootCategory(null);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [props.graphqlClient, props.categoryId, props.language, props.user]);
  return (
    <div className={`propeller-menu ${(props.className as string) || ''}`}>
      {isLoading ? (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          <span>{getLabel('loading', 'Loading menu...')}</span>
        </div>
      ) : null}
      {!isLoading && hasError ? (
        <div className="px-4 py-3 text-sm text-destructive">
          {getLabel('error', 'Failed to load menu')}
        </div>
      ) : null}
      {!isLoading &&
      !hasError &&
      rootCategory !== null &&
      getSubCategories(rootCategory as Category).length === 0 ? (
        <div className="px-4 py-3 text-sm text-muted-foreground">
          {getLabel('empty', 'No categories found')}
        </div>
      ) : null}
      {!isLoading &&
      !hasError &&
      rootCategory !== null &&
      getSubCategories(rootCategory as Category).length > 0 &&
      getMenuStyle() === 'dropdown-vertical' ? (
        <nav
          className={`propeller-menu-dropdown hidden md:block ${(props.menuClass as string) || ''}`}
        >
          <div className="flex bg-popover border border-border shadow-lg">
            <ul className="w-64 py-1 border-r border-border flex-shrink-0">
              {getSubCategories(rootCategory as Category)?.map((l1, idx) => (
                <li
                  key={l1.categoryId || idx}
                  onMouseEnter={(event) => setHoveredL1(l1.categoryId)}
                >
                  <a
                    href={getCategoryUrl(l1)}
                    onClick={(e) => handleItemClick(l1, e)}
                    className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${hoveredL1Id === l1.categoryId ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'}`}
                  >
                    <span className="font-medium truncate">{getCategoryName(l1)}</span>
                    {getSubCategories(l1).length > 0 ? (
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        className="w-4 h-4 text-muted-foreground"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                          strokeWidth={2}
                        />
                      </svg>
                    ) : null}
                  </a>
                </li>
              ))}
            </ul>
            {getSubCategories(rootCategory as Category)?.map((l1, idx) =>
              hoveredL1Id === l1.categoryId && getSubCategories(l1).length > 0 ? (
                <ul className="w-64 py-1 border-r border-border flex-shrink-0">
                  {getSubCategories(l1)?.map((l2, idx2) => (
                    <li
                      key={l2.categoryId || idx2}
                      onMouseEnter={(event) => setHoveredL2(l2.categoryId)}
                    >
                      <a
                        href={getCategoryUrl(l2)}
                        onClick={(e) => handleItemClick(l2, e)}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${hoveredL2Id === l2.categoryId ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/50'}`}
                      >
                        <span className="truncate">{getCategoryName(l2)}</span>
                        {getSubCategories(l2).length > 0 ? (
                          <svg
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            className="w-4 h-4 text-muted-foreground"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 5l7 7-7 7"
                              strokeWidth={2}
                            />
                          </svg>
                        ) : null}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null
            )}
            {getSubCategories(rootCategory as Category)?.map((l1) =>
              hoveredL1Id === l1.categoryId ? (
                <>
                  {getSubCategories(l1)?.map((l2) =>
                    hoveredL2Id === l2.categoryId && getSubCategories(l2).length > 0 ? (
                      <ul className="w-64 py-1 flex-shrink-0">
                        {getSubCategories(l2)?.map((l3, idx3) => (
                          <li key={l3.categoryId || idx3}>
                            <a
                              className="block px-4 py-2.5 text-sm text-foreground hover:bg-accent/50 transition-colors"
                              href={getCategoryUrl(l3)}
                              onClick={(e) => handleItemClick(l3, e)}
                            >
                              {getCategoryName(l3)}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null
                  )}
                </>
              ) : null
            )}
          </div>
        </nav>
      ) : null}
      {!isLoading &&
      !hasError &&
      rootCategory !== null &&
      getSubCategories(rootCategory as Category).length > 0 &&
      getMenuStyle() === 'jumbotron' ? (
        <nav
          className={`propeller-menu-jumbotron hidden md:block ${(props.menuClass as string) || ''}`}
        >
          <div className="flex items-center border-b border-border">
            {getSubCategories(rootCategory as Category)?.map((l1, idx) => (
              <button
                key={l1.categoryId || idx}
                onMouseEnter={(event) => setHoveredL1(l1.categoryId)}
                onClick={(e) => handleItemClick(l1, e)}
                className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${hoveredL1Id === l1.categoryId ? 'border-primary text-primary' : 'border-transparent text-foreground hover:text-primary hover:border-primary/50'}`}
              >
                {getCategoryName(l1)}
              </button>
            ))}
          </div>
          {getSubCategories(rootCategory as Category)?.map((l1, idx) =>
            hoveredL1Id === l1.categoryId && getSubCategories(l1).length > 0 ? (
              <div
                className="bg-popover border border-border border-t-0 shadow-lg p-6"
                onMouseEnter={(event) => setHoveredL1(l1.categoryId)}
                onMouseLeave={(event) => setHoveredL1(null)}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {getSubCategories(l1)?.map((l2, idx2) => (
                    <div key={l2.categoryId || idx2}>
                      <a
                        className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                        href={getCategoryUrl(l2)}
                        onClick={(e) => handleItemClick(l2, e)}
                      >
                        {getCategoryName(l2)}
                      </a>
                      {getSubCategories(l2).length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {getSubCategories(l2)?.map((l3, idx3) => (
                            <li key={l3.categoryId || idx3}>
                              <a
                                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                                href={getCategoryUrl(l3)}
                                onClick={(e) => handleItemClick(l3, e)}
                              >
                                {getCategoryName(l3)}
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </nav>
      ) : null}
      {!isLoading &&
      !hasError &&
      rootCategory !== null &&
      getSubCategories(rootCategory as Category).length > 0 ? (
        <nav className={`propeller-menu-mobile md:hidden ${(props.menuClass as string) || ''}`}>
          <ul className="divide-y divide-border">
            {getSubCategories(rootCategory as Category)?.map((l1, idx) => (
              <li key={l1.categoryId || idx}>
                <div className="flex items-center">
                  <a
                    className="flex-1 px-4 py-3 text-sm font-medium text-foreground"
                    href={getCategoryUrl(l1)}
                    onClick={(e) => handleItemClick(l1, e)}
                  >
                    {getCategoryName(l1)}
                  </a>
                  {getSubCategories(l1).length > 0 ? (
                    <button
                      type="button"
                      className="px-4 py-3 text-muted-foreground"
                      onClick={(event) => {
                        setExpandedL1(expandedL1 === l1.categoryId ? null : l1.categoryId);
                      }}
                    >
                      <svg
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        className={`w-4 h-4 transition-transform ${expandedL1 === l1.categoryId ? 'rotate-180' : ''}`}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m6 9 6 6 6-6"
                          strokeWidth={2}
                        />
                      </svg>
                    </button>
                  ) : null}
                </div>
                {expandedL1 === l1.categoryId && getSubCategories(l1).length > 0 ? (
                  <ul className="bg-accent/30">
                    {getSubCategories(l1)?.map((l2, idx2) => (
                      <li key={l2.categoryId || idx2}>
                        <div className="flex items-center">
                          <a
                            className="flex-1 pl-8 pr-4 py-2.5 text-sm text-foreground"
                            href={getCategoryUrl(l2)}
                            onClick={(e) => handleItemClick(l2, e)}
                          >
                            {getCategoryName(l2)}
                          </a>
                          {getSubCategories(l2).length > 0 ? (
                            <button
                              type="button"
                              className="px-4 py-2.5 text-muted-foreground"
                              onClick={(event) => {
                                setExpandedL2(expandedL2 === l2.categoryId ? null : l2.categoryId);
                              }}
                            >
                              <svg
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                className={`w-3.5 h-3.5 transition-transform ${expandedL2 === l2.categoryId ? 'rotate-180' : ''}`}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m6 9 6 6 6-6"
                                  strokeWidth={2}
                                />
                              </svg>
                            </button>
                          ) : null}
                        </div>
                        {expandedL2 === l2.categoryId && getSubCategories(l2).length > 0 ? (
                          <ul className="bg-accent/20">
                            {getSubCategories(l2)?.map((l3, idx3) => (
                              <li key={l3.categoryId || idx3}>
                                <a
                                  className="block pl-12 pr-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                  href={getCategoryUrl(l3)}
                                  onClick={(e) => handleItemClick(l3, e)}
                                >
                                  {getCategoryName(l3)}
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}

export default Menu;
