'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { graphqlClient } from '@/lib/api';
import AddressCard from '@/components/propeller/AddressCard';
import { Address, AddressService, UserService, Contact, Customer, Company, CompanyAddressCreateInput, CustomerAddressCreateInput } from 'propeller-sdk-v2';
import { Enums } from 'propeller-sdk-v2';
import { CompanyAddressUpdateInput } from 'propeller-sdk-v2';
import { CustomerAddressUpdateInput } from 'propeller-sdk-v2';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, Truck, Plus } from 'lucide-react';

/** Recursively converts SDK class instances to plain objects, stripping underscore prefixes */
function deepPlain(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(deepPlain);
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as object)) {
      const cleanKey = key.startsWith('_') ? key.slice(1) : key;
      result[cleanKey] = deepPlain((value as Record<string, unknown>)[key]);
    }
    return result;
  }
  return value;
}

export default function AddressesPage() {
  const { state: authState } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<Enums.AddressType>(Enums.AddressType.invoice);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selected_company_id');
      return stored ? parseInt(stored, 10) : null;
    }
    return null;
  });

  // Use authState.user directly instead of storing in local state
  const user = authState.user;

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

  // Type guards
  const isContact = (u: Contact | Customer | null): u is Contact => {
    return u !== null && 'company' in u;
  };

  const isCustomer = (u: Contact | Customer | null): u is Customer => {
    return u !== null && 'customerId' in u;
  };

  /** Resolve the active company for a Contact user (respects company switcher) */
  const getActiveCompany = (): Company | null => {
    if (!user || !isContact(user)) return null;
    if (selectedCompanyId !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const companiesRaw = (user as any).companies;
      const items = (companiesRaw?.items ?? companiesRaw?._items ?? companiesRaw) as Company[] | undefined;
      if (Array.isArray(items)) {
        const found = items.find((c: Company) => c.companyId === selectedCompanyId);
        if (found) return found;
      }
    }
    return (user.company as Company | undefined) ?? null;
  };

  const getAllAddresses = (): Address[] => {
    if (!user) return [];
    if (isContact(user)) {
      const company = getActiveCompany();
      return company?.addresses || [];
    }
    if (isCustomer(user)) {
      return user.addresses || [];
    }
    return [];
  };

  const getDefaultAddresses = () => {
    const addresses = getAllAddresses();
    return {
      invoice: addresses.find((addr: Address) => addr.type === Enums.AddressType.invoice && addr.isDefault === Enums.YesNo.Y),
      delivery: addresses.find((addr: Address) => addr.type === Enums.AddressType.delivery && addr.isDefault === Enums.YesNo.Y)
    };
  };

  const getBillingAddresses = () => {
    const addresses = getAllAddresses();
    return addresses.filter((addr: Address) => addr.type === Enums.AddressType.invoice && addr.isDefault === Enums.YesNo.N);
  };

  const getDeliveryAddresses = () => {
    const addresses = getAllAddresses();
    return addresses.filter((addr: Address) => addr.type === Enums.AddressType.delivery && addr.isDefault === Enums.YesNo.N);
  };

  const handleAddAddress = (type: Enums.AddressType) => {
    setAddModalType(type);
    setShowAddModal(true);
  };

  const refreshUserData = async () => {
    try {
      const userService = new UserService(graphqlClient);
      const viewerData = await userService.getViewer({});
      if (viewerData) {
        // Use deepPlain to strip SDK underscore prefixes (same as login flow)
        const plainUser = deepPlain(viewerData);
        localStorage.setItem('user', JSON.stringify(plainUser));
        // Trigger AuthContext to re-read from localStorage (same event login uses)
        window.dispatchEvent(new CustomEvent('userLoggedIn'));
      }
    } catch (error: unknown) {
      console.error('Error refreshing user data:', error);

      // Handle case where we have "partial" data but also errors (common in GraphQL)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as Record<string, any>;
      const potentialData = err?.response?.data?.viewer || err?.data?.viewer;

      if (potentialData) {
        console.log('Recovering user data from partial error response', potentialData);
        const plainUser = deepPlain(potentialData);
        localStorage.setItem('user', JSON.stringify(plainUser));
        window.dispatchEvent(new CustomEvent('userLoggedIn'));
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditAddress = async (address: any) => {
    if (!user) return;

    try {
      const addressService = new AddressService(graphqlClient);

      if (isContact(user) && getActiveCompany()) {
        const updateInput: CompanyAddressUpdateInput = {
          id: Number(address.id),
          companyId: getActiveCompany()!.companyId,
          company: address.company,
          gender: address.gender,
          firstName: address.firstName,
          middleName: address.middleName,
          lastName: address.lastName,
          email: address.email,
          street: address.street,
          number: address.number,
          numberExtension: address.numberExtension,
          postalCode: address.postalCode,
          city: address.city,
          country: address.country,
          notes: address.notes,
          isDefault: address.isDefault as Enums.YesNo
        };
        await addressService.updateCompanyAddress(updateInput);
      } else if (isCustomer(user)) {
        const updateInput: CustomerAddressUpdateInput = {
          id: Number(address.id),
          customerId: user.customerId,
          company: address.company,
          gender: address.gender,
          firstName: address.firstName,
          middleName: address.middleName,
          lastName: address.lastName,
          email: address.email,
          street: address.street,
          number: address.number,
          numberExtension: address.numberExtension,
          postalCode: address.postalCode,
          city: address.city,
          country: address.country,
          notes: address.notes,
          isDefault: address.isDefault as Enums.YesNo
        };
        await addressService.updateCustomerAddress(updateInput);
      }

      await refreshUserData();
      toast.success('Address updated successfully');
    } catch (error) {
      console.error('Error updating address:', error);
      toast.error('Failed to update address');
    }
  };

  const handleDeleteAddress = async (addressId: number) => {
    if (!user) return;

    try {
      const addressService = new AddressService(graphqlClient);

      if (isContact(user) && getActiveCompany()) {
        await addressService.deleteCompanyAddress({
          id: Number(addressId),
          companyId: getActiveCompany()!.companyId
        });
      } else if (isCustomer(user)) {
        await addressService.deleteCustomerAddress({
          id: Number(addressId),
          customerId: user.customerId
        });
      }

      await refreshUserData();
      toast.success('Address deleted successfully');
    } catch (error) {
      console.error('Error deleting address:', error);
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (address: Address) => {
    if (!user || !address.id) return;

    try {
      const addressService = new AddressService(graphqlClient);
      if (isContact(user) && getActiveCompany()) {
        await addressService.updateCompanyAddress({
          id: Number(address.id),
          companyId: getActiveCompany()!.companyId,
          isDefault: Enums.YesNo.Y
        });
      } else if (isCustomer(user)) {
        await addressService.updateCustomerAddress({
          id: Number(address.id),
          customerId: user.customerId,
          isDefault: Enums.YesNo.Y
        });
      }
      await refreshUserData();
      toast.success('Address set as default');
    } catch (error) {
      console.error('Error setting default address:', error);
      toast.error('Failed to set default address');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSaveNewAddress = async (address: any) => {
    if (!user) return;

    try {
      const addressService = new AddressService(graphqlClient);

      const commonData = {
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
        isDefault: (address.isDefault as Enums.YesNo) || Enums.YesNo.N,
        type: addModalType
      };

      if (isContact(user) && getActiveCompany()) {
        const input: CompanyAddressCreateInput = {
          ...commonData,
          companyId: getActiveCompany()!.companyId
        };
        await addressService.createCompanyAddress(input);
      } else if (isCustomer(user)) {
        const input: CustomerAddressCreateInput = {
          ...commonData,
          customerId: user.customerId
        };
        await addressService.createCustomerAddress(input);
      }

      await refreshUserData();
      toast.success('Address created successfully');
      setShowAddModal(false);
    } catch (error) {
      console.error('Error creating address:', error);
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
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Default Addresses</h2>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Default Invoice
            </h3>
            {defaultAddresses.invoice ? (
              <AddressCard
                graphqlClient={graphqlClient}
                address={defaultAddresses.invoice}
                enableDelete={false}
                onEdit={handleEditAddress}
                onDelete={handleDeleteAddress}
                onSetDefault={handleSetDefault}
              />
            ) : (
              <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2">
                <p className="text-sm text-muted-foreground">No default invoice address</p>
                <Button variant="link" onClick={() => handleAddAddress(Enums.AddressType.invoice)}>Add One</Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Truck className="w-4 h-4" /> Default Delivery
            </h3>
            {defaultAddresses.delivery ? (
              <AddressCard
                graphqlClient={graphqlClient}
                address={defaultAddresses.delivery}
                enableDelete={false}
                onEdit={handleEditAddress}
                onDelete={handleDeleteAddress}
                onSetDefault={handleSetDefault}
              />
            ) : (
              <div className="border border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center space-y-2">
                <p className="text-sm text-muted-foreground">No default delivery address</p>
                <Button variant="link" onClick={() => handleAddAddress(Enums.AddressType.delivery)}>Add One</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Billing Addresses */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Billing Addresses</h2>
          <Button size="sm" onClick={() => handleAddAddress(Enums.AddressType.invoice)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Button>
        </div>
        {billingAddresses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {billingAddresses.map((address: Address) => (
              <AddressCard
                key={address.id}
                graphqlClient={graphqlClient}
                address={address}
                onEdit={handleEditAddress}
                onDelete={handleDeleteAddress}
                onSetDefault={handleSetDefault}
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
          <h2 className="text-xl font-semibold">Delivery Addresses</h2>
          <Button size="sm" onClick={() => handleAddAddress(Enums.AddressType.delivery)}>
            <Plus className="w-4 h-4 mr-2" />
            Add New
          </Button>
        </div>
        {deliveryAddresses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {deliveryAddresses.map((address: Address) => (
              <AddressCard
                key={address.id}
                graphqlClient={graphqlClient}
                address={address}
                onEdit={handleEditAddress}
                onDelete={handleDeleteAddress}
                onSetDefault={handleSetDefault}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic text-sm">No additional delivery addresses.</p>
        )}
      </div>

      {showAddModal && (
        <AddressCard
          graphqlClient={graphqlClient}
          address={{ type: addModalType }}
          isNew
          onEdit={handleSaveNewAddress}
          onCancel={() => setShowAddModal(false)}
          enableActions={false}
        />
      )}
    </div>
  );
}
