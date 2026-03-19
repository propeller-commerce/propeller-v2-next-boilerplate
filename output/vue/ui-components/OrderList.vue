<template>
  <div :class="className">
    <template v-if="enableSearch && searchFields.length > 0">
      <div class="mb-6 bg-white p-4 rounded-lg shadow space-y-4">
        <template v-if="searchFields.includes('term')">
          <div class="w-full">
            <label class="block text-sm font-medium text-gray-700 capitalize mb-1">{{
              getColumnLabel('term')
            }}</label
            ><input
              type="text"
              placeholder="Search..."
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              :value="searchForm.term || ''"
              @change="
                async (e) => {
                  searchForm = {
                    ...searchForm,
                    term: e.target.value,
                  };
                }
              "
              @keydown="
                async (e) => {
                  if (e.key === 'Enter') {
                    fetchOrders(1);
                  }
                }
              "
            />
          </div>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          <template :key="field" v-for="(field, index) in searchFields.filter((f) => f !== 'term')">
            <div class="space-y-1">
              <label class="block text-sm font-medium text-gray-700 capitalize">{{
                getColumnLabel(field)
              }}</label>
              <template v-if="field === 'createdAt'">
                <div class="flex space-x-2 w-full">
                  <input
                    type="date"
                    placeholder="From"
                    class="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    :value="
                      searchForm.createdAt?.greaterThan
                        ? searchForm.createdAt.greaterThan.split('T')[0]
                        : ''
                    "
                    @change="
                      async (e) => {
                        const current = searchForm.createdAt || {};
                        const val = e.target.value ? `${e.target.value}T00:00:00Z` : undefined;
                        searchForm = {
                          ...searchForm,
                          createdAt: {
                            ...current,
                            greaterThan: val,
                          },
                        };
                      }
                    "
                  /><input
                    type="date"
                    placeholder="To"
                    class="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    :value="
                      searchForm.createdAt?.lessThan
                        ? searchForm.createdAt.lessThan.split('T')[0]
                        : ''
                    "
                    @change="
                      async (e) => {
                        const current = searchForm.createdAt || {};
                        const val = e.target.value ? `${e.target.value}T23:59:59Z` : undefined;
                        searchForm = {
                          ...searchForm,
                          createdAt: {
                            ...current,
                            lessThan: val,
                          },
                        };
                      }
                    "
                  />
                </div>
              </template>

              <template v-if="field === 'lastModifiedAt'">
                <div class="flex space-x-2 w-full">
                  <input
                    type="date"
                    placeholder="From"
                    class="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    :value="
                      searchForm.lastModifiedAt?.greaterThan
                        ? searchForm.lastModifiedAt.greaterThan.split('T')[0]
                        : ''
                    "
                    @change="
                      async (e) => {
                        const current = searchForm.lastModifiedAt || {};
                        const val = e.target.value ? `${e.target.value}T00:00:00Z` : undefined;
                        searchForm = {
                          ...searchForm,
                          lastModifiedAt: {
                            ...current,
                            greaterThan: val,
                          },
                        };
                      }
                    "
                  /><input
                    type="date"
                    placeholder="To"
                    class="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    :value="
                      searchForm.lastModifiedAt?.lessThan
                        ? searchForm.lastModifiedAt.lessThan.split('T')[0]
                        : ''
                    "
                    @change="
                      async (e) => {
                        const current = searchForm.lastModifiedAt || {};
                        const val = e.target.value ? `${e.target.value}T23:59:59Z` : undefined;
                        searchForm = {
                          ...searchForm,
                          lastModifiedAt: {
                            ...current,
                            lessThan: val,
                          },
                        };
                      }
                    "
                  />
                </div>
              </template>

              <template v-if="field === 'price'">
                <div class="flex space-x-2 w-full">
                  <input
                    type="number"
                    placeholder="Min"
                    class="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    :value="searchForm.price?.greaterThan || ''"
                    @change="
                      async (e) => {
                        const current = searchForm.price || {};
                        searchForm = {
                          ...searchForm,
                          price: {
                            ...current,
                            greaterThan: parseFloat(e.target.value),
                          },
                        };
                      }
                    "
                  /><input
                    type="number"
                    placeholder="Max"
                    class="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    :value="searchForm.price?.lessThan || ''"
                    @change="
                      async (e) => {
                        const current = searchForm.price || {};
                        searchForm = {
                          ...searchForm,
                          price: {
                            ...current,
                            lessThan: parseFloat(e.target.value),
                          },
                        };
                      }
                    "
                  />
                </div>
              </template>

              <template v-if="field === 'sortInput'">
                <div class="flex space-x-2 w-full">
                  <select
                    class="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    :value="searchForm.sortInput?.field || ''"
                    @change="
                      async (e) => {
                        const current = searchForm.sortInput || {};
                        searchForm = {
                          ...searchForm,
                          sortInput: {
                            ...current,
                            field: e.target.value,
                          },
                        };
                      }
                    "
                  >
                    <option value="">Sort Field</option>
                    <template
                      :key="sortField"
                      v-for="(sortField, index) in Object.values(Enums.OrderSortField)"
                    >
                      <option :value="sortField">{{ sortField }}</option>
                    </template></select
                  ><select
                    class="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    :value="searchForm.sortInput?.order || ''"
                    @change="
                      async (e) => {
                        const current = searchForm.sortInput || {};
                        searchForm = {
                          ...searchForm,
                          sortInput: {
                            ...current,
                            order: e.target.value,
                          },
                        };
                      }
                    "
                  >
                    <option value="">Order</option>
                    <template :key="order" v-for="(order, index) in Object.values(Enums.SortOrder)">
                      <option :value="order">{{ order }}</option>
                    </template>
                  </select>
                </div>
              </template>

              <template v-if="field === 'type'">
                <div class="flex space-x-2">
                  <select
                    class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    :value="searchForm.type || ''"
                    @change="
                      async (e) => {
                        searchForm = {
                          ...searchForm,
                          type: e.target.value,
                        };
                      }
                    "
                  >
                    <option value="">Type</option>
                    <template :key="type" v-for="(type, index) in Object.values(Enums.OrderType)">
                      <option :value="type">{{ type }}</option>
                    </template>
                  </select>
                </div>
              </template>
            </div>
          </template>
        </div>
        <div class="flex justify-end space-x-2">
          <button
            class="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            @click="
              async (event) => {
                searchForm = {};
                fetchOrders(1);
              }
            "
          >
            Clear</button
          ><button
            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            @click="async (event) => fetchOrders(1)"
          >
            Search
          </button>
        </div>
      </div>
    </template>

    <template v-if="!loading || orders.length > 0">
      <template v-if="orders.length > 0">
        <div class="bg-white rounded-lg shadow overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead class="bg-gray-50">
                <tr>
                  <template :key="col" v-for="(col, index) in columns">
                    <th
                      :class="`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                        col === 'action' || col === 'total' ? 'text-right' : ''
                      }`"
                    >
                      {{ getColumnLabel(col) }}
                    </th>
                  </template>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <template :key="order.id" v-for="(order, index) in orders">
                  <tr
                    class="hover:bg-gray-50"
                    @click="async (event) => rowsClickable && onOrderClick(order.id)"
                  >
                    <template :key="col" v-for="(col, index) in columns">
                      <td
                        :class="`px-6 py-4 whitespace-nowrap text-sm ${
                          col === 'id' || col === 'action' ? 'font-medium' : 'text-gray-500'
                        } ${col === 'action' || col === 'total' ? 'text-right' : ''}`"
                      >
                        <template v-if="col === 'id'">
                          <span class="text-gray-900">{{ order.id }}</span>
                        </template>

                        <template v-if="col === 'date'">
                          {{ formatDate(order.date || order.createdAt || '') }}
                        </template>

                        <template v-if="col === 'status'">
                          <span
                            :class="`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              order.status
                            )}`"
                            >{{ order.status }}</span
                          >
                        </template>

                        <template v-if="col === 'total'">
                          {{ formatPrice(order.total?.net) }}
                        </template>

                        <template v-if="col === 'action' && !rowsClickable">
                          <button
                            class="text-blue-600 hover:text-blue-900 cursor-pointer"
                            @click="
                              async (event) => {
                                event.preventDefault();
                                onOrderClick(order.id);
                              }
                            "
                          >
                            {{ getLabel('view', 'View') }}
                          </button>
                        </template>

                        <template v-if="col === 'validUntil'">
                          {{ formatDate(order.validUntil || '') }}
                        </template>

                        <template
                          v-if="
                            !['id', 'date', 'status', 'total', 'action', 'validUntil'].includes(col)
                          "
                        >
                          {{ order[col] }}
                        </template>
                      </td>
                    </template>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          <template v-if="totalPages > 1">
            <div
              class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6"
            >
              <div class="flex-1 flex justify-between sm:hidden">
                <button
                  class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  @click="async (event) => handlePageChange(currentPage - 1)"
                  :disabled="currentPage === 1"
                >
                  {{ getLabel('previous', 'Previous') }}</button
                ><button
                  class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  @click="async (event) => handlePageChange(currentPage + 1)"
                  :disabled="currentPage === totalPages"
                >
                  {{ getLabel('next', 'Next') }}
                </button>
              </div>
              <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm text-gray-700">
                    {{ getLabel('showingPage', 'Showing page') }}&nbsp;<span class="font-medium">{{
                      currentPage
                    }}</span
                    >&nbsp;{{ getLabel('of', 'of') }}&nbsp;<span class="font-medium">{{
                      totalPages
                    }}</span>
                  </p>
                </div>
                <div>
                  <nav
                    aria-label="Pagination"
                    class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                  >
                    <button
                      class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      @click="async (event) => handlePageChange(currentPage - 1)"
                      :disabled="currentPage === 1"
                    >
                      {{ getLabel('previous', 'Previous') }}</button
                    ><button
                      class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      @click="async (event) => handlePageChange(currentPage + 1)"
                      :disabled="currentPage === totalPages"
                    >
                      {{ getLabel('next', 'Next') }}
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </template>
        </div>
      </template>

      <template v-else>
        <div class="bg-white rounded-lg shadow p-8 text-center">
          <p class="text-gray-500 mb-4">
            {{ getLabel('noOrders', 'No orders found.') }}
          </p>
        </div>
      </template>
    </template>

    <template v-else>
      <div class="p-8 text-center text-gray-500">
        {{ getLabel('loading', 'Loading orders...') }}
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

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
  fetching: boolean;
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
  searchFields: string[];
}

const props = defineProps<OrderListProps>();
const orders = ref<OrderListState['orders']>([]);
const columns = ref<OrderListState['columns']>(
  props.columns.value || ['id', 'date', 'status', 'total']
);
const loading = ref<OrderListState['loading']>(true);
const totalItems = ref<OrderListState['totalItems']>(0);
const currentPage = ref<OrderListState['currentPage']>(1);
const itemsPerPage = ref<OrderListState['itemsPerPage']>(props.initialItemsPerPage || 10);
const totalPages = ref<OrderListState['totalPages']>(0);
const rowsClickable = ref<OrderListState['rowsClickable']>(props.rowsClickable.value || false);
const fetching = ref<OrderListState['fetching']>(false);
const searchForm = ref<OrderListState['searchForm']>({});

onMounted(() => {
  if (props.user) {
    fetchOrders(currentPage.value);
  }
});

const searchFields = computed(() => {
  const fields = props.searchFields || [];
  if (props.enableSearch && !(fields as string[]).includes('term')) {
    return ['term', ...fields] as string[];
  }
  return fields;
});

watch(
  () => [props.user, currentPage.value, props.companyId],
  () => {
    if (props.user) {
      fetchOrders(currentPage.value);
    }
  },
  { immediate: true }
);
async function fetchOrders(page: number = 1): ReturnType<OrderListState['fetchOrders']> {
  if (!props.user || !props.graphqlClient || fetching.value) return;
  fetching.value = true;
  loading.value = true;
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
    const companyId =
      props.companyId ||
      (isContactUser && (props.user as any).company
        ? (props.user as any).company.companyId
        : undefined);
    const searchArgs: OrderSearchArguments = {
      status: statuses,
      userId: [userId],
      ...(companyId && {
        companyIds: [companyId],
      }),
      page: page,
      offset: itemsPerPage.value,
      term: searchForm.value.term || '',
      termFields: props.termFields || [
        Enums.OrderSearchFields.REFERENCE,
        Enums.OrderSearchFields.ITEM_SKU,
      ],
      ...(searchForm.value.createdAt && {
        createdAt: searchForm.value.createdAt,
      }),
      ...(searchForm.value.lastModifiedAt && {
        lastModifiedAt: searchForm.value.lastModifiedAt,
      }),
      ...(searchForm.value.price && {
        price: searchForm.value.price,
      }),
      ...(searchForm.value.sortInput && {
        sortInput: searchForm.value.sortInput,
      }),
      ...(searchForm.value.type && {
        type: searchForm.value.type,
      }),
    };
    const response: OrderResponse = await orderService.getOrders(searchArgs);
    orders.value = response.items || [];
    totalItems.value = response.itemsFound || 0;
    if (response.offset) {
      itemsPerPage.value = response.offset;
    }
    totalPages.value = Math.ceil((response.itemsFound || 0) / (response.offset || 10));
  } catch (error) {
    console.error('Error fetching orders:', error);
    orders.value = [];
  } finally {
    loading.value = false;
    fetching.value = false;
  }
}
function handlePageChange(newPage: number): ReturnType<OrderListState['handlePageChange']> {
  if (newPage >= 1 && newPage <= totalPages.value) {
    currentPage.value = newPage;
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
      return 'bg-violet-100 text-violet-800';
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
</script>
