// Default configuration for the application
// These will be used with project wide

import { Category, Cluster, Product } from 'propeller-sdk-v2';
import {
  imageSearchFilters,
  imageSearchFiltersGrid,
  imageVariantFiltersSmall,
  imageVariantFiltersMedium,
  imageVariantFiltersLarge,
} from './defaults';

/**
 * Builds a URL from a pattern string.
 *
 * Pattern tokens:
 *   page  → entity type ('product', 'cluster', …)
 *   id    → entity numeric ID
 *   slug  → entity URL slug
 *
 * Examples:
 *   buildEntityUrl('product', 123, 'my-widget', 'page/id/slug') → '/product/123/my-widget'
 *   buildEntityUrl('product', 123, 'my-widget', 'page/slug')    → '/product/my-widget'
 *   buildEntityUrl('product', 123, '',           'page/id')     → '/product/123'
 *
 * Empty segments (missing id or slug) are dropped so the URL is always clean.
 */
function buildEntityUrl(
  page: string,
  id: number | string | undefined,
  slug: string | undefined,
  pattern: string,
): string {
  const segments = pattern.split('/').map(token => {
    if (token === 'page') return page;
    if (token === 'id') return id != null ? String(id) : '';
    if (token === 'slug') return slug || '';
    return token;
  }).filter(s => s.length > 0);

  if (segments.length === 0) return '#';
  return '/' + segments.join('/');
}

export const config = {
  baseCategoryId: 17,
  imageSearchFilters: imageSearchFilters,
  imageSearchFiltersGrid: imageSearchFiltersGrid,
  imageVariantFiltersSmall: imageVariantFiltersSmall,
  imageVariantFiltersMedium: imageVariantFiltersMedium,
  imageVariantFiltersLarge: imageVariantFiltersLarge,
  productTrackAttributes: [],
  enableRegistration: true,
  enableGuestCheckout: false,
  enableWishlist: true,
  enableReviews: false,
  enableChat: false,
  enableNotifications: true,
  urls: {
    /**
     * Controls which segments are included in entity URLs.
     *
     * Supported patterns:
     *   'page/id/slug'  →  /product/123/my-product   (default)
     *   'page/slug'     →  /product/my-product
     *   'page/id'       →  /product/123
     */
    pattern: 'page/id/slug',

    /** Generate a canonical product URL from a Product object. */
    getProductUrl(product: Product, language?: string): string {
      const slug = (language && product?.slugs?.find(s => s.language === language)?.value)
        || product?.slugs?.[0]?.value || '';
      return buildEntityUrl('product', product?.productId, slug, this.pattern);
    },

    /** Generate a canonical cluster URL from a Cluster object. */
    getClusterUrl(cluster: Cluster, language?: string): string {
      const slugs = cluster?.slugs || cluster?.defaultProduct?.slugs;
      const slug = (language && slugs?.find((s: any) => s.language === language)?.value)
        || slugs?.[0]?.value || '';
      return buildEntityUrl('cluster', cluster?.clusterId, slug, this.pattern);
    },

    /** Generate a canonical category URL from a Category object. */
    getCategoryUrl(category: Category, language?: string): string {
      const slug = (language && category?.slug?.find((s: any) => s.language === language)?.value)
        || category?.slug?.[0]?.value || '';
      return buildEntityUrl('category', category?.categoryId, slug, this.pattern);
    },
  },
};
