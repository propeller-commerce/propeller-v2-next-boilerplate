'use client';

import { useCart } from '@/context/CartContext';
import { useParams } from 'next/navigation';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import { CartMainItem } from 'propeller-sdk-v2';

export default function AuthorizationRequestSentPage() {
    const params = useParams();
    const cartId = params?.cartId as string;
    const { cart } = useCart();
    const { language } = useLanguage();

    const items: CartMainItem[] = cart?.items || [];
    const total = cart?.total?.totalNet ?? 0;
    const totalExclVat = cart?.total?.totalGross ?? 0;
    const totalVat = total - totalExclVat;

    const formatPrice = (price: number) =>
        `€${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">Authorization Request Sent!</h1>
                        <p className="text-lg text-gray-600">
                            Your request has been submitted. An authorization manager will review it shortly.
                        </p>
                        {cartId && (
                            <p className="text-sm text-gray-400 mt-2">Reference: {cartId}</p>
                        )}
                    </div>

                    {items.length > 0 && (
                        <div className="space-y-8">
                            {/* Cart items */}
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100">
                                    <h2 className="text-xl font-bold text-gray-900">Cart Summary</h2>
                                </div>
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 w-2/3">Product</th>
                                            <th className="px-6 py-3 text-center text-sm font-medium text-gray-500">Qty</th>
                                            <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {items.map((item) => {
                                            const name = item.product?.names?.[0]?.value || 'Product';
                                            const sku = item.product?.sku;
                                            const imageUrl = item.product?.media?.images?.items?.[0]?.imageVariants?.[0]?.url;
                                            const itemTotal = item.totalSumNet ?? 0;

                                            return (
                                                <tr key={item.itemId} className="hover:bg-gray-50/50">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {imageUrl ? (
                                                                <img
                                                                    src={imageUrl}
                                                                    alt={name}
                                                                    className="w-12 h-12 object-contain rounded border border-gray-100 flex-shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-12 h-12 bg-gray-100 rounded border border-gray-100 flex-shrink-0 flex items-center justify-center">
                                                                    <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                                                    </svg>
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">{name}</p>
                                                                {sku && <p className="text-xs text-gray-400 mt-0.5">SKU: {sku}</p>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center text-sm text-gray-600">{item.quantity}</td>
                                                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">{formatPrice(itemTotal)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Totals */}
                                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 space-y-2">
                                    <div className="flex justify-between text-sm text-gray-600">
                                        <span>Total excl. VAT:</span>
                                        <span>{formatPrice(totalExclVat)}</span>
                                    </div>
                                    {totalVat > 0 && (
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>VAT:</span>
                                            <span>{formatPrice(totalVat)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
                                        <span>Total:</span>
                                        <span>{formatPrice(total)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
                        <Link
                            href={localizeHref('/', language)}
                            className="px-8 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/80 transition text-center"
                        >
                            Continue Shopping
                        </Link>
                    </div>

                    <div className="text-center text-gray-500 pt-6 text-sm">
                        <p>You will be notified once your authorization request has been reviewed.</p>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
