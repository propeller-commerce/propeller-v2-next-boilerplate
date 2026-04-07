/**
 * usePagination (Vue) — Shared pagination logic.
 *
 * Used by useOrders, useProductSearch, useFavorites, and any composable
 * with paged API results.
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue';

export interface PaginationState {
  currentPage: Ref<number>;
  totalPages: Ref<number>;
  totalItems: Ref<number>;
  itemsPerPage: Ref<number>;
  hasNextPage: ComputedRef<boolean>;
  hasPreviousPage: ComputedRef<boolean>;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  setFromResponse: (response: { itemsFound?: number; pages?: number; offset?: number }) => void;
  reset: () => void;
}

export function usePagination(initialItemsPerPage = 10): PaginationState {
  const currentPage = ref(1);
  const totalPages = ref(1);
  const totalItems = ref(0);
  const itemsPerPage = ref(initialItemsPerPage);

  const hasNextPage = computed(() => currentPage.value < totalPages.value);
  const hasPreviousPage = computed(() => currentPage.value > 1);

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages.value) {
      currentPage.value = page;
    }
  }

  function nextPage() {
    if (hasNextPage.value) currentPage.value++;
  }

  function previousPage() {
    if (hasPreviousPage.value) currentPage.value--;
  }

  function setFromResponse(response: { itemsFound?: number; pages?: number; offset?: number }) {
    totalItems.value = response.itemsFound ?? 0;
    totalPages.value =
      response.pages ??
      Math.ceil((response.itemsFound ?? 0) / (response.offset ?? itemsPerPage.value));
    if (response.offset) {
      itemsPerPage.value = response.offset;
    }
  }

  function reset() {
    currentPage.value = 1;
    totalPages.value = 1;
    totalItems.value = 0;
  }

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
