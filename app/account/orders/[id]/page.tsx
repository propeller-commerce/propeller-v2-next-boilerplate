'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { graphqlClient } from '@/lib/api';
import { OrderService, Order, OrderItem, Base64File } from 'propeller-sdk-v2';
import OrderSummary from '@/components/propeller/OrderSummary';
import { imageSearchFiltersGrid, imageVariantFiltersSmall } from '@/data/defaults';
import { OrderQueryVariables } from 'propeller-sdk-v2/dist/service/OrderService';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import OrderItemCard from '@/components/propeller/OrderItemCard';
import OrderTotals from '@/components/propeller/OrderTotals';

export default function OrderDetailPage() {
    const { state } = useAuth();
    const router = useRouter();
    const params = useParams();
    const orderId = params.id as string;
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                setLoading(true);
                const orderService = new OrderService(graphqlClient);

                const variables: OrderQueryVariables = {
                    orderId: Number(orderId),
                    imageSearchFilters: imageSearchFiltersGrid,
                    imageVariantFilters: imageVariantFiltersSmall,
                    language: 'NL'
                };

                const orderResponse = await orderService.getOrder(variables);

                if (orderResponse) {
                    setOrder(orderResponse);
                } else {
                    console.error('No order data found in response');
                    setError('Order not found');
                }

            } catch (err) {
                console.error('Error fetching order details:', err);
                setError('Failed to load order details');
            } finally {
                setLoading(false);
            }
        };

        if (orderId) {
            fetchOrderDetails();
        }
    }, [orderId]);

    const handleOrderAgain = () => {
        // TODO: Implement order again functionality
        console.log('Order again clicked');
    };

    const handleReturnRequest = () => {
        // TODO: Implement return request functionality
        console.log('Return request clicked');
    };

    const handleDownloadPDF = async () => {
        if (!orderId) {
            console.error('No order ID available for PDF download');
            return;
        }

        try {
            const orderService = new OrderService(graphqlClient);
            const pdfResponse = await orderService.getOrderPDF(Number(orderId));

            if (pdfResponse) {
                if (typeof pdfResponse === 'object' && (pdfResponse as Base64File).base64) {
                    const response = pdfResponse as Base64File;
                    const byteCharacters = atob(response.base64);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);

                    const contentType = response.contentType || 'application/pdf';
                    const fileName = response.fileName || `order-${orderId}-confirmation.pdf`;
                    const blob = new Blob([byteArray], { type: contentType });

                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();

                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);

                } else if (typeof pdfResponse === 'string') {
                    const byteCharacters = atob(pdfResponse);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);

                    const blob = new Blob([byteArray], { type: 'application/pdf' });
                    const fileName = `order-${orderId}-confirmation.pdf`;

                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();

                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                }
                console.log('PDF download initiated successfully');
            } else {
                console.error('Invalid PDF response:', pdfResponse);
                alert('Failed to download PDF: Invalid response from server');
            }
        } catch (error) {
            console.error('Error downloading PDF:', error);
            alert('Failed to download PDF. Please try again.');
        }
    };

    if (!state.isAuthenticated) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="gap-2"
                    >
                        ← Back
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">Order Details</h1>
                </div>
            </div>
            {loading && (
                <Card className="p-8 text-center animate-pulse">
                    <div className="h-8 bg-slate-100 rounded w-1/3 mx-auto mb-4"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto"></div>
                </Card>
            )}

            {error && (
                <Card className="p-8 text-center">
                    <p className="text-destructive mb-4">{error}</p>
                    <Link href="/account/orders" className="text-primary hover:underline">
                        Return to Orders
                    </Link>
                </Card>
            )}

            {!loading && !error && order && (
                <div className="space-y-8">
                    {/* Order Summary + Addresses + Delivery Info */}
                    <Card className="p-6">                        
                        <div className="flex-1">
                            <OrderSummary order={order} />
                        </div>
                        <div className="flex flex-row items-end gap-3 flex-shrink-0">
                            <Button variant="link" size="sm" onClick={handleDownloadPDF}>
                                Order confirmation (PDF)
                            </Button>
                            <Button variant="link" size="sm" onClick={handleOrderAgain}>
                                Order again
                            </Button>
                        </div>                       
                    </Card>

                    {/* Order Overview */}
                    <div className="pt-10">
                        <h2 className="text-2xl font-bold mb-6">Order Overview</h2>

                        {/* Regular Products (grouped parent/child) */}
                        {(() => {
                            const allProducts = order.items?.filter((item: OrderItem) =>
                                item.class === "product" && item.isBonus === "N"
                            ) || [];
                            const parentItems = allProducts.filter((item: OrderItem) => !item.parentOrderItemId);
                            const childMap = new Map<number, OrderItem[]>();
                            allProducts.filter((item: OrderItem) => item.parentOrderItemId).forEach((item: OrderItem) => {
                                const children = childMap.get(item.parentOrderItemId!) || [];
                                children.push(item);
                                childMap.set(item.parentOrderItemId!, children);
                            });

                            if (parentItems.length > 0) {
                                return (
                                    <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
                                        <table className="w-full">
                                            <thead className="bg-gray-50 border-b">
                                                <tr>
                                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 w-2/3">Product</th>
                                                    <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">Quantity</th>
                                                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Price</th>
                                                </tr>
                                            </thead>
                                            {parentItems.map((item: OrderItem) => (
                                                <OrderItemCard
                                                    key={item.id}
                                                    orderItem={item}
                                                    childItems={childMap.get(item.id) || []}
                                                />
                                            ))}
                                        </table>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* Bonus Items */}
                        {(() => {
                            const bonusItems = order.items?.filter((item: OrderItem) =>
                                item.class === "product" && item.isBonus === "Y"
                            );

                            if (bonusItems?.length > 0) {
                                return (
                                    <div className="mb-8">
                                        <h3 className="text-lg font-bold mb-3 text-gray-800">Bonus Items</h3>
                                        <div className="bg-white rounded-lg shadow overflow-hidden">
                                            <table className="w-full">
                                                <thead className="bg-gray-50 border-b">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                                                    </tr>
                                                </thead>
                                                {bonusItems.map((item: OrderItem) => (
                                                    <OrderItemCard
                                                        key={item.id}
                                                        orderItem={item}
                                                        titleLinkable={false}
                                                    />
                                                ))}
                                            </table>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* Surcharges */}
                        {(() => {
                            const surcharges = order.items?.filter((item: OrderItem) => item.class === "surcharge");

                            if (surcharges?.length > 0) {
                                return (
                                    <div className="mb-8">
                                        <h3 className="text-lg font-bold mb-3 text-gray-800">Surcharges</h3>
                                        <div className="bg-white rounded-lg shadow overflow-hidden">
                                            <table className="w-full">
                                                {surcharges.map((item: OrderItem) => (
                                                    <OrderItemCard
                                                        key={item.id}
                                                        orderItem={item}
                                                        titleLinkable={false}
                                                        showImage={false}
                                                        showSku={false}
                                                    />
                                                ))}
                                            </table>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>

                    {/* Order Bottom Actions & Totals */}
                    <div className="flex flex-col md:flex-row justify-between gap-8 pt-6 border-t md:border-none">
                        <div className="order-actions flex flex-wrap gap-4 h-fit">
                            <button onClick={handleDownloadPDF} className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline">
                                Order confirmation (PDF)
                            </button>
                            <button onClick={handleOrderAgain} className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline">
                                Order again
                            </button>
                        </div>

                        <OrderTotals order={order} />
                    </div>
                </div>
            )}
        </div>
    );
}

