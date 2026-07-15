'use client';

import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Contact, Customer } from '@propeller-commerce/propeller-sdk-v2';
import { UserDetails } from '@propeller-commerce/propeller-v2-react-ui';
import { COUNTRIES } from '@propeller-commerce/propeller-v2-react-ui';
import { useTranslations } from '@/lib/i18n/client';

// COUNTRIES imported from shared utils
export default function AccountPage() {
  const { state } = useAuth();
  const { selectedCompany } = useCompany();
  const user = state.user;
  const userDetailsLabels = useTranslations('UserDetails');
  const t = useTranslations('Account');

  if (!state.isAuthenticated || !user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t.dashboardTitle}</h1>
      </div>

      <UserDetails
        activeCompany={selectedCompany}
        showCompanyInfo={true}
        listAllContactCompanies={false}
        showDefaultInvoiceAddress={true}
        showDefaultDeliveryAddress={true}
        countries={COUNTRIES}
        labels={userDetailsLabels}
      />
    </div>
  );
}
