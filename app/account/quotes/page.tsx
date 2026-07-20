'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { config, localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { OrderList } from '@propeller-commerce/propeller-v2-react-ui';
import { useTranslations } from '@/lib/i18n/client';


export default function QuotesPage() {
  const { state } = useAuth();
  const router = useRouter();
  const { language } = useLanguage();
  const labels = useTranslations('OrderList');
  const orderStatusLabels = useTranslations('OrderStatus');
  const t = useTranslations('Account');

  if (!state.isAuthenticated) return null;

  const ordersColumnConf = {
    id: '#',
    date: t.colDate,
    status: t.colStatus,
    validUntil: t.colValidUntil,
    total: t.colTotal,
  }

  const columns = ['id', 'date', 'status', 'validUntil', 'total'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t.quotesTitle}</h1>
      </div>
      <div className="bg-card shadow-sm">
        <OrderList
          channelIds={[config.channelId]}
          showCompanyOrders={false}
          onOrderClick={(orderId) => router.push(localizeHref(`/account/quotes/${orderId}`, language))}
          orderStatus={["QUOTATION"]}
          labels={{ ...labels, noOrders: t.noQuotes }}
          statusLabels={orderStatusLabels}
          rowsClickable={true}
          searchFields={['term', 'createdAt', 'price']}
          columnConfig={ordersColumnConf}
          columns={columns}
          enableSearch={true}
        />
      </div>
    </div>
  );
}
