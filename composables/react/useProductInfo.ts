/**
 * useProductInfo (React) — Sequential product/cluster data fetching.
 *
 * React mirror of vue/useProductInfo.ts.
 */

import { useState, useCallback, useMemo } from 'react';
import { ProductService, ClusterService } from 'propeller-sdk-v2';
import type { GraphQLClient, Product, Cluster } from 'propeller-sdk-v2';

export interface UseProductInfoOptions {
  graphqlClient: GraphQLClient;
  language?: string;
  configuration?: {
    imageSearchFiltersGrid?: any;
    imageVariantFiltersSmall?: any;
  };
}

export interface UseProductInfoReturn {
  product: Product | null;
  cluster: Cluster | null;
  loading: boolean;
  error: string | null;
  fetchProduct: (productId: number) => Promise<void>;
  fetchCluster: (clusterId: number) => Promise<void>;
  clusterName: string;
  clusterSku: string;
  clusterPrice: number | null;
  clusterImageUrl: string;
}

export function useProductInfo(options: UseProductInfoOptions): UseProductInfoReturn {
  const { graphqlClient, configuration = {} } = options;
  const language = options.language || 'NL';

  const [product, setProduct] = useState<Product | null>(null);
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async (productId: number): Promise<void> => {
    setLoading(true); setError(null);
    try {
      const service = new ProductService(graphqlClient);
      const result = await service.getProduct({ productId, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      setProduct(result as Product);
    } catch (e: any) { setError(e?.message || 'Failed to fetch product'); }
    finally { setLoading(false); }
  }, [graphqlClient, language, configuration]);

  const fetchCluster = useCallback(async (clusterId: number): Promise<void> => {
    setLoading(true); setError(null);
    try {
      const service = new ClusterService(graphqlClient);
      const result = await service.getCluster({ clusterId, language, imageSearchFilters: configuration.imageSearchFiltersGrid, imageVariantFilters: configuration.imageVariantFiltersSmall });
      setCluster(result as Cluster);
    } catch (e: any) { setError(e?.message || 'Failed to fetch cluster'); }
    finally { setLoading(false); }
  }, [graphqlClient, language, configuration]);

  const clusterName = useMemo<string>(() => {
    if (!cluster) return '';
    const names = (cluster as any).names;
    if (names?.length) return names[0].value || '';
    return (cluster as any).defaultProduct?.names?.[0]?.value || '';
  }, [cluster]);

  const clusterSku = useMemo<string>(() => {
    if (!cluster) return '';
    return (cluster as any).sku || (cluster as any).defaultProduct?.sku || '';
  }, [cluster]);

  const clusterPrice = useMemo<number | null>(() => {
    if (!cluster) return null;
    const dp = (cluster as any).defaultProduct;
    return dp?.price?.gross ?? (cluster as any).price?.gross ?? null;
  }, [cluster]);

  const clusterImageUrl = useMemo<string>(() => {
    if (!cluster) return '';
    const images = (cluster as any).media?.images?.items;
    if (images?.length) return images[0].imageVariants?.[0]?.url || '';
    return (cluster as any).defaultProduct?.media?.images?.items?.[0]?.imageVariants?.[0]?.url || '';
  }, [cluster]);

  return { product, cluster, loading, error, fetchProduct, fetchCluster, clusterName, clusterSku, clusterPrice, clusterImageUrl };
}
