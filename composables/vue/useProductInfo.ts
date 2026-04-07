/**
 * useProductInfo (Vue) — Sequential product/cluster data fetching.
 *
 * Covers: ProductInfo, ClusterInfo, ProductCard, ClusterCard components.
 *
 * Responsibilities:
 * - ProductInfo: getOrderlists → getProduct (sequential, orderlists needed for price tier)
 * - ClusterInfo: getClusterConfig → getCluster (sequential, config drives configurator)
 * - Cluster fallback chain: cluster → defaultProduct for name/sku/price/image
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue';
import {
  ProductService,
  ClusterService,
} from 'propeller-sdk-v2';
import type {
  GraphQLClient,
  Product,
  Cluster,
} from 'propeller-sdk-v2';

// ── Types ────────────────────────────────────────────────────────────────────

export interface UseProductInfoOptions {
  graphqlClient: GraphQLClient;
  language?: Ref<string>;
  configuration?: {
    imageSearchFiltersGrid?: any;
    imageVariantFiltersSmall?: any;
  };
}

export interface UseProductInfoReturn {
  product: Ref<Product | null>;
  cluster: Ref<Cluster | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  fetchProduct: (productId: number) => Promise<void>;
  fetchCluster: (clusterId: number) => Promise<void>;
  // Cluster display helpers (fallback to defaultProduct)
  getClusterName: ComputedRef<string>;
  getClusterSku: ComputedRef<string>;
  getClusterPrice: ComputedRef<number | null>;
  getClusterImageUrl: ComputedRef<string>;
}

export function useProductInfo(options: UseProductInfoOptions): UseProductInfoReturn {
  const { graphqlClient, configuration = {} } = options;
  const languageRef = options.language ?? ref('NL');

  const product = ref<Product | null>(null) as Ref<Product | null>;
  const cluster = ref<Cluster | null>(null) as Ref<Cluster | null>;
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ── Fetch product (with optional orderlists first) ────────────────────────

  async function fetchProduct(productId: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const service = new ProductService(graphqlClient);
      const language = languageRef.value || 'NL';
      const result = await service.getProduct({
        productId,
        language,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        imageVariantFilters: configuration.imageVariantFiltersSmall,
      });
      product.value = result as Product;
    } catch (e: any) {
      error.value = e?.message || 'Failed to fetch product';
    } finally {
      loading.value = false;
    }
  }

  // ── Fetch cluster (config + cluster data) ─────────────────────────────────

  async function fetchCluster(clusterId: number): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const service = new ClusterService(graphqlClient);
      const language = languageRef.value || 'NL';
      const result = await service.getCluster({
        clusterId,
        language,
        imageSearchFilters: configuration.imageSearchFiltersGrid,
        imageVariantFilters: configuration.imageVariantFiltersSmall,
      });
      cluster.value = result as Cluster;
    } catch (e: any) {
      error.value = e?.message || 'Failed to fetch cluster';
    } finally {
      loading.value = false;
    }
  }

  // ── Cluster display helpers (fallback chain) ──────────────────────────────

  const getClusterName = computed<string>(() => {
    const c = cluster.value;
    if (!c) return '';
    const names = (c as any).names;
    if (names?.length) return names[0].value || '';
    const dp = (c as any).defaultProduct;
    return dp?.names?.[0]?.value || '';
  });

  const getClusterSku = computed<string>(() => {
    const c = cluster.value;
    if (!c) return '';
    return (c as any).sku || (c as any).defaultProduct?.sku || '';
  });

  const getClusterPrice = computed<number | null>(() => {
    const c = cluster.value;
    if (!c) return null;
    const dp = (c as any).defaultProduct;
    return dp?.price?.gross ?? (c as any).price?.gross ?? null;
  });

  const getClusterImageUrl = computed<string>(() => {
    const c = cluster.value;
    if (!c) return '';
    const images = (c as any).media?.images?.items;
    if (images?.length) return images[0].imageVariants?.[0]?.url || '';
    const dp = (c as any).defaultProduct;
    return dp?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
  });

  return {
    product,
    cluster,
    loading,
    error,
    fetchProduct,
    fetchCluster,
    getClusterName,
    getClusterSku,
    getClusterPrice,
    getClusterImageUrl,
  };
}
