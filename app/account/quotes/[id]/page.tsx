'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { graphqlClient } from 'propeller-v2-react-ui';
import { Order, OrderItem } from 'propeller-sdk-v2';
import { useOrders } from 'propeller-v2-react-ui';
import { OrderSummary } from 'propeller-v2-react-ui';
import { QuoteActions } from 'propeller-v2-react-ui';
import { imageSearchFiltersGrid, imageVariantFiltersSmall } from '@/data/defaults';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { OrderItemCard } from 'propeller-v2-react-ui';
import { OrderTotals } from 'propeller-v2-react-ui';
import { COUNTRIES } from 'propeller-v2-react-ui';

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

    const { getOrderById, downloadQuotePdf } = useOrders({
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
                setError(result.error ?? 'Quote not found');
            }
            setLoading(false);
        };

        if (quoteId) {
            fetchQuoteDetails();
        }
    }, [quoteId]);

    const handleAfterAccept = async (acceptedQuote: Order) => {
        router.push(localizeHref(`/checkout/thank-you/${acceptedQuote.id}`, language));
    };

    // PDF download UX state — shows "Downloading..." while the request is in
    // flight, then a success or error toast based on the result. Mirrors the
    // pattern OrderActions uses for the order-confirmation PDF.
    const [downloading, setDownloading] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState<'success' | 'error'>('success');

    const showDownloadToast = (message: string, type: 'success' | 'error') => {
        setToastMessage(message);
        setToastType(type);
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), 4000);
    };

    const handleDownloadPDF = async () => {
        if (downloading) return;
        setDownloading(true);
        try {
            const result = await downloadQuotePdf(Number(quoteId));
            if (result?.success) {
                showDownloadToast('PDF downloaded successfully', 'success');
            } else {
                showDownloadToast(result?.error || 'Failed to download PDF', 'error');
            }
        } catch (e) {
            console.error('Error downloading quote PDF:', e);
            showDownloadToast('Failed to download PDF', 'error');
        } finally {
            setDownloading(false);
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
                    <Link href={localizeHref('/account/quotes', language)} className="text-primary hover:underline">
                        Return to Quotes
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
                        <div className="flex flex-row items-end gap-3 flex-shrink-0 mt-4">
                            <QuoteActions
                                quote={quote}
                                afterAccept={handleAfterAccept}
                                showTermsAndConditions={true}
                                onTermsAndConditionsClick={() => window.open('/terms-conditions', '_blank')}
                            />
                            <Button variant="link" size="sm" onClick={handleDownloadPDF} disabled={downloading}>
                                {downloading ? 'Downloading...' : 'Download Quote (PDF)'}
                            </Button>
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

            {/* PDF download toast (success / error feedback) */}
            {toastVisible ? (
                <div
                    className={`fixed top-4 right-4 z-50 flex items-start gap-3 w-80 rounded-container shadow-lg p-4 ${
                        toastType === 'success'
                            ? 'bg-success border border-success text-success-foreground'
                            : 'bg-destructive border border-destructive text-destructive-foreground'
                    }`}
                    data-toast-type={toastType}
                >
                    <div className="flex-shrink-0 w-5 h-5 mt-0.5">
                        {toastType === 'success' ? (
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                                />
                            </svg>
                        )}
                    </div>
                    <p className="flex-1 text-sm font-medium">{toastMessage}</p>
                    <button
                        type="button"
                        className="flex-shrink-0 rounded focus:outline-none hover:opacity-80"
                        onClick={() => setToastVisible(false)}
                    >
                        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-4 w-4" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            ) : null}
        </div>
    );
}
