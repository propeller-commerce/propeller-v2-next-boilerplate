import {
  CategoryService,
  GraphQLClient,
  CategoryQueryVariables,
  CategoryProductSearchInput,
  Product,
  Cluster,
  Contact,
  Customer,
  Enums,
  MediaImageProductSearchInput,
  TransformationsInput,
} from 'propeller-sdk-v2';
import type { ProductGridComposableConfig, ProductGridQuery } from './types';

export interface FetchProductsResult {
  items: (Product | Cluster)[];
  itemsFound: number;
  totalPages: number;
  filters: any[];
  priceBounds: { min: number; max: number } | null;
  category: any;
  productsResponse: any;
}

/**
 * Build the CategoryService.getCategory query variables from config + query params.
 * Mirrors the logic in ProductGrid.lite.tsx fetchProducts().
 */
export function buildCategoryQueryVariables(
  config: ProductGridComposableConfig,
  query: ProductGridQuery,
  currentSortField: string,
  currentSortOrder: string,
): CategoryQueryVariables {
  const language = config.language || 'NL';
  const taxZone = config.taxZone || 'NL';
  const isWideSearch = !!(query.term) || !!(query.brand);

  const catId = isWideSearch
    ? (config.baseCategoryId || 0)
    : (query.categoryId || config.baseCategoryId || 0);

  // Default to RELEVANCE sort when searching by term
  const sortField = query.sortField || currentSortField || (query.term ? Enums.ProductSortField.RELEVANCE : '');
  const sortOrder = query.sortOrder || currentSortOrder || 'ASC';

  const searchInput: CategoryProductSearchInput = {
    language,
    page: query.page || 1,
    offset: query.pageSize || 12,
    hidden: false,
    ...(config.companyId && { companyId: config.companyId }),
    ...(config.user && {
      userId: 'contactId' in config.user
        ? (config.user as Contact)?.contactId
        : (config.user as Customer)?.customerId,
    }),
    statuses: [
      Enums.ProductStatus.A,
      Enums.ProductStatus.P,
      Enums.ProductStatus.T,
      Enums.ProductStatus.S,
    ],
    ...(query.term && {
      term: query.term,
      searchFields: [
        {
          fieldNames: [
            Enums.ProductSearchableField.NAME,
            Enums.ProductSearchableField.KEYWORDS,
            Enums.ProductSearchableField.SKU,
            Enums.ProductSearchableField.CUSTOM_KEYWORDS,
          ],
          boost: 5,
        },
        {
          fieldNames: [
            Enums.ProductSearchableField.DESCRIPTION,
            Enums.ProductSearchableField.MANUFACTURER,
            Enums.ProductSearchableField.MANUFACTURER_CODE,
            Enums.ProductSearchableField.EAN_CODE,
            Enums.ProductSearchableField.BAR_CODE,
            Enums.ProductSearchableField.CLUSTER_ID,
            Enums.ProductSearchableField.CUSTOM_KEYWORDS,
            Enums.ProductSearchableField.PRODUCT_ID,
            Enums.ProductSearchableField.SHORT_DESCRIPTION,
            Enums.ProductSearchableField.SUPPLIER,
            Enums.ProductSearchableField.SUPPLIER_CODE,
          ],
          boost: 1,
        },
      ],
    }),
    ...(query.brand && { manufacturers: [query.brand] }),
    ...(query.textFilters?.length && { textFilters: query.textFilters }),
    ...(query.priceFilterMin !== undefined || query.priceFilterMax !== undefined
      ? {
          price: {
            from: query.priceFilterMin || 0,
            to: query.priceFilterMax || 999999,
          },
        }
      : {}),
    ...(sortField && {
      sortInputs: [
        {
          field: sortField as Enums.ProductSortField,
          order: sortOrder as Enums.SortOrder,
        },
      ],
    }),
  };

  return {
    categoryId: catId,
    language,
    imageSearchFilters: config.imageSearchFilters || ({} as MediaImageProductSearchInput),
    imageVariantFilters: config.imageVariantFilters || ({} as TransformationsInput),
    filterAvailableAttributeInput: { isSearchable: true },
    priceCalculateProductInput: {
      taxZone,
      ...(config.companyId && { companyId: config.companyId }),
      ...(config.user && 'contactId' in config.user && {
        contactId: (config.user as Contact)?.contactId,
      }),
      ...(config.user && 'customerId' in config.user && {
        customerId: (config.user as Customer)?.customerId,
      }),
    },
    categoryProductSearchInput: searchInput,
  } as CategoryQueryVariables;
}

/**
 * Filter items by language and adjust the total count.
 * Removes products/clusters that don't have a name in the target language.
 */
export function filterByLanguage(
  items: (Product | Cluster)[],
  language: string,
  apiTotal: number,
): { filtered: (Product | Cluster)[]; adjustedTotal: number } {
  const filtered = items.filter((item) => {
    const names = (item as Product).names || (item as Cluster).names || [];
    return names.some((n: { language?: string }) => n.language === language);
  });

  const untranslatedCount = items.length - filtered.length;
  return {
    filtered,
    adjustedTotal: apiTotal - untranslatedCount,
  };
}

/**
 * Execute the product grid fetch and return structured results.
 */
export async function fetchProducts(
  config: ProductGridComposableConfig,
  query: ProductGridQuery,
  currentSortField: string,
  currentSortOrder: string,
): Promise<FetchProductsResult> {
  const service = new CategoryService(config.graphqlClient);
  const language = config.language || 'NL';

  const variables = buildCategoryQueryVariables(config, query, currentSortField, currentSortOrder);
  const result = await service.getCategory(variables);

  const allItems = (result?.products?.items || []) as (Product | Cluster)[];
  const apiTotal = (result?.products as any)?.itemsFound ?? allItems.length;
  const { filtered, adjustedTotal } = filterByLanguage(allItems, language, apiTotal);

  return {
    items: filtered,
    itemsFound: adjustedTotal,
    totalPages: result?.products?.pages || 1,
    filters: (result?.products?.filters || []) as any[],
    priceBounds:
      result?.products?.minPrice !== undefined && result?.products?.maxPrice !== undefined
        ? { min: result.products.minPrice, max: result.products.maxPrice }
        : null,
    category: result || null,
    productsResponse: result?.products || null,
  };
}

/**
 * Check if an item is a cluster (has clusterId).
 */
export function isClusterItem(item: Product | Cluster): item is Cluster {
  return !!(item as any)?.clusterId;
}
