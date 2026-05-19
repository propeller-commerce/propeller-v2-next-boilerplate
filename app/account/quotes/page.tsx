'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { config, localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import OrderList from '@/components/propeller/OrderList';


export default function QuotesPage() {
  const { state } = useAuth();
  const router = useRouter();
  const { language } = useLanguage();

  if (!state.isAuthenticated) return null;

  const paginationLabels = {
    view: 'Weergave',
    previous: 'Vorige',
    next: 'Volgende',
    showingPage: 'Pagina',
    of: 'van',
    noOrders: 'Geen offertes',
    loading: 'Laden',
    order: 'Order',
    date: 'Datum',
    status: 'Status',
    total: 'Totaal',
    action: 'Actie',
  };

  const ordersColumnConf = {
    id: '#',
    date: 'Datum',
    status: 'Status',
    validUntil: 'Geldig tot',
    total: 'Totaal',
  }

  const columns = ['id', 'date', 'status', 'validUntil', 'total'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Quote History</h1>
      </div>
      <div className="bg-card shadow-sm">
        <OrderList
          channelIds={[config.channelId]}
          showCompanyOrders={false}
          onOrderClick={(orderId) => router.push(localizeHref(`/account/quotes/${orderId}`, language))}
          orderStatus={["QUOTATION"]}
          labels={paginationLabels}
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
