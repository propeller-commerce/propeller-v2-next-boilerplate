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
    setExpandedFilters({
      ...expandedFilters,
      [filterName]: !cur,
    });
  }

  function handleCheckbox(
    filter: AttributeFilter,
    value: string,
    checked: boolean
  ): ReturnType<GridFiltersState['handleCheckbox']> {
    const name = (filter as AttributeFilter)?.attributeDescription?.name || '';
    const cur = (selectedFilters as Record<string, string[]>)[name] || [];
    const next = checked ? [...cur, value] : cur.filter((v: string) => v !== value);
    setSelectedFilters({
      ...selectedFilters,
      [name]: next,
    });
    if (next.length === 0) {
      setExpandedFilters({
        ...expandedFilters,
        [name]: false,
      });
    }
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

  useEffect(() => {
    const currentExp = expandedFilters as Record<string, boolean>;
    const open = props.collapsed === false;
    const nextExp: Record<string, boolean> = {
      ...currentExp,
    };
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
    if (changed) setExpandedFilters(nextExp);
  }, [props.filters]);
  useEffect(() => {
    setCurrentMin((props.priceMin as number) || 0);
    setCurrentMax((props.priceMax as number) || 9999);
  }, [props.priceMin, props.priceMax]);
  useEffect(() => {
    if (props.clearSignal === undefined) return;
    setSelectedFilters({});
    setCurrentMin((props.priceMin as number) || 0);
    setCurrentMax((props.priceMax as number) || 9999);
    setExpandedFilters({});
  }, [props.clearSignal]);

  return (
    <div
      className={`space-y-4 ${(props.isMobile as boolean) ? 'pb-8' : 'sticky top-24'} ${(props.className as string) || ''}`}
    >
      {showPriceFilter() && (props.priceMin !== undefined || props.priceMax !== undefined) ? (
        <>
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Price Range
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                  €
                </span>
                <input
                  type="number"
                  className="w-full pl-6 pr-2 h-8 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                  value={currentMin}
                  min={getMinBound()}
                  max={getMaxBound()}
                  onChange={(e) => handleMinChange(parseFloat(e.target.value) || 0)}
                  onBlur={(event) => applyPrice()}
                />
              </div>
              <span className="text-gray-400 text-sm select-none">–</span>
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                  €
                </span>
                <input
                  type="number"
                  className="w-full pl-6 pr-2 h-8 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-secondary"
                  value={currentMax}
                  min={getMinBound()}
                  max={getMaxBound()}
                  onChange={(e) => handleMaxChange(parseFloat(e.target.value) || 0)}
                  onBlur={(event) => applyPrice()}
                />
              </div>
            </div>
            <div className="relative h-4 pt-1">
              <input
                type="range"
                className="absolute w-full h-1.5 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:cursor-pointer z-20"
                min={getMinBound()}
                max={getMaxBound()}
                value={currentMin}
                onChange={(e) => {
                  handleMinChange(parseFloat(e.target.value));
                  applyPrice();
                }}
              />
              <input
                type="range"
                className="absolute w-full h-1.5 bg-transparent appearance-none pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:cursor-pointer z-20"
                min={getMinBound()}
                max={getMaxBound()}
                value={currentMax}
                onChange={(e) => {
                  handleMaxChange(parseFloat(e.target.value));
                  applyPrice();
                }}
              />
              <div className="absolute top-1.5 left-0 right-0 h-1.5 bg-gray-200 rounded z-10" />
            </div>
          </div>
          <div className="h-px bg-gray-100" />
        </>
      ) : null}
      {(props.filters as AttributeFilter[]).length === 0 ? (
        <p className="text-sm text-gray-400 italic">No filters available</p>
      ) : null}
      {getFilteredFilters()?.map((filter) => (
        <div className="border-b border-gray-100 pb-3 last:border-b-0" key={getFilterName(filter)}>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-2 text-left py-1 hover:text-secondary transition-colors"
            onClick={(event) => toggleAccordion(getFilterName(filter))}
          >
            <span className="text-sm font-semibold text-gray-700 truncate">
              {getFilterTitle(filter)}
            </span>
            <svg
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded(getFilterName(filter)) ? 'rotate-180' : ''}`}
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
            <div className="pt-2 space-y-1.5">
              {getValidOptions(filter)?.map((option) => (
                <label className="flex items-center gap-2 cursor-pointer group" key={option.value}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-secondary focus:ring-secondary cursor-pointer flex-shrink-0"
                    checked={isSelected(getFilterName(filter), option.value)}
                    onChange={(e) => handleCheckbox(filter, option.value, e.target.checked)}
                  />
                  <span className="flex-1 text-sm text-gray-600 leading-none select-none group-hover:text-gray-900">
                    {option.value}
                    <span className="ml-1 text-xs text-gray-400">({getCount(option)})</span>
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
