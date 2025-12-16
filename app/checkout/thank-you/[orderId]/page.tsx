'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import { orderService } from '@/lib/api';
import { imageSearchFiltersGrid, imageVariantFiltersSmall } from '@/data/defaults';
import AddressCard from '@/components/account/AddressCard';
import Image from 'next/image';
import { Address, OrderItem } from 'propeller-sdk-v2';

interface OrderDetails {
  orderId: string;
  orderNumber?: string;
  status?: string;
  totalAmount?: number;
  currency?: string;
  orderDate?: string;
  deliveryAddress?: Address;
  invoiceAddress?: Address;
  items?: OrderItem[];
  paymentMethod?: string;
  carrier?: string;
  deliveryDate?: string;
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
        orderNumber: String(order.id) || orderId,
        status: order.status,
        totalAmount: order.total?.gross || 0,
        currency: '€',
        orderDate: order.createdAt,
        deliveryAddress: order.addresses?.find((addr: Address) => addr.type === 'delivery'),
        invoiceAddress: order.addresses?.find((addr: Address) => addr.type === 'invoice'),
        items: order.items || [],
        paymentMethod: order.paymentData?.method,
        carrier: order.postageData?.carrier,
        deliveryDate: order.postageData?.requestDate
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return `€${amount.toFixed(2)}`;
  };

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
                <h2 className="text-xl font-bold mb-6 pb-2 border-b">Order Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Order Number</p>
                    <p className="font-semibold">{orderDetails.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Order Date</p>
                    <p className="font-semibold">{formatDate(orderDetails.orderDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Status</p>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-800">
                      {orderDetails.status || 'Processing'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Amount</p>
                    <p className="font-bold text-lg text-blue-600">{formatCurrency(orderDetails.totalAmount || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold mb-4">Delivery Address</h3>
                  {orderDetails.deliveryAddress ? (
                    <div className="min-h-[120px]">
                      <AddressCard address={orderDetails.deliveryAddress} showActions={false} />
                    </div>
                  ) : (
                    <p className="text-gray-500">No delivery address available</p>
                  )}
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold mb-4">Delivery Details</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Carrier</span>
                      <span className="font-medium">{orderDetails.carrier || 'Standard'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expected Delivery</span>
                      <span className="font-medium">{formatDate(orderDetails.deliveryDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Method</span>
                      <span className="font-medium">{orderDetails.paymentMethod || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              {orderDetails.items && orderDetails.items.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-xl font-bold">Order Items</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {orderDetails.items.map((item: OrderItem, index: number) => {
                      const productImage = item.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
                      return (
                        <div key={index} className="p-6 flex items-center gap-6">
                          <div className="bg-gray-100 rounded-md p-2 w-20 h-20 flex-shrink-0 flex items-center justify-center">
                            {productImage ? (
                              <Image
                                src={productImage}
                                alt={item.product?.names?.[0]?.value || 'Product'}
                                width={64}
                                height={64}
                                className="object-contain w-full h-full"
                              />
                            ) : (
                              <span className="text-2xl">📦</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 truncate">
                              {item.product?.names?.[0]?.value || 'Product'}
                            </h4>
                            <p className="text-sm text-gray-500 mt-1">SKU: {item.product?.sku || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Qty: {item.quantity || 1}</p>
                            <p className="font-bold text-gray-900 mt-1">{formatCurrency(item.priceTotalNet || 0)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
