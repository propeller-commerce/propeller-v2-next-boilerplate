import type {
  GraphQLClient,
  Product,
  Cluster,
  Contact,
  Customer,
  AttributeFilter,
  ProductTextFilterInput,
  ProductsResponse,
  Category,
  MediaImageProductSearchInput,
  TransformationsInput,
} from 'propeller-sdk-v2';
import type { AsyncState } from '../core/types';

export interface ProductGridComposableConfig {
  graphqlClient: GraphQLClient;
  language?: string;
  taxZone?: string;
  user?: Contact | Customer | null;
  companyId?: number;
  imageSearchFilters?: MediaImageProductSearchInput;
  imageVariantFilters?: TransformationsInput;
  /** Base category ID used for search/brand mode. */
  baseCategoryId?: number;
}

export interface ProductGridQuery {
  categoryId?: number;
  term?: string;
  brand?: string;
  textFilters?: ProductTextFilterInput[];
  priceFilterMin?: number;
  priceFilterMax?: number;
  sortField?: string;
  sortOrder?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductGridState extends AsyncState {
  items: (Product | Cluster)[];
  currentPage: number;
  totalPages: number;
  itemsFound: number;
  currentSortField: string;
  currentSortOrder: string;
  filters: AttributeFilter[];
  priceBounds: { min: number; max: number } | null;
  category: Category | null;
  productsResponse: ProductsResponse | null;
}

export interface ProductGridComposable {
  getState: () => ProductGridState;
  subscribe: (listener: () => void) => () => void;
  fetch: (query: ProductGridQuery) => Promise<void>;
  goToPage: (page: number) => void;
  setSort: (field: string, order: string) => void;
}
