'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import { Contact, Customer, Enums } from 'propeller-sdk-v2';

// Default sort field keys shown in the dropdown when sortOptions is not provided.

export interface GridToolbarProps {
  /**
   * Sort field keys to show in the sort dropdown.
   * Accepts keys of the ProductSortField enum (e.g. 'NAME', 'PRICE').
   * Defaults to all available sort fields.
   */
  sortOptions?: string[];

  /**
   * Active sort — first element is used.
   * Defaults to [{ field: 'CATEGORY_ORDER', order: 'ASC' }].
   */
  defaultSort?: {
    field: string;
    order: string;
  }[];

  /**
   * Layout mode: 'grid' or 'list'.
   * Controls which icon the view-toggle button shows.
   * Defaults to 'grid'.
   */
  viewMode?: string;

  /**
   * Available page-size options shown in the per-page dropdown.
   * Defaults to [12, 24, 48].
   */
  offset?: number[];

  /**
   * Initially selected page size.
   * Defaults to 12.
   */
  defaultOffset?: number;

  /**
   * Called when the sort field or sort direction changes.
   * Receives the new field key and direction ('ASC'|'DESC').
   */
  onSortChange?: (field: string, order: string) => void;

  /**
   * Called when the user selects a different per-page value.
   * Receives the new page size number.
   */
  onOffsetChange?: (offset: number) => void;

  /**
   * Called when the user clicks the view-mode toggle button.
   * Receives the new mode: 'grid' or 'list'.
   */
  onViewChange?: (mode: string) => void;

  /**
   * Total products found — displayed as a result count on the left side.
   * Pass 0 or undefined to hide the count.
   */
  itemsFound?: number;

  /**
   * Current page number. Used together with `pageSize` and `itemsFound`
   * to display a range indicator (e.g. "1–10 from 594 results").
   * When omitted the component falls back to a simple total count.
   */
  page?: number;

  /**
   * Items per page. Used together with `page` and `itemsFound`
   * to compute the result range. Defaults to 12.
   */
  pageSize?: number;

  /**
   * Actual number of items visible on the current page.
   * When provided, overrides `pageSize` for the range end calculation
   * (e.g. when client-side filtering reduces the count below `pageSize`).
   */
  pageItemCount?: number;

  /**
   * Currently active attribute filter selections.
   * Key = attribute name, value = array of selected values.
   * Used to render removable filter badges.
   */
  activeTextFilters?: Record<string, string[]>;

  /**
   * Currently active price filter lower bound.
   * When defined (together with or without priceFilterMax), renders a price badge.
   */
  priceFilterMin?: number;

  /**
   * Currently active price filter upper bound.
   */
  priceFilterMax?: number;

  /**
   * Called when an attribute filter badge × is clicked.
   * Receives the attribute name and the specific value to remove.
   */
  onFilterRemove?: (filterName: string, value: string) => void;

  /**
   * Called when the price filter badge × is clicked.
   */
  onPriceFilterRemove?: () => void;

  /**
   * Called when "Clear All" is clicked.
   */
  onClearFilters?: () => void;

  /**
   * Label overrides. Supply any subset of DEFAULT_LABELS keys plus
   * any of the ProductSortField key strings to customise display text.
   */
  labels?: Record<string, string>;

  /**
   * Portal visibility mode.
   * 'open'        — price sorting is available for all users.
   * 'semi-closed' — price sorting is disabled for unauthenticated users.
   */
  portalMode?: string;

  /**
   * Authenticated user object.
   * When null/undefined in semi-closed mode the PRICE sort option is disabled.
   */
  user?: Contact | Customer | null;

  /** Extra CSS class applied to the root element. */
  className?: string;
}

/** Flat badge item used when rendering the active-filters bar. */
// Default sort field keys shown in the dropdown when sortOptions is not provided.

/** Flat badge item used when rendering the active-filters bar. */
interface FilterBadge {
  key: string;
  value: string;
}
// Default sort field keys shown in the dropdown when sortOptions is not provided.

/** Flat badge item used when rendering the active-filters bar. */

interface GridToolbarState {
  currentSortField: string;
  currentSortOrder: string;
  currentOffset: number;
  currentViewMode: string;
  getLabel: (key: string) => string;
  getSortOptions: () => string[];
  getOffsetOptions: () => number[];
  hasActiveFilters: () => boolean;
  getActiveFilterBadges: () => FilterBadge[];
  isPriceSortDisabled: () => boolean;
  handleSortFieldChange: (field: string) => void;
  handleSortOrderChange: (order: string) => void;
  handleOffsetChange: (offset: number) => void;
  handleViewChange: () => void;
}

