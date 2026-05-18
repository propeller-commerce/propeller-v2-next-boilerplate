'use client';
import * as React from 'react';

import { useState } from 'react';
import { Contact, Customer, DateSearchInput, DecimalSearchInput, GraphQLClient, Order, OrderSortField, OrderSortInput, OrderType, SortOrder } from 'propeller-sdk-v2';
import { useOrders } from '@/composables/react/useOrders';
import { getLabel } from '@/composables/shared/utils/labelHelpers';
import { formatPrice as formatPriceHelper } from '@/composables/shared/utils/formatting';
import { config } from '@/data/config';

export interface OrderListProps {
  /** The authenticated user (Contact or Customer) */
  user: Contact | Customer | null;

  /** The initialized GraphQL Client instance */
  graphqlClient: GraphQLClient;

  /** Callback when an order is clicked */
  onOrderClick: (orderId: number) => void;

  /** Columns to display. Defaults to ['id', 'date', 'status', 'total', 'action'] */
  columns?: string[];

  /** Label mapping for columns */
  columnConfig?: Record<string, string>;

  /** Enable searching */
  enableSearch?: boolean;

  /** Fields enabled for searching (UI inputs) */
  searchFields?: string[];

  /** Term fields configuration (backend) */
  termFields?: any[]; // Using any[] to avoid strict enum import issues in Mitosis for now, effectively OrderSearchFields[]

  /** Override company ID for order filtering (respects company switcher) */
  companyId?: number;

  /** Filter orders by these statuses */
  orderStatus?: string[];

  /** Override base styles */
  className?: string;

  /** Items per page default */
  initialItemsPerPage?: number;

  /** Rows are clickable */
  rowsClickable?: boolean;

  /** Show company orders */
  showCompanyOrders?: boolean;

  /** Hide pagination controls. Defaults to false. */
  hidePagination?: boolean;

  /** Filter orders by channel IDs */
  channelIds?: number[];

  /** Format price */
  formatPrice?: (price: number) => string;

  /** Format date */
  formatDate?: (dateString: string) => string;

  /** Get status color */
  getStatusColor?: (status: string) => string;

  /** Localization labels */
  labels?: {
    view?: string;
    previous?: string;
    next?: string;
    showingPage?: string;
    of?: string;
    noOrders?: string;
    loading?: string;
    order?: string;
    date?: string;
    status?: string;
    total?: string;
    action?: string;
  };
}

