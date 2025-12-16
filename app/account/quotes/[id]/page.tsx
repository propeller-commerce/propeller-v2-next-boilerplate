'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AddressCard from '@/components/account/AddressCard';
import { graphqlClient } from '@/lib/api';
import { Address, Base64File, Enums, Order, OrderItem, OrderService, OrderTotalTaxPercentage } from 'propeller-sdk-v2';
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

export default function QuoteDetailPage() {
    const { state } = useAuth();
    const router = useRouter();
    const params = useParams();
    const quoteId = params.id as string;
    const [quote, setQuote] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!state.isAuthenticated) {
            router.push('/login');
            return;
        }

        const fetchQuoteDetails = async () => {
            try {
                setLoading(true);
                const orderService = new OrderService(graphqlClient);

                const variables: OrderQueryVariables = {
                    orderId: Number(quoteId),
                    imageSearchFilters: imageSearchFiltersGrid,
                    imageVariantFilters: imageVariantFiltersSmall,
                    language: 'NL'
                };

                const quoteResponse = await orderService.getOrder(variables);

                if (quoteResponse) {
                    setQuote(quoteResponse);
                } else {
                    console.error('No quote data found in response');
                    setError('Quote not found');
                }

            } catch (err) {
                console.error('Error fetching quote details:', err);
                setError('Failed to load quote details');
            } finally {
                setLoading(false);
            }
        };

        if (quoteId) {
            fetchQuoteDetails();
        }
    }, [state.isAuthenticated, router, quoteId]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const handleAcceptQuote = () => {
        // TODO: Implement accept quote functionality
        console.log('Accept quote clicked');
    };

    const handleRequestChanges = () => {
        // TODO: Implement request changes functionality
        console.log('Request changes clicked');
    };

    const handleDownloadPDF = async () => {
        if (!quoteId) {
            console.error('No quote ID available for PDF download');
            return;
        }

        try {
            const orderService = new OrderService(graphqlClient);
            const pdfResponse = await orderService.getOrderPDF(Number(quoteId));

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
                    const fileName = response.fileName || `quote-${quoteId}.pdf`;
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
                    const fileName = `quote-${quoteId}.pdf`;

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
                    <h1 className="text-3xl font-bold tracking-tight">Quote Details</h1>
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
                    <Link href="/account/quotes" className="text-primary hover:underline">
                        Return to Quotes
                    </Link>
                </Card>
            )}

            {!loading && !error && quote && (
                <div className="space-y-8">
                    {/* Quote Header & Info */}
                    <div>

                        <Card className="p-6 mb-6">
                            <div className="flex flex-col md:flex-row justify-between gap-6">
                                <div className="space-y-3 flex-1">
                                    <div className="grid grid-cols-[140px_1fr] gap-4">
                                        <span className="text-gray-600 font-medium">Quote Date:</span>
                                        <span>{formatDate(quote.createdAt)}</span>

                                        <span className="text-gray-600 font-medium">Total:</span>
                                        <span>€{(quote.total?.net || 0).toFixed(2)}</span>

                                        <span className="text-gray-600 font-medium">Payment Method:</span>
                                        <span>{quote.paymentData?.method || '-'}</span>

                                        {quote.remarks && (
                                            <>
                                                <span className="text-gray-600 font-medium">Remarks:</span>
                                                <span>{quote.remarks}</span>
                                            </>
                                        )}

                                        {quote.reference && (
                                            <>
                                                <span className="text-gray-600 font-medium">Reference:</span>
                                                <span>{quote.reference}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-4">
                                    <span className={`px-4 py-2 rounded-full text-sm font-semibold capitalize
                                                    ${quote.status === 'QUOTE_ACCEPTED' ? 'bg-violet-100 text-violet-800' :
                                            quote.status === 'QUOTE_REJECTED' ? 'bg-red-100 text-red-800' :
                                                'bg-blue-100 text-blue-800'}`}>
                                        {quote.status?.toLowerCase().replace(/_/g, ' ')}
                                    </span>

                                    <div className="flex flex-wrap gap-3 justify-end">
                                        <Button onClick={handleAcceptQuote} className="bg-violet-600 hover:bg-violet-700">
                                            Accept Quote
                                        </Button>
                                        <Button variant="outline" onClick={handleRequestChanges}>
                                            Request Changes
                                        </Button>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button variant="link" size="sm" onClick={handleDownloadPDF}>
                                            Download Quote (PDF)
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
                                const invoiceAddress = quote.addresses?.find((addr: Address) => addr.type === AddressType.invoice);
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
                                const deliveryAddress = quote.addresses?.find((addr: Address) => addr.type === AddressType.delivery);
                                return deliveryAddress ? (
                                    <AddressCard address={deliveryAddress} showActions={false} />
                                ) : (
                                    <p className="text-gray-500 italic">No delivery address found</p>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Quote Overview */}
                    <div className="pt-10">
                        <h2 className="text-2xl font-bold mb-6 mt-6">Quote Overview</h2>

                        {/* Regular Products */}
                        {(() => {
                            const regularProducts = quote.items?.filter((item: OrderItem) =>
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
                            const bonusItems = quote.items?.filter((item: OrderItem) =>
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
                            const surcharges = quote.items?.filter((item: OrderItem) => item.class === "surcharge");

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

                    {/* Quote Bottom Totals */}
                    <div className="flex flex-col md:flex-row justify-end gap-8 pt-6 border-t md:border-none">
                        <div className="w-full md:w-80 bg-white p-6 rounded-lg shadow space-y-3">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal:</span>
                                <span>€{(quote.total?.gross || 0).toFixed(2)}</span>
                            </div>

                            {quote.total?.discountType && quote.total.discountType !== Enums.OrderDiscountType.N && quote.total.discountValue > 0 && (
                                <>
                                    <div className="flex justify-between text-violet-600">
                                        <span>Discount:</span>
                                        <span>
                                            {quote.total.discountType === Enums.OrderDiscountType.A ? `-€${quote.total.discountValue.toFixed(2)}` :
                                                quote.total.discountType === Enums.OrderDiscountType.P ? `- ${quote.total.discountValue}%` :
                                                    `-€${quote.total.discountValue.toFixed(2)}`}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-gray-600 border-t pt-2 border-dashed">
                                        <span>Subtotal with discount:</span>
                                        <span>€{((quote.total.gross || 0) - (quote.total.discountValue || 0)).toFixed(2)}</span>
                                    </div>
                                </>
                            )}

                            {quote.paymentData?.gross > 0 && (
                                <div className="flex justify-between text-gray-600">
                                    <span>Transaction costs:</span>
                                    <span>€{Number(quote.paymentData.gross).toFixed(2)}</span>
                                </div>
                            )}

                            {quote.postageData?.gross > 0 && (
                                <div className="flex justify-between text-gray-600">
                                    <span>Shipping costs:</span>
                                    <span>€{Number(quote.postageData.gross).toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex justify-between text-gray-600 pt-2 border-t">
                                <span>Total excl. VAT:</span>
                                <span>€{(quote.total?.gross || 0).toFixed(2)}</span>
                            </div>

                            {quote.total?.taxPercentages && quote.total.taxPercentages
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
                                <span>€{(quote.total?.net || 0).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

