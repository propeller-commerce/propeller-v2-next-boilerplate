'use client';
import * as React from 'react';

import { useState, useEffect, useRef } from 'react';
import {
  OrderService,
  OrderSearchArguments,
  OrderResponse,
  Order,
  Contact,
  Customer,
  GraphQLClient,
  Enums,
  OrderStatus,
  DateSearchInput,
  DecimalSearchInput,
  OrderSortInput,
} from 'propeller-sdk-v2';

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
interface OrderListState {
  orders: Order[];
  columns: string[];
  loading: boolean;
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  rowsClickable: boolean;
  searchForm: {
    term?: string;
    createdAt?: DateSearchInput;
    lastModifiedAt?: DateSearchInput;
    price?: DecimalSearchInput;
    sortInput?: Partial<OrderSortInput>;
    type?: Enums.OrderType;
    [key: string]: any;
  };
  fetchOrders: (page?: number) => Promise<void>;
  handlePageChange: (newPage: number) => void;
  formatDate: (dateString: string) => string;
  formatPrice: (price: any) => string;
  getStatusColor: (status: string) => string;
  getColumnLabel: (col: string) => string;
  getLabel: (key: string, fallback: string) => string;
  searchFields: () => string[];
}
function OrderList(props: OrderListProps) {
  const [orders, setOrders] = useState<OrderListState['orders']>(() => []);
  const [columns, setColumns] = useState<OrderListState['columns']>(
    () => props.columns || ['id', 'date', 'status', 'total']
  );
  const [loading, setLoading] = useState<OrderListState['loading']>(() => true);
  const [totalItems, setTotalItems] = useState<OrderListState['totalItems']>(() => 0);
  const [currentPage, setCurrentPage] = useState<OrderListState['currentPage']>(() => 1);
  const [itemsPerPage, setItemsPerPage] = useState<OrderListState['itemsPerPage']>(
    () => props.initialItemsPerPage || 10
  );
  const [totalPages, setTotalPages] = useState<OrderListState['totalPages']>(() => 0);
  const [rowsClickable, setRowsClickable] = useState<OrderListState['rowsClickable']>(
    () => props.rowsClickable || false
  );
  const fetchingRef = useRef(false);
  const [searchForm, setSearchForm] = useState<OrderListState['searchForm']>(() => ({}));
  async function fetchOrders(page: number = 1): ReturnType<OrderListState['fetchOrders']> {
    if (!props.user || !props.graphqlClient || fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    try {
      const orderService = new OrderService(props.graphqlClient);
      const isContactUser = 'contactId' in props.user;
      const statuses = props.orderStatus || [
        'NEW',
        'CONFIRMED',
        'VALIDATED',
        'ORDER', // Default statuses if not provided
      ];

      // Explicit cast to any for user ID access as SDK types might be strict interfaces
      // We handle both Contact (contactId) and Customer (customerId)
      const userId = isContactUser ? (props.user as any).contactId : (props.user as any).customerId;
      const companyIdFallback =
        isContactUser && (props.user as any).company ? (props.user as any).company.companyId : null;
      const companyId = props.companyId || companyIdFallback || null;
      const searchArgs: OrderSearchArguments = {
        status: statuses,
        ...(!props.showCompanyOrders && {
          userId: [userId],
        }),
        ...(props.showCompanyOrders && companyId && {
          companyIds: [companyId],
        }),
        page: page,
        offset: itemsPerPage,
        term: searchForm.term || '',
        termFields: props.termFields || [
          Enums.OrderSearchFields.REFERENCE,
          Enums.OrderSearchFields.ITEM_SKU,
          Enums.OrderSearchFields.ID,
          Enums.OrderSearchFields.ITEM_NAME,
          Enums.OrderSearchFields.REMARKS,
        ],
        sortInputs: searchForm.sortInput || {
          field: Enums.OrderSortField.CREATED_AT,
          order: Enums.SortOrder.DESC,
        },
        ...(searchForm.createdAt && {
          createdAt: searchForm.createdAt,
        }),
        ...(searchForm.lastModifiedAt && {
          lastModifiedAt: searchForm.lastModifiedAt,
        }),
        ...(searchForm.price && {
          price: searchForm.price,
        }),
        ...(searchForm.type && {
          type: searchForm.type,
        }),
      };
      const response: OrderResponse = await orderService.getOrders(searchArgs);
      setOrders(response.items || []);
      setTotalItems(response.itemsFound || 0);
      if (response.offset) {
        setItemsPerPage(response.offset);
      }
      setTotalPages(Math.ceil((response.itemsFound || 0) / (response.offset || 10)));
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }
  function handlePageChange(newPage: number): ReturnType<OrderListState['handlePageChange']> {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  }
  function formatDate(dateString: string): ReturnType<OrderListState['formatDate']> {
    if (props.formatDate) return props.formatDate(dateString);
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  }
  function formatPrice(price: number): ReturnType<OrderListState['formatPrice']> {
    if (props.formatPrice) return props.formatPrice(price);
    if (!price) return '-';
    return `€${Number(price).toFixed(2)}`;
  }
  function getStatusColor(status: string): ReturnType<OrderListState['getStatusColor']> {
    if (props.getStatusColor) return props.getStatusColor(status);
    switch (status) {
      case 'COMPLETE':
      case 'QUOTE_ACCEPTED':
        return 'bg-secondary/10 text-secondary';
      case 'CANCELLED':
      case 'QUOTE_REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  }
  function getColumnLabel(col: string): ReturnType<OrderListState['getColumnLabel']> {
    if (props.columnConfig && props.columnConfig[col]) {
      return props.columnConfig[col];
    }
    // Fallback: Capitalize first letter
    return col.charAt(0).toUpperCase() + col.slice(1);
  }
  function getLabel(key: string, fallback: string): ReturnType<OrderListState['getLabel']> {
    return (props.labels as any)?.[key] || fallback;
  }
  function searchFields(): ReturnType<OrderListState['searchFields']> {
    const fields = props.searchFields || [];
    if (props.enableSearch && !(fields as string[]).includes('term')) {
      return ['term', ...fields] as string[];
    }
    return fields;
  }
  useEffect(() => {
    if (props.user) {
      fetchOrders(currentPage);
    }
  }, [props.user, currentPage, props.companyId]);
  return (
    <div className={props.className}>
      {props.enableSearch && searchFields().length > 0 ? (
        <div className="mb-6 bg-white p-4 rounded-lg shadow space-y-4">
          {searchFields().includes('term') ? (
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 capitalize mb-1">
                {getColumnLabel('term')}
              </label>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                value={searchForm.term || ''}
                onChange={(e) => {
                  setSearchForm({
                    ...searchForm,
                    term: e.target.value,
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
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
                  <label className="block text-sm font-medium text-gray-700 capitalize">
                    {getColumnLabel(field)}
                  </label>
                  {field === 'createdAt' ? (
                    <div className="flex space-x-2 w-full">
                      <input
                        type="date"
                        placeholder="From"
                        className="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        value={
                          searchForm.createdAt?.greaterThan
                            ? (searchForm.createdAt.greaterThan as string).split('T')[0]
                            : ''
                        }
                        onChange={(e) => {
                          const current = searchForm.createdAt || {};
                          const val = e.target.value ? `${e.target.value}T00:00:00Z` : undefined;
                          setSearchForm({
                            ...searchForm,
                            createdAt: {
                              ...current,
                              greaterThan: val ?? undefined,
                            },
                          });
                        }}
                      />
                      <input
                        type="date"
                        placeholder="To"
                        className="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        value={
                          searchForm.createdAt?.lessThan
                            ? (searchForm.createdAt.lessThan as string).split('T')[0]
                            : ''
                        }
                        onChange={(e) => {
                          const current = searchForm.createdAt || {};
                          const val = e.target.value ? `${e.target.value}T23:59:59Z` : undefined;
                          setSearchForm({
                            ...searchForm,
                            createdAt: {
                              ...current,
                              lessThan: val ?? undefined,
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
                        className="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        value={
                          searchForm.lastModifiedAt?.greaterThan
                            ? (searchForm.lastModifiedAt.greaterThan as string).split('T')[0]
                            : ''
                        }
                        onChange={(e) => {
                          const current = searchForm.lastModifiedAt || {};
                          const val = e.target.value ? `${e.target.value}T00:00:00Z` : undefined;
                          setSearchForm({
                            ...searchForm,
                            lastModifiedAt: {
                              ...current,
                              greaterThan: val ?? undefined,
                            },
                          });
                        }}
                      />
                      <input
                        type="date"
                        placeholder="To"
                        className="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        value={
                          searchForm.lastModifiedAt?.lessThan
                            ? (searchForm.lastModifiedAt.lessThan as string).split('T')[0]
                            : ''
                        }
                        onChange={(e) => {
                          const current = searchForm.lastModifiedAt || {};
                          const val = e.target.value ? `${e.target.value}T23:59:59Z` : undefined;
                          setSearchForm({
                            ...searchForm,
                            lastModifiedAt: {
                              ...current,
                              lessThan: val ?? undefined,
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
                        className="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
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
                        className="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
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
                        className="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        value={searchForm.sortInput?.field || ''}
                        onChange={(e) => {
                          const current = searchForm.sortInput || {};
                          setSearchForm({
                            ...searchForm,
                            sortInput: {
                              ...current,
                              field: e.target.value as Enums.OrderSortField,
                            },
                          });
                        }}
                      >
                        <option value="">Sort Field</option>
                        {Object.values(Enums.OrderSortField)?.map((sortField) => (
                          <option key={sortField} value={sortField}>
                            {sortField}
                          </option>
                        ))}
                      </select>
                      <select
                        className="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        value={searchForm.sortInput?.order || ''}
                        onChange={(e) => {
                          const current = searchForm.sortInput || {};
                          setSearchForm({
                            ...searchForm,
                            sortInput: {
                              ...current,
                              order: e.target.value as Enums.SortOrder,
                            },
                          });
                        }}
                      >
                        <option value="">Order</option>
                        {Object.values(Enums.SortOrder)?.map((order) => (
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
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                        value={searchForm.type || ''}
                        onChange={(e) => {
                          setSearchForm({
                            ...searchForm,
                            type: e.target.value as Enums.OrderType,
                          });
                        }}
                      >
                        <option value="">Type</option>
                        {Object.values(Enums.OrderType)?.map((type) => (
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
          <div className="flex justify-end space-x-2">
            <button
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              onClick={(event) => {
                setSearchForm({});
                fetchOrders(1);
              }}
            >
              Clear
            </button>
            <button
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
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
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {columns?.map((col) => (
                        <th
                          key={col}
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col === 'action' || col === 'total' ? 'text-right' : ''}`}
                        >
                          {getColumnLabel(col)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders?.map((order) => (
                      <tr
                        className="hover:bg-gray-50"
                        key={order.id}
                        onClick={(event) => rowsClickable && props.onOrderClick(order.id)}
                      >
                        {columns?.map((col) => (
                          <td
                            key={col}
                            className={`px-6 py-4 whitespace-nowrap text-sm ${col === 'id' || col === 'action' ? 'font-medium' : 'text-gray-500'} ${col === 'action' || col === 'total' ? 'text-right' : ''}`}
                          >
                            {col === 'id' ? (
                              <span className="text-gray-900">{order.id}</span>
                            ) : null}
                            {col === 'date' ? (
                              <>{formatDate(order.date || order.createdAt || '')}</>
                            ) : null}
                            {col === 'status' ? (
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}
                              >
                                {order.status}
                              </span>
                            ) : null}
                            {col === 'total' ? <>{formatPrice(order.total?.net)}</> : null}
                            {col === 'action' && !rowsClickable ? (
                              <button
                                className="text-primary hover:text-primary/70 cursor-pointer"
                                onClick={(event) => {
                                  event.preventDefault();
                                  props.onOrderClick(order.id);
                                }}
                              >
                                {getLabel('view', 'View')}
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
              {totalPages > 1 ? (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      onClick={(event) => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      {getLabel('previous', 'Previous')}
                    </button>
                    <button
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      onClick={(event) => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      {getLabel('next', 'Next')}
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        {getLabel('showingPage', 'Showing page')}&nbsp;
                        <span className="font-medium">{currentPage}</span>&nbsp;
                        {getLabel('of', 'of')}&nbsp;
                        <span className="font-medium">{totalPages}</span>
                      </p>
                    </div>
                    <div>
                      <nav
                        aria-label="Pagination"
                        className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                      >
                        <button
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          onClick={(event) => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          {getLabel('previous', 'Previous')}
                        </button>
                        <button
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          onClick={(event) => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          {getLabel('next', 'Next')}
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 mb-4">{getLabel('noOrders', 'No orders found.')}</p>
            </div>
          )}
        </>
      ) : (
        <div className="p-8 text-center text-gray-500">
          {getLabel('loading', 'Loading orders...')}
        </div>
      )}
    </div>
  );
}

export default OrderList;
