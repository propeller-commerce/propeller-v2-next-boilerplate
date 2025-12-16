'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AddressCard from '@/components/account/AddressCard';
import { graphqlClient } from '@/lib/api';
import { OrderService, Enums, Order, Address, OrderItem, OrderTotalTaxPercentage, Base64File } from 'propeller-sdk-v2';
import { imageSearchFiltersGrid, imageVariantFiltersSmall } from '@/data/defaults';
import { OrderQueryVariables } from 'propeller-sdk-v2/dist/service/OrderService';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

// Helper for AddressType since we might not have the enum exported directly from sdk-v2 in the same way
const AddressType = {
    invoice: 'invoice',
    delivery: 'delivery'
};

export default function OrderDetailPage() {
    const { state } = useAuth();
    const router = useRouter();
    const params = useParams();
    const orderId = params.id as string;
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!state.isAuthenticated) {
            router.push('/login');
            return;
        }

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
    }, [state.isAuthenticated, router, orderId]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

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
                    {/* Order Header & Info */}
                    <div>

                        <Card className="p-6 mb-6">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="space-y-3 flex-1">
                                    <div className="grid grid-cols-[140px_1fr] gap-4">
                                        <span className="text-gray-600 font-medium">Order Date:</span>
                                        <span>{formatDate(order.createdAt)}</span>

                                        <span className="text-gray-600 font-medium">Total:</span>
                                        <span>€{(order.total?.net || 0).toFixed(2)}</span>

                                        <span className="text-gray-600 font-medium">Payment Method:</span>
                                        <span>{order.paymentData?.method || '-'}</span>

                                        {order.remarks && (
                                            <>
                                                <span className="text-gray-600 font-medium">Remarks:</span>
                                                <span>{order.remarks}</span>
                                            </>
                                        )}

                                        {order.reference && (
                                            <>
                                                <span className="text-gray-600 font-medium">Reference:</span>
                                                <span>{order.reference}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-4">
                                    <span className={`px-4 py-2 rounded-full text-sm font-semibold capitalize
                                                ${order.status === 'COMPLETE' ? 'bg-violet-100 text-violet-800' :
                                            order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                                                'bg-blue-100 text-blue-800'}`}>
                                        {order.status?.toLowerCase()}
                                    </span>

                                    <div className="flex flex-wrap gap-3 justify-end">
                                        <Button variant="link" size="sm" onClick={handleDownloadPDF}>
                                            Order confirmation (PDF)
                                        </Button>
                                        <Button variant="link" size="sm" onClick={handleReturnRequest}>
                                            Return request
                                        </Button>
                                        <Button variant="link" size="sm" onClick={handleOrderAgain}>
                                            Order again
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* Addresses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold">Invoice Address</h3>
                            {(() => {
                                const invoiceAddress = order.addresses?.find((addr: Address) => addr.type === AddressType.invoice);
                                return invoiceAddress ? (
                                    <AddressCard address={invoiceAddress} showActions={false} />
                                ) : (
                                    <p className="text-gray-500 italic">No invoice address found</p>
                                );
                            })()}
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold">Delivery Address</h3>
                            {(() => {
                                const deliveryAddress = order.addresses?.find((addr: Address) => addr.type === AddressType.delivery);
                                return deliveryAddress ? (
                                    <AddressCard address={deliveryAddress} showActions={false} />
                                ) : (
                                    <p className="text-gray-500 italic">No delivery address found</p>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Order Overview */}
                    <div className="pt-10">
                        <h2 className="text-2xl font-bold mb-6">Order Overview</h2>

                        {/* Regular Products */}
                        {(() => {
                            const regularProducts = order.items?.filter((item: OrderItem) =>
                                item.class === "product" && item.isBonus === "N"
                            );

                            if (regularProducts?.length > 0) {
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
                                            <tbody className="divide-y divide-gray-100">
                                                {regularProducts.map((item: OrderItem) => {
                                                    const productId = item.product?.productId;
                                                    const slug = item.product?.slugs?.[0]?.value;
                                                    const productName = item.product?.names?.[0]?.value || 'Unknown Product';
                                                    const productSku = item.product?.sku;
                                                    const productImage = item.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;

                                                    return (
                                                        <tr key={item.id} className="hover:bg-gray-50 transition">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-4">
                                                                    {productImage ? (
                                                                        <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden">
                                                                            <Image
                                                                                src={productImage}
                                                                                alt={productName}
                                                                                fill
                                                                                className="object-cover"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                                                                            No Img
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        {productId && slug ? (
                                                                            <Link
                                                                                href={`/product/${productId}/${slug}`}
                                                                                className="font-medium text-blue-600 hover:underline"
                                                                            >
                                                                                {productName}
                                                                            </Link>
                                                                        ) : (
                                                                            <span className="font-medium">{productName}</span>
                                                                        )}
                                                                        {productSku && (
                                                                            <p className="text-sm text-gray-500 mt-1">SKU: {productSku}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">{item.quantity || 0}</td>
                                                            <td className="px-6 py-4 text-right whitespace-nowrap">€{Number(item.price || 0).toFixed(2)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
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
                                                <tbody className="divide-y divide-gray-100">
                                                    {bonusItems.map((item: OrderItem) => {
                                                        const productName = item.product?.names?.[0]?.value || 'Unknown Product';
                                                        const productSku = item.product?.sku;
                                                        const productImage = item.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;

                                                        return (
                                                            <tr key={item.id} className="bg-violet-50/30">
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-4">
                                                                        {productImage && (
                                                                            <div className="relative w-12 h-12 flex-shrink-0 border rounded overflow-hidden">
                                                                                <Image
                                                                                    src={productImage}
                                                                                    alt={productName}
                                                                                    fill
                                                                                    className="object-cover"
                                                                                />
                                                                            </div>
                                                                        )}
                                                                        <div>
                                                                            <span className="font-medium text-gray-900">{productName}</span>
                                                                            {productSku && (
                                                                                <p className="text-xs text-gray-500 mt-0.5">SKU: {productSku}</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-center">{item.quantity || 0}</td>
                                                                <td className="px-6 py-4 text-right">€{Number(item.price || 0).toFixed(2)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
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
                                                <tbody className="divide-y divide-gray-100">
                                                    {surcharges.map((item: OrderItem) => (
                                                        <tr key={item.id} className="bg-gray-50">
                                                            <td className="px-6 py-3 font-medium text-gray-700 w-2/3">{item.name || 'Surcharge'}</td>
                                                            <td className="px-6 py-3 text-center text-gray-600">{item.quantity}</td>
                                                            <td className="px-6 py-3 text-right font-medium text-gray-700">€{Number(item.price || 0).toFixed(2)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
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
                            <button onClick={handleReturnRequest} className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline">
                                Return request
                            </button>
                            <button onClick={handleOrderAgain} className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline">
                                Order again
                            </button>
                        </div>

                        <div className="w-full md:w-80 bg-white p-6 rounded-lg shadow space-y-3">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal:</span>
                                <span>€{(order.total?.gross || 0).toFixed(2)}</span>
                            </div>

                            {order.total?.discountType && order.total.discountType !== Enums.OrderDiscountType.N && order.total.discountValue > 0 && (
                                <>
                                    <div className="flex justify-between text-violet-600">
                                        <span>Discount:</span>
                                        <span>
                                            {order.total.discountType === Enums.OrderDiscountType.A ? `-€${order.total.discountValue.toFixed(2)}` :
                                                order.total.discountType === Enums.OrderDiscountType.P ? `- ${order.total.discountValue}%` :
                                                    `-€${order.total.discountValue.toFixed(2)}`}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-gray-600 border-t pt-2 border-dashed">
                                        <span>Subtotal with discount:</span>
                                        <span>€{((order.total.gross || 0) - (order.total.discountValue || 0)).toFixed(2)}</span>
                                    </div>
                                </>
                            )}

                            {order.paymentData?.gross > 0 && (
                                <div className="flex justify-between text-gray-600">
                                    <span>Transaction costs:</span>
                                    <span>€{Number(order.paymentData.gross).toFixed(2)}</span>
                                </div>
                            )}

                            {order.postageData?.gross > 0 && (
                                <div className="flex justify-between text-gray-600">
                                    <span>Shipping costs:</span>
                                    <span>€{Number(order.postageData.gross).toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-gray-600 pt-2 border-t">
                                <span>Total excl. VAT:</span>
                                <span>€{(order.total?.gross || 0).toFixed(2)}</span>
                            </div>

                            {order.total?.taxPercentages && order.total.taxPercentages
                                .filter((tax: OrderTotalTaxPercentage) => tax.percentage > 0 && tax.total > 0)
                                .map((tax: OrderTotalTaxPercentage, i: number) => (
                                    <div key={i} className="flex justify-between text-gray-600 text-sm">
                                        <span>{tax.percentage}% VAT:</span>
                                        <span>€{Number(tax.total).toFixed(2)}</span>
                                    </div>
                                ))
                            }

                            <div className="flex justify-between text-xl font-bold pt-4 border-t text-gray-900 mt-2">
                                <span>Total:</span>
                                <span>€{(order.total?.net || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

