/**
 * useProductInfo (React) — Sequential product/cluster data fetching.
 *
 * React mirror of vue/useProductInfo.ts.
 * Mirrors the fetch logic of ui-components/ProductInfo.lite.tsx and
 * ui-components/ClusterInfo.lite.tsx exactly.
 *
 * Responsibilities:
 * - ProductInfo: getOrderlists → getProduct (sequential; orderlists needed for price tier)
 * - ClusterInfo: getClusterConfig → getCluster (sequential; config drives attribute names)
 * - priceCalculateProductInput + userBulkPriceProductInput for correct per-user pricing
 * - Cluster fallback chain: cluster → defaultProduct for name/sku/price/image
 */

import { useState, useCallback, useMemo } from 'react';
import {
  ProductService,
  ClusterService,
  OrderlistService,
} from 'propeller-sdk-v2';
import type {
  GraphQLClient,
  Product,
  Cluster,
  Contact,
  Customer,
  LocalizedString,
  ClusterConfigSetting,
  ProductQueryVariables,
  ClusterQueryVariables,
  PriceCalculateProductInput,
  UserBulkPriceProductInput,
  AttributeResultSearchInput,
  MediaImageProductSearchInput,
  TransformationsInput,
  OrderlistSearchInput,
} from 'propeller-sdk-v2';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseProductInfoOptions {
  graphqlClient: GraphQLClient;
  language?: string;
  taxZone?: string;
  user?: Contact | Customer | null;
  companyId?: number;
  /** Attribute names to include in attributeResultSearchInput (productTrackAttributes). */
  productTrackAttributes?: string[];
  configuration?: {
    imageSearchFiltersGrid?: MediaImageProductSearchInput;
    /** Used for products (ProductInfo). */
    imageVariantFiltersLarge?: TransformationsInput;
    /** Used for clusters (ClusterInfo). */
    imageVariantFiltersMedium?: TransformationsInput;
    /** Alias: some configs use imageVariantFiltersSmall for product images. */
    imageVariantFiltersSmall?: TransformationsInput;
  };
}

