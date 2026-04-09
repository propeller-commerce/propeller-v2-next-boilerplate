'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { graphqlClient } from '@/lib/api';
import { Base64File, Order, OrderItem, OrderService, OrderQueryVariables } from 'propeller-sdk-v2';
import OrderSummary from '@/components/propeller/OrderSummary';
import QuoteActions from '@/components/propeller/QuoteActions';
import { imageSearchFiltersGrid, imageVariantFiltersSmall } from '@/data/defaults';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import OrderItemCard from '@/components/propeller/OrderItemCard';
import OrderTotals from '@/components/propeller/OrderTotals';

const COUNTRIES = [
    { code: 'NL', name: 'Netherlands' },
    { code: 'BE', name: 'Belgium' },
    { code: 'DE', name: 'Germany' },
    { code: 'FR', name: 'France' },
    { code: 'UK', name: 'United Kingdom' },
    { code: 'US', name: 'United States' },
];

export default function QuoteDetailPage() {
    const { state } = useAuth();
    const router = useRouter();
    const { cart: contextCart, getCart } = useCart();
    const { language } = useLanguage();
    const params = useParams();
    const quoteId = params.id as string;
    const [quote, setQuote] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
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
                    console.error('No quote request data found in response');
                    setError('Quote request not found');
                }

            } catch (err) {
                console.error('Error fetching quote request details:', err);
                setError('Failed to load quote request details');
            } finally {
                setLoading(false);
            }
        };

        if (quoteId) {
            fetchQuoteDetails();
        }
    }, [quoteId]);

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
                    <h1 className="text-3xl font-bold tracking-tight">Request details</h1>
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
                    <Link href={localizeHref('/account/quote-requests', language)} className="text-primary hover:underline">
                        Return to Quote requests
                    </Link>
                </Card>
            )}

            {!loading && !error && quote && (
                <div className="space-y-8">
                    {/* Quote Summary + Addresses + Delivery Info */}
                    <Card className="p-6">
                        <div className="flex-1">
                            <OrderSummary
                                order={quote}
                                labels={{ orderNumber: 'Quote Number', orderDate: 'Quote Date' }}
                                countries={COUNTRIES}
                            />
                        </div>
                    </Card>

                    {/* Quote Overview */}
                    <div className="pt-10">
                        <h2 className="text-2xl font-bold mb-6 mt-6">Quote Overview</h2>

                        {/* Regular Products (grouped parent/child) */}
                        {(() => {
                            const allProducts = quote.items?.filter((item: OrderItem) =>
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
                                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">Products</th>
                                                    <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">Quantity</th>
                                                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Discount</th>
                                                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">Price</th>
                                                </tr>
                                            </thead>
                                            {parentItems.map((item: OrderItem) => (
                                                <OrderItemCard
                                                    key={item.id}
                                                    orderItem={item}
                                                    showDiscount={true}
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
                            const surcharges = quote.items?.filter((item: OrderItem) => item.class === "surcharge");

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

                    {/* Quote Bottom Totals */}
                    <div className="flex flex-col md:flex-row justify-end gap-8 pt-6 border-t md:border-none">
                        <OrderTotals order={quote} />
                    </div>
                </div>
            )}
        </div>
    );
}

