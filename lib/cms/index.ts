import type { CmsProvider } from './core';
import { createStrapiProvider } from './providers/strapi';
import { createPreprProvider } from './providers/prepr';
import { createContentfulProvider } from './providers/contentful';

/**
 * Resolve the active CMS provider based on the CMS_PROVIDER env var.
 * Defaults to 'strapi'. Add new providers here as needed.
 */
/** No-op provider when no CMS is configured. */
function createNoneProvider(): CmsProvider {
  return {
    getPage: async () => null,
    getAllPageSlugs: async () => [],
    getGlobal: async () => null,
    getCategoryBanner: async () => null,
    getArticles: async () => [],
    getArticle: async () => null,
    getAllArticleSlugs: async () => [],
    resolveImageUrl: (path: string) => path,
  };
}

function createProvider(): CmsProvider {
  const provider = process.env.CMS_PROVIDER || process.env.NEXT_PUBLIC_CMS_PROVIDER || 'none';

  switch (provider) {
    case 'none':
      return createNoneProvider();
    case 'strapi':
      return createStrapiProvider();
    case 'prepr':
      return createPreprProvider();
    case 'contentful':
      return createContentfulProvider();
    default:
      throw new Error(`Unknown CMS provider: "${provider}". Supported: none, strapi, prepr, contentful`);
  }
}

const cms = createProvider();

// Re-export individual functions for convenience (drop-in replacement for old strapi.ts imports)
export const getPage = cms.getPage.bind(cms);
export const getAllPageSlugs = cms.getAllPageSlugs.bind(cms);
export const getGlobal = cms.getGlobal.bind(cms);
export const getCategoryBanner = cms.getCategoryBanner.bind(cms);
export const getArticles = cms.getArticles.bind(cms);
export const getArticle = cms.getArticle.bind(cms);
export const getAllArticleSlugs = cms.getAllArticleSlugs.bind(cms);
export const resolveImageUrl = cms.resolveImageUrl.bind(cms);

// Re-export the provider instance and types
export { cms };
export type { CmsProvider, CmsPageOptions } from './core';
