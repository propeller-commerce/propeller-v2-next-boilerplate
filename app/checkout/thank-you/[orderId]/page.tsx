'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import { orderService } from '@/lib/api';
import { imageSearchFiltersGrid, imageVariantFiltersSmall } from '@/data/defaults';
import OrderSummary from '@/components/propeller/OrderSummary';
import { OrderItem } from 'propeller-sdk-v2';
import OrderItemCard from '@/components/propeller/OrderItemCard';
import OrderTotals from '@/components/propeller/OrderTotals';

interface OrderDetails {
  orderId: string;
  order: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  items?: OrderItem[];
}

export default function ThankYouPage() {
  const params = useParams();
  const orderId = params?.orderId as string;
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;

    try {
      setLoading(true);

      const variables = {
        orderId: Number(orderId),
        imageSearchFilters: imageSearchFiltersGrid,
        imageVariantFilters: imageVariantFiltersSmall,
        language: process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL'
      };

      const order = await orderService.getOrder(variables);

      setOrderDetails({
        orderId: orderId,
        order: order,
        items: order.items || [],
      });
    } catch (err) {
      console.error('Failed to fetch order details:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto space-y-8 animate-pulse">
            <div className="h-24 bg-gray-200 rounded-lg w-full"></div>
            <div className="h-64 bg-gray-200 rounded-lg w-full"></div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Return to Home</Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Thank You for Your Order!</h1>
            <p className="text-lg text-gray-600">Your order has been successfully placed and is being processed.</p>
          </div>

          {orderDetails && (
            <div className="space-y-8">
              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <OrderSummary
                  order={orderDetails.order}
                  title="Order Summary"
                />
              </div>

              {/* Order Overview */}
              <div className="pt-10">
                  <h2 className="text-2xl font-bold mb-6">Order Overview</h2>

                  {/* Regular Products (grouped parent/child) */}
                  {(() => {
                      const allProducts = orderDetails.order.items?.filter((item: OrderItem) =>
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
                      const bonusItems = orderDetails.order.items?.filter((item: OrderItem) =>
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
                      const surcharges = orderDetails.order.items?.filter((item: OrderItem) => item.class === "surcharge");

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

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                <Link
                  href="/account/orders"
                  className="px-8 py-3 bg-white border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition text-center"
                >
                  View Order History
                </Link>
                <Link
                  href="/"
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition text-center"
                >
                  Continue Shopping
                </Link>
              </div>

              <div className="text-center text-gray-500 pt-4">
                <p>If you have any questions about your order, please <Link href="/contact" className="text-blue-600 hover:underline">contact our customer service team</Link>.</p>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
