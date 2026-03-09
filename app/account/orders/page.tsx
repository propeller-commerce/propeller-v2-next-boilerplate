'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { graphqlClient } from '@/lib/api';
// import OrderList from '@/components/account/OrderList';
import OrderList from '@/components/propeller/OrderList';


export default function OrdersPage() {
  const { state } = useAuth();
  const router = useRouter();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selected_company_id');
      return stored ? parseInt(stored, 10) : undefined;
    }
    return undefined;
  });

  useEffect(() => {
    if (!state.isAuthenticated) {
      router.push('/login');
    }
  }, [state.isAuthenticated, router]);

  // Listen for company switch events
  useEffect(() => {
    const listener = (event: CustomEvent) => {
      const company = event.detail;
      if (company && company.companyId) {
        setSelectedCompanyId(company.companyId);
      }
    };
    window.addEventListener('companySwitched', listener as EventListener);
    return () => {
      window.removeEventListener('companySwitched', listener as EventListener);
    };
  }, []);

  if (!state.isAuthenticated) return null;

  const paginationLabels = {
    view: 'Weergave',
    previous: 'Vorige',
    next: 'Volgende',
    showingPage: 'Pagina',
    of: 'van',
    noOrders: 'Geen orders',
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
          graphqlClient={graphqlClient}
          user={state.user}
          companyId={selectedCompanyId}
          onOrderClick={(orderId) => router.push(`/account/orders/${orderId}`)}
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
