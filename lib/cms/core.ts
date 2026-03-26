import type { CmsPage, CmsGlobal, CmsCategoryBanner, CmsArticle } from './types';

/**
 * CMS provider interface.
 * Each CMS adapter (Strapi, Contentful, Storyblok, etc.) implements this contract.
 */
export interface CmsProvider {
  getPage(slug: string): Promise<CmsPage | null>;
  getAllPageSlugs(): Promise<string[]>;
  getGlobal(): Promise<CmsGlobal | null>;
  getCategoryBanner(categoryId: string): Promise<CmsCategoryBanner | null>;
  getArticles(): Promise<CmsArticle[]>;
  getArticle(slug: string): Promise<CmsArticle | null>;
  getAllArticleSlugs(): Promise<string[]>;
  resolveImageUrl(path: string): string;
}
