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
  searchFields?: (keyof OrderSearchArguments)[];

  /** Term fields configuration (backend) */
  termFields?: any[]; // Using any[] to avoid strict enum import issues in Mitosis for now, effectively OrderSearchFields[]

  /** Filter orders by these statuses */
  orderStatus?: OrderStatus[];

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
  searchFields: (keyof OrderSearchArguments)[];
}

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
} from "propeller-sdk-v2";

/**
 * Usage:
 *
 *  <order-list></order-list>
 *
 */
class OrderList extends HTMLElement {
  get _root() {
    return this.shadowRoot || this;
  }

  constructor() {
    super();
    const self = this;

    this.state = {
      orders: [],
      columns: self.props.columns || ["id", "date", "status", "total"],
      loading: true,
      totalItems: 0,
      currentPage: 1,
      itemsPerPage: self.props.initialItemsPerPage || 10,
      totalPages: 0,
      rowsClickable: self.props.rowsClickable || false,
      fetching: false,
      searchForm: {},
      fetchOrders: async function fetchOrders(page: number = 1) {
        if (
          !self.props.user ||
          !self.props.graphqlClient ||
          self.state.fetching
        )
          return;
        self.state.fetching = true;
        self.update();
        self.state.loading = true;
        self.update();
        try {
          const orderService = new OrderService(self.props.graphqlClient);
          const isContactUser = "contactId" in self.props.user;
          const statuses = self.props.orderStatus || [
            "NEW",
            "CONFIRMED",
            "VALIDATED",
            "ORDER", // Default statuses if not provided
          ];

          // Explicit cast to any for user ID access as SDK types might be strict interfaces
          // We handle both Contact (contactId) and Customer (customerId)
          const userId = isContactUser
            ? (self.props.user as any).contactId
            : (self.props.user as any).customerId;
          const companyId =
            isContactUser && (self.props.user as any).company
              ? (self.props.user as any).company.companyId
              : undefined;
          const searchArgs: OrderSearchArguments = {
            status: statuses,
            userId: [userId],
            ...(companyId && {
              companyIds: [companyId],
            }),
            page: page,
            offset: self.state.itemsPerPage,
            term: self.state.searchForm.term || "",
            termFields: self.props.termFields || [
              Enums.OrderSearchFields.REFERENCE,
              Enums.OrderSearchFields.ITEM_SKU,
            ],
            ...(self.state.searchForm.createdAt && {
              createdAt: self.state.searchForm.createdAt,
            }),
            ...(self.state.searchForm.lastModifiedAt && {
              lastModifiedAt: self.state.searchForm.lastModifiedAt,
            }),
            ...(self.state.searchForm.price && {
              price: self.state.searchForm.price,
            }),
            ...(self.state.searchForm.sortInput && {
              sortInput: self.state.searchForm.sortInput,
            }),
            ...(self.state.searchForm.type && {
              type: self.state.searchForm.type,
            }),
          };
          const response: OrderResponse = await orderService.getOrders(
            searchArgs
          );
          self.state.orders = response.items || [];
          self.update();
          self.state.totalItems = response.itemsFound || 0;
          self.update();
          if (response.offset) {
            self.state.itemsPerPage = response.offset;
            self.update();
          }
          self.state.totalPages = Math.ceil(
            (response.itemsFound || 0) / (response.offset || 10)
          );
          self.update();
        } catch (error) {
          console.error("Error fetching orders:", error);
          self.state.orders = [];
          self.update();
        } finally {
          self.state.loading = false;
          self.update();
          self.state.fetching = false;
          self.update();
        }
      },
      handlePageChange(newPage: number) {
        if (newPage >= 1 && newPage <= self.state.totalPages) {
          self.state.currentPage = newPage;
          self.update();
        }
      },
      formatDate(dateString: string) {
        if (self.props.formatDate) return self.props.formatDate(dateString);
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString();
      },
      formatPrice(price: number) {
        if (self.props.formatPrice) return self.props.formatPrice(price);
        if (!price) return "-";
        return `€${Number(price).toFixed(2)}`;
      },
      getStatusColor(status: string) {
        if (self.props.getStatusColor) return self.props.getStatusColor(status);
        switch (status) {
          case "COMPLETE":
          case "QUOTE_ACCEPTED":
            return "bg-violet-100 text-violet-800";
          case "CANCELLED":
          case "QUOTE_REJECTED":
            return "bg-red-100 text-red-800";
          default:
            return "bg-yellow-100 text-yellow-800";
        }
      },
      getColumnLabel(col: string) {
        if (self.props.columnConfig && self.props.columnConfig[col]) {
          return self.props.columnConfig[col];
        }
        // Fallback: Capitalize first letter
        return col.charAt(0).toUpperCase() + col.slice(1);
      },
      getLabel(key: string, fallback: string) {
        return (self.props.labels as any)?.[key] || fallback;
      },
      get searchFields() {
        const fields = self.props.searchFields || [];
        if (self.props.enableSearch && !(fields as string[]).includes("term")) {
          return ["term", ...fields] as (keyof OrderSearchArguments)[];
        }
        return fields;
      },
    };
    if (!this.props) {
      this.props = {};
    }

    this.componentProps = [
      "user",
      "columns",
      "initialItemsPerPage",
      "rowsClickable",
      "graphqlClient",
      "orderStatus",
      "termFields",
      "formatDate",
      "formatPrice",
      "getStatusColor",
      "columnConfig",
      "labels",
      "searchFields",
      "enableSearch",
      "className",
      "onOrderClick",
    ];

    this.updateDeps = [[this.props.user, this.state.currentPage]];

    // used to keep track of all nodes created by show/for
    this.nodesToDestroy = [];
    // batch updates
    this.pendingUpdate = false;

    // Event handler for 'change' event on input-order-list-1
    this.onInputOrderList1Change = (e) => {
      this.state.searchForm = {
        ...this.state.searchForm,
        term: e.target.value,
      };
      this.update();
    };

    // Event handler for 'keydown' event on input-order-list-1
    this.onInputOrderList1Keydown = (e) => {
      if (e.key === "Enter") {
        this.state.fetchOrders(1);
      }
    };

    // Event handler for 'change' event on input-order-list-2
    this.onInputOrderList2Change = (e) => {
      const current = this.state.searchForm.createdAt || {};
      const val = e.target.value ? `${e.target.value}T00:00:00Z` : undefined;
      this.state.searchForm = {
        ...this.state.searchForm,
        createdAt: {
          ...current,
          greaterThan: val,
        },
      };
      this.update();
    };

    // Event handler for 'change' event on input-order-list-3
    this.onInputOrderList3Change = (e) => {
      const current = this.state.searchForm.createdAt || {};
      const val = e.target.value ? `${e.target.value}T23:59:59Z` : undefined;
      this.state.searchForm = {
        ...this.state.searchForm,
        createdAt: {
          ...current,
          lessThan: val,
        },
      };
      this.update();
    };

    // Event handler for 'change' event on input-order-list-4
    this.onInputOrderList4Change = (e) => {
      const current = this.state.searchForm.lastModifiedAt || {};
      const val = e.target.value ? `${e.target.value}T00:00:00Z` : undefined;
      this.state.searchForm = {
        ...this.state.searchForm,
        lastModifiedAt: {
          ...current,
          greaterThan: val,
        },
      };
      this.update();
    };

    // Event handler for 'change' event on input-order-list-5
    this.onInputOrderList5Change = (e) => {
      const current = this.state.searchForm.lastModifiedAt || {};
      const val = e.target.value ? `${e.target.value}T23:59:59Z` : undefined;
      this.state.searchForm = {
        ...this.state.searchForm,
        lastModifiedAt: {
          ...current,
          lessThan: val,
        },
      };
      this.update();
    };

    // Event handler for 'change' event on input-order-list-6
    this.onInputOrderList6Change = (e) => {
      const current = this.state.searchForm.price || {};
      this.state.searchForm = {
        ...this.state.searchForm,
        price: {
          ...current,
          greaterThan: parseFloat(e.target.value),
        },
      };
      this.update();
    };

    // Event handler for 'change' event on input-order-list-7
    this.onInputOrderList7Change = (e) => {
      const current = this.state.searchForm.price || {};
      this.state.searchForm = {
        ...this.state.searchForm,
        price: {
          ...current,
          lessThan: parseFloat(e.target.value),
        },
      };
      this.update();
    };

    // Event handler for 'change' event on select-order-list-1
    this.onSelectOrderList1Change = (e) => {
      const current = this.state.searchForm.sortInput || {};
      this.state.searchForm = {
        ...this.state.searchForm,
        sortInput: {
          ...current,
          field: e.target.value as Enums.OrderSortField,
        },
      };
      this.update();
    };

    // Event handler for 'change' event on select-order-list-2
    this.onSelectOrderList2Change = (e) => {
      const current = this.state.searchForm.sortInput || {};
      this.state.searchForm = {
        ...this.state.searchForm,
        sortInput: {
          ...current,
          order: e.target.value as Enums.SortOrder,
        },
      };
      this.update();
    };

    // Event handler for 'change' event on select-order-list-3
    this.onSelectOrderList3Change = (e) => {
      this.state.searchForm = {
        ...this.state.searchForm,
        type: e.target.value as Enums.OrderType,
      };
      this.update();
    };

    // Event handler for 'click' event on button-order-list-1
    this.onButtonOrderList1Click = (event) => {
      this.state.searchForm = {};
      this.update();
      this.state.fetchOrders(1);
    };

    // Event handler for 'click' event on button-order-list-2
    this.onButtonOrderList2Click = (event) => {
      this.state.fetchOrders(1);
    };

    // Event handler for 'click' event on tr-order-list-1
    this.onTrOrderList1Click = (event) => {
      const order = this.getScope(event.currentTarget, "order");
      this.state.rowsClickable && this.props.onOrderClick(order.id);
    };

    // Event handler for 'click' event on button-order-list-3
    this.onButtonOrderList3Click = (event) => {
      const order = this.getScope(event.currentTarget, "order");

      event.preventDefault();
      this.props.onOrderClick(order.id);
    };

    // Event handler for 'click' event on button-order-list-4
    this.onButtonOrderList4Click = (event) => {
      this.state.handlePageChange(this.state.currentPage - 1);
    };

    // Event handler for 'click' event on button-order-list-5
    this.onButtonOrderList5Click = (event) => {
      this.state.handlePageChange(this.state.currentPage + 1);
    };

    // Event handler for 'click' event on button-order-list-6
    this.onButtonOrderList6Click = (event) => {
      this.state.handlePageChange(this.state.currentPage - 1);
    };

    // Event handler for 'click' event on button-order-list-7
    this.onButtonOrderList7Click = (event) => {
      this.state.handlePageChange(this.state.currentPage + 1);
    };

    if (undefined) {
      this.attachShadow({ mode: "open" });
    }
  }