export interface UseProductInfoReturn {
  product: Product | null;
  cluster: Cluster | null;
  loading: boolean;
  error: string | null;
  fetchProduct: (productId: number, imageSearchFilters?: MediaImageProductSearchInput, imageVariantFilters?: TransformationsInput) => Promise<void>;
  fetchCluster: (clusterId: number, imageSearchFilters?: MediaImageProductSearchInput, imageVariantFilters?: TransformationsInput) => Promise<void>;
  // Cluster display helpers (fallback chain: cluster → defaultProduct)
  clusterName: string;
  clusterSku: string;
  clusterPrice: number | null;
  clusterImageUrl: string;
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useProductInfo(options: UseProductInfoOptions): UseProductInfoReturn {
  const { graphqlClient, configuration = {} } = options;
  const language = options.language ?? 'NL';
  const taxZone = options.taxZone ?? 'NL';

  const [product, setProduct] = useState<Product | null>(null);
  const [cluster, setCluster] = useState<Cluster | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Shared price input builders ───────────────────────────────────────────

  function buildPriceInput(): PriceCalculateProductInput {
    const input: PriceCalculateProductInput = { taxZone };
    if (options.companyId) input.companyId = options.companyId;
    if (options.user && 'contactId' in options.user) input.contactId = (options.user as Contact).contactId;
    if (options.user && 'customerId' in options.user) input.customerId = (options.user as Customer).customerId;
    return input;
  }

  function buildBulkPriceInput(): UserBulkPriceProductInput {
    const input: UserBulkPriceProductInput = { taxZone };
    if (options.companyId) input.companyId = options.companyId;
    if (options.user && 'contactId' in options.user) input.contactId = (options.user as Contact).contactId;
    if (options.user && 'customerId' in options.user) input.customerId = (options.user as Customer).customerId;
    return input;
  }

  function buildAttributeInput(): AttributeResultSearchInput | undefined {
    const names = options.productTrackAttributes;
    if (!names || names.length === 0) return undefined;
    return { attributeDescription: { names } };
  }

  // ── Fetch product ─────────────────────────────────────────────────────────
  // Mirrors ProductInfo.lite.tsx: getOrderlists first (if user+companyId), then getProduct.

  const fetchProduct = useCallback(async (
    productId: number,
    imageSearchFilters?: MediaImageProductSearchInput,
    imageVariantFilters?: TransformationsInput,
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: resolve orderlist IDs (mirrors ProductInfo.lite.tsx orderListsPromise)
      let orderlistIds: number[] = [];
      if (options.user && options.companyId) {
        const orderlistService = new OrderlistService(graphqlClient);
        const searchInput: OrderlistSearchInput = { companyIds: [options.companyId] };
        const orderlists = await orderlistService.getOrderlists(searchInput);
        orderlistIds = (orderlists?.items ?? []).map((ol) => ol.id);
      }

      // Step 2: fetch product with full inputs
      const service = new ProductService(graphqlClient);
      const attributeInput = buildAttributeInput();

      const variables: ProductQueryVariables = {
        productId,
        language,
        applyOrderlists: true,
        orderlistIds,
        imageSearchFilters: imageSearchFilters ?? configuration.imageSearchFiltersGrid,
        imageVariantFilters: (imageVariantFilters ?? configuration.imageVariantFiltersLarge ?? configuration.imageVariantFiltersSmall) as TransformationsInput,
        priceCalculateProductInput: buildPriceInput(),
        userBulkPriceProductInput: buildBulkPriceInput(),
        ...(attributeInput && { attributeResultSearchInput: attributeInput }),
      };

      const result = await service.getProduct(variables);
      setProduct(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch product');
    } finally {
      setLoading(false);
    }
  }, [graphqlClient, language, taxZone, options.user, options.companyId, options.productTrackAttributes, configuration]);

  // ── Fetch cluster ─────────────────────────────────────────────────────────
  // Mirrors ClusterInfo.lite.tsx: getClusterConfig first, then getCluster with attributeNames.

  const fetchCluster = useCallback(async (
    clusterId: number,
    imageSearchFilters?: MediaImageProductSearchInput,
    imageVariantFilters?: TransformationsInput,
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const service = new ClusterService(graphqlClient);

      // Step 1: get cluster config to extract attribute names (mirrors ClusterInfo.lite.tsx)
      const clusterConfig = await service.getClusterConfig(clusterId);
      const attributeNames: string[] =
        (clusterConfig?.config?.settings ?? []).map(
          (setting: ClusterConfigSetting) => setting.name
        );

      // Step 2: fetch cluster with full inputs
      const variables: ClusterQueryVariables = {
        clusterId,
        language,
        imageSearchFilters: imageSearchFilters ?? configuration.imageSearchFiltersGrid,
        imageVariantFilters: imageVariantFilters ?? configuration.imageVariantFiltersMedium,
        priceCalculateProductInput: buildPriceInput(),
        ...(attributeNames.length > 0 && {
          attributeResultSearchInput: {
            attributeDescription: { names: attributeNames },
          } as AttributeResultSearchInput,
        }),
      };

      const result = await service.getCluster(variables);
      setCluster(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch cluster');
    } finally {
      setLoading(false);
    }
  }, [graphqlClient, language, taxZone, options.user, options.companyId, configuration]);

  // ── Cluster display helpers (fallback chain: cluster → defaultProduct) ────

  const clusterName = useMemo<string>(() => {
    if (!cluster) return '';
    const lang = language;
    const names: LocalizedString[] = cluster.names ?? [];
    if (names.length) {
      const match = names.find(n => n.language === lang);
      return match?.value ?? names[0]?.value ?? '';
    }
    const dp = cluster.defaultProduct;
    const dpNames: LocalizedString[] = dp?.names ?? [];
    const dpMatch = dpNames.find(n => n.language === lang);
    return dpMatch?.value ?? dpNames[0]?.value ?? '';
  }, [cluster, language]);

  const clusterSku = useMemo<string>(() => {
    if (!cluster) return '';
    return cluster.sku || cluster.defaultProduct?.sku || '';
  }, [cluster]);

  const clusterPrice = useMemo<number | null>(() => {
    if (!cluster) return null;
    const dp = cluster.defaultProduct;
    return dp?.price?.gross ?? null;
  }, [cluster]);

  const clusterImageUrl = useMemo<string>(() => {
    if (!cluster) return '';
    const dp = cluster.defaultProduct;
    return dp?.media?.images?.items?.[0]?.imageVariants?.[0]?.url ?? '';
  }, [cluster]);

  return {
    product,
    cluster,
    loading,
    error,
    fetchProduct,
    fetchCluster,
    clusterName,
    clusterSku,
    clusterPrice,
    clusterImageUrl,
  };
}