// Default sort field keys shown in the dropdown when sortOptions is not provided.
const ALL_SORT_FIELDS: string[] = [
  Enums.ProductSortField.CATEGORY_ORDER,
  Enums.ProductSortField.NAME,
  Enums.ProductSortField.PRICE,
  Enums.ProductSortField.SKU,
  Enums.ProductSortField.SUPPLIER_CODE,
  Enums.ProductSortField.CREATED_AT,
  Enums.ProductSortField.LAST_MODIFIED_AT,
  Enums.ProductSortField.RELEVANCE,
  Enums.ProductSortField.PRIORITY,
];

// Built-in label defaults (can be overridden via the labels prop).
// Built-in label defaults (can be overridden via the labels prop).
const DEFAULT_LABELS: Record<string, string> = {
  [Enums.ProductSortField.CATEGORY_ORDER]: 'Default Sorting',
  [Enums.ProductSortField.NAME]: 'Name',
  [Enums.ProductSortField.PRICE]: 'Price',
  [Enums.ProductSortField.SKU]: 'SKU',
  [Enums.ProductSortField.SUPPLIER_CODE]: 'Supplier Code',
  [Enums.ProductSortField.CREATED_AT]: 'Created Date',
  [Enums.ProductSortField.LAST_MODIFIED_AT]: 'Last Modified Date',
  [Enums.ProductSortField.RELEVANCE]: 'Relevance',
  [Enums.ProductSortField.PRIORITY]: 'Priority',
  [Enums.SortOrder.ASC]: 'Low to High',
  [Enums.SortOrder.DESC]: 'High to Low',
  clearAll: 'Clear All',
  products: ' Products',
  from: 'from',
  results: 'results',
  perPage: ' per page',
  price: 'Price',
  switchToList: 'Switch to list view',
  switchToGrid: 'Switch to grid view',
};

