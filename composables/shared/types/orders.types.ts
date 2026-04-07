import type {
  Order,
  OrderItem,
  GraphQLClient,
} from 'propeller-sdk-v2';

export interface OrderSearchFilters {
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  priceFrom?: number;
  priceTo?: number;
  status?: string;
}

export interface OrderListOptions {
  graphqlClient: GraphQLClient;
  user: import('propeller-sdk-v2').Contact | import('propeller-sdk-v2').Customer | null;
  companyId?: number;
  language?: string;
  itemsPerPage?: number;
}

export type PdfDownloadResult =
  | { success: true }
  | { success: false; error: string };

export type ReorderResult =
  | { success: true; cart: import('propeller-sdk-v2').Cart }
  | { success: false; error: string };

export type { Order, OrderItem };
