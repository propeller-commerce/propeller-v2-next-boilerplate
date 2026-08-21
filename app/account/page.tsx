'use client';

import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { useRouter } from 'next/navigation';
import {
  UserDetails,
  OrderList,
  FavoriteLists,
  PurchaseAuthorizationRequests,
} from '@propeller-commerce/propeller-v2-react-ui';
import { useTranslations } from '@/lib/i18n/client';
import { useLanguage } from '@/context/LanguageContext';
import { getCountries } from '@/data/countries';
import { localizeHref, config } from '@/data/config';
import type { ReactNode } from 'react';

const DASHBOARD_LIMIT = 3;

function DashboardCard({
  title,
  href,
  viewAllLabel,
  children,
}: {
  title: string;
  href?: string;
  viewAllLabel: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {href ? (
          <a href={href} className="text-sm text-secondary hover:underline shrink-0">
            {viewAllLabel}
          </a>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function AccountPage() {
  const { state, isAuthManagerForCompany } = useAuth();
  const { selectedCompany } = useCompany();
  const { language } = useLanguage();
  const router = useRouter();
  const user = state.user;
  const userDetailsLabels = useTranslations('UserDetails');
  const orderListLabels = useTranslations('OrderList');
  const orderStatusLabels = useTranslations('OrderStatus');
  const favoriteListsLabels = useTranslations('FavoriteLists');
  const authRequestLabels = useTranslations('PurchaseAuthorizationRequests');
  const t = useTranslations('Account');

  if (!state.isAuthenticated || !user) return null;

  const href = (path: string) => localizeHref(path, language);
  const isAuthManager = isAuthManagerForCompany(user, selectedCompany?.companyId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t.dashboardTitle}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard
          title={t.openQuotesTitle}
          href={href('/account/quotes')}
          viewAllLabel={t.viewAll}
        >
          <OrderList
            showCompanyOrders={false}
            orderStatus={['QUOTATION']}
            columns={['id', 'validUntil', 'total']}
            columnConfig={{ id: '#', validUntil: t.colValidUntil, total: t.colTotal }}
            initialItemsPerPage={DASHBOARD_LIMIT}
            hidePagination={true}
            flat={true}
            hideHeader={true}
            enableSearch={false}
            rowsClickable={true}
            channelIds={[config.channelId]}
            onOrderClick={(orderId) => router.push(href(`/account/quotes/${orderId}`))}
            labels={{ ...orderListLabels, noOrders: t.noQuotes }}
            statusLabels={orderStatusLabels}
          />
        </DashboardCard>

        <DashboardCard
          title={t.latestOrdersTitle}
          href={href('/account/orders')}
          viewAllLabel={t.viewAll}
        >
          <OrderList
            showCompanyOrders={false}
            columns={['id', 'status', 'total']}
            columnConfig={{ id: '#', status: t.colStatus, total: t.colTotal }}
            initialItemsPerPage={DASHBOARD_LIMIT}
            hidePagination={true}
            flat={true}
            hideHeader={true}
            enableSearch={false}
            rowsClickable={true}
            channelIds={[config.channelId]}
            onOrderClick={(orderId) => router.push(href(`/account/orders/${orderId}`))}
            labels={orderListLabels}
            statusLabels={orderStatusLabels}
          />
        </DashboardCard>

        <DashboardCard
          title={t.favoritesTitle}
          href={href('/account/favorites')}
          viewAllLabel={t.viewAll}
        >
          <FavoriteLists
            limit={DASHBOARD_LIMIT}
            showActions={false}
            allowFavoriteListCreate={false}
            onListClick={(listId) => router.push(href(`/account/favorites/${listId}`))}
            labels={favoriteListsLabels}
          />
        </DashboardCard>

        {isAuthManager ? (
          <DashboardCard
            title={t.authorizationRequestsTitle}
            href={href('/account/authorization-requests')}
            viewAllLabel={t.viewAll}
          >
            <PurchaseAuthorizationRequests
              limit={DASHBOARD_LIMIT}
              columns={['date', 'requestedBy', 'total']}
              showActions={false}
              flat={true}
              hideHeader={true}
              hideTitle={true}
              labels={authRequestLabels}
            />
          </DashboardCard>
        ) : null}
      </div>

      <UserDetails
        activeCompany={selectedCompany}
        showCompanyInfo={true}
        listAllContactCompanies={false}
        showDefaultInvoiceAddress={true}
        showDefaultDeliveryAddress={true}
        countries={getCountries(language)}
        labels={userDetailsLabels}
      />
    </div>
  );
}
