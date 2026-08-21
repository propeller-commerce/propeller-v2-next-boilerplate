'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { localizeHref, config } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { OrderList } from '@propeller-commerce/propeller-v2-react-ui';
import { useTranslations } from '@/lib/i18n/client';
import { orderFilterFromParams, orderFilterToQueryString } from '@/lib/orderFilters';


export default function OrdersPage() {
  const { state } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const labels = useTranslations('OrderList');
  const orderStatusLabels = useTranslations('OrderStatus');
  const t = useTranslations('Account');

  if (!state.isAuthenticated) return null;

  // Seed the filter form from the URL so a shared/bookmarked filtered view
  // restores on reload; write filters back to the URL when they change.
  const initialSearchForm = orderFilterFromParams(
    new URLSearchParams(searchParams?.toString() ?? ''),
  );
  const persistFilters = (form: typeof initialSearchForm) => {
    const qs = orderFilterToQueryString(form);
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const ordersColumnConf = {
    id: '#',
    date: t.colDate,
    status: t.colStatus,
    total: t.colTotal,
  }

  const columns = ['id', 'date', 'status', 'total'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t.ordersTitle}</h1>
      </div>
      <div className="bg-card shadow-sm">
        <OrderList
          showCompanyOrders={false}
          onOrderClick={(orderId) => router.push(localizeHref(`/account/orders/${orderId}`, language))}
          labels={labels}
          statusLabels={orderStatusLabels}
          rowsClickable={true}
          searchFields={['term', 'createdAt', 'price']}
          columnConfig={ordersColumnConf}
          columns={columns}
          enableSearch={true}
          channelIds={[config.channelId]}
          initialSearchForm={initialSearchForm}
          onSearchApply={persistFilters}
        />
      </div>
    </div>
  );
}