  destroyAnyNodes() {
    // destroy current view template refs before rendering again
    this.nodesToDestroy.forEach((el) => el.remove());
    this.nodesToDestroy = [];
  }

  connectedCallback() {
    this.getAttributeNames().forEach((attr) => {
      const jsVar = attr.replace(/-/g, "");
      const regexp = new RegExp(jsVar, "i");
      this.componentProps.forEach((prop) => {
        if (regexp.test(prop)) {
          const attrValue = this.getAttribute(attr);
          if (this.props[prop] !== attrValue) {
            this.props[prop] = attrValue;
          }
        }
      });
    });

    this._root.innerHTML = `
      <div data-el="div-order-list-1">
        <template data-el="show-order-list">
          <div class="mb-6 bg-white p-4 rounded-lg shadow space-y-4">
            <template data-el="show-order-list-2">
              <div class="w-full">
                <label
                  class="block text-sm font-medium text-gray-700 capitalize mb-1"
                >
                  <template data-el="div-order-list-2">
                    <!-- state.getColumnLabel('term') -->
                  </template>
                </label>
                <input
                  type="text"
                  placeholder="Search..."
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                  data-el="input-order-list-1"
                  data-dom-state="OrderList-input-order-list-1"
                />
              </div>
            </template>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <template data-el="for-order-list">
                <div class="space-y-1" data-el="div-order-list-3">
                  <label class="block text-sm font-medium text-gray-700 capitalize">
                    <template data-el="div-order-list-4">
                      <!-- state.getColumnLabel(field) -->
                    </template>
                  </label>
                  <template data-el="show-order-list-3">
                    <div class="flex space-x-2 w-full">
                      <input
                        type="date"
                        placeholder="From"
                        class="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        data-el="input-order-list-2"
                        data-dom-state="OrderList-input-order-list-2"
                      />
                      <input
                        type="date"
                        placeholder="To"
                        class="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        data-el="input-order-list-3"
                        data-dom-state="OrderList-input-order-list-3"
                      />
                    </div>
                  </template>
                  <template data-el="show-order-list-4">
                    <div class="flex space-x-2 w-full">
                      <input
                        type="date"
                        placeholder="From"
                        class="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        data-el="input-order-list-4"
                        data-dom-state="OrderList-input-order-list-4"
                      />
                      <input
                        type="date"
                        placeholder="To"
                        class="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        data-el="input-order-list-5"
                        data-dom-state="OrderList-input-order-list-5"
                      />
                    </div>
                  </template>
                  <template data-el="show-order-list-5">
                    <div class="flex space-x-2 w-full">
                      <input
                        type="number"
                        placeholder="Min"
                        class="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        data-el="input-order-list-6"
                        data-dom-state="OrderList-input-order-list-6"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        class="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        data-el="input-order-list-7"
                        data-dom-state="OrderList-input-order-list-7"
                      />
                    </div>
                  </template>
                  <template data-el="show-order-list-6">
                    <div class="flex space-x-2 w-full">
                      <select
                        class="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        data-el="select-order-list-1"
                        data-dom-state="OrderList-select-order-list-1"
                      >
                        <option value="">Sort Field</option>
      
                        <template data-el="for-order-list-2">
                          <option data-el="option-order-list-1">
                            <template data-el="div-order-list-5">
                              <!-- sortField -->
                            </template>
                          </option>
                        </template>
                      </select>
                      <select
                        class="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        data-el="select-order-list-2"
                        data-dom-state="OrderList-select-order-list-2"
                      >
                        <option value="">Order</option>
      
                        <template data-el="for-order-list-3">
                          <option data-el="option-order-list-2">
                            <template data-el="div-order-list-6">
                              <!-- order -->
                            </template>
                          </option>
                        </template>
                      </select>
                    </div>
                  </template>
                  <template data-el="show-order-list-7">
                    <div class="flex space-x-2">
                      <select
                        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        data-el="select-order-list-3"
                        data-dom-state="OrderList-select-order-list-3"
                      >
                        <option value="">Type</option>
      
                        <template data-el="for-order-list-4">
                          <option data-el="option-order-list-3">
                            <template data-el="div-order-list-7">
                              <!-- type -->
                            </template>
                          </option>
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
                data-el="button-order-list-1"
              >
                Clear
              </button>
              <button
                class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                data-el="button-order-list-2"
              >
                Search
              </button>
            </div>
          </div>
        </template>
        <template data-el="show-order-list-8">
          <template data-el="show-order-list-9">
            <div class="bg-white rounded-lg shadow overflow-hidden">
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <template data-el="for-order-list-5">
                        <th data-el="th-order-list-1">
                          <template data-el="div-order-list-8">
                            <!-- state.getColumnLabel(col) -->
                          </template>
                        </th>
                      </template>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    <template data-el="for-order-list-6">
                      <tr class="hover:bg-gray-50" data-el="tr-order-list-1">
                        <template data-el="for-order-list-7">
                          <td data-el="td-order-list-1">
                            <template data-el="show-order-list-10">
                              <span class="text-gray-900">
                                <template data-el="div-order-list-9">
                                  <!-- order.id -->
                                </template>
                              </span>
                            </template>
                            <template data-el="show-order-list-11">
                              <template data-el="div-order-list-10">
                                <!-- state.formatDate(order.date || order.createdAt || '') -->
                              </template>
                            </template>
                            <template data-el="show-order-list-12">
                              <span data-el="span-order-list-1">
                                <template data-el="div-order-list-11">
                                  <!-- order.status -->
                                </template>
                              </span>
                            </template>
                            <template data-el="show-order-list-13">
                              <template data-el="div-order-list-12">
                                <!-- state.formatPrice(order.total?.net) -->
                              </template>
                            </template>
                            <template data-el="show-order-list-14">
                              <button
                                class="text-blue-600 hover:text-blue-900 cursor-pointer"
                                data-el="button-order-list-3"
                              >
                                <template data-el="div-order-list-13">
                                  <!-- state.getLabel('view', 'View') -->
                                </template>
                              </button>
                            </template>
                            <template data-el="show-order-list-15">
                              <template data-el="div-order-list-14">
                                <!-- (order as any)[col] -->
                              </template>
                            </template>
                          </td>
                        </template>
                      </tr>
                    </template>
                  </tbody>
                </table>
              </div>
              <template data-el="show-order-list-16">
                <div
                  class="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6"
                >
                  <div class="flex-1 flex justify-between sm:hidden">
                    <button
                      class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      data-el="button-order-list-4"
                    >
                      <template data-el="div-order-list-15">
                        <!-- state.getLabel('previous', 'Previous') -->
                      </template>
                    </button>
                    <button
                      class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      data-el="button-order-list-5"
                    >
                      <template data-el="div-order-list-16">
                        <!-- state.getLabel('next', 'Next') -->
                      </template>
                    </button>
                  </div>
                  <div
                    class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between"
                  >
                    <div>
                      <p class="text-sm text-gray-700">
                        <template data-el="div-order-list-17">
                          <!-- state.getLabel('showingPage', 'Showing page') -->
                        </template>
                        &nbsp;
                        <span class="font-medium">
                          <template data-el="div-order-list-18">
                            <!-- state.currentPage -->
                          </template>
                        </span>
                        &nbsp;
                        <template data-el="div-order-list-19">
                          <!-- state.getLabel('of', 'of') -->
                        </template>
                        &nbsp;
                        <span class="font-medium">
                          <template data-el="div-order-list-20">
                            <!-- state.totalPages -->
                          </template>
                        </span>
                      </p>
                    </div>
                    <div>
                      <nav
                        aria-label="Pagination"
                        class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                      >
                        <button
                          class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          data-el="button-order-list-6"
                        >
                          <template data-el="div-order-list-21">
                            <!-- state.getLabel('previous', 'Previous') -->
                          </template>
                        </button>
                        <button
                          class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                          data-el="button-order-list-7"
                        >
                          <template data-el="div-order-list-22">
                            <!-- state.getLabel('next', 'Next') -->
                          </template>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </template>
        </template>
      </div>`;
    this.pendingUpdate = true;

    this.render();
    this.onMount();
    this.pendingUpdate = false;
    this.update();
  }

