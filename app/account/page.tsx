'use client';

import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { Contact, Customer } from 'propeller-sdk-v2';
import UserDetails from '@/components/propeller/UserDetails';

export default function AccountPage() {
  const { state } = useAuth();
  const { selectedCompany } = useCompany();
  const user = state.user;

  if (!state.isAuthenticated || !user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <UserDetails
        user={user as Contact | Customer}
        activeCompany={selectedCompany}
        showCompanyInfo={true}
        listAllContactCompanies={false}
        showDefaultInvoiceAddress={true}
        showDefaultDeliveryAddress={true}
      />
    </div>
  );
}
