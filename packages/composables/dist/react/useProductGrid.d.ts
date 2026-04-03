import type { ProductGridComposableConfig } from '../productGrid/types';
export declare function useProductGrid(config: ProductGridComposableConfig): {
    fetch: (query: import("../productGrid/types").ProductGridQuery) => Promise<void>;
    goToPage: (page: number) => void;
    setSort: (field: string, order: string) => void;
    items: (import("propeller-sdk-v2").Product | import("propeller-sdk-v2").Cluster)[];
    currentPage: number;
    totalPages: number;
    itemsFound: number;
    currentSortField: string;
    currentSortOrder: string;
    filters: import("propeller-sdk-v2").AttributeFilter[];
    priceBounds: {
        min: number;
        max: number;
    } | null;
    category: import("propeller-sdk-v2").Category | null;
    productsResponse: import("propeller-sdk-v2").ProductsResponse | null;
    loading: boolean;
    error: string | null;
};
//# sourceMappingURL=useProductGrid.d.ts.map