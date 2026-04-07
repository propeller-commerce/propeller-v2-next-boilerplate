export interface PaginatedResponse {
  itemsFound?: number;
  pages?: number;
  offset?: number;
}

export interface PageItem {
  type: 'page' | 'dots';
  value: number;
}

export interface PaginationOptions {
  initialPage?: number;
  itemsPerPage?: number;
}

export interface PaginationResult {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
