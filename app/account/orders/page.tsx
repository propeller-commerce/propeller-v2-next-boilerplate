'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { localizeHref, config } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { OrderList } from '@propeller-commerce/propeller-v2-react-ui';
import { useTranslations } from '@/lib/i18n/client';


export default function OrdersPage() {
  const { state } = useAuth();
  const router = useRouter();
  const { language } = useLanguage();
  const labels = useTranslations('OrderList');

  if (!state.isAuthenticated) return null;

  const ordersColumnConf = {
    id: '#',
    date: 'Datum',
    status: 'Status',
    total: 'Totaal',
  }

  const columns = ['id', 'date', 'status', 'total'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Order History</h1>
      </div>
      <div className="bg-card shadow-sm">
        <OrderList
          showCompanyOrders={false}
          onOrderClick={(orderId) => router.push(localizeHref(`/account/orders/${orderId}`, language))}
          labels={labels}
          rowsClickable={true}
          searchFields={['term', 'createdAt', 'price']}
          columnConfig={ordersColumnConf}
          columns={columns}
          enableSearch={true}
          channelIds={[config.channelId]}
        />
      </div>
    </div>
  );
}
