<template>
  <div :class="`${className || ''}`">
    <template v-if="showPagination()">
      <template v-if="(variant || 'compact') === 'compact'">
        <div class="flex justify-center items-center gap-2">
          <button
            type="button"
            class="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="getCurrentPage() === 1"
            @click="async (event) => handlePageChange(getCurrentPage() - 1)"
          >
            {{ getLabel('previous') }}</button
          ><span class="px-2 text-sm font-medium text-gray-700"
            >{{ getLabel('page') }}&nbsp;{{ getCurrentPage() }}&nbsp;{{ getLabel('of') }}&nbsp;{{
              getTotalPages()
            }}</span
          ><button
            type="button"
            class="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="getCurrentPage() === getTotalPages()"
            @click="async (event) => handlePageChange(getCurrentPage() + 1)"
          >
            {{ getLabel('next') }}
          </button>
        </div>
      </template>

      <template v-if="(variant || 'compact') === 'full'">
        <div class="flex justify-center items-center gap-1 flex-wrap">
          <button
            type="button"
            class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="getCurrentPage() === 1"
            @click="async (event) => handlePageChange(getCurrentPage() - 1)"
          >
            {{ getLabel('previous') }}</button
          ><template
            :key="item.type === 'dots' ? `dots-${idx}` : `page-${item.value}`"
            v-for="(item, idx) in getFullPages()"
          >
            <div class="inline-flex">
              <template v-if="item.type === 'dots'">
                <span
                  class="inline-flex items-center justify-center min-w-[2rem] px-1 py-2 text-sm text-gray-500 select-none"
                >
                  ...
                </span>
              </template>

              <template v-if="item.type === 'page'">
                <button
                  type="button"
                  @click="async (event) => handlePageChange(item.value)"
                  :class="
                    item.value === getCurrentPage()
                      ? 'inline-flex items-center justify-center min-w-[2.25rem] rounded-md border border-primary bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm'
                      : 'inline-flex items-center justify-center min-w-[2.25rem] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50'
                  "
                >
                  {{ item.value }}
                </button>
              </template>
            </div> </template
          ><button
            type="button"
            class="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="getCurrentPage() === getTotalPages()"
            @click="async (event) => handlePageChange(getCurrentPage() + 1)"
          >
            {{ getLabel('next') }}
          </button>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ProductsResponse } from 'propeller-sdk-v2';
// Built-in label defaults (can be overridden via the labels prop).
const DEFAULT_LABELS: Record<string, string> = {
  previous: 'Previous',
  next: 'Next',
  page: 'Page',
  of: 'of',
};

// Built-in label defaults (can be overridden via the labels prop).

export interface GridPaginationProps {
  /**
   * A ProductsResponse object for populating the pagination component.
   * Reads `page` (current page), `pages` (total pages) from the response.
   */
  products: ProductsResponse;

  /**
   * Called when the user navigates to a different page.
   * Receives the newly selected page number (1-based).
   */
  onPageChange: (page: number) => void;

  /**
   * Pagination display variant.
   * 'compact' — Previous / "Page X of Y" / Next.
   * 'full'    — numbered page buttons with ellipsis collapsing + Previous / Next.
   * Defaults to 'compact'.
   */
  variant?: string;

  /**
   * Number of visible page buttons rendered around the current page in 'full' style.
   * Defaults to 5.
   */
  siblingCount?: number;

  /**
   * Label overrides for the text inside the component.
   * Supported keys: previous, next, page, of
   */
  labels?: Record<string, string>;

  /** Extra CSS class applied to the root element. */
  className?: string;
}

/** Single item in the computed full-style page list. */
// Built-in label defaults (can be overridden via the labels prop).

/** Single item in the computed full-style page list. */
interface PageItem {
  /** 'page' renders a numbered button; 'dots' renders an ellipsis spacer. */
  type: string;
  /** Page number for 'page' items; negative unique sentinel for 'dots' items. */
  value: number;
}
// Built-in label defaults (can be overridden via the labels prop).

/** Single item in the computed full-style page list. */

interface GridPaginationState {
  getLabel: (key: string) => string;
  getTotalPages: () => number;
  getCurrentPage: () => number;
  showPagination: () => boolean;
  getFullPages: () => PageItem[];
  handlePageChange: (page: number) => void;
}

const props = defineProps<GridPaginationProps>();

function getLabel(key: string): ReturnType<GridPaginationState['getLabel']> {
  const labels = (props.labels as Record<string, string>) || {};
  return labels[key] !== undefined ? labels[key] : DEFAULT_LABELS[key] || key;
}
function getTotalPages(): ReturnType<GridPaginationState['getTotalPages']> {
  return (props.products as ProductsResponse)?.pages || 1;
}
function getCurrentPage(): ReturnType<GridPaginationState['getCurrentPage']> {
  return (props.products as ProductsResponse)?.page || 1;
}
function showPagination(): ReturnType<GridPaginationState['showPagination']> {
  return getTotalPages() > 1;
}
function getFullPages(): ReturnType<GridPaginationState['getFullPages']> {
  const total = getTotalPages();
  const current = getCurrentPage();
  const sibling = (props.siblingCount as number) || 5;

  // All pages fit without collapsing — show them all.
  if (total <= sibling + 4) {
    const items: PageItem[] = [];
    for (let i = 1; i <= total; i++)
      items.push({
        type: 'page',
        value: i,
      });
    return items;
  }

  // Compute sibling window, always staying inside [2, total-1].
  const halfSib = Math.floor(sibling / 2);
  let rangeStart = Math.max(2, current - halfSib);
  let rangeEnd = Math.min(total - 1, current + halfSib);

  // Stretch the range to ensure exactly siblingCount slots when near an edge.
  if (rangeEnd - rangeStart + 1 < sibling) {
    if (rangeStart === 2) {
      rangeEnd = Math.min(total - 1, rangeStart + sibling - 1);
    } else {
      rangeStart = Math.max(2, rangeEnd - sibling + 1);
    }
  }
  const items: PageItem[] = [];

  // First page
  items.push({
    type: 'page',
    value: 1,
  });

  // Left ellipsis (value -1 is a unique sentinel)
  if (rangeStart > 2)
    items.push({
      type: 'dots',
      value: -1,
    });

  // Sibling window
  for (let i = rangeStart; i <= rangeEnd; i++) {
    items.push({
      type: 'page',
      value: i,
    });
  }

  // Right ellipsis (value -2 is a unique sentinel)
  if (rangeEnd < total - 1)
    items.push({
      type: 'dots',
      value: -2,
    });

  // Last page
  items.push({
    type: 'page',
    value: total,
  });
  return items;
}
function handlePageChange(page: number): ReturnType<GridPaginationState['handlePageChange']> {
  if (props.onPageChange) props.onPageChange(page);
}
</script>
