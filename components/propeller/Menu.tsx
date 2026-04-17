'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import { GraphQLClient, Category, Contact, Customer } from 'propeller-sdk-v2';
import { useMenu, MenuCategory } from '@/composables/react/useMenu';

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

function Menu(props: MenuProps) {
  const [hoveredL1Id, setHoveredL1Id] = useState<number | null>(null);
  const [hoveredL2Id, setHoveredL2Id] = useState<number | null>(null);
  const [expandedL1, setExpandedL1] = useState<number | null>(null);
  const [expandedL2, setExpandedL2] = useState<number | null>(null);

  // Stable string key derived from user identity — used as dep so that a new
  // user object reference (same ID) never triggers a spurious re-fetch.
  const userKey = props.user
    ? ('contactId' in (props.user as any)
      ? `c${(props.user as Contact).contactId}`
      : `u${(props.user as Customer).customerId}`)
    : '';

  const { categories: menuCategories, loading: isLoading, error: menuError, fetchMenu } = useMenu({
    graphqlClient: props.graphqlClient,
    language: props.language,
    depth: props.depth,
  });
  const hasError = menuError !== null;

  function getCategoryName(cat: MenuCategory): string {
    return cat.name;
  }
  function getCategoryUrl(cat: MenuCategory): string {
    const lang = props.language || 'NL';
    return props.configuration.urls.getCategoryUrl(
      { categoryId: cat.categoryId, slug: [{ value: cat.slug, language: lang }] } as Category,
      lang
    );
  }
  function getSubCategories(cat: MenuCategory): MenuCategory[] {
    return (cat.children || []).filter((sub) => sub.name && sub.slug);
  }
  function handleItemClick(cat: MenuCategory, e: any): void {
    if (props.onMenuItemClick) {
      e.preventDefault();
      const lang = props.language || 'NL';
      props.onMenuItemClick({
        categoryId: cat.categoryId,
        name: [{ value: cat.name, language: lang }] as any,
        slug: [{ value: cat.slug, language: lang }] as any,
      } as Category);
    }
  }
  function setHoveredL1(id: number | null): void {
    setHoveredL1Id(id);
    setHoveredL2Id(null);
  }
  function setHoveredL2(id: number | null): void {
    setHoveredL2Id(id);
  }
  function getLabel(key: string, fallback: string): string {
    return (props.labels as Record<string, string>)?.[key] || fallback;
  }
  function getMenuStyle(): string {
    return (props.menuStyle as string) || 'dropdown-vertical';
  }

  useEffect(() => {
    if (!props.graphqlClient) return;
    fetchMenu(props.categoryId, userKey);
  }, [props.graphqlClient, props.categoryId, props.language, userKey, fetchMenu]);

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
      {!isLoading && !hasError && menuCategories.length === 0 ? (
        <div className="px-4 py-3 text-sm text-muted-foreground">
          {getLabel('empty', 'No categories found')}
        </div>
      ) : null}
      {!isLoading &&
      !hasError &&
      menuCategories.length > 0 &&
      getMenuStyle() === 'dropdown-vertical' ? (
        <nav
          className={`propeller-menu-dropdown hidden md:block ${(props.menuClass as string) || ''}`}
        >
          <div className="flex bg-popover border border-border shadow-lg">
            <ul className="w-64 py-1 border-r border-border flex-shrink-0">
              {menuCategories?.map((l1, idx) => (
                <li
                  key={`l1-${l1.categoryId}-${idx}`}
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
            {menuCategories?.map((l1, idx) =>
              hoveredL1Id === l1.categoryId && getSubCategories(l1).length > 0 ? (
                <ul key={`l1-sub-${l1.categoryId}-${idx}`} className="w-64 py-1 border-r border-border flex-shrink-0">
                  {getSubCategories(l1)?.map((l2, idx2) => (
                    <li
                      key={`l2-${l2.categoryId}-${idx2}`}
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
            {menuCategories?.map((l1) =>
              hoveredL1Id === l1.categoryId ? (
                <>
                  {getSubCategories(l1)?.map((l2) =>
                    hoveredL2Id === l2.categoryId && getSubCategories(l2).length > 0 ? (
                      <ul className="w-64 py-1 flex-shrink-0">
                        {getSubCategories(l2)?.map((l3, idx3) => (
                          <li key={`l3-${l3.categoryId}-${idx3}`}>
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
      menuCategories.length > 0 &&
      getMenuStyle() === 'jumbotron' ? (
        <nav
          className={`propeller-menu-jumbotron hidden md:block ${(props.menuClass as string) || ''}`}
        >
          <div className="flex items-center border-b border-border">
            {menuCategories?.map((l1, idx) => (
              <button
                key={`l1-${l1.categoryId}-${idx}`}
                onMouseEnter={(event) => setHoveredL1(l1.categoryId)}
                onClick={(e) => handleItemClick(l1, e)}
                className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${hoveredL1Id === l1.categoryId ? 'border-primary text-primary' : 'border-transparent text-foreground hover:text-primary hover:border-primary/50'}`}
              >
                {getCategoryName(l1)}
              </button>
            ))}
          </div>
          {menuCategories?.map((l1, idx) =>
            hoveredL1Id === l1.categoryId && getSubCategories(l1).length > 0 ? (
              <div
                className="bg-popover border border-border border-t-0 shadow-lg p-6"
                onMouseEnter={(event) => setHoveredL1(l1.categoryId)}
                onMouseLeave={(event) => setHoveredL1(null)}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {getSubCategories(l1)?.map((l2, idx2) => (
                    <div key={`l2-${l2.categoryId}-${idx2}`}>
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
                            <li key={`l3-${l3.categoryId}-${idx3}`}>
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
      menuCategories.length > 0 ? (
        <nav className={`propeller-menu-mobile md:hidden ${(props.menuClass as string) || ''}`}>
          <ul className="divide-y divide-border">
            {menuCategories?.map((l1, idx) => (
              <li key={`l1-mobile-${l1.categoryId}-${idx}`}>
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
                      <li key={`l2-mobile-${l2.categoryId}-${idx2}`}>
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
                              <li key={`l3-mobile-${l3.categoryId}-${idx3}`}>
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
