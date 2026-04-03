"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCategoryQueryVariables = buildCategoryQueryVariables;
exports.filterByLanguage = filterByLanguage;
exports.fetchProducts = fetchProducts;
exports.isClusterItem = isClusterItem;
const propeller_sdk_v2_1 = require("propeller-sdk-v2");
/**
 * Build the CategoryService.getCategory query variables from config + query params.
 * Mirrors the logic in ProductGrid.lite.tsx fetchProducts().
 */
function buildCategoryQueryVariables(config, query, currentSortField, currentSortOrder) {
    const language = config.language || 'NL';
    const taxZone = config.taxZone || 'NL';
    const isWideSearch = !!(query.term) || !!(query.brand);
    const catId = isWideSearch
        ? (config.baseCategoryId || 0)
        : (query.categoryId || config.baseCategoryId || 0);
    // Default to RELEVANCE sort when searching by term
    const sortField = query.sortField || currentSortField || (query.term ? propeller_sdk_v2_1.Enums.ProductSortField.RELEVANCE : '');
    const sortOrder = query.sortOrder || currentSortOrder || 'ASC';
    const searchInput = {
        language,
        page: query.page || 1,
        offset: query.pageSize || 12,
        hidden: false,
        ...(config.companyId && { companyId: config.companyId }),
        ...(config.user && {
            userId: 'contactId' in config.user
                ? config.user?.contactId
                : config.user?.customerId,
        }),
        statuses: [
            propeller_sdk_v2_1.Enums.ProductStatus.A,
            propeller_sdk_v2_1.Enums.ProductStatus.P,
            propeller_sdk_v2_1.Enums.ProductStatus.T,
            propeller_sdk_v2_1.Enums.ProductStatus.S,
        ],
        ...(query.term && {
            term: query.term,
            searchFields: [
                {
                    fieldNames: [
                        propeller_sdk_v2_1.Enums.ProductSearchableField.NAME,
                        propeller_sdk_v2_1.Enums.ProductSearchableField.KEYWORDS,
                        propeller_sdk_v2_1.Enums.ProductSearchableField.SKU,
                        propeller_sdk_v2_1.Enums.ProductSearchableField.CUSTOM_KEYWORDS,
                    ],
                    boost: 5,
                },
                {
                    fieldNames: [
                        propeller_sdk_v2_1.Enums.ProductSearchableField.DESCRIPTION,
                        propeller_sdk_v2_1.Enums.ProductSearchableField.MANUFACTURER,
                        propeller_sdk_v2_1.Enums.ProductSearchableField.MANUFACTURER_CODE,
                        propeller_sdk_v2_1.Enums.ProductSearchableField.EAN_CODE,
                        propeller_sdk_v2_1.Enums.ProductSearchableField.BAR_CODE,
                        propeller_sdk_v2_1.Enums.ProductSearchableField.CLUSTER_ID,
                        propeller_sdk_v2_1.Enums.ProductSearchableField.CUSTOM_KEYWORDS,
                        propeller_sdk_v2_1.Enums.ProductSearchableField.PRODUCT_ID,
                        propeller_sdk_v2_1.Enums.ProductSearchableField.SHORT_DESCRIPTION,
                        propeller_sdk_v2_1.Enums.ProductSearchableField.SUPPLIER,
                        propeller_sdk_v2_1.Enums.ProductSearchableField.SUPPLIER_CODE,
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
                    field: sortField,
                    order: sortOrder,
                },
            ],
        }),
    };
    return {
        categoryId: catId,
        language,
        imageSearchFilters: config.imageSearchFilters || {},
        imageVariantFilters: config.imageVariantFilters || {},
        filterAvailableAttributeInput: { isSearchable: true },
        priceCalculateProductInput: {
            taxZone,
            ...(config.companyId && { companyId: config.companyId }),
            ...(config.user && 'contactId' in config.user && {
                contactId: config.user?.contactId,
            }),
            ...(config.user && 'customerId' in config.user && {
                customerId: config.user?.customerId,
            }),
        },
        categoryProductSearchInput: searchInput,
    };
}
/**
 * Filter items by language and adjust the total count.
 * Removes products/clusters that don't have a name in the target language.
 */
function filterByLanguage(items, language, apiTotal) {
    const filtered = items.filter((item) => {
        const names = item.names || item.names || [];
        return names.some((n) => n.language === language);
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
async function fetchProducts(config, query, currentSortField, currentSortOrder) {
    const service = new propeller_sdk_v2_1.CategoryService(config.graphqlClient);
    const language = config.language || 'NL';
    const variables = buildCategoryQueryVariables(config, query, currentSortField, currentSortOrder);
    const result = await service.getCategory(variables);
    const allItems = (result?.products?.items || []);
    const apiTotal = result?.products?.itemsFound ?? allItems.length;
    const { filtered, adjustedTotal } = filterByLanguage(allItems, language, apiTotal);
    return {
        items: filtered,
        itemsFound: adjustedTotal,
        totalPages: result?.products?.pages || 1,
        filters: (result?.products?.filters || []),
        priceBounds: result?.products?.minPrice !== undefined && result?.products?.maxPrice !== undefined
            ? { min: result.products.minPrice, max: result.products.maxPrice }
            : null,
        category: result || null,
        productsResponse: result?.products || null,
    };
}
/**
 * Check if an item is a cluster (has clusterId).
 */
function isClusterItem(item) {
    return !!item?.clusterId;
}
//# sourceMappingURL=productGridLogic.js.map