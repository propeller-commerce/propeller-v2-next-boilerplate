import * as React from 'react';
import { Category, LocalizedString } from 'propeller-sdk-v2';

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

function Breadcrumbs(props: BreadcrumbsProps) {
  function getItems(): ReturnType<BreadcrumbsState['getItems']> {
    const path = (props.categoryPath as Category[]) || [];
    const baseId = props.configuration?.baseCategoryId;
    if (!baseId) return path;
    return path.filter((cat: Category) => cat.categoryId !== baseId);
  }

  function getDisplayItems(): ReturnType<BreadcrumbsState['getDisplayItems']> {
    const items = getItems();
    if (props.showCurrent === false && items.length > 0) {
      return items.slice(0, items.length - 1);
    }
    return items;
  }

  function getCategoryName(cat: Category): ReturnType<BreadcrumbsState['getCategoryName']> {
    const lang = (props.language as string) || 'NL';
    const match = cat.name?.find((n: LocalizedString) => n.language === lang);
    return match?.value || cat.name?.[0]?.value || '';
  }

  function getCategorySlug(cat: Category): ReturnType<BreadcrumbsState['getCategorySlug']> {
    const lang = (props.language as string) || 'NL';
    const match = cat.slug?.find((s: LocalizedString) => s.language === lang);
    return match?.value || cat.slug?.[0]?.value || '';
  }

  function getCategoryUrl(
    cat: Category,
    index: number
  ): ReturnType<BreadcrumbsState['getCategoryUrl']> {
    if (props.getUrl) {
      return (props.getUrl as (cat: Category, index: number) => string)(cat, index);
    }
    return props.configuration.urls.getCategoryUrl(cat);
  }

  function isCurrentItem(index: number): ReturnType<BreadcrumbsState['isCurrentItem']> {
    if (props.showCurrent === false) return false;
    return index === getDisplayItems().length - 1;
  }

  function showSeparatorBefore(index: number): ReturnType<BreadcrumbsState['showSeparatorBefore']> {
    // Show separator when Home precedes this item, or when a previous category item exists.
    return props.showHome !== false || index > 0;
  }

  function getLabel(key: string, fallback: string): ReturnType<BreadcrumbsState['getLabel']> {
    return (props.labels as Record<string, string>)?.[key] || fallback;
  }

  return (
    <nav aria-label="Breadcrumb" className={`breadcrumbs ${(props.className as string) || ''}`}>
      <ol className="flex flex-wrap items-center text-sm text-muted-foreground">
        {props.showHome !== false ? (
          <li className="flex items-center">
            <a
              className="hover:text-foreground transition-colors"
              href={(props.homeUrl as string) || '/'}
            >
              {getLabel('home', 'Home')}
            </a>
          </li>
        ) : null}
        {getDisplayItems()?.map((cat, index) => (
          <li className="flex items-center" key={cat.categoryId || index}>
            {showSeparatorBefore(index) ? (
              <span aria-hidden="true" className="mx-2 select-none text-muted-foreground/40">
                {getLabel('separator', '/')}
              </span>
            ) : null}
            {isCurrentItem(index) ? (
              <a
                className="hover:text-foreground transition-colors"
                href={getCategoryUrl(cat, index)}
              >
                {getCategoryName(cat)}
              </a>
            ) : null}
            {!isCurrentItem(index) ? (
              <a
                className="hover:text-foreground transition-colors"
                href={getCategoryUrl(cat, index)}
              >
                {getCategoryName(cat)}
              </a>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
