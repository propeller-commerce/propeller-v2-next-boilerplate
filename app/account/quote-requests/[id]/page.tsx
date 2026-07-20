'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { graphqlClient } from '@/lib/api';
import { Order, OrderItem } from '@propeller-commerce/propeller-sdk-v2';
import { useOrders } from '@propeller-commerce/propeller-v2-react-ui';
import { OrderSummary } from '@propeller-commerce/propeller-v2-react-ui';
import { imageSearchFiltersGrid, imageVariantFiltersSmall } from '@/data/defaults';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OrderItemCard } from '@propeller-commerce/propeller-v2-react-ui';
import { OrderBonusItems } from '@propeller-commerce/propeller-v2-react-ui';
import { OrderTotals } from '@propeller-commerce/propeller-v2-react-ui';
import { getCountries } from '@/data/countries';
import { useTranslations } from '@/lib/i18n/client';
import AccessErrorView from '@/components/access/AccessErrorView';
import { classifyApiError } from '@/lib/errors';

// COUNTRIES imported from shared utils
export default function QuoteDetailPage() {
    const { state } = useAuth();
    const router = useRouter();
    const { language } = useLanguage();
    const params = useParams();
    const quoteId = params.id as string;
    const [quote, setQuote] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const orderSummaryLabels = useTranslations('OrderSummary');
    const orderBonusItemsLabels = useTranslations('OrderBonusItems');
    const orderTotalsLabels = useTranslations('OrderTotals');
    const orderItemCardLabels = useTranslations('OrderItemCard');
    const errorPagesLabels = useTranslations('ErrorPages');
    const t = useTranslations('Account');

    const { getOrderById } = useOrders({
        graphqlClient,
        user: state.user,
        language,
        configuration: { imageSearchFiltersGrid, imageVariantFiltersSmall },
    });

    useEffect(() => {
        const fetchQuoteDetails = async () => {
            setLoading(true);
            const result = await getOrderById(Number(quoteId));
            if (result.success && result.order) {
                setQuote(result.order);
            } else {
                setError(result.error ?? 'Quote request not found');
            }
            setLoading(false);
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
                        ← {t.back}
                    </Button>
                    <h1 className="text-3xl font-bold tracking-tight">{t.requestDetailsTitle}</h1>
                </div>
            </div>

            {loading && (
                <Card className="p-8 text-center animate-pulse">
                    <div className="h-8 bg-slate-100 rounded w-1/3 mx-auto mb-4"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto"></div>
                </Card>
            )}

            {error && (
                <AccessErrorView
                    kind={classifyApiError(error)}
                    backHref="/account/quote-requests"
                    backLabel={errorPagesLabels.backToQuoteRequests}
                />
            )}

            {!loading && !error && quote && (
                <div className="space-y-8">
                    {/* Quote Summary + Addresses + Delivery Info */}
                    <Card className="p-6">
                        <div className="flex-1">
                            <OrderSummary
                                order={quote}
                                labels={orderSummaryLabels}
                                countries={getCountries(language)}
                            />
                        </div>
                    </Card>

                    {/* Quote Overview */}
                    <div className="pt-10">
                        <h2 className="text-2xl font-bold mb-6 mt-6">{t.quoteOverviewTitle}</h2>

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
                                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">{t.colProducts}</th>
                                                    <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">{t.colQuantity}</th>
                                                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">{t.colDiscount}</th>
                                                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">{t.colPrice}</th>
                                                </tr>
                                            </thead>
                                            {parentItems.map((item: OrderItem) => (
                                                <OrderItemCard
                                                    key={item.id}
                                                    orderItem={item}
                                                    showDiscount={true}
                                                    childItems={childMap.get(item.id) || []}
                                                    labels={orderItemCardLabels}
                                                />
                                            ))}
                                        </table>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        {/* Bonus Items */}
                        <OrderBonusItems order={quote} labels={orderBonusItemsLabels} />
                    </div>

                    {/* Quote Bottom Totals */}
                    <div className="flex flex-col md:flex-row justify-end gap-8 pt-6 border-t md:border-none">
                        <OrderTotals order={quote} labels={orderTotalsLabels} />
                    </div>
                </div>
            )}
        </div>
    );
}
