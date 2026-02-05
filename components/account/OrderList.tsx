'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { graphqlClient } from '@/lib/api';
import { OrderService, OrderSearchArguments, OrderResponse } from 'propeller-sdk-v2';
import Link from 'next/link';

interface OrderListProps {
    type?: 'orders' | 'quotes';
}

/*

    Arguments:
        - user: propeller-sdk-v2.Contact | propeller-sdk-v2.Customer | null
        - columns: string[] = arguments.columns || ['id', 'date', 'status', 'total', 'action']   
        - columnConfig: Record<string, string> = arguments.columnConfig || {
            'id': 'Order #',
            'date': 'Date',
            'status': 'Status',
            'total': 'Total',
            'action': 'Action'
        }
        - searchFields: arguments.searchFields || ['id', 'date', 'status', 'total']
        - orderStatus: arguments.orderStatus || ['NEW', 'CONFIRMED', 'VALIDATED', 'ARCHIVED', 'ORDER']
        - style: Orders.css | React.CSSProperties = {}
        - router: arguments.router || useRouter()
        - graphqlClient: arguments.graphqlClient || graphqlClient


*/

const OrderList: React.FC<OrderListProps> = ({ type = 'orders' }) => {
    const { state: authState } = useAuth();
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalItems, setTotalItems] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalPages, setTotalPages] = useState(0);
    const fetchingRef = useRef(false);

    const statuses = useMemo(() =>
        type === 'quotes'
            ? ['QUOTATION']
            : ['NEW', 'CONFIRMED', 'VALIDATED', 'ARCHIVED', 'ORDER'],
        [type]
    );

    const fetchOrders = React.useCallback(async (page: number = 1) => {
        const user = authState.user;
        if (!user) return;

        // Prevent multiple simultaneous requests
        if (fetchingRef.current) return;

        try {
            fetchingRef.current = true;
            setLoading(true);

            const orderService = new OrderService(graphqlClient);
            const isContactUser = 'company' in user;

            // Build search arguments based on user type
            const searchArgs: OrderSearchArguments = {
                status: statuses,
                userId: isContactUser ? [(user as any).contactId] : [(user as any).customerId],
                ...(isContactUser && { companyIds: [(user as any).company?.companyId] }),
                page: page,
                offset: 12
            };

            console.log('Fetching orders with search args:', searchArgs);

            const response: OrderResponse = await orderService.getOrders(searchArgs);

            console.log('Orders response:', response);

            setOrders(response.items || []);
            setTotalItems(response.itemsFound || 0);

            if (response.offset !== undefined) {
                setItemsPerPage(response.offset || 10);
            }

            const calculatedTotalPages = Math.ceil((response.itemsFound || 0) / (response.offset || 10));
            setTotalPages(calculatedTotalPages);

        } catch (error) {
            console.error('Error fetching orders:', error);
            setOrders([]);
            setTotalItems(0);
            setTotalPages(0);
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, [authState.user, statuses]);

    useEffect(() => {
        if (authState.isAuthenticated && authState.user) {
            fetchOrders(currentPage);
        }
    }, [authState.isAuthenticated, authState.user, currentPage, fetchOrders]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const formatPrice = (price: any) => {
        if (!price) return '-';
        // Handle different price structures if needed
        return `€${Number(price).toFixed(2)}`;
    };

    if (loading && orders.length === 0) {
        return <div className="p-8 text-center">Loading {type}...</div>;
    }

    return (
        <div>
            {orders.length > 0 ? (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {type === 'quotes' ? 'Quote #' : 'Order #'}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Total
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Action
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {orders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {order.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(order.id)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${order.status === 'COMPLETE' || order.status === 'QUOTE_ACCEPTED' ? 'bg-violet-100 text-violet-800' :
                                                    order.status === 'CANCELLED' || order.status === 'QUOTE_REJECTED' ? 'bg-red-100 text-red-800' :
                                                        'bg-yellow-100 text-yellow-800'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatPrice(order.total.net)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link
                                                href={`/account/${type}/${order.id}`}
                                                className="text-blue-600 hover:text-blue-900"
                                            >
                                                View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                        >
                                            Next
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <p className="text-gray-500 mb-4">You have no {type} yet.</p>
                    <Link
                        href="/"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                        Start Shopping
                    </Link>
                </div>
            )}
        </div>
    );
};

export default OrderList;