  showContent(el) {
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLTemplateElement/content
    // grabs the content of a node that is between <template> tags
    // iterates through child nodes to register all content including text elements
    // attaches the content after the template

    const elementFragment = el.content.cloneNode(true);
    const children = Array.from(elementFragment.childNodes);
    children.forEach((child) => {
      if (el?.scope) {
        child.scope = el.scope;
      }
      if (el?.context) {
        child.context = el.context;
      }
      this.nodesToDestroy.push(child);
    });
    el.after(elementFragment);
  }

  onMount() {
    // onMount
    if (this.props.user) {
      this.state.fetchOrders(this.state.currentPage);
    }
  }

  onUpdate() {
    const self = this;

    (function (__prev, __next) {
      const __hasChange = __prev.find((val, index) => val !== __next[index]);
      if (__hasChange !== undefined) {
        if (self.props.user) {
          self.state.fetchOrders(self.state.currentPage);
        }
        self.updateDeps[0] = __next;
      }
    })(self.updateDeps[0], [self.props.user, self.state.currentPage]);
  }

  update() {
    if (this.pendingUpdate === true) {
      return;
    }
    this.pendingUpdate = true;
    this.render();
    this.onUpdate();
    this.pendingUpdate = false;
  }

  render() {
    // grab previous input state
    const preStateful = this.getStateful(this._root);
    const preValues = this.prepareHydrate(preStateful);

    // re-rendering needs to ensure that all nodes generated by for/show are refreshed
    this.destroyAnyNodes();
    this.updateBindings();

    // hydrate input state
    if (preValues.length) {
      const nextStateful = this.getStateful(this._root);
      this.hydrateDom(preValues, nextStateful);
    }
  }

