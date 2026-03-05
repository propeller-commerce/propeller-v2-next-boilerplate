import type { CmsPage, CmsGlobal, CmsCategoryBanner } from './types';

/**
 * CMS provider interface.
 * Each CMS adapter (Strapi, Contentful, Storyblok, etc.) implements this contract.
 */
export interface CmsProvider {
  getPage(slug: string): Promise<CmsPage | null>;
  getAllPageSlugs(): Promise<string[]>;
  getGlobal(): Promise<CmsGlobal | null>;
  getCategoryBanner(categoryId: string): Promise<CmsCategoryBanner | null>;
  resolveImageUrl(path: string): string;
}
