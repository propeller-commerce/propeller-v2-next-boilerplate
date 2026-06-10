'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { graphqlClient } from '@/lib/api';
import { AddressCard } from '@propeller-commerce/propeller-v2-react-ui';
import { Address, AddressType, Company, Contact, Customer, YesNo } from '@propeller-commerce/propeller-sdk-v2';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { useAddress, type AddressInput } from '@propeller-commerce/propeller-v2-react-ui';
import { COUNTRIES } from '@propeller-commerce/propeller-v2-react-ui';
import { useTranslations } from '@/lib/i18n/client';

// COUNTRIES imported from shared utils
export default function AddressesPage() {
  const { state: authState, refreshUser } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<AddressType>(AddressType.invoice);
  const { selectedCompany } = useCompany();

  const user = authState.user;

  const isContact = (u: Contact | Customer | null): u is Contact => u !== null && 'company' in u;
  const isCustomer = (u: Contact | Customer | null): u is Customer => u !== null && 'customerId' in u;

  const getActiveCompany = (): Company | null => {
    if (!user || !isContact(user)) return null;
    const targetId = selectedCompany?.companyId;
    if (targetId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const companiesRaw = (user as any).companies;
      const items = (companiesRaw?.items ?? companiesRaw) as Company[] | undefined;
      if (Array.isArray(items)) {
        const found = items.find((c: Company) => c.companyId === targetId);
        if (found) return found;
      }
      if (user.company?.companyId === targetId) return user.company as Company;
    }
    return (user.company as Company | undefined) ?? null;
  };

  const resolvedCompanyId = getActiveCompany()?.companyId;

  const addressCardLabels = useTranslations('AddressCard');

  const { createAddress, updateAddress, deleteAddress, setDefaultAddress } = useAddress({
    graphqlClient,
    user,
    companyId: resolvedCompanyId,
  });

  const getAllAddresses = (): Address[] => {
    if (!user) return [];
    if (isContact(user)) return getActiveCompany()?.addresses || [];
    if (isCustomer(user)) return user.addresses || [];
    return [];
  };

  const getDefaultAddresses = () => {
    const addresses = getAllAddresses();
    return {
      invoice: addresses.find((addr: Address) => addr.type === AddressType.invoice && addr.isDefault === YesNo.Y),
      delivery: addresses.find((addr: Address) => addr.type === AddressType.delivery && addr.isDefault === YesNo.Y),
    };
  };

  const getBillingAddresses = () =>
    getAllAddresses().filter((addr: Address) => addr.type === AddressType.invoice && addr.isDefault === YesNo.N);

  const getDeliveryAddresses = () =>
    getAllAddresses().filter((addr: Address) => addr.type === AddressType.delivery && addr.isDefault === YesNo.N);

  const handleAddAddress = (type: AddressType) => {
    setAddModalType(type);
    setShowAddModal(true);
  };

  const handleEditAddress = async (address: Address) => {
    const result = await updateAddress(Number(address.id), address as Partial<AddressInput>);
    if (result.success) {
      await refreshUser();
      toast.success('Address updated successfully');
    } else {
      toast.error('Failed to update address');
    }
  };

  const handleDeleteAddress = async (address: Address) => {
    const result = await deleteAddress(Number(address.id));
    if (result.success) {
      await refreshUser();
      toast.success('Address deleted successfully');
    } else {
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (address: Address) => {
    const result = await setDefaultAddress(Number(address.id));
    if (result.success) {
      await refreshUser();
      toast.success('Address set as default');
    } else {
      toast.error('Failed to set default address');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSaveNewAddress = async (address: any) => {
    const input: AddressInput = {
      company: address.company || undefined,
      gender: address.gender || undefined,
      firstName: address.firstName || undefined,
      middleName: address.middleName || undefined,
      lastName: address.lastName || undefined,
      email: address.email || undefined,
      street: address.street || '',
      number: address.number || undefined,
      numberExtension: address.numberExtension || undefined,
      postalCode: address.postalCode || '',
      city: address.city || '',
      country: address.country || 'NL',
      notes: address.notes || undefined,
      isDefault: (address.isDefault as YesNo) || YesNo.N,
      type: addModalType,
    };

    const result = await createAddress(input);
    if (result.success) {
      await refreshUser();
      toast.success('Address created successfully');
      setShowAddModal(false);
    } else {
      toast.error('Failed to create address');
    }
  };

  if (!authState.isAuthenticated || !user) return null;

  const defaultAddresses = getDefaultAddresses();
  const billingAddresses = getBillingAddresses();
  const deliveryAddresses = getDeliveryAddresses();

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Addresses</h1>
      </div>

      {/* Default Addresses */}
      <div className="space-y-4 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-md">Default Billing Address</h2>
            </div>
            {defaultAddresses.invoice ? (
              <AddressCard
                key={`inv-${defaultAddresses.invoice.id}-${selectedCompany?.companyId ?? 'default'}`}
                address={defaultAddresses.invoice}
                enableDelete={false}
                onEdit={handleEditAddress}
                onDelete={handleDeleteAddress}
                onSetDefault={handleSetDefault}
                countries={COUNTRIES}
                labels={addressCardLabels}
              />
            ) : (
              <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2">
                <p className="text-sm text-muted-foreground">No default invoice address</p>
                <Button variant="link" onClick={() => handleAddAddress(AddressType.invoice)}>Add One</Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-md">Default Delivery Address</h2>
            </div>
            {defaultAddresses.delivery ? (
              <AddressCard
                key={`del-${defaultAddresses.delivery.id}-${selectedCompany?.companyId ?? 'default'}`}
                address={defaultAddresses.delivery}
                enableDelete={false}
                onEdit={handleEditAddress}
                onDelete={handleDeleteAddress}
                onSetDefault={handleSetDefault}
                countries={COUNTRIES}
                labels={addressCardLabels}
              />
            ) : (
              <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2">
                <p className="text-sm text-muted-foreground">No default delivery address</p>
                <Button variant="link" onClick={() => handleAddAddress(AddressType.delivery)}>Add One</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Billing Addresses */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Additional Billing Addresses</h2>
          <Button size="sm" onClick={() => handleAddAddress(AddressType.invoice)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Button>
        </div>
        {billingAddresses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {billingAddresses.map((address: Address) => (
              <AddressCard
                key={`${address.id}-${selectedCompany?.companyId ?? 'default'}`}
                address={address}
                onEdit={handleEditAddress}
                onDelete={handleDeleteAddress}
                onSetDefault={handleSetDefault}
                countries={COUNTRIES}
                labels={addressCardLabels}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic text-sm">No additional billing addresses.</p>
        )}
      </div>

      {/* Delivery Addresses */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Additional Delivery Addresses</h2>
          <Button size="sm" onClick={() => handleAddAddress(AddressType.delivery)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Button>
        </div>
        {deliveryAddresses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {deliveryAddresses.map((address: Address) => (
              <AddressCard
                key={`${address.id}-${selectedCompany?.companyId ?? 'default'}`}
                address={address}
                onEdit={handleEditAddress}
                onDelete={handleDeleteAddress}
                onSetDefault={handleSetDefault}
                countries={COUNTRIES}
                labels={addressCardLabels}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic text-sm">No additional delivery addresses.</p>
        )}
      </div>

      {showAddModal && (
        <AddressCard
          addressType={addModalType}
          address={null}
          isNew
          onEdit={handleSaveNewAddress}
          onCancel={() => setShowAddModal(false)}
          enableActions={false}
          countries={COUNTRIES}
          labels={addressCardLabels}
        />
      )}
    </div>
  );
}
