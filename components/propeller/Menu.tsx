'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import { GraphQLClient, Category, LocalizedString, Contact, Customer } from 'propeller-sdk-v2';

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
  prevUserKey: string;
  fetchMenu: () => Promise<void>;
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

  const [prevUserKey, setPrevUserKey] = useState<MenuState['prevUserKey']>(() => '');

  async function fetchMenu(): ReturnType<MenuState['fetchMenu']> {
    if (!props.graphqlClient) return;

    // Try cache first
    const cached = getCachedMenu();
    if (cached) {
      setRootCategory(cached);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setHasError(false);
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
      const variables = {
        categoryId: props.categoryId as number,
        language,
      };
      const response = await (props.graphqlClient as GraphQLClient).execute({
        query: gql,
        variables,
      });
      const menuData = (response as any)?.data || response;
      const root = (menuData as any)?.category || null;
      setRootCategory(root as Category);
      if (root) {
        cacheMenu(root as Category);
      }
    } catch {
      setHasError(true);
      setRootCategory(null);
    } finally {
      setIsLoading(false);
    }
  }

  function getCacheKey(): ReturnType<MenuState['getCacheKey']> {
    const lang = (props.language as string) || 'NL';
    return `propeller_menu_${props.categoryId}_${lang}`;
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
    return props.configuration.urls.getCategoryUrl(cat);
  }

  function getSubCategories(cat: Category): ReturnType<MenuState['getSubCategories']> {
    const subs = (cat as any).categories || [];
    return subs.filter((sub: Category) => {
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
    fetchMenu();
  }, [props.graphqlClient, props.categoryId, props.language]);
  useEffect(() => {
    const userKey: string = props.user ? 'auth' : 'anon';
    if (prevUserKey !== '' && prevUserKey !== userKey) {
      clearCache();
      fetchMenu();
    }
    setPrevUserKey(userKey);
  }, [props.user]);

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
        <nav className={`propeller-menu-dropdown ${(props.menuClass as string) || ''}`}>
          <ul className="bg-popover border border-border shadow-lg w-64 py-1">
            {getSubCategories(rootCategory as Category)?.map((l1, idx) => (
              <li
                className="relative"
                key={l1.categoryId || idx}
                onMouseEnter={(event) => setHoveredL1(l1.categoryId)}
                onMouseLeave={(event) => setHoveredL1(null)}
              >
                <a
                  className="flex items-center justify-between px-4 py-2.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  href={getCategoryUrl(l1)}
                  onClick={(e) => handleItemClick(l1, e)}
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
                {hoveredL1Id === l1.categoryId && getSubCategories(l1).length > 0 ? (
                  <div className="absolute left-full top-0 bottom-0 -ml-1 pl-1 z-50">
                    <ul className="bg-popover border border-border shadow-lg w-64 py-1 min-h-full">
                      {getSubCategories(l1)?.map((l2, idx2) => (
                        <li
                          className="relative"
                          key={l2.categoryId || idx2}
                          onMouseEnter={(event) => setHoveredL2(l2.categoryId)}
                          onMouseLeave={(event) => setHoveredL2(null)}
                        >
                          <a
                            className="flex items-center justify-between px-4 py-2.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            href={getCategoryUrl(l2)}
                            onClick={(e) => handleItemClick(l2, e)}
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
                          {hoveredL2Id === l2.categoryId && getSubCategories(l2).length > 0 ? (
                            <div className="absolute left-full top-0 bottom-0 -ml-1 pl-1 z-50">
                              <ul className="bg-popover border border-border shadow-lg w-64 py-1 min-h-full">
                                {getSubCategories(l2)?.map((l3, idx3) => (
                                  <li key={l3.categoryId || idx3}>
                                    <a
                                      className="block px-4 py-2.5 text-sm text-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                                      href={getCategoryUrl(l3)}
                                      onClick={(e) => handleItemClick(l3, e)}
                                    >
                                      {getCategoryName(l3)}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {!isLoading &&
      !hasError &&
      rootCategory !== null &&
      getSubCategories(rootCategory as Category).length > 0 &&
      getMenuStyle() === 'jumbotron' ? (
        <nav className={`propeller-menu-jumbotron ${(props.menuClass as string) || ''}`}>
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
    </div>
  );
}

export default Menu;
