'use client';

import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useRouter } from 'next/navigation';
import { config, localizeHref } from '@/data/config';
import { useLanguage } from '@/context/LanguageContext';
import { graphqlClient } from '@/lib/api';
import OrderList from '@/components/propeller/OrderList';
import { Contact, Customer, Company } from 'propeller-sdk-v2';


export default function QuotesPage() {
  const { state } = useAuth();
  const { selectedCompany } = useCompany();
  const router = useRouter();
  const { language } = useLanguage();

  const isContact = (u: Contact | Customer | null): u is Contact =>
    u !== null && 'company' in u;

  /** Resolve the active company for a Contact user (respects company switcher) */
  const getActiveCompany = (): Company | null => {
    if (!state.user || !isContact(state.user)) return null;
    return (selectedCompany) ?? null;
  };

  const companyId = getActiveCompany()?.companyId;

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

  const columns = ['id', 'date', 'status', 'total'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Quote requests</h1>
      </div>
      <div className="bg-card shadow-sm">
        <OrderList
          graphqlClient={graphqlClient}
          channelIds={[config.channelId]}
          user={state.user}
          companyId={companyId}
          showCompanyOrders={false}
          onOrderClick={(orderId) => router.push(localizeHref(`/account/quote-requests/${orderId}`, language))}
          orderStatus={["REQUEST"]}
          labels={paginationLabels}
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
