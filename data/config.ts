// Default configuration for the application
// These will be used with project wide

import { Category, Cluster, Product } from '@propeller-commerce/propeller-sdk-v2';
import {
  imageSearchFilters,
  imageSearchFiltersGrid,
  imageVariantFiltersSmall,
  imageVariantFiltersMedium,
  imageVariantFiltersLarge,
} from './defaults';

const DEFAULT_LANG = (process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL').toUpperCase();
const BASE_CATEGORY_ID = parseInt(process.env.NEXT_PUBLIC_BASE_CATEGORY_ID || '1', 10);
/**
 * Returns the URL prefix for a given language.
 * Default language (NL) gets no prefix; others get '/en', '/de', etc.
 */
export function getLanguagePrefix(language?: string): string {
  if (!language || language.toUpperCase() === DEFAULT_LANG) return '';
  return `/${language.toLowerCase()}`;
}

/**
 * Prepends the language prefix to an absolute path.
 * Default language paths remain unchanged.
 *
 * Examples:
 *   localizeHref('/checkout', 'NL') → '/checkout'
 *   localizeHref('/checkout', 'EN') → '/en/checkout'
 *   localizeHref('/', 'EN')         → '/en'
 */
export function localizeHref(path: string, language?: string): string {
  const prefix = getLanguagePrefix(language);
  if (!prefix) return path;
  if (path.startsWith(prefix + '/') || path === prefix) return path;
  return path === '/' ? prefix : prefix + path;
}

/**
 * Strips any known language prefix from a pathname.
 * '/en/category/5/shoes' → '/category/5/shoes'
 * '/category/5/shoes'    → '/category/5/shoes'
 */
export function stripLanguagePrefix(pathname: string): string {
  const match = pathname.match(/^\/([a-z]{2})(\/|$)/);
  if (match && match[1].toUpperCase() !== DEFAULT_LANG) {
    const rest = pathname.slice(3); // remove '/xx'
    return rest || '/';
  }
  return pathname;
}

/**
 * Detects the language from a URL pathname.
 * '/en/category/5' → 'EN', '/category/5' → default language
 */
export function detectLanguageFromPath(pathname: string): string {
  const match = pathname.match(/^\/([a-z]{2})(\/|$)/);
  if (match && match[1].toUpperCase() !== DEFAULT_LANG) {
    return match[1].toUpperCase();
  }
  return DEFAULT_LANG;
}

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
  language?: string,
): string {
  const segments = pattern.split('/').map(token => {
    if (token === 'page') return page;
    if (token === 'id') return id != null ? String(id) : '';
    if (token === 'slug') return slug || '';
    return token;
  }).filter(s => s.length > 0);

  if (segments.length === 0) return '#';
  const base = '/' + segments.join('/');
  return localizeHref(base, language);
}

/**
 * Portal access modes. Values are KEBAB-CASE strings — the package's
 * `isContentHidden(portalMode, user)` helper matches on these exact strings
 * (see `propeller-v2-react-ui/src/composables/shared/utils/visibilityHelpers.ts`).
 * Historical note: `SEMI_CLOSED` used to be `'semiClosed'` (camelCase), which
 * silently never matched the helper — the semi-closed gate was a no-op until
 * 2026-05-26 when this was corrected.
 */
export const PORTAL_MODE = {
  CLOSED: 'closed',
  SEMI_CLOSED: 'semi-closed',
  OPEN: 'open'
} as const;

export const config = {
  baseCategoryId: BASE_CATEGORY_ID,
  channelId: 621,
  anonymousId: 71,
  language: DEFAULT_LANG,
  currency: '€',
  /** ISO 4217 currency code — used by JSON-LD / schema.org payloads (`priceCurrency`).
   *  Distinct from `currency` above, which is the display symbol shown to humans. */
  currencyCode: 'EUR',
  imageSearchFilters: imageSearchFilters,
  imageSearchFiltersGrid: imageSearchFiltersGrid,
  imageVariantFiltersSmall: imageVariantFiltersSmall,
  imageVariantFiltersMedium: imageVariantFiltersMedium,
  imageVariantFiltersLarge: imageVariantFiltersLarge,
  taxZone: 'NL',
  portal: {
    mode: PORTAL_MODE.OPEN,
  },
  productTrackAttributes: [],
  categoryTrackAttributes: [],
  clusterTrackAttributes: [],
  companyTrackAttributes: [],
  contactTrackAttributes: [],
  customerTrackAttributes: [],
  contactPAConfigInput: [],
  includeVAT: true,
  enableRegistration: true,
  enableGuestCheckout: false,
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
      return buildEntityUrl('product', product?.productId, slug, this.pattern, language);
    },

    /** Generate a canonical cluster URL from a Cluster object. */
    getClusterUrl(cluster: Cluster, language?: string): string {
      const slugs = cluster?.slugs || cluster?.defaultProduct?.slugs;
      const slug = (language && slugs?.find((s: any) => s.language === language)?.value)
        || slugs?.[0]?.value || '';
      return buildEntityUrl('cluster', cluster?.clusterId, slug, this.pattern, language);
    },

    /** Generate a canonical category URL from a Category object. */
    getCategoryUrl(category: Category, language?: string): string {
      const slug = (language && category?.slug?.find((s: any) => s.language === language)?.value)
        || category?.slug?.[0]?.value || '';
      return buildEntityUrl('category', category?.categoryId, slug, this.pattern, language);
    },
  },
};
