import type { CmsPage, CmsGlobal, CmsCategoryBanner, CmsArticle } from './types';

/**
 * Slugs that resolve to the site home page. The home page is rendered at the
 * root `/` (by `app/page.tsx`, with personalization), NOT via the catch-all
 * CMS route. In Prepr the home page may use any of these slugs — most notably
 * the personalized `home-personalized` — but it is always served at `/`.
 * Keep in sync with the provider's home-slug preference list.
 */
export const HOME_SLUGS = ['home', 'home-personalized', 'index', 'home-generic'];

/** True when a slug (with or without a leading slash) refers to the home page. */
export function isHomeSlug(slug: string): boolean {
  const normalized = slug.replace(/^\/+/, '').toLowerCase();
  return normalized === '' || HOME_SLUGS.includes(normalized);
}

/**
 * CMS provider interface.
 * Each CMS adapter (Strapi, Contentful, Prepr, etc.) implements this contract.
 */
export interface CmsPageOptions {
  /** Personalization segments to pass to the CMS (e.g. user group tags). */
  segments?: string[];
  /** Locale code for fetching localized content (e.g. 'nl-NL', 'en'). */
  locale?: string;
  /**
   * Extra request headers to forward to the CMS — used for visitor/behavioral
   * personalization (e.g. Prepr-Customer-Id, Prepr-Visitor-IP, Prepr-Context-*).
   */
  extraHeaders?: Record<string, string>;
  /**
   * Bypass response caching for this request. Required when the response varies
   * per visitor (personalized content), so visitors never share a cached page.
   */
  noStore?: boolean;
  /**
   * Fetch unpublished (concept/draft) content via the Preview API. Enabled when
   * Next.js draft mode is active so editors can preview before publishing.
   */
  preview?: boolean;
}

/** Options for fetching article(s) (blog posts). */
export interface CmsArticleOptions {
  /**
   * Fetch unpublished (concept/draft) content via the Preview API. Enabled when
   * Next.js draft mode is active so editors can preview before publishing.
   */
  preview?: boolean;
  /**
   * Extra request headers to forward to the CMS — e.g. Prepr-Segments /
   * Prepr-ABTesting from the editor's preview segment switch, so a post's
   * adaptive content resolves for the previewed segment.
   */
  extraHeaders?: Record<string, string>;
}

export interface CmsProvider {
  getPage(slug: string, options?: CmsPageOptions): Promise<CmsPage | null>;
  getAllPageSlugs(): Promise<string[]>;
  getGlobal(locale?: string): Promise<CmsGlobal | null>;
  getCategoryBanner(categoryId: string, locale?: string): Promise<CmsCategoryBanner | null>;
  getArticles(locale?: string, options?: CmsArticleOptions): Promise<CmsArticle[]>;
  getArticle(slug: string, locale?: string, options?: CmsArticleOptions): Promise<CmsArticle | null>;
  getAllArticleSlugs(): Promise<string[]>;
  resolveImageUrl(path: string): string;
}