function OrderList(props: OrderListProps) {
  const columns = props.columns || ['id', 'date', 'status', 'total'];
  const rowsClickable = props.rowsClickable || false;

  const { orders, loading, searchForm, setSearchForm, currentPage, totalPages, fetchOrders, goToPage } = useOrders({
    graphqlClient: props.graphqlClient,
    user: props.user as any,
    companyId: props.companyId,
    orderStatuses: props.orderStatus,
    termFields: props.termFields as any,
    itemsPerPage: props.initialItemsPerPage || 10,
    channelIds: props.channelIds,
  });

  function handlePageChange(newPage: number) {
    if (newPage >= 1 && newPage <= totalPages) {
      goToPage(newPage);
    }
  }

  function formatDate(dateString: string): string {
    if (props.formatDate) return props.formatDate(dateString);
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  }

  function formatPrice(price: number): string {
    if (props.formatPrice) return props.formatPrice(price);
    if (!price) return '-';
    return formatPriceHelper(price, { symbol: config.currency });
  }

  function getStatusColor(status: string): string {
    if (props.getStatusColor) return props.getStatusColor(status);
    switch (status) {
      case 'COMPLETE':
      case 'QUOTE_ACCEPTED':
        return 'bg-secondary/10 text-secondary';
      case 'CANCELLED':
      case 'QUOTE_REJECTED':
        return 'bg-destructive/10 text-destructive';
      default:
        return 'bg-warning/10 text-warning';
    }
  }

  function getColumnLabel(col: string): string {
    if (props.columnConfig && props.columnConfig[col]) {
      return props.columnConfig[col];
    }
    // Fallback: Capitalize first letter
    return col.charAt(0).toUpperCase() + col.slice(1);
  }

  const dateMin = '1970-01-01';
  const dateMax = new Date().toISOString().split('T')[0];

  // Returns a YYYY-MM-DD string only when the input value is a valid date in
  // the allowed range; otherwise returns null. Native <input type="date">
  // happily accepts year-6 inputs ("0006-05-04") via keyboard, so we guard at
  // the model layer.
  function sanitizeDateInput(value: string): string | null {
    if (!value) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const year = Number(match[1]);
    if (year < 1970 || year > new Date().getFullYear()) return null;
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return null;
    return value;
  }

  function searchFields(): string[] {
    const fields = props.searchFields || [];
    if (props.enableSearch && !(fields as string[]).includes('term')) {
      return ['term', ...fields] as string[];
    }
    return fields;
  }

  return (
    <div className={`propeller-order-list ${props.className || ''}`} data-loading={loading ? 'true' : 'false'}>
      {props.enableSearch && searchFields().length > 0 ? (
        <div className="propeller-order-list__filters mb-6 bg-card p-4 rounded-container shadow space-y-4">
          {searchFields().includes('term') ? (
            <div className="propeller-order-list__search-field w-full">
              <label className="propeller-order-list__filter-label block text-sm font-medium text-muted-foreground capitalize mb-1">
                {getColumnLabel('term')}
              </label>
              <input
                type="text"
                placeholder="Search..."
                className="propeller-order-list__search-input block w-full rounded-control border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                value={searchForm.term || ''}
                onChange={(e) => {
                  setSearchForm({
                    ...searchForm,
                    term: e.target.value,
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    setSearchForm({
                      ...searchForm,
                      term: (e.target as HTMLInputElement).value,
                    });
                    fetchOrders(1);
                  }
                }}
              />
            </div>
          ) : null}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {searchFields()
              .filter((f: string) => f !== 'term')
              ?.map((field) => (
                <div className="space-y-1" key={field}>
                  <label className="propeller-order-list__filter-label block text-sm font-medium text-muted-foreground capitalize">
                    {getColumnLabel(field)}
                  </label>
                  {field === 'createdAt' ? (
                    <div className="flex space-x-2 w-full">
                      <input
                        type="date"
                        placeholder="From"
                        min={dateMin}
                        max={dateMax}
                        className="propeller-order-list__filter-input block w-0 flex-1 min-w-0 rounded-control border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        value={
                          searchForm.createdAt?.greaterThan
                            ? (searchForm.createdAt.greaterThan as string).split('T')[0]
                            : ''
                        }
                        onChange={(e) => {
                          const current = searchForm.createdAt || {};
                          const sanitized = sanitizeDateInput(e.target.value);
                          if (e.target.value && !sanitized) {
                            e.target.value = current.greaterThan
                              ? (current.greaterThan as string).split('T')[0]
                              : '';
                            return;
                          }
                          setSearchForm({
                            ...searchForm,
                            createdAt: {
                              ...current,
                              greaterThan: sanitized ? `${sanitized}T00:00:00Z` : undefined,
                            },
                          });
                        }}
                      />
                      <input
                        type="date"
                        placeholder="To"
                        min={dateMin}
                        max={dateMax}
                        className="propeller-order-list__filter-input block w-0 flex-1 min-w-0 rounded-control border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        value={
                          searchForm.createdAt?.lessThan
                            ? (searchForm.createdAt.lessThan as string).split('T')[0]
                            : ''
                        }
                        onChange={(e) => {
                          const current = searchForm.createdAt || {};
                          const sanitized = sanitizeDateInput(e.target.value);
                          if (e.target.value && !sanitized) {
                            e.target.value = current.lessThan
                              ? (current.lessThan as string).split('T')[0]
                              : '';
                            return;
                          }
                          setSearchForm({
                            ...searchForm,
                            createdAt: {
                              ...current,
                              lessThan: sanitized ? `${sanitized}T23:59:59Z` : undefined,
                            },
                          });
                        }}
                      />
                    </div>
                  ) : null}
                  {field === 'lastModifiedAt' ? (
                    <div className="flex space-x-2 w-full">
                      <input
                        type="date"
                        placeholder="From"
                        min={dateMin}
                        max={dateMax}
                        className="propeller-order-list__filter-input block w-0 flex-1 min-w-0 rounded-control border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        value={
                          searchForm.lastModifiedAt?.greaterThan
                            ? (searchForm.lastModifiedAt.greaterThan as string).split('T')[0]
                            : ''
                        }
                        onChange={(e) => {
                          const current = searchForm.lastModifiedAt || {};
                          const sanitized = sanitizeDateInput(e.target.value);
                          if (e.target.value && !sanitized) {
                            e.target.value = current.greaterThan
                              ? (current.greaterThan as string).split('T')[0]
                              : '';
                            return;
                          }
                          setSearchForm({
                            ...searchForm,
                            lastModifiedAt: {
                              ...current,
                              greaterThan: sanitized ? `${sanitized}T00:00:00Z` : undefined,
                            },
                          });
                        }}
                      />
                      <input
                        type="date"
                        placeholder="To"
                        min={dateMin}
                        max={dateMax}
                        className="propeller-order-list__filter-input block w-0 flex-1 min-w-0 rounded-control border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        value={
                          searchForm.lastModifiedAt?.lessThan
                            ? (searchForm.lastModifiedAt.lessThan as string).split('T')[0]
                            : ''
                        }
                        onChange={(e) => {
                          const current = searchForm.lastModifiedAt || {};
                          const sanitized = sanitizeDateInput(e.target.value);
                          if (e.target.value && !sanitized) {
                            e.target.value = current.lessThan
                              ? (current.lessThan as string).split('T')[0]
                              : '';
                            return;
                          }
                          setSearchForm({
                            ...searchForm,
                            lastModifiedAt: {
                              ...current,
                              lessThan: sanitized ? `${sanitized}T23:59:59Z` : undefined,
                            },
                          });
                        }}
                      />
                    </div>
                  ) : null}
                  {field === 'price' ? (
                    <div className="flex space-x-2 w-full">
                      <input
                        type="number"
                        placeholder="Min"
                        className="propeller-order-list__filter-input block w-0 flex-1 min-w-0 rounded-control border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        value={searchForm.price?.greaterThan || ''}
                        onChange={(e) => {
                          const current = searchForm.price || {};
                          setSearchForm({
                            ...searchForm,
                            price: {
                              ...current,
                              greaterThan: parseFloat(e.target.value),
                            },
                          });
                        }}
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        className="propeller-order-list__filter-input block w-0 flex-1 min-w-0 rounded-control border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        value={searchForm.price?.lessThan || ''}
                        onChange={(e) => {
                          const current = searchForm.price || {};
                          setSearchForm({
                            ...searchForm,
                            price: {
                              ...current,
                              lessThan: parseFloat(e.target.value),
                            },
                          });
                        }}
                      />
                    </div>
                  ) : null}
                  {field === 'sortInput' ? (
                    <div className="flex space-x-2 w-full">
                      <select
                        className="propeller-order-list__filter-input block w-0 flex-1 min-w-0 rounded-control border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        value={searchForm.sortInput?.field || ''}
                        onChange={(e) => {
                          const current = searchForm.sortInput || {};
                          setSearchForm({
                            ...searchForm,
                            sortInput: {
                              ...current,
                              field: e.target.value as OrderSortField,
                            },
                          });
                        }}
                      >
                        <option value="">Sort Field</option>
                        {Object.values(OrderSortField)?.map((sortField) => (
                          <option key={sortField} value={sortField}>
                            {sortField}
                          </option>
                        ))}
                      </select>
                      <select
                        className="propeller-order-list__filter-input block w-0 flex-1 min-w-0 rounded-control border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        value={searchForm.sortInput?.order || ''}
                        onChange={(e) => {
                          const current = searchForm.sortInput || {};
                          setSearchForm({
                            ...searchForm,
                            sortInput: {
                              ...current,
                              order: e.target.value as SortOrder,
                            },
                          });
                        }}
                      >
                        <option value="">Order</option>
                        {Object.values(SortOrder)?.map((order) => (
                          <option key={order} value={order}>
                            {order}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  {field === 'type' ? (
                    <div className="flex space-x-2">
                      <select
                        className="propeller-order-list__filter-input block w-full rounded-control border-input shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        value={searchForm.type || ''}
                        onChange={(e) => {
                          setSearchForm({
                            ...searchForm,
                            type: e.target.value as OrderType,
                          });
                        }}
                      >
                        <option value="">Type</option>
                        {Object.values(OrderType)?.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              ))}
          </div>
          <div className="propeller-order-list__filter-actions flex justify-end space-x-2">
            <button
              className="propeller-order-list__clear-btn inline-flex items-center px-4 py-2 border border-input text-sm font-medium rounded-control shadow-sm text-foreground bg-card hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              onClick={(event) => {
                setSearchForm({});
                fetchOrders(1);
              }}
            >
              Clear
            </button>
            <button
              className="propeller-order-list__search-btn inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-control shadow-sm text-primary-foreground bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              onClick={(event) => fetchOrders(1)}
            >
              Search
            </button>
          </div>
        </div>
      ) : null}
      {!loading || orders.length > 0 ? (
        <>
          {orders.length > 0 ? (
            <div className="propeller-order-list__results bg-card rounded-container shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="propeller-order-list__table min-w-full divide-y divide-border">
                  <thead className="propeller-order-list__thead bg-surface-hover">
                    <tr>
                      {columns?.map((col) => (
                        <th
                          key={col}
                          data-column={col}
                          className={`propeller-order-list__th px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider ${col === 'action' || col === 'total' ? 'text-right' : ''}`}
                        >
                          {getColumnLabel(col)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="propeller-order-list__tbody bg-card divide-y divide-border">
                    {orders?.map((order) => (
                      <tr
                        className="propeller-order-list__row hover:bg-surface-hover"
                        key={order.id}
                        data-clickable={rowsClickable ? 'true' : 'false'}
                        onClick={(event) => rowsClickable && props.onOrderClick(order.id)}
                      >
                        {columns?.map((col) => (
                          <td
                            key={col}
                            data-column={col}
                            className={`propeller-order-list__cell px-6 py-4 whitespace-nowrap text-sm ${col === 'id' || col === 'action' ? 'font-medium' : 'text-muted-foreground'} ${col === 'action' || col === 'total' ? 'text-right' : ''}`}
                          >
                            {col === 'id' ? (
                              <span className="propeller-order-list__order-id text-foreground">{order.id}</span>
                            ) : null}
                            {col === 'date' ? (
                              <>{formatDate(order.createdAt || '')}</>
                            ) : null}
                            {col === 'status' ? (
                              <span
                                className={`propeller-order-list__status px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}
                                data-status={order.status}
                              >
                                {order.status}
                              </span>
                            ) : null}
                            {col === 'total' ? <>{formatPrice(order.total?.net)}</> : null}
                            {col === 'action' && !rowsClickable ? (
                              <button
                                className="propeller-order-list__action-btn text-primary hover:text-primary/70 cursor-pointer"
                                onClick={(event) => {
                                  event.preventDefault();
                                  props.onOrderClick(order.id);
                                }}
                              >
                                {getLabel(props.labels, 'view', 'View')}
                              </button>
                            ) : null}
                            {col === 'validUntil' ? (
                              <>{formatDate((order as any).validUntil || '')}</>
                            ) : null}
                            {!['id', 'date', 'status', 'total', 'action', 'validUntil'].includes(
                              col
                            ) ? (
                              <>{(order as any)[col]}</>
                            ) : null}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!props.hidePagination && totalPages > 1 ? (
                <div className="propeller-order-list__pagination bg-card px-4 py-3 flex items-center justify-between border-t border-border sm:px-6">
                  <div className="propeller-order-list__pagination-mobile flex-1 flex justify-between sm:hidden">
                    <button
                      className="propeller-order-list__pagination-btn relative inline-flex items-center px-4 py-2 border border-input text-sm font-medium rounded-control text-foreground bg-card hover:bg-surface-hover disabled:opacity-50"
                      onClick={(event) => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      {getLabel(props.labels, 'previous', 'Previous')}
                    </button>
                    <button
                      className="propeller-order-list__pagination-btn ml-3 relative inline-flex items-center px-4 py-2 border border-input text-sm font-medium rounded-control text-foreground bg-card hover:bg-surface-hover disabled:opacity-50"
                      onClick={(event) => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      {getLabel(props.labels, 'next', 'Next')}
                    </button>
                  </div>
                  <div className="propeller-order-list__pagination-desktop hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="propeller-order-list__pagination-summary text-sm text-muted-foreground">
                        {getLabel(props.labels, 'showingPage', 'Showing page')}&nbsp;
                        <span className="font-medium">{currentPage}</span>&nbsp;
                        {getLabel(props.labels, 'of', 'of')}&nbsp;
                        <span className="font-medium">{totalPages}</span>
                      </p>
                    </div>
                    <div>
                      <nav
                        aria-label="Pagination"
                        className="propeller-order-list__pagination-nav relative z-0 inline-flex rounded-control shadow-sm -space-x-px"
                      >
                        <button
                          className="propeller-order-list__pagination-btn relative inline-flex items-center px-2 py-2 rounded-l-control border border-input bg-card text-sm font-medium text-muted-foreground hover:bg-surface-hover disabled:opacity-50"
                          onClick={(event) => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          {getLabel(props.labels, 'previous', 'Previous')}
                        </button>
                        <button
                          className="propeller-order-list__pagination-btn relative inline-flex items-center px-2 py-2 rounded-r-control border border-input bg-card text-sm font-medium text-muted-foreground hover:bg-surface-hover disabled:opacity-50"
                          onClick={(event) => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          {getLabel(props.labels, 'next', 'Next')}
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="propeller-order-list__empty bg-card rounded-container shadow p-8 text-center">
              <p className="text-muted-foreground mb-4">{getLabel(props.labels, 'noOrders', 'No orders found.')}</p>
            </div>
          )}
        </>
      ) : (
        <div className="propeller-order-list__loading p-8 text-center text-muted-foreground">
          {getLabel(props.labels, 'loading', 'Loading orders...')}
        </div>
      )}
    </div>
  );
}

export default OrderList;
