'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useCart } from '@/context/CartContext';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { graphqlClient } from '@/lib/api';
import { Order, OrderItem, Company } from '@propeller-commerce/propeller-sdk-v2';
import { useOrders } from '@propeller-commerce/propeller-v2-react-ui';
import { OrderSummary } from '@propeller-commerce/propeller-v2-react-ui';
import { imageSearchFiltersGrid, imageVariantFiltersSmall } from '@/data/defaults';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OrderItemCard } from '@propeller-commerce/propeller-v2-react-ui';
import { OrderBonusItems } from '@propeller-commerce/propeller-v2-react-ui';
import { OrderTotals } from '@propeller-commerce/propeller-v2-react-ui';
import { OrderActions } from '@propeller-commerce/propeller-v2-react-ui';
import { OrderShipments } from '@propeller-commerce/propeller-v2-react-ui';
import { getCountries } from '@/data/countries';
import { useTranslations } from '@/lib/i18n/client';
import AccessErrorView from '@/components/access/AccessErrorView';
import { classifyApiError } from '@/lib/errors';

// COUNTRIES imported from shared utils
export default function OrderDetailPage() {
    const { state } = useAuth();
    const router = useRouter();
    const { language } = useLanguage();
    const { selectedCompany } = useCompany();
    const { cart, saveCart } = useCart();
    const params = useParams();
    const orderId = params.id as string;
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const companyId = (selectedCompany as Company | null)?.companyId;

    const orderSummaryLabels = useTranslations('OrderSummary');
    const orderStatusLabels = useTranslations('OrderStatus');
    const paymethodNames = useTranslations('PaymethodNames');
    const orderActionsLabels = useTranslations('OrderActions');
    const orderShipmentsLabels = useTranslations('OrderShipments');
    const orderBonusItemsLabels = useTranslations('OrderBonusItems');
    const orderTotalsLabels = useTranslations('OrderTotals');
    const orderItemCardLabels = useTranslations('OrderItemCard');
    const t = useTranslations('Account');

    const { getOrderById } = useOrders({
        graphqlClient,
        user: state.user,
        companyId,
        language,
        configuration: { imageSearchFiltersGrid, imageVariantFiltersSmall },
    });

    useEffect(() => {
        const fetchOrderDetails = async () => {
            setLoading(true);
            const result = await getOrderById(Number(orderId));
            if (result.success && result.order) {
                setOrder(result.order);
            } else {
                setError(result.error ?? 'Order not found');
            }
            setLoading(false);
        };

        if (orderId) {
            fetchOrderDetails();
        }
    }, [orderId]);


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
                    <h1 className="text-3xl font-bold tracking-tight">{t.orderDetailsTitle}</h1>
                </div>
            </div>
            {loading && (
                <Card className="p-8 text-center animate-pulse">
                    <div className="h-8 bg-slate-100 rounded w-1/3 mx-auto mb-4"></div>
                    <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto"></div>
                </Card>
            )}

            {error && (
                <AccessErrorView kind={classifyApiError(error)} />
            )}

            {!loading && !error && order && (
                <div className="space-y-8">
                    {/* Order Summary + Addresses + Delivery Info */}
                    <Card className="p-6">
                        <div className="flex-1">
                            <OrderSummary order={order} labels={orderSummaryLabels} statusLabels={orderStatusLabels} paymethodLabels={paymethodNames} countries={getCountries(language)} />
                        </div>
                        <OrderActions
                            order={order}
                            labels={orderActionsLabels}
                            cartId={cart?.cartId}
                            onCartCreated={(newCart) => {
                                console.log('Cart created:', newCart);
                                saveCart(newCart)
                            }}
                            afterReorder={(newCart) => {
                                console.log('Cart reordered:', newCart);
                                saveCart(newCart)
                            }}
                        />
                    </Card>

                    {/* Shipments */}
                    <OrderShipments order={order} labels={orderShipmentsLabels} />

                    {/* Order Overview */}
                    <div className="pt-10">
                        <h2 className="text-2xl font-bold mb-6">{t.orderOverviewTitle}</h2>

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
                                                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-500 w-2/3">{t.colProduct}</th>
                                                    <th className="px-6 py-4 text-center text-sm font-medium text-gray-500">{t.colQuantity}</th>
                                                    <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">{t.colPrice}</th>
                                                </tr>
                                            </thead>
                                            {parentItems.map((item: OrderItem) => (
                                                <OrderItemCard
                                                    key={item.id}
                                                    orderItem={item}
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
                        <OrderBonusItems order={order} labels={orderBonusItemsLabels} />
                    </div>

                    {/* Order Bottom Actions & Totals */}
                    <div className="flex flex-col md:flex-row justify-between gap-8 pt-6 border-t md:border-none">
                        <OrderActions
                            order={order}
                            labels={orderActionsLabels}
                            cartId={cart?.cartId}
                            onCartCreated={(newCart) => saveCart(newCart)}
                            afterReorder={(newCart) => saveCart(newCart)}
                        />

                        <OrderTotals order={order} labels={orderTotalsLabels} />
                    </div>
                </div>
            )}
        </div>
    );
}