  getStateful(el) {
    const stateful = el.querySelectorAll("[data-dom-state]");
    return stateful ? Array.from(stateful) : [];
  }
  prepareHydrate(stateful) {
    return stateful.map((el) => {
      return {
        id: el.dataset.domState,
        value: el.value,
        active: document.activeElement === el,
        selectionStart: el.selectionStart,
      };
    });
  }
  hydrateDom(preValues, stateful) {
    return stateful.map((el, index) => {
      const prev = preValues.find((prev) => el.dataset.domState === prev.id);
      if (prev) {
        el.value = prev.value;
        if (prev.active) {
          el.focus();
          el.selectionStart = prev.selectionStart;
        }
      }
    });
  }

  updateBindings() {
    this._root
      .querySelectorAll("[data-el='div-order-list-1']")
      .forEach((el) => {
        el.className = this.props.className;
      });

    this._root.querySelectorAll("[data-el='show-order-list']").forEach((el) => {
      const whenCondition =
        this.props.enableSearch && this.state.searchFields.length > 0;
      if (whenCondition) {
        this.showContent(el);
      }
    });

    this._root
      .querySelectorAll("[data-el='show-order-list-2']")
      .forEach((el) => {
        const whenCondition = this.state.searchFields.includes("term");
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-2']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getColumnLabel("term"));
      });

    this._root
      .querySelectorAll("[data-el='input-order-list-1']")
      .forEach((el) => {
        el.value = this.state.searchForm.term || "";
        el.removeEventListener("change", this.onInputOrderList1Change);
        el.addEventListener("change", this.onInputOrderList1Change);
        el.removeEventListener("keydown", this.onInputOrderList1Keydown);
        el.addEventListener("keydown", this.onInputOrderList1Keydown);
      });

    this._root.querySelectorAll("[data-el='for-order-list']").forEach((el) => {
      let array = this.state.searchFields.filter((f: string) => f !== "term");
      this.renderLoop(el, array, "field");
    });

    this._root
      .querySelectorAll("[data-el='div-order-list-3']")
      .forEach((el) => {
        const field = this.getScope(el, "field");
        el.key = field;
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-4']")
      .forEach((el) => {
        const field = this.getScope(el, "field");
        this.renderTextNode(el, this.state.getColumnLabel(field));
      });

    this._root
      .querySelectorAll("[data-el='show-order-list-3']")
      .forEach((el) => {
        const field = this.getScope(el, "field");
        const whenCondition = field === "createdAt";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='input-order-list-2']")
      .forEach((el) => {
        el.value = this.state.searchForm.createdAt?.greaterThan
          ? (this.state.searchForm.createdAt.greaterThan as string).split(
              "T"
            )[0]
          : "";
        el.removeEventListener("change", this.onInputOrderList2Change);
        el.addEventListener("change", this.onInputOrderList2Change);
      });

    this._root
      .querySelectorAll("[data-el='input-order-list-3']")
      .forEach((el) => {
        el.value = this.state.searchForm.createdAt?.lessThan
          ? (this.state.searchForm.createdAt.lessThan as string).split("T")[0]
          : "";
        el.removeEventListener("change", this.onInputOrderList3Change);
        el.addEventListener("change", this.onInputOrderList3Change);
      });

    this._root
      .querySelectorAll("[data-el='show-order-list-4']")
      .forEach((el) => {
        const field = this.getScope(el, "field");
        const whenCondition = field === "lastModifiedAt";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='input-order-list-4']")
      .forEach((el) => {
        el.value = this.state.searchForm.lastModifiedAt?.greaterThan
          ? (this.state.searchForm.lastModifiedAt.greaterThan as string).split(
              "T"
            )[0]
          : "";
        el.removeEventListener("change", this.onInputOrderList4Change);
        el.addEventListener("change", this.onInputOrderList4Change);
      });

    this._root
      .querySelectorAll("[data-el='input-order-list-5']")
      .forEach((el) => {
        el.value = this.state.searchForm.lastModifiedAt?.lessThan
          ? (this.state.searchForm.lastModifiedAt.lessThan as string).split(
              "T"
            )[0]
          : "";
        el.removeEventListener("change", this.onInputOrderList5Change);
        el.addEventListener("change", this.onInputOrderList5Change);
      });

    this._root
      .querySelectorAll("[data-el='show-order-list-5']")
      .forEach((el) => {
        const field = this.getScope(el, "field");
        const whenCondition = field === "price";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='input-order-list-6']")
      .forEach((el) => {
        el.value = this.state.searchForm.price?.greaterThan || "";
        el.removeEventListener("change", this.onInputOrderList6Change);
        el.addEventListener("change", this.onInputOrderList6Change);
      });

    this._root
      .querySelectorAll("[data-el='input-order-list-7']")
      .forEach((el) => {
        el.value = this.state.searchForm.price?.lessThan || "";
        el.removeEventListener("change", this.onInputOrderList7Change);
        el.addEventListener("change", this.onInputOrderList7Change);
      });

    this._root
      .querySelectorAll("[data-el='show-order-list-6']")
      .forEach((el) => {
        const field = this.getScope(el, "field");
        const whenCondition = field === "sortInput";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='select-order-list-1']")
      .forEach((el) => {
        el.value = this.state.searchForm.sortInput?.field || "";
        el.removeEventListener("change", this.onSelectOrderList1Change);
        el.addEventListener("change", this.onSelectOrderList1Change);
      });

    this._root
      .querySelectorAll("[data-el='for-order-list-2']")
      .forEach((el) => {
        let array = Object.values(Enums.OrderSortField);
        this.renderLoop(el, array, "sortField");
      });

    this._root
      .querySelectorAll("[data-el='option-order-list-1']")
      .forEach((el) => {
        const sortField = this.getScope(el, "sortField");
        el.key = sortField;
        el.value = sortField;
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-5']")
      .forEach((el) => {
        const sortField = this.getScope(el, "sortField");
        this.renderTextNode(el, sortField);
      });

    this._root
      .querySelectorAll("[data-el='select-order-list-2']")
      .forEach((el) => {
        el.value = this.state.searchForm.sortInput?.order || "";
        el.removeEventListener("change", this.onSelectOrderList2Change);
        el.addEventListener("change", this.onSelectOrderList2Change);
      });

    this._root
      .querySelectorAll("[data-el='for-order-list-3']")
      .forEach((el) => {
        let array = Object.values(Enums.SortOrder);
        this.renderLoop(el, array, "order");
      });

    this._root
      .querySelectorAll("[data-el='option-order-list-2']")
      .forEach((el) => {
        const order = this.getScope(el, "order");
        el.key = order;
        el.value = order;
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-6']")
      .forEach((el) => {
        const order = this.getScope(el, "order");
        this.renderTextNode(el, order);
      });

    this._root
      .querySelectorAll("[data-el='show-order-list-7']")
      .forEach((el) => {
        const field = this.getScope(el, "field");
        const whenCondition = field === "type";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='select-order-list-3']")
      .forEach((el) => {
        el.value = this.state.searchForm.type || "";
        el.removeEventListener("change", this.onSelectOrderList3Change);
        el.addEventListener("change", this.onSelectOrderList3Change);
      });

    this._root
      .querySelectorAll("[data-el='for-order-list-4']")
      .forEach((el) => {
        let array = Object.values(Enums.OrderType);
        this.renderLoop(el, array, "type");
      });

    this._root
      .querySelectorAll("[data-el='option-order-list-3']")
      .forEach((el) => {
        const type = this.getScope(el, "type");
        el.key = type;
        el.value = type;
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-7']")
      .forEach((el) => {
        const type = this.getScope(el, "type");
        this.renderTextNode(el, type);
      });

    this._root
      .querySelectorAll("[data-el='button-order-list-1']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonOrderList1Click);
        el.addEventListener("click", this.onButtonOrderList1Click);
      });

    this._root
      .querySelectorAll("[data-el='button-order-list-2']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonOrderList2Click);
        el.addEventListener("click", this.onButtonOrderList2Click);
      });

    this._root
      .querySelectorAll("[data-el='show-order-list-8']")
      .forEach((el) => {
        const whenCondition =
          !this.state.loading || this.state.orders.length > 0;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='show-order-list-9']")
      .forEach((el) => {
        const whenCondition = this.state.orders.length > 0;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='for-order-list-5']")
      .forEach((el) => {
        let array = this.state.columns;
        this.renderLoop(el, array, "col");
      });

    this._root.querySelectorAll("[data-el='th-order-list-1']").forEach((el) => {
      const col = this.getScope(el, "col");
      el.key = col;
      el.className = `px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
        col === "action" || col === "total" ? "text-right" : ""
      }`;
    });

    this._root
      .querySelectorAll("[data-el='div-order-list-8']")
      .forEach((el) => {
        const col = this.getScope(el, "col");
        this.renderTextNode(el, this.state.getColumnLabel(col));
      });

    this._root
      .querySelectorAll("[data-el='for-order-list-6']")
      .forEach((el) => {
        let array = this.state.orders;
        this.renderLoop(el, array, "order");
      });

    this._root.querySelectorAll("[data-el='tr-order-list-1']").forEach((el) => {
      const order = this.getScope(el, "order");
      el.key = order.id;
      el.removeEventListener("click", this.onTrOrderList1Click);
      el.addEventListener("click", this.onTrOrderList1Click);
    });

    this._root
      .querySelectorAll("[data-el='for-order-list-7']")
      .forEach((el) => {
        let array = this.state.columns;
        this.renderLoop(el, array, "col");
      });

    this._root.querySelectorAll("[data-el='td-order-list-1']").forEach((el) => {
      const col = this.getScope(el, "col");
      el.key = col;
      el.className = `px-6 py-4 whitespace-nowrap text-sm ${
        col === "id" || col === "action" ? "font-medium" : "text-gray-500"
      } ${col === "action" || col === "total" ? "text-right" : ""}`;
    });

    this._root
      .querySelectorAll("[data-el='show-order-list-10']")
      .forEach((el) => {
        const col = this.getScope(el, "col");
        const whenCondition = col === "id";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-9']")
      .forEach((el) => {
        const order = this.getScope(el, "order");
        this.renderTextNode(el, order.id);
      });

    this._root
      .querySelectorAll("[data-el='show-order-list-11']")
      .forEach((el) => {
        const col = this.getScope(el, "col");
        const whenCondition = col === "date";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-10']")
      .forEach((el) => {
        const order = this.getScope(el, "order");
        this.renderTextNode(
          el,
          this.state.formatDate(order.date || order.createdAt || "")
        );
      });

    this._root
      .querySelectorAll("[data-el='show-order-list-12']")
      .forEach((el) => {
        const col = this.getScope(el, "col");
        const whenCondition = col === "status";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='span-order-list-1']")
      .forEach((el) => {
        const order = this.getScope(el, "order");
        el.className = `px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${this.state.getStatusColor(
          order.status
        )}`;
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-11']")
      .forEach((el) => {
        const order = this.getScope(el, "order");
        this.renderTextNode(el, order.status);
      });

    this._root
      .querySelectorAll("[data-el='show-order-list-13']")
      .forEach((el) => {
        const col = this.getScope(el, "col");
        const whenCondition = col === "total";
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-12']")
      .forEach((el) => {
        const order = this.getScope(el, "order");
        this.renderTextNode(el, this.state.formatPrice(order.total?.net));
      });

    this._root
      .querySelectorAll("[data-el='show-order-list-14']")
      .forEach((el) => {
        const col = this.getScope(el, "col");
        const whenCondition = col === "action" && !this.state.rowsClickable;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='button-order-list-3']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonOrderList3Click);
        el.addEventListener("click", this.onButtonOrderList3Click);
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-13']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("view", "View"));
      });

    this._root
      .querySelectorAll("[data-el='show-order-list-15']")
      .forEach((el) => {
        const col = this.getScope(el, "col");
        const whenCondition = ![
          "id",
          "date",
          "status",
          "total",
          "action",
        ].includes(col);
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-14']")
      .forEach((el) => {
        const order = this.getScope(el, "order");
        this.renderTextNode(el, (order as any)[col]);
      });

    this._root
      .querySelectorAll("[data-el='show-order-list-16']")
      .forEach((el) => {
        const whenCondition = this.state.totalPages > 1;
        if (whenCondition) {
          this.showContent(el);
        }
      });

    this._root
      .querySelectorAll("[data-el='button-order-list-4']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonOrderList4Click);
        el.addEventListener("click", this.onButtonOrderList4Click);
        el.setAttribute("disabled", this.state.currentPage === 1);
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-15']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("previous", "Previous"));
      });

    this._root
      .querySelectorAll("[data-el='button-order-list-5']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonOrderList5Click);
        el.addEventListener("click", this.onButtonOrderList5Click);
        el.setAttribute(
          "disabled",
          this.state.currentPage === this.state.totalPages
        );
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-16']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("next", "Next"));
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-17']")
      .forEach((el) => {
        this.renderTextNode(
          el,
          this.state.getLabel("showingPage", "Showing page")
        );
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-18']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.currentPage);
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-19']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("of", "of"));
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-20']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.totalPages);
      });

    this._root
      .querySelectorAll("[data-el='button-order-list-6']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonOrderList6Click);
        el.addEventListener("click", this.onButtonOrderList6Click);
        el.setAttribute("disabled", this.state.currentPage === 1);
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-21']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("previous", "Previous"));
      });

    this._root
      .querySelectorAll("[data-el='button-order-list-7']")
      .forEach((el) => {
        el.removeEventListener("click", this.onButtonOrderList7Click);
        el.addEventListener("click", this.onButtonOrderList7Click);
        el.setAttribute(
          "disabled",
          this.state.currentPage === this.state.totalPages
        );
      });

    this._root
      .querySelectorAll("[data-el='div-order-list-22']")
      .forEach((el) => {
        this.renderTextNode(el, this.state.getLabel("next", "Next"));
      });
  }

  // Helper to render content
  renderTextNode(el, text) {
    const textNode = document.createTextNode(text);
    if (el?.scope) {
      textNode.scope = el.scope;
    }
    if (el?.context) {
      textNode.context = el.context;
    }
    el.after(textNode);
    this.nodesToDestroy.push(el.nextSibling);
  }

  // scope helper
  getScope(el, name) {
    do {
      let value = el?.scope?.[name];
      if (value !== undefined) {
        return value;
      }
    } while ((el = el.parentNode));
  }

  // Helper to render loops
  renderLoop(template, array, itemName, itemIndex, collectionName) {
    const collection = [];
    for (let [index, value] of array.entries()) {
      const elementFragment = template.content.cloneNode(true);
      const children = Array.from(elementFragment.childNodes);
      const localScope = {};
      let scope = localScope;
      if (template?.scope) {
        const getParent = {
          get(target, prop, receiver) {
            if (prop in target) {
              return target[prop];
            }
            if (prop in template.scope) {
              return template.scope[prop];
            }
            return target[prop];
          },
        };
        scope = new Proxy(localScope, getParent);
      }
      children.forEach((child) => {
        if (itemName !== undefined) {
          scope[itemName] = value;
        }
        if (itemIndex !== undefined) {
          scope[itemIndex] = index;
        }
        if (collectionName !== undefined) {
          scope[collectionName] = array;
        }
        child.scope = scope;
        if (template.context) {
          child.context = context;
        }
        this.nodesToDestroy.push(child);
        collection.unshift(child);
      });
    }
    collection.forEach((child) => template.after(child));
  }
}

customElements.define("order-list", OrderList);
