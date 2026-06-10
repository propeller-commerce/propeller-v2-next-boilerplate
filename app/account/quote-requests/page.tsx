'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { config, localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { OrderList } from 'propeller-v2-react-ui';
import { useTranslations } from '@/lib/i18n/client';


export default function QuoteRequestsPage() {
  const { state } = useAuth();
  const router = useRouter();
  const { language } = useLanguage();
  const labels = useTranslations('OrderList');

  if (!state.isAuthenticated) return null;

  const ordersColumnConf = {
    id: '#',
    date: 'Datum',
    status: 'Status',
    validUntil: 'Geldig tot',
    total: 'Totaal',
  }

  const columns = ['id', 'date', 'status', 'total'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Quote requests</h1>
      </div>
      <div className="bg-card shadow-sm">
        <OrderList
          channelIds={[config.channelId]}
          showCompanyOrders={false}
          onOrderClick={(orderId) => router.push(localizeHref(`/account/quote-requests/${orderId}`, language))}
          orderStatus={["REQUEST"]}
          labels={labels}
          rowsClickable={true}
          // searchFields={['term', 'createdAt', 'price']}
          columnConfig={ordersColumnConf}
          columns={columns}
        // enableSearch={true}
        />
      </div>
    </div>
  );
}
