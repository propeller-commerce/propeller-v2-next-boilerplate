import {
    useStore,
    onUpdate,
    Show,
    For,
} from '@builder.io/mitosis';
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
    OrderSortInput
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

export default function OrderList(props: OrderListProps) {
    const state = useStore<OrderListState>({
        orders: [] as Order[],
        columns: props.columns || ['id', 'date', 'status', 'total'],
        loading: true,
        totalItems: 0,
        currentPage: 1,
        itemsPerPage: props.initialItemsPerPage || 10,
        totalPages: 0,
        rowsClickable: props.rowsClickable || false,
        fetching: false,
        searchForm: {},

        async fetchOrders(page: number = 1) {
            if (!props.user || !props.graphqlClient || state.fetching) return;

            state.fetching = true;
            state.loading = true;

            try {
                const orderService = new OrderService(props.graphqlClient);
                const isContactUser = 'contactId' in props.user;
                const statuses = props.orderStatus || [
                    'NEW', 'CONFIRMED', 'VALIDATED', 'ORDER' // Default statuses if not provided
                ];

                // Explicit cast to any for user ID access as SDK types might be strict interfaces
                // We handle both Contact (contactId) and Customer (customerId)
                const userId = isContactUser
                    ? (props.user as any).contactId
                    : (props.user as any).customerId;

                const companyIdFallback = isContactUser && (props.user as any).company
                    ? (props.user as any).company.companyId
                    : null;
                const companyId = props.companyId || companyIdFallback || null;

                const searchArgs: OrderSearchArguments = {
                    status: statuses,
                    ...(!props.showCompanyOrders && { userId: [userId] }),
                    ...(props.showCompanyOrders && companyId && { companyIds: [companyId] }),
                    page: page,
                    offset: state.itemsPerPage,
                    term: state.searchForm.term || "",
                    termFields: props.termFields || [
                        Enums.OrderSearchFields.REFERENCE,
                        Enums.OrderSearchFields.ITEM_SKU,
                        Enums.OrderSearchFields.ID,
                        Enums.OrderSearchFields.ITEM_NAME,
                        Enums.OrderSearchFields.REMARKS
                    ],
                    sortInputs: state.searchForm.sortInput || { field: Enums.OrderSortField.CREATED_AT, order: Enums.SortOrder.DESC },
                    ...(state.searchForm.createdAt && { createdAt: state.searchForm.createdAt }),
                    ...(state.searchForm.lastModifiedAt && { lastModifiedAt: state.searchForm.lastModifiedAt }),
                    ...(state.searchForm.price && { price: state.searchForm.price }),
                    ...(state.searchForm.type && { type: state.searchForm.type })
                };

                const response: OrderResponse = await orderService.getOrders(searchArgs);

                state.orders = response.items || [];
                state.totalItems = response.itemsFound || 0;

                if (response.offset) {
                    state.itemsPerPage = response.offset;
                }

                state.totalPages = Math.ceil((response.itemsFound || 0) / (response.offset || 10));

            } catch (error) {
                console.error('Error fetching orders:', error);
                state.orders = [];
            } finally {
                state.loading = false;
                state.fetching = false;
            }
        },

        handlePageChange(newPage: number) {
            if (newPage >= 1 && newPage <= state.totalPages) {
                state.currentPage = newPage;
            }
        },

        formatDate(dateString: string) {
            if (props.formatDate) return props.formatDate(dateString);
            if (!dateString) return '-';
            return new Date(dateString).toLocaleDateString();
        },

        formatPrice(price: number) {
            if (props.formatPrice) return props.formatPrice(price);
            if (!price) return '-';
            return `€${Number(price).toFixed(2)}`;
        },

        getStatusColor(status: string) {
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
        },

        getColumnLabel(col: string) {
            if (props.columnConfig && props.columnConfig[col]) {
                return props.columnConfig[col];
            }
            // Fallback: Capitalize first letter
            return col.charAt(0).toUpperCase() + col.slice(1);
        },

        getLabel(key: string, fallback: string) {
            return (props.labels as any)?.[key] || fallback;
        },

        get searchFields() {
            const fields = props.searchFields || [];
            if (props.enableSearch && !(fields as string[]).includes('term')) {
                return ['term', ...fields] as string[];
            }
            return fields;
        }
    });

    onUpdate(() => {
        if (props.user) {
            state.fetchOrders(state.currentPage);
        }
    }, [props.user, state.currentPage, props.companyId]);

    return (
        <div className={props.className}>
            <Show when={props.enableSearch && state.searchFields.length > 0}>
                <div className="mb-6 bg-white p-4 rounded-lg shadow space-y-4">
                    {/* Term Field Section (Full Width) */}
                    <Show when={state.searchFields.includes('term')}>
                        <div className="w-full">
                            <label className="block text-sm font-medium text-gray-700 capitalize mb-1">
                                {state.getColumnLabel('term')}
                            </label>
                            <input
                                type="text"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                                value={state.searchForm.term || ''}
                                onChange={(e) => {
                                    state.searchForm = { ...state.searchForm, term: e.target.value };
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        state.fetchOrders(1);
                                    }
                                }}
                                placeholder="Search..."
                            />
                        </div>
                    </Show>

                    {/* Other Search Fields (Grid Layout) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                        <For each={state.searchFields.filter((f: string) => f !== 'term')}>
                            {(field: string) => (
                                <div key={field} className="space-y-1">
                                    <label className="block text-sm font-medium text-gray-700 capitalize">
                                        {state.getColumnLabel(field)}
                                    </label>

                                    <Show when={field === 'createdAt'}>
                                        <div className="flex space-x-2 w-full">
                                            <input
                                                type="date"
                                                className="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                                                placeholder="From"
                                                value={state.searchForm.createdAt?.greaterThan ? (state.searchForm.createdAt.greaterThan as string).split('T')[0] : ''}
                                                onChange={(e) => {
                                                    const current = state.searchForm.createdAt || {};
                                                    const val = e.target.value ? `${e.target.value}T00:00:00Z` : undefined;
                                                    state.searchForm = {
                                                        ...state.searchForm,
                                                        createdAt: { ...current, greaterThan: val }
                                                    };
                                                }}
                                            />
                                            <input
                                                type="date"
                                                className="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                                                placeholder="To"
                                                value={state.searchForm.createdAt?.lessThan ? (state.searchForm.createdAt.lessThan as string).split('T')[0] : ''}
                                                onChange={(e) => {
                                                    const current = state.searchForm.createdAt || {};
                                                    const val = e.target.value ? `${e.target.value}T23:59:59Z` : undefined;
                                                    state.searchForm = {
                                                        ...state.searchForm,
                                                        createdAt: { ...current, lessThan: val }
                                                    };
                                                }}
                                            />
                                        </div>
                                    </Show>

                                    <Show when={field === 'lastModifiedAt'}>
                                        <div className="flex space-x-2 w-full">
                                            <input
                                                type="date"
                                                className="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                                                placeholder="From"
                                                value={state.searchForm.lastModifiedAt?.greaterThan ? (state.searchForm.lastModifiedAt.greaterThan as string).split('T')[0] : ''}
                                                onChange={(e) => {
                                                    const current = state.searchForm.lastModifiedAt || {};
                                                    const val = e.target.value ? `${e.target.value}T00:00:00Z` : undefined;
                                                    state.searchForm = {
                                                        ...state.searchForm,
                                                        lastModifiedAt: { ...current, greaterThan: val }
                                                    };
                                                }}
                                            />
                                            <input
                                                type="date"
                                                className="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                                                placeholder="To"
                                                value={state.searchForm.lastModifiedAt?.lessThan ? (state.searchForm.lastModifiedAt.lessThan as string).split('T')[0] : ''}
                                                onChange={(e) => {
                                                    const current = state.searchForm.lastModifiedAt || {};
                                                    const val = e.target.value ? `${e.target.value}T23:59:59Z` : undefined;
                                                    state.searchForm = {
                                                        ...state.searchForm,
                                                        lastModifiedAt: { ...current, lessThan: val }
                                                    };
                                                }}
                                            />
                                        </div>
                                    </Show>

                                    <Show when={field === 'price'}>
                                        <div className="flex space-x-2 w-full">
                                            <input
                                                type="number"
                                                className="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                                                placeholder="Min"
                                                value={state.searchForm.price?.greaterThan || ''}
                                                onChange={(e) => {
                                                    const current = state.searchForm.price || {};
                                                    state.searchForm = {
                                                        ...state.searchForm,
                                                        price: { ...current, greaterThan: parseFloat(e.target.value) }
                                                    };
                                                }}
                                            />
                                            <input
                                                type="number"
                                                className="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                                                placeholder="Max"
                                                value={state.searchForm.price?.lessThan || ''}
                                                onChange={(e) => {
                                                    const current = state.searchForm.price || {};
                                                    state.searchForm = {
                                                        ...state.searchForm,
                                                        price: { ...current, lessThan: parseFloat(e.target.value) }
                                                    };
                                                }}
                                            />
                                        </div>
                                    </Show>
                                    <Show when={field === 'sortInput'}>
                                        <div className="flex space-x-2 w-full">
                                            <select
                                                className="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                                                value={state.searchForm.sortInput?.field || ''}
                                                onChange={(e) => {
                                                    const current = state.searchForm.sortInput || {};
                                                    state.searchForm = {
                                                        ...state.searchForm,
                                                        sortInput: { ...current, field: e.target.value as Enums.OrderSortField }
                                                    };
                                                }}
                                            >
                                                <option value="">Sort Field</option>
                                                <For each={Object.values(Enums.OrderSortField)}>
                                                    {(sortField) => (
                                                        <option key={sortField} value={sortField}>
                                                            {sortField}
                                                        </option>
                                                    )}
                                                </For>
                                            </select>
                                            <select
                                                className="block w-0 flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                                                value={state.searchForm.sortInput?.order || ''}
                                                onChange={(e) => {
                                                    const current = state.searchForm.sortInput || {};
                                                    state.searchForm = {
                                                        ...state.searchForm,
                                                        sortInput: { ...current, order: e.target.value as Enums.SortOrder }
                                                    };
                                                }}
                                            >
                                                <option value="">Order</option>
                                                <For each={Object.values(Enums.SortOrder)}>
                                                    {(order) => (
                                                        <option key={order} value={order}>
                                                            {order}
                                                        </option>
                                                    )}
                                                </For>
                                            </select>
                                        </div>
                                    </Show>
                                    <Show when={field === 'type'}>
                                        <div className="flex space-x-2">
                                            <select
                                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 border"
                                                value={state.searchForm.type || ''}
                                                onChange={(e) => {
                                                    state.searchForm = {
                                                        ...state.searchForm,
                                                        type: e.target.value as Enums.OrderType
                                                    };
                                                }}
                                            >
                                                <option value="">Type</option>
                                                <For each={Object.values(Enums.OrderType)}>
                                                    {(type) => (
                                                        <option key={type} value={type}>
                                                            {type}
                                                        </option>
                                                    )}
                                                </For>
                                            </select>
                                        </div>
                                    </Show>
                                </div>
                            )}
                        </For>
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button
                            onClick={() => {
                                state.searchForm = {};
                                state.fetchOrders(1);
                            }}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            Clear
                        </button>
                        <button
                            onClick={() => state.fetchOrders(1)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                        >
                            Search
                        </button>
                    </div>
                </div>
            </Show>
            <Show when={!state.loading || state.orders.length > 0} else={<div className="p-8 text-center text-gray-500">{state.getLabel('loading', 'Loading orders...')}</div>}>
                <Show when={state.orders.length > 0} else={
                    <div className="bg-white rounded-lg shadow p-8 text-center">
                        <p className="text-gray-500 mb-4">{state.getLabel('noOrders', 'No orders found.')}</p>
                    </div>
                }>
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <For each={state.columns}>
                                            {(col: string) => (
                                                <th
                                                    key={col}
                                                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col === 'action' || col === 'total' ? 'text-right' : ''}`}
                                                >
                                                    {state.getColumnLabel(col)}
                                                </th>
                                            )}
                                        </For>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    <For each={state.orders}>
                                        {(order: Order) => (
                                            <tr key={order.id} className="hover:bg-gray-50" onClick={() => state.rowsClickable && props.onOrderClick(order.id)}>
                                                <For each={state.columns}>
                                                    {(col: string) => (
                                                        <td key={col} className={`px-6 py-4 whitespace-nowrap text-sm ${col === 'id' || col === 'action' ? 'font-medium' : 'text-gray-500'} ${col === 'action' || col === 'total' ? 'text-right' : ''}`}>
                                                            <Show when={col === 'id'}>
                                                                <span className="text-gray-900">{order.id}</span>
                                                            </Show>
                                                            <Show when={col === 'date'}>
                                                                {state.formatDate(order.date || order.createdAt || '')}
                                                            </Show>
                                                            <Show when={col === 'status'}>
                                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${state.getStatusColor(order.status)}`}>
                                                                    {order.status}
                                                                </span>
                                                            </Show>
                                                            <Show when={col === 'total'}>
                                                                {state.formatPrice(order.total?.net)}
                                                            </Show>
                                                            <Show when={col === 'action' && !state.rowsClickable}>
                                                                <button
                                                                    onClick={(event) => {
                                                                        event.preventDefault();
                                                                        props.onOrderClick(order.id);
                                                                    }}
                                                                    className="text-primary hover:text-primary/70 cursor-pointer"
                                                                >
                                                                    {state.getLabel('view', 'View')}
                                                                </button>
                                                            </Show>
                                                            <Show when={col === 'validUntil'}>
                                                                {state.formatDate((order as any).validUntil || '')}
                                                            </Show>
                                                            <Show when={!['id', 'date', 'status', 'total', 'action', 'validUntil'].includes(col)}>
                                                                {(order as any)[col]}
                                                            </Show>
                                                        </td>
                                                    )}
                                                </For>
                                            </tr>
                                        )}
                                    </For>
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <Show when={state.totalPages > 1}>
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                <div className="flex-1 flex justify-between sm:hidden">
                                    <button
                                        onClick={() => state.handlePageChange(state.currentPage - 1)}
                                        disabled={state.currentPage === 1}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        {state.getLabel('previous', 'Previous')}
                                    </button>
                                    <button
                                        onClick={() => state.handlePageChange(state.currentPage + 1)}
                                        disabled={state.currentPage === state.totalPages}
                                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        {state.getLabel('next', 'Next')}
                                    </button>
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            {state.getLabel('showingPage', 'Showing page')}&nbsp;<span className="font-medium">{state.currentPage}</span>&nbsp;{state.getLabel('of', 'of')}&nbsp;<span className="font-medium">{state.totalPages}</span>
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            <button
                                                onClick={() => state.handlePageChange(state.currentPage - 1)}
                                                disabled={state.currentPage === 1}
                                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                {state.getLabel('previous', 'Previous')}
                                            </button>
                                            <button
                                                onClick={() => state.handlePageChange(state.currentPage + 1)}
                                                disabled={state.currentPage === state.totalPages}
                                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                {state.getLabel('next', 'Next')}
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        </Show>
                    </div>
                </Show>
            </Show>
        </div>
    );
}
