'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useCart } from '@/context/CartContext';
import { localizeHref, config } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { graphqlClient } from '@/lib/api';
import { Order, OrderItem, Company } from 'propeller-sdk-v2';
import { useOrders } from '@/composables/react/useOrders';
import OrderSummary from '@/components/propeller/OrderSummary';
import { imageSearchFiltersGrid, imageVariantFiltersSmall } from '@/data/defaults';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import OrderItemCard from '@/components/propeller/OrderItemCard';
import OrderTotals from '@/components/propeller/OrderTotals';
import OrderActions from '@/components/propeller/OrderActions';
import OrderShipments from '@/components/propeller/OrderShipments';
import { COUNTRIES } from '@/composables/shared/utils/countries';

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
                    <Link href={localizeHref('/account/orders', language)} className="text-primary hover:underline">
                        Return to Orders
                    </Link>
                </Card>
            )}

            {!loading && !error && order && (
                <div className="space-y-8">
                    {/* Order Summary + Addresses + Delivery Info */}
                    <Card className="p-6">
                        <div className="flex-1">
                            <OrderSummary order={order} countries={COUNTRIES} />
                        </div>
                        <OrderActions
                            graphqlClient={graphqlClient}
                            order={order}
                            user={state.user}
                            cartId={cart?.cartId}
                            companyId={companyId}
                            configuration={config}
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
                    <OrderShipments order={order} />

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
                        <OrderActions
                            graphqlClient={graphqlClient}
                            order={order}
                            user={state.user}
                            cartId={cart?.cartId}
                            companyId={companyId}
                            configuration={config}
                            onCartCreated={(newCart) => saveCart(newCart)}
                            afterReorder={(newCart) => saveCart(newCart)}
                        />

                        <OrderTotals order={order} />
                    </div>
                </div>
            )}
        </div>
    );
}