function GridToolbar(props: GridToolbarProps) {
  const [currentSortField, setCurrentSortField] = useState<GridToolbarState['currentSortField']>(
    () => Enums.ProductSortField.CATEGORY_ORDER
  );

  const [currentSortOrder, setCurrentSortOrder] = useState<GridToolbarState['currentSortOrder']>(
    () => Enums.SortOrder.ASC
  );

  const [currentOffset, setCurrentOffset] = useState<GridToolbarState['currentOffset']>(() => 12);

  const [currentViewMode, setCurrentViewMode] = useState<GridToolbarState['currentViewMode']>(
    () => 'grid'
  );

  function getLabel(key: string): ReturnType<GridToolbarState['getLabel']> {
    const labels = (props.labels as Record<string, string>) || {};
    return labels[key] !== undefined ? labels[key] : DEFAULT_LABELS[key] || key;
  }

  function getSortOptions(): ReturnType<GridToolbarState['getSortOptions']> {
    const opts = (props.sortOptions as string[]) || [];
    return opts.length > 0 ? opts : ALL_SORT_FIELDS;
  }

  function getOffsetOptions(): ReturnType<GridToolbarState['getOffsetOptions']> {
    const opts = (props.offset as number[]) || [];
    return opts.length > 0 ? opts : [12, 24, 48];
  }

  function hasActiveFilters(): ReturnType<GridToolbarState['hasActiveFilters']> {
    const text = (props.activeTextFilters as Record<string, string[]>) || {};
    const hasText = Object.keys(text).some((k) => (text[k] || []).length > 0);
    const hasPrice = props.priceFilterMin !== undefined || props.priceFilterMax !== undefined;
    return hasText || hasPrice;
  }

  function getActiveFilterBadges(): ReturnType<GridToolbarState['getActiveFilterBadges']> {
    const text = (props.activeTextFilters as Record<string, string[]>) || {};
    const badges: FilterBadge[] = [];
    Object.entries(text)
      .filter(([, values]) => (values || []).length > 0)
      .forEach(([key, values]) => {
        (values || []).forEach((value: string) => {
          badges.push({
            key,
            value,
          });
        });
      });
    return badges;
  }

  function isPriceSortDisabled(): ReturnType<GridToolbarState['isPriceSortDisabled']> {
    return (props.portalMode as string) === 'semi-closed' && !props.user;
  }

  function handleSortFieldChange(
    field: string
  ): ReturnType<GridToolbarState['handleSortFieldChange']> {
    setCurrentSortField(field);
    if (props.onSortChange) props.onSortChange(field, currentSortOrder);
  }

  function handleSortOrderChange(
    order: string
  ): ReturnType<GridToolbarState['handleSortOrderChange']> {
    setCurrentSortOrder(order);
    if (props.onSortChange) props.onSortChange(currentSortField, order);
  }

  function handleOffsetChange(offset: number): ReturnType<GridToolbarState['handleOffsetChange']> {
    setCurrentOffset(offset);
    if (props.onOffsetChange) props.onOffsetChange(offset);
  }

  function handleViewChange(): ReturnType<GridToolbarState['handleViewChange']> {
    const next = currentViewMode === 'grid' ? 'list' : 'grid';
    setCurrentViewMode(next);
    if (props.onViewChange) props.onViewChange(next);
  }

  useEffect(() => {
    const sort =
      (props.defaultSort as {
        field: string;
        order: string;
      }[]) || [];
    setCurrentSortField(
      sort.length > 0
        ? sort[0].field || Enums.ProductSortField.CATEGORY_ORDER
        : Enums.ProductSortField.CATEGORY_ORDER
    );
    setCurrentSortOrder(
      sort.length > 0 ? sort[0].order || Enums.SortOrder.ASC : Enums.SortOrder.ASC
    );
  }, [props.defaultSort]);
  useEffect(() => {
    setCurrentOffset((props.defaultOffset as number) || 12);
  }, [props.defaultOffset]);
  useEffect(() => {
    if (props.viewMode) {
      setCurrentViewMode(props.viewMode as string);
    }
  }, [props.viewMode]);

  return (
    <div className={`${(props.className as string) || ''}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="text-sm text-muted-foreground font-medium">
          {(props.itemsFound as number) > 0 ? (
            <span>
              {props.itemsFound as number}
              {getLabel('products')}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={currentOffset}
            onChange={(e) => handleOffsetChange(parseInt((e.target as HTMLSelectElement).value))}
          >
            {getOffsetOptions()?.map((n) => (
              <option key={n} value={n}>
                {n}
                {getLabel('perPage')}
              </option>
            ))}
          </select>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={currentSortField}
            onChange={(e) => handleSortFieldChange((e.target as HTMLSelectElement).value)}
          >
            {getSortOptions()?.map((field) => (
              <option
                key={field}
                value={field}
                disabled={field === 'PRICE' && isPriceSortDisabled()}
              >
                {getLabel(field)}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={currentSortOrder}
            onChange={(e) => handleSortOrderChange((e.target as HTMLSelectElement).value)}
          >
            <option value={Enums.SortOrder.ASC}>{getLabel('ASC')}</option>
            <option value={Enums.SortOrder.DESC}>{getLabel('DESC')}</option>
          </select>
          <button
            type="button"
            className="h-9 w-9 flex items-center justify-center rounded-md border border-input bg-transparent hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={(event) => handleViewChange()}
            title={currentViewMode === 'grid' ? getLabel('switchToList') : getLabel('switchToGrid')}
          >
            {currentViewMode === 'grid' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            ) : null}
            {currentViewMode === 'list' ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            ) : null}
          </button>
        </div>
      </div>
      {hasActiveFilters() ? (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            className="h-7 px-2 text-xs rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={(event) => {
              if (props.onClearFilters) props.onClearFilters();
            }}
          >
            {getLabel('clearAll')}
          </button>
          {props.priceFilterMin !== undefined || props.priceFilterMax !== undefined ? (
            <span
              className="inline-flex items-center gap-1 cursor-pointer px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
              onClick={(event) => {
                if (props.onPriceFilterRemove) props.onPriceFilterRemove();
              }}
            >
              {getLabel('price')}: €{(props.priceFilterMin as number) ?? 0} – €
              {(props.priceFilterMax as number) ?? '∞'}
              <span>×</span>
            </span>
          ) : null}
          {getActiveFilterBadges()?.map((badge) => (
            <span
              className="inline-flex items-center gap-1 cursor-pointer px-2.5 py-0.5 rounded-full text-xs font-semibold border border-input bg-background hover:bg-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
              key={`${badge.key}-${badge.value}`}
              onClick={(event) => {
                if (props.onFilterRemove) props.onFilterRemove(badge.key, badge.value);
              }}
            >
              {badge.value}
              <span>×</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default GridToolbar;
