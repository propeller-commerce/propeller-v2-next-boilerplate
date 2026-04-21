import type { Product, Cluster } from 'propeller-sdk-v2';

export function getProductImageUrl(product: Product | null | undefined): string {
  return product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
}

export function getClusterImageUrl(cluster: Cluster | null | undefined): string {
  return cluster?.defaultProduct?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
}

export function getProductSku(product: Product | null | undefined): string {
  return product?.sku || '';
}

export function getClusterSku(cluster: Cluster | null | undefined): string {
  return cluster?.sku || cluster?.defaultProduct?.sku || '';
}

/**
 * Finds the best localized string value from an array of {language, value} items.
 * Falls back to first item's value, then to the provided fallback.
 */
export function getLocalizedValue(
  items: Array<{ language?: string | null; value?: string | null }> | null | undefined,
  language?: string | null,
  fallback = '',
): string {
  if (!items || items.length === 0) return fallback;
  if (language) {
    const match = items.find((n) => n.language === language);
    if (match?.value) return match.value;
  }
  return items[0]?.value || fallback;
}
