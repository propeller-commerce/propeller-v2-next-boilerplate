/**
 * useProductInfo (Vue) — Sequential product/cluster data fetching.
 *
 * Covers: ProductInfo, ClusterInfo, ProductCard, ClusterCard components.
 * Vue mirror of react/useProductInfo.ts.
 * Mirrors the fetch logic of ui-components/ProductInfo.lite.tsx and
 * ui-components/ClusterInfo.lite.tsx exactly.
 *
 * Responsibilities:
 * - ProductInfo: getOrderlists → getProduct (sequential; orderlists needed for price tier)
 * - ClusterInfo: getClusterConfig → getCluster (sequential; config drives attribute names)
 * - priceCalculateProductInput + userBulkPriceProductInput for correct per-user pricing
 * - Cluster fallback chain: cluster → defaultProduct for name/sku/price/image
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue';
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
  language?: Ref<string>;
  taxZone?: string;
  user?: Ref<Contact | Customer | null>;
  companyId?: Ref<number | undefined>;
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
  product: Ref<Product | null>;
  cluster: Ref<Cluster | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  fetchProduct: (productId: number, imageSearchFilters?: MediaImageProductSearchInput, imageVariantFilters?: TransformationsInput) => Promise<void>;
  fetchCluster: (clusterId: number, imageSearchFilters?: MediaImageProductSearchInput, imageVariantFilters?: TransformationsInput) => Promise<void>;
  // Cluster display helpers (fallback chain: cluster → defaultProduct)
  clusterName: ComputedRef<string>;
  clusterSku: ComputedRef<string>;
  clusterPrice: ComputedRef<number | null>;
  clusterImageUrl: ComputedRef<string>;
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useProductInfo(options: UseProductInfoOptions): UseProductInfoReturn {
  const { graphqlClient, configuration = {} } = options;
  const languageRef = options.language ?? ref('NL');
  const taxZone = options.taxZone ?? 'NL';

  const product = ref<Product | null>(null) as Ref<Product | null>;
  const cluster = ref<Cluster | null>(null) as Ref<Cluster | null>;
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ── Shared price input builders ───────────────────────────────────────────

  function buildPriceInput(): PriceCalculateProductInput {
    const user = options.user?.value ?? null;
    const companyId = options.companyId?.value;
    const input: PriceCalculateProductInput = { taxZone };
    if (companyId) input.companyId = companyId;
    if (user && 'contactId' in user) input.contactId = (user as Contact).contactId;
    if (user && 'customerId' in user) input.customerId = (user as Customer).customerId;
    return input;
  }

  function buildBulkPriceInput(): UserBulkPriceProductInput {
    const user = options.user?.value ?? null;
    const companyId = options.companyId?.value;
    const input: UserBulkPriceProductInput = { taxZone };
    if (companyId) input.companyId = companyId;
    if (user && 'contactId' in user) input.contactId = (user as Contact).contactId;
    if (user && 'customerId' in user) input.customerId = (user as Customer).customerId;
    return input;
  }

  function buildAttributeInput(): AttributeResultSearchInput | undefined {
    const names = options.productTrackAttributes;
    if (!names || names.length === 0) return undefined;
    return { attributeDescription: { names } };
  }

  // ── Fetch product ─────────────────────────────────────────────────────────
  // Mirrors ProductInfo.lite.tsx: getOrderlists first (if user+companyId), then getProduct.

  async function fetchProduct(
    productId: number,
    imageSearchFilters?: MediaImageProductSearchInput,
    imageVariantFilters?: TransformationsInput,
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const lang = languageRef.value || 'NL';
      const user = options.user?.value ?? null;
      const companyId = options.companyId?.value;

      // Step 1: resolve orderlist IDs (mirrors ProductInfo.lite.tsx orderListsPromise)
      let orderlistIds: number[] = [];
      if (user && companyId) {
        const orderlistService = new OrderlistService(graphqlClient);
        const searchInput: OrderlistSearchInput = { companyIds: [companyId] };
        const orderlists = await orderlistService.getOrderlists(searchInput);
        orderlistIds = (orderlists?.items ?? []).map((ol) => ol.id);
      }

      // Step 2: fetch product with full inputs
      const service = new ProductService(graphqlClient);
      const attributeInput = buildAttributeInput();

      const variables: ProductQueryVariables = {
        productId,
        language: lang,
        applyOrderlists: true,
        orderlistIds,
        imageSearchFilters: imageSearchFilters ?? configuration.imageSearchFiltersGrid,
        imageVariantFilters: (imageVariantFilters ?? configuration.imageVariantFiltersLarge ?? configuration.imageVariantFiltersSmall) as TransformationsInput,
        priceCalculateProductInput: buildPriceInput(),
        userBulkPriceProductInput: buildBulkPriceInput(),
        ...(attributeInput && { attributeResultSearchInput: attributeInput }),
      };

      const result = await service.getProduct(variables);
      product.value = result;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch product';
    } finally {
      loading.value = false;
    }
  }

  // ── Fetch cluster ─────────────────────────────────────────────────────────
  // Mirrors ClusterInfo.lite.tsx: getClusterConfig first, then getCluster with attributeNames.

  async function fetchCluster(
    clusterId: number,
    imageSearchFilters?: MediaImageProductSearchInput,
    imageVariantFilters?: TransformationsInput,
  ): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const lang = languageRef.value || 'NL';
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
        language: lang,
        imageSearchFilters: imageSearchFilters ?? configuration.imageSearchFiltersGrid,
        imageVariantFilters: (imageVariantFilters ?? configuration.imageVariantFiltersMedium) as TransformationsInput,
        priceCalculateProductInput: buildPriceInput(),
        ...(attributeNames.length > 0 && {
          attributeResultSearchInput: {
            attributeDescription: { names: attributeNames },
          } as AttributeResultSearchInput,
        }),
      };

      const result = await service.getCluster(variables);
      cluster.value = result;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch cluster';
    } finally {
      loading.value = false;
    }
  }

  // ── Cluster display helpers (fallback chain: cluster → defaultProduct) ────

  const clusterName = computed<string>(() => {
    const c = cluster.value;
    if (!c) return '';
    const lang = languageRef.value || 'NL';
    const names: LocalizedString[] = c.names ?? [];
    if (names.length) {
      const match = names.find(n => n.language === lang);
      return match?.value ?? names[0]?.value ?? '';
    }
    const dp = c.defaultProduct;
    const dpNames: LocalizedString[] = dp?.names ?? [];
    const dpMatch = dpNames.find(n => n.language === lang);
    return dpMatch?.value ?? dpNames[0]?.value ?? '';
  });

  const clusterSku = computed<string>(() => {
    const c = cluster.value;
    if (!c) return '';
    return c.sku || c.defaultProduct?.sku || '';
  });

  const clusterPrice = computed<number | null>(() => {
    const c = cluster.value;
    if (!c) return null;
    const dp = c.defaultProduct;
    return dp?.price?.gross ?? null;
  });

  const clusterImageUrl = computed<string>(() => {
    const c = cluster.value;
    if (!c) return '';
    const dp = c.defaultProduct;
    return dp?.media?.images?.items?.[0]?.imageVariants?.[0]?.url ?? '';
  });

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
