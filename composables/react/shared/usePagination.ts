/**
 * usePagination (React) — Shared pagination logic.
 *
 * React hook mirror of vue/shared/usePagination.ts.
 */

import { useState, useCallback } from 'react';

export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setFromResponse: (response: { itemsFound?: number; pages?: number; offset?: number }) => void;
  reset: () => void;
}

export function usePagination(initialItemsPerPage = 10): PaginationState {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage);

  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const goToPage = useCallback((page: number) => {
    setCurrentPage((prev) => {
      if (page >= 1 && page <= totalPages) return page;
      return prev;
    });
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => (prev < totalPages ? prev + 1 : prev));
  }, [totalPages]);

  const previousPage = useCallback(() => {
    setCurrentPage((prev) => (prev > 1 ? prev - 1 : prev));
  }, []);

  const setFromResponse = useCallback(
    (response: { itemsFound?: number; pages?: number; offset?: number }) => {
      const items = response.itemsFound ?? 0;
      const perPage = response.offset ?? itemsPerPage;
      setTotalItems(items);
      setTotalPages(response.pages ?? Math.ceil(items / perPage));
      if (response.offset) setItemsPerPage(response.offset);
    },
    [itemsPerPage]
  );

  const reset = useCallback(() => {
    setCurrentPage(1);
    setTotalPages(1);
    setTotalItems(0);
  }, []);

  return {
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    setFromResponse,
    reset,
  };
}
