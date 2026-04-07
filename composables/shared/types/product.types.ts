import type {
  Product,
  Cluster,
  ProductsResponse,
  AttributeResult,
  GraphQLClient,
} from 'propeller-sdk-v2';

export interface ProductSearchOptions {
  graphqlClient: GraphQLClient;
  language?: string;
  itemsPerPage?: number;
}

export interface ProductSearchFilters {
  categoryId?: number;
  brandId?: number;
  searchTerm?: string;
  priceFrom?: number;
  priceTo?: number;
  attributeFilters?: Record<string, string[]>;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface ProductInfoOptions {
  graphqlClient: GraphQLClient;
  language?: string;
  configuration?: any;
}

export interface AttributeValueResult {
  values: string[];
  displayName: string;
  type: string;
}

export type { Product, Cluster, ProductsResponse, AttributeResult };
