<template>
  <div
    :class="`space-y-4 ${isMobile ? 'pb-8' : 'sticky top-24'} ${
      className || ''
    }`"
  >
    <template
      v-if="
        showPriceFilter() && (priceMin !== undefined || priceMax !== undefined)
      "
    >
      <div class="space-y-3">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Price Range
        </h3>
        <div class="flex items-center gap-2">
          <div class="relative flex-1">
            <span
              class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none"
              >€</span
            ><input
              type="number"
              class="w-full pl-6 pr-2 h-8 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
              :value="currentMin"
              :min="getMinBound()"
              :max="getMaxBound()"
              @change="
                async (e) => handleMinChange(parseFloat(e.target.value) || 0)
              "
              @blur="async (event) => applyPrice()"
            />
          </div>
          <span class="text-gray-400 text-sm select-none">–</span>
          <div class="relative flex-1">
            <span
              class="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none"
              >€</span
            ><input
              type="number"
              class="w-full pl-6 pr-2 h-8 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
              :value="currentMax"
              :min="getMinBound()"
              :max="getMaxBound()"
              @change="
                async (e) => handleMaxChange(parseFloat(e.target.value) || 0)
              "
              @blur="async (event) => applyPrice()"
            />
          </div>
        </div>
        <div class="relative h-4 pt-1">
          <input
            type="range"
            class="absolute w-full h-1.5 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-600 [&::-webkit-slider-thumb]:cursor-pointer z-20"
            :min="getMinBound()"
            :max="getMaxBound()"
            :value="currentMin"
            @change="
              async (e) => {
                handleMinChange(parseFloat(e.target.value));
                applyPrice();
              }
            "
          /><input
            type="range"
            class="absolute w-full h-1.5 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-600 [&::-webkit-slider-thumb]:cursor-pointer z-20"
            :min="getMinBound()"
            :max="getMaxBound()"
            :value="currentMax"
            @change="
              async (e) => {
                handleMaxChange(parseFloat(e.target.value));
                applyPrice();
              }
            "
          />
          <div
            class="absolute top-1.5 left-0 right-0 h-1.5 bg-gray-200 rounded z-10"
          ></div>
        </div>
      </div>
      <div class="h-px bg-gray-100"></div>
    </template>

    <template v-if="filters.length === 0">
      <p class="text-sm text-gray-400 italic">No filters available</p>
    </template>

    <template :key="index" v-for="(filter, index) in getFilteredFilters()">
      <div class="border-b border-gray-100 pb-3 last:border-b-0">
        <button
          type="button"
          class="w-full flex items-center justify-between gap-2 text-left py-1 hover:text-violet-600 transition-colors"
          @click="async (event) => toggleAccordion(getFilterName(filter))"
        >
          <span class="text-sm font-semibold text-gray-700 truncate">{{
            getFilterTitle(filter)
          }}</span
          ><svg
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            :class="`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
              isExpanded(getFilterName(filter)) ? 'rotate-180' : ''
            }`"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
              :strokeWidth="2"
            ></path>
          </svg>
        </button>
        <template v-if="isExpanded(getFilterName(filter))">
          <div class="pt-2 space-y-1.5">
            <template
              :key="index"
              v-for="(option, index) in getValidOptions(filter)"
            >
              <label class="flex items-center gap-2 cursor-pointer group"
                ><input
                  type="checkbox"
                  class="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer flex-shrink-0"
                  :checked="isSelected(getFilterName(filter), option.value)"
                  @change="
                    async (e) =>
                      handleCheckbox(filter, option.value, e.target.checked)
                  "
                /><span
                  class="flex-1 text-sm text-gray-600 leading-none select-none group-hover:text-gray-900"
                  >{{ option.value
                  }}<span class="ml-1 text-xs text-gray-400">
                    ({{ getCount(option) }})
                  </span></span
                ></label
              >
            </template>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

import { Contact, Customer, AttributeFilter } from "propeller-sdk-v2";

export interface GridFiltersProps {
  /**
   * Attribute filter definitions from the ProductGrid API response.
   * Each entry describes one filterable attribute (e.g. colour, brand, size).
   */
  filters: AttributeFilter[];

  /**
   * Price bounds { min, max } from the current product set.
   * When absent the price section is hidden.
   */
  priceMin?: number;
  priceMax?: number;

  /** Language code. Defaults to 'NL'. */
  language?: string;

  /** Notification called after every filter change. */
  getSelectedFilters?: () => void;

  /**
   * Called on every checkbox toggle.
   * `filter` is the AttributeFilter; `value` is the toggled option string.
   */
  onFilterChange: (filter: AttributeFilter, value: string | number) => void;

  /**
   * Called when the price range changes (on blur / slider release).
   */
  onPriceChange?: (minPrice: number, maxPrice: number) => void;

  /** Called when "Clear all" is clicked. */
  onClearFilters?: () => void;

  /** Enable mobile-specific behaviour (drops sticky positioning). */
  isMobile?: boolean;

  /**
   * 'open' — show price filter for all users.
   * 'semi-closed' — hide price filter for unauthenticated users.
   */
  portalMode?: string;

  /** Authenticated user — price filter visibility depends on this in semi-closed mode. */
  user?: Contact | Customer | null;

  /**
   * Whether filter accordions start collapsed.
   * Defaults to true.
   */
  collapsed?: boolean;

  /** Increment this counter to reset all selected filters and price inputs externally. */
  clearSignal?: number;

  /** Extra CSS class on the root element. */
  className?: string;
}
interface GridFiltersState {
  selectedFilters: Record<string, string[]>;
  currentMin: number;
  currentMax: number;
  expandedFilters: Record<string, boolean>;
  showPriceFilter: () => boolean;
  getFilterName: (filter: AttributeFilter) => string;
  getFilterTitle: (filter: AttributeFilter) => string;
  getFilteredFilters: () => AttributeFilter[];
  getValidOptions: (filter: AttributeFilter) => any[];
  getSelectedCount: () => number;
  hasActiveFilters: () => boolean;
  isSelected: (filterName: string, value: string) => boolean;
  isExpanded: (filterName: string) => boolean;
  toggleAccordion: (filterName: string) => void;
  handleCheckbox: (
    filter: AttributeFilter,
    value: string,
    checked: boolean
  ) => void;
  handleMinChange: (value: number) => void;
  handleMaxChange: (value: number) => void;
  applyPrice: () => void;
  clearAll: () => void;
  getCount: (option: any) => number;
  getMinBound: () => number;
  getMaxBound: () => number;
}

const props = defineProps<GridFiltersProps>();
const selectedFilters = ref<GridFiltersState["selectedFilters"]>({});
const currentMin = ref<GridFiltersState["currentMin"]>(0);
const currentMax = ref<GridFiltersState["currentMax"]>(9999);
const expandedFilters = ref<GridFiltersState["expandedFilters"]>({});

watch(
  () => [props.filters],
  () => {
    const currentExp = expandedFilters.value as Record<string, boolean>;
    const open = props.collapsed === false;
    const nextExp: Record<string, boolean> = {
      ...currentExp,
    };
    let changed = false;
    ((props.filters as AttributeFilter[]) || []).forEach(
      (f: AttributeFilter) => {
        const n = f?.attributeDescription?.name;
        if (n && nextExp[n] === undefined) {
          nextExp[n] = open;
          changed = true;
        }
      }
    );
    const sel = selectedFilters.value as Record<string, string[]>;
    Object.keys(nextExp).forEach((k: string) => {
      if (nextExp[k] && !(sel[k] || []).length) {
        nextExp[k] = false;
        changed = true;
      }
    });
    if (changed) expandedFilters.value = nextExp;
  },
  { immediate: true }
);
watch(
  () => [props.priceMin, props.priceMax],
  () => {
    currentMin.value = (props.priceMin as number) || 0;
    currentMax.value = (props.priceMax as number) || 9999;
  },
  { immediate: true }
);
watch(
  () => [props.clearSignal],
  () => {
    if (props.clearSignal === undefined) return;
    selectedFilters.value = {};
    currentMin.value = (props.priceMin as number) || 0;
    currentMax.value = (props.priceMax as number) || 9999;
    expandedFilters.value = {};
  },
  { immediate: true }
);
function showPriceFilter(): ReturnType<GridFiltersState["showPriceFilter"]> {
  const mode = (props.portalMode as string) || "open";
  if (mode === "open") return true;
  return !!props.user;
}
function getFilterName(
  filter: AttributeFilter
): ReturnType<GridFiltersState["getFilterName"]> {
  return (filter as AttributeFilter)?.attributeDescription?.name || "";
}
function getFilterTitle(
  filter: AttributeFilter
): ReturnType<GridFiltersState["getFilterTitle"]> {
  return (
    (filter as AttributeFilter)?.attributeDescription?.descriptions?.[0]
      ?.value ||
    (filter as AttributeFilter)?.attributeDescription?.name ||
    ""
  );
}
function getFilteredFilters(): ReturnType<
  GridFiltersState["getFilteredFilters"]
> {
  const list = (props.filters as AttributeFilter[]) || [];
  return list.filter((f: AttributeFilter) => {
    const opts = (f?.textFilters as any[]) || [];
    return opts.some(
      (o: any) => (o?.count || 0) > 0 || (o?.countActive || 0) > 0
    );
  });
}
function getValidOptions(
  filter: AttributeFilter
): ReturnType<GridFiltersState["getValidOptions"]> {
  return (((filter as AttributeFilter)?.textFilters as any[]) || []).filter(
    (o: any) => (o?.count || 0) > 0 || (o?.countActive || 0) > 0
  );
}
function getSelectedCount(): ReturnType<GridFiltersState["getSelectedCount"]> {
  let n = 0;
  const sel = selectedFilters.value as Record<string, string[]>;
  Object.keys(sel).forEach((k: string) => {
    n += (sel[k] || []).length;
  });
  return n;
}
function hasActiveFilters(): ReturnType<GridFiltersState["hasActiveFilters"]> {
  const sel = selectedFilters.value as Record<string, string[]>;
  return Object.keys(sel).some((k: string) => (sel[k] || []).length > 0);
}
function isSelected(
  filterName: string,
  value: string
): ReturnType<GridFiltersState["isSelected"]> {
  return (
    (selectedFilters.value as Record<string, string[]>)[filterName] || []
  ).includes(value);
}
function isExpanded(
  filterName: string
): ReturnType<GridFiltersState["isExpanded"]> {
  const stored = (expandedFilters.value as Record<string, boolean>)[filterName];
  if (stored === undefined) return props.collapsed === false;
  return !!stored;
}
function toggleAccordion(
  filterName: string
): ReturnType<GridFiltersState["toggleAccordion"]> {
  const cur = !!(expandedFilters.value as Record<string, boolean>)[filterName];
  expandedFilters.value = {
    ...expandedFilters.value,
    [filterName]: !cur,
  };
}
function handleCheckbox(
  filter: AttributeFilter,
  value: string,
  checked: boolean
): ReturnType<GridFiltersState["handleCheckbox"]> {
  const name = (filter as AttributeFilter)?.attributeDescription?.name || "";
  const cur = (selectedFilters.value as Record<string, string[]>)[name] || [];
  const next = checked
    ? [...cur, value]
    : cur.filter((v: string) => v !== value);
  selectedFilters.value = {
    ...selectedFilters.value,
    [name]: next,
  };
  if (next.length === 0) {
    expandedFilters.value = {
      ...expandedFilters.value,
      [name]: false,
    };
  }
  props.onFilterChange(filter, value);
  if (props.getSelectedFilters) props.getSelectedFilters();
}
function handleMinChange(
  value: number
): ReturnType<GridFiltersState["handleMinChange"]> {
  const n = value > currentMax.value ? currentMax.value : value;
  currentMin.value = n;
}
function handleMaxChange(
  value: number
): ReturnType<GridFiltersState["handleMaxChange"]> {
  const n = value < currentMin.value ? currentMin.value : value;
  currentMax.value = n;
}
function applyPrice(): ReturnType<GridFiltersState["applyPrice"]> {
  if (props.onPriceChange)
    props.onPriceChange(currentMin.value, currentMax.value);
  if (props.getSelectedFilters) props.getSelectedFilters();
}
function clearAll(): ReturnType<GridFiltersState["clearAll"]> {
  selectedFilters.value = {};
  currentMin.value = (props.priceMin as number) || 0;
  currentMax.value = (props.priceMax as number) || 9999;
  if (props.onClearFilters) props.onClearFilters();
  if (props.getSelectedFilters) props.getSelectedFilters();
}
function getCount(option: any): ReturnType<GridFiltersState["getCount"]> {
  const c = option?.count || 0;
  const ca = option?.countActive || 0;
  return c === 0 && ca > 0 ? ca : c;
}
function getMinBound(): ReturnType<GridFiltersState["getMinBound"]> {
  return (props.priceMin as number) || 0;
}
function getMaxBound(): ReturnType<GridFiltersState["getMaxBound"]> {
  return (props.priceMax as number) || 9999;
}
</script>