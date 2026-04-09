import type { CmsProvider } from './core';
import { createStrapiProvider } from './providers/strapi';
import { createPreprProvider } from './providers/prepr';

/**
 * Resolve the active CMS provider based on the CMS_PROVIDER env var.
 * Defaults to 'strapi'. Add new providers here as needed.
 */
function createProvider(): CmsProvider {
  const provider = process.env.CMS_PROVIDER || process.env.NEXT_PUBLIC_CMS_PROVIDER || 'strapi';

  switch (provider) {
    case 'strapi':
      return createStrapiProvider();
    case 'prepr':
      return createPreprProvider();
    default:
      throw new Error(`Unknown CMS provider: "${provider}". Supported: strapi, prepr`);
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
