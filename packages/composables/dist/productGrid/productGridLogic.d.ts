import { CategoryQueryVariables, Product, Cluster } from 'propeller-sdk-v2';
import type { ProductGridComposableConfig, ProductGridQuery } from './types';
export interface FetchProductsResult {
    items: (Product | Cluster)[];
    itemsFound: number;
    totalPages: number;
    filters: any[];
    priceBounds: {
        min: number;
        max: number;
    } | null;
    category: any;
    productsResponse: any;
}
/**
 * Build the CategoryService.getCategory query variables from config + query params.
 * Mirrors the logic in ProductGrid.lite.tsx fetchProducts().
 */
export declare function buildCategoryQueryVariables(config: ProductGridComposableConfig, query: ProductGridQuery, currentSortField: string, currentSortOrder: string): CategoryQueryVariables;
/**
 * Filter items by language and adjust the total count.
 * Removes products/clusters that don't have a name in the target language.
 */
export declare function filterByLanguage(items: (Product | Cluster)[], language: string, apiTotal: number): {
    filtered: (Product | Cluster)[];
    adjustedTotal: number;
};
/**
 * Execute the product grid fetch and return structured results.
 */
export declare function fetchProducts(config: ProductGridComposableConfig, query: ProductGridQuery, currentSortField: string, currentSortOrder: string): Promise<FetchProductsResult>;
/**
 * Check if an item is a cluster (has clusterId).
 */
export declare function isClusterItem(item: Product | Cluster): item is Cluster;
//# sourceMappingURL=productGridLogic.d.ts.map