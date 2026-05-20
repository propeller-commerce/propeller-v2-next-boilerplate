'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import { Contact, Customer, AttributeFilter } from 'propeller-sdk-v2';

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

  /** Currently active text filters (URL-driven). Syncs internal checkbox state when filters are removed externally. */
  activeTextFilters?: Record<string, string[]>;

  /**
   * Currently active price filter min from URL state.
   * When both activePriceMin and activePriceMax become undefined the price inputs reset to the priceMin/priceMax bounds.
   */
  activePriceMin?: number;

  /** Currently active price filter max from URL state. */
  activePriceMax?: number;

  /**
   * When true, all checkboxes and price inputs are disabled.
   * Wire to ProductGrid's `onLoadingChange` to block rapid re-clicks while a fetch is in flight.
   */
  isLoading?: boolean;

  /** Extra CSS class on the root element. */
  className?: string;
}
interface GridFiltersState {
  selectedFilters: Record<string, string[]>;
  currentMin: number;
  currentMax: number;
  expandedFilters: Record<string, boolean>;
  isPending: boolean;
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
  handleCheckbox: (filter: AttributeFilter, value: string, checked: boolean) => void;
  handleMinChange: (value: number) => void;
  handleMaxChange: (value: number) => void;
  applyPrice: () => void;
  clearAll: () => void;
  getCount: (option: any) => number;
  getMinBound: () => number;
  getMaxBound: () => number;
}
function GridFilters(props: GridFiltersProps) {
  const [selectedFilters, setSelectedFilters] = useState<GridFiltersState['selectedFilters']>(
    () => ({})
  );
  const [currentMin, setCurrentMin] = useState<GridFiltersState['currentMin']>(() => 0);
  const [currentMax, setCurrentMax] = useState<GridFiltersState['currentMax']>(() => 9999);
  const [expandedFilters, setExpandedFilters] = useState<GridFiltersState['expandedFilters']>(
    () => ({})
  );
  const [isPending, setIsPending] = useState<GridFiltersState['isPending']>(() => false);
  function showPriceFilter(): ReturnType<GridFiltersState['showPriceFilter']> {
    const mode = (props.portalMode as string) || 'open';
    if (mode === 'open') return true;
    return !!props.user;
  }
  function getFilterName(filter: AttributeFilter): ReturnType<GridFiltersState['getFilterName']> {
    return (filter as AttributeFilter)?.attributeDescription?.name || '';
  }
  function getFilterTitle(filter: AttributeFilter): ReturnType<GridFiltersState['getFilterTitle']> {
    return (
      (filter as AttributeFilter)?.attributeDescription?.descriptions?.[0]?.value ||
      (filter as AttributeFilter)?.attributeDescription?.name ||
      ''
    );
  }
  function getFilteredFilters(): ReturnType<GridFiltersState['getFilteredFilters']> {
    const list = (props.filters as AttributeFilter[]) || [];
    return list.filter((f: AttributeFilter) => {
      const opts = (f?.textFilters as any[]) || [];
      return opts.some((o: any) => (o?.count || 0) > 0 || (o?.countActive || 0) > 0);
    });
  }
  function getValidOptions(
    filter: AttributeFilter
  ): ReturnType<GridFiltersState['getValidOptions']> {
    return (((filter as AttributeFilter)?.textFilters as any[]) || []).filter(
      (o: any) => (o?.count || 0) > 0 || (o?.countActive || 0) > 0
    );
  }
  function getSelectedCount(): ReturnType<GridFiltersState['getSelectedCount']> {
    let n = 0;
    const sel = selectedFilters as Record<string, string[]>;
    Object.keys(sel).forEach((k: string) => {
      n += (sel[k] || []).length;
    });
    return n;
  }
  function hasActiveFilters(): ReturnType<GridFiltersState['hasActiveFilters']> {
    const sel = selectedFilters as Record<string, string[]>;
    return Object.keys(sel).some((k: string) => (sel[k] || []).length > 0);
  }
  function isSelected(
    filterName: string,
    value: string
  ): ReturnType<GridFiltersState['isSelected']> {
    return ((selectedFilters as Record<string, string[]>)[filterName] || []).includes(value);
  }
  function isExpanded(filterName: string): ReturnType<GridFiltersState['isExpanded']> {
    const stored = (expandedFilters as Record<string, boolean>)[filterName];
    if (stored === undefined) return props.collapsed === false;
    return !!stored;
  }
  function toggleAccordion(filterName: string): ReturnType<GridFiltersState['toggleAccordion']> {
    const cur = !!(expandedFilters as Record<string, boolean>)[filterName];
    setExpandedFilters({ ...expandedFilters, [filterName]: !cur });
  }
  function handleCheckbox(
    filter: AttributeFilter,
    value: string,
    checked: boolean
  ): ReturnType<GridFiltersState['handleCheckbox']> {
    const name = (filter as AttributeFilter)?.attributeDescription?.name || '';
    const cur = (selectedFilters as Record<string, string[]>)[name] || [];
    const next = checked ? [...cur, value] : cur.filter((v: string) => v !== value);
    setSelectedFilters({ ...selectedFilters, [name]: next });
    if (next.length === 0) {
      setExpandedFilters({ ...expandedFilters, [name]: false });
    }
    setIsPending(true);
    props.onFilterChange(filter, value);
    if (props.getSelectedFilters) props.getSelectedFilters();
  }
  function handleMinChange(value: number): ReturnType<GridFiltersState['handleMinChange']> {
    const n = value > currentMax ? currentMax : value;
    setCurrentMin(n);
  }
  function handleMaxChange(value: number): ReturnType<GridFiltersState['handleMaxChange']> {
    const n = value < currentMin ? currentMin : value;
    setCurrentMax(n);
  }
  function applyPrice(): ReturnType<GridFiltersState['applyPrice']> {
    setIsPending(true);
    if (props.onPriceChange) props.onPriceChange(currentMin, currentMax);
    if (props.getSelectedFilters) props.getSelectedFilters();
  }
  function clearAll(): ReturnType<GridFiltersState['clearAll']> {
    setSelectedFilters({});
    setCurrentMin((props.priceMin as number) || 0);
    setCurrentMax((props.priceMax as number) || 9999);
    if (props.onClearFilters) props.onClearFilters();
    if (props.getSelectedFilters) props.getSelectedFilters();
  }
  function getCount(option: any): ReturnType<GridFiltersState['getCount']> {
    const c = option?.count || 0;
    const ca = option?.countActive || 0;
    return c === 0 && ca > 0 ? ca : c;
  }
  function getMinBound(): ReturnType<GridFiltersState['getMinBound']> {
    return (props.priceMin as number) || 0;
  }
  function getMaxBound(): ReturnType<GridFiltersState['getMaxBound']> {
    return (props.priceMax as number) || 9999;
  }
  // All five of the effects below are intentional external-state → local
  // sync. ProductGrid (the parent) drives filter+price state via props;
  // GridFilters mirrors it locally so the user can interact (drag the
  // slider, tick a checkbox) before the parent commits. Replacing with
  // derived-on-render would require lifting the entire local-edit buffer
  // up to ProductGrid — a real refactor planned for Phase C (compound
  // primitives). Disables are scoped to the specific setState calls.

  // Initialize accordion open/closed when the filter set changes.
  useEffect(() => {
    const currentExp = expandedFilters as Record<string, boolean>;
    const open = props.collapsed === false;
    const nextExp: Record<string, boolean> = { ...currentExp };
    let changed = false;
    ((props.filters as AttributeFilter[]) || []).forEach((f: AttributeFilter) => {
      const n = f?.attributeDescription?.name;
      if (n && nextExp[n] === undefined) {
        nextExp[n] = open;
        changed = true;
      }
    });
    const sel = selectedFilters as Record<string, string[]>;
    Object.keys(nextExp).forEach((k: string) => {
      if (nextExp[k] && !(sel[k] || []).length) {
        nextExp[k] = false;
        changed = true;
      }
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (changed) setExpandedFilters(nextExp);
  }, [props.filters, expandedFilters, props.collapsed, selectedFilters]);

  // Re-bound the slider when the catalog's price range changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentMin((props.priceMin as number) || 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentMax((props.priceMax as number) || 9999);
  }, [props.priceMin, props.priceMax]);

  // Parent-triggered "clear all" pulse.
  useEffect(() => {
    if (props.clearSignal === undefined) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedFilters({});
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentMin((props.priceMin as number) || 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentMax((props.priceMax as number) || 9999);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedFilters({});
  }, [props.clearSignal, props.priceMin, props.priceMax]);

  // Adopt parent-supplied active filter set (URL state rehydration).
  useEffect(() => {
    if (!props.activeTextFilters) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedFilters(props.activeTextFilters as Record<string, string[]>);
  }, [props.activeTextFilters]);

  // Reset slider to bounds when parent has no active price filter.
  useEffect(() => {
    if (props.activePriceMin === undefined && props.activePriceMax === undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentMin((props.priceMin as number) || 0);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentMax((props.priceMax as number) || 9999);
    }
  }, [props.activePriceMin, props.activePriceMax, props.priceMin, props.priceMax]);

  // Clear the "rapid click" pending flag when the parent reports loading done.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!props.isLoading) setIsPending(false);
  }, [props.isLoading]);
  return (
    <div
      className={`propeller-grid-filters space-y-4 ${(props.isMobile as boolean) ? 'pb-8' : 'sticky top-24'} ${isPending ? 'opacity-50 pointer-events-none' : ''} ${(props.className as string) || ''}`}
      data-mobile={props.isMobile ? 'true' : 'false'}
      data-pending={isPending ? 'true' : 'false'}
    >
      {showPriceFilter() && (props.priceMin !== undefined || props.priceMax !== undefined) ? (
        <>
          <div className="propeller-grid-filters__price space-y-3">
            <h3 className="propeller-grid-filters__price-title text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {' '}
              Price Range{' '}
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="propeller-grid-filters__price-currency absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-foreground-subtle pointer-events-none">
                  €
                </span>
                <input
                  type="number"
                  className="propeller-grid-filters__price-input w-full pl-6 pr-2 h-8 rounded-control border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                  value={currentMin}
                  min={getMinBound()}
                  max={getMaxBound()}
                  onChange={(e) => handleMinChange(parseFloat(e.target.value) || 0)}
                  onBlur={(event) => applyPrice()}
                />
              </div>
              <span className="propeller-grid-filters__price-separator text-foreground-subtle text-sm select-none">–</span>
              <div className="relative flex-1">
                <span className="propeller-grid-filters__price-currency absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-foreground-subtle pointer-events-none">
                  €
                </span>
                <input
                  type="number"
                  className="propeller-grid-filters__price-input w-full pl-6 pr-2 h-8 rounded-control border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                  value={currentMax}
                  min={getMinBound()}
                  max={getMaxBound()}
                  onChange={(e) => handleMaxChange(parseFloat(e.target.value) || 0)}
                  onBlur={(event) => applyPrice()}
                />
              </div>
            </div>
            <div className="propeller-grid-filters__price-slider relative h-4 pt-1">
              <input
                type="range"
                className="propeller-grid-filters__price-slider-thumb absolute w-full h-1.5 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:cursor-pointer z-20"
                min={getMinBound()}
                max={getMaxBound()}
                value={currentMin}
                onChange={(e) => handleMinChange(parseFloat(e.target.value))}
                onPointerUp={() => applyPrice()}
                onTouchEnd={() => applyPrice()}
              />
              <input
                type="range"
                className="propeller-grid-filters__price-slider-thumb absolute w-full h-1.5 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:cursor-pointer z-20"
                min={getMinBound()}
                max={getMaxBound()}
                value={currentMax}
                onChange={(e) => handleMaxChange(parseFloat(e.target.value))}
                onPointerUp={() => applyPrice()}
                onTouchEnd={() => applyPrice()}
              />
              <div className="propeller-grid-filters__price-slider-track absolute top-1.5 left-0 right-0 h-1.5 bg-border rounded z-10" />
            </div>
          </div>{' '}
          <div className="propeller-grid-filters__divider h-px bg-border-subtle" />
        </>
      ) : null}
      {(props.filters as AttributeFilter[]).length === 0 ? (
        <p className="propeller-grid-filters__empty text-sm text-foreground-subtle italic">No filters available</p>
      ) : null}
      {getFilteredFilters()?.map((filter) => (
        <div className="propeller-grid-filters__group border-b border-border-subtle pb-3 last:border-b-0" key={getFilterName(filter)} data-expanded={isExpanded(getFilterName(filter)) ? 'true' : 'false'}>
          <button
            type="button"
            className="propeller-grid-filters__group-toggle w-full flex items-center justify-between gap-2 text-left py-1 hover:text-secondary transition-colors"
            onClick={(event) => toggleAccordion(getFilterName(filter))}
          >
            <span className="propeller-grid-filters__group-title text-sm font-semibold text-muted-foreground truncate">
              {getFilterTitle(filter)}
            </span>
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              className={`propeller-grid-filters__chevron h-4 w-4 flex-shrink-0 text-foreground-subtle transition-transform duration-200 ${isExpanded(getFilterName(filter)) ? 'rotate-180' : ''}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
                strokeWidth={2}
              />
            </svg>
          </button>
          {isExpanded(getFilterName(filter)) ? (
            <div className="propeller-grid-filters__options pt-2 space-y-1.5">
              {getValidOptions(filter)?.map((option) => (
                <label className="propeller-grid-filters__option flex items-center gap-2 cursor-pointer group" key={option.value}>
                  <input
                    type="checkbox"
                    className="propeller-grid-filters__checkbox h-4 w-4 rounded border-input text-secondary focus:ring-secondary cursor-pointer flex-shrink-0"
                    checked={isSelected(getFilterName(filter), option.value)}
                    onChange={(e) => handleCheckbox(filter, option.value, e.target.checked)}
                  />
                  <span className="propeller-grid-filters__option-label flex-1 text-sm text-muted-foreground leading-none select-none group-hover:text-foreground">
                    {option.value}
                    <span className="propeller-grid-filters__option-count ml-1 text-xs text-foreground-subtle"> ({getCount(option)}) </span>
                  </span>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
export default GridFilters;
