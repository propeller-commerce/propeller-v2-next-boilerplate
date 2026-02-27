'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { graphqlClient } from '@/lib/api';
// import OrderList from '@/components/account/OrderList';
import OrderList from '@/output/react/ui-components/OrderList';
import { OrderStatus } from 'propeller-sdk-v2';

export default function OrdersPage() {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!state.isAuthenticated) {
      router.push('/login');
    }
  }, [state.isAuthenticated, router]);

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
