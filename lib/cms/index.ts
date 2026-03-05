import type { CmsProvider } from './core';
import { createStrapiProvider } from './providers/strapi';

/**
 * Resolve the active CMS provider based on the CMS_PROVIDER env var.
 * Defaults to 'strapi'. Add new providers here as needed.
 */
function createProvider(): CmsProvider {
  const provider = process.env.CMS_PROVIDER || 'strapi';

  switch (provider) {
    case 'strapi':
      return createStrapiProvider();
    default:
      throw new Error(`Unknown CMS provider: "${provider}". Supported: strapi`);
  }
}

const cms = createProvider();

// Re-export individual functions for convenience (drop-in replacement for old strapi.ts imports)
export const getPage = cms.getPage.bind(cms);
export const getAllPageSlugs = cms.getAllPageSlugs.bind(cms);
export const getGlobal = cms.getGlobal.bind(cms);
export const getCategoryBanner = cms.getCategoryBanner.bind(cms);
export const resolveImageUrl = cms.resolveImageUrl.bind(cms);

// Re-export the provider instance and types
export { cms };
export type { CmsProvider } from './core';
