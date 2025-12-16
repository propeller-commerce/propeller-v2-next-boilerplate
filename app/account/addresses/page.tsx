'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { graphqlClient } from '@/lib/api';
import AddressCard from '@/components/account/AddressCard';
import AddressModal, { AddressFormData } from '@/components/account/AddressModal';
import { Address, AddressService, UserService, Contact, Customer, CompanyAddressCreateInput, CustomerAddressCreateInput } from 'propeller-sdk-v2';
import { Enums } from 'propeller-sdk-v2';
import { CompanyAddressUpdateInput } from 'propeller-sdk-v2';
import { CustomerAddressUpdateInput } from 'propeller-sdk-v2';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import { ShieldCheck, Truck, Plus } from 'lucide-react';

export default function AddressesPage() {
  const { state: authState, updateUser } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState<Enums.AddressType>(Enums.AddressType.invoice);

  // Use authState.user directly instead of storing in local state
  const user = authState.user;

  // Type guards
  const isContact = (user: Contact | Customer | null): user is Contact => {
    return user !== null && 'company' in user;
  };

  const isCustomer = (user: Contact | Customer | null): user is Customer => {
    return user !== null && 'customerId' in user;
  };

  const getAllAddresses = (): Address[] => {
    if (!user) return [];
    if (isContact(user)) {
      return user.company?.addresses || [];
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
        if ('contactId' in viewerData) {
          const user = new Contact(viewerData);
          localStorage.setItem('user', JSON.stringify(user));
          // Update the auth context directly
          updateUser(user);
        } else if ('customerId' in viewerData) {
          const user = new Customer(viewerData);
          localStorage.setItem('user', JSON.stringify(user));
          // Update the auth context directly
          updateUser(user);
        }
      }
    } catch (error: any) {
      console.error('Error refreshing user data:', error);

      // Handle case where we have "partial" data but also errors (common in GraphQL)
      // The SDK might throw because of "errors" array, but "data" might still contain the viewer
      const potentialData = error?.response?.data?.viewer || error?.data?.viewer;

      if (potentialData) {
        console.log('Recovering user data from partial error response', potentialData);
        localStorage.setItem('user', JSON.stringify(potentialData));
        updateUser(potentialData);
      }
    }
  };

  const handleEditAddress = async (address: AddressFormData) => {
    if (!user) return;

    try {
      const addressService = new AddressService(graphqlClient);

      if (isContact(user) && user.company) {
        const updateInput: CompanyAddressUpdateInput = {
          id: Number(address.id),
          companyId: user.company.companyId,
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

  const handleDeleteAddress = async (addressId: string) => {
    if (!user) return;

    try {
      const addressService = new AddressService(graphqlClient);

      if (isContact(user) && user.company) {
        await addressService.deleteCompanyAddress({
          id: Number(addressId),
          companyId: user.company.companyId
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

  const handleSetDefault = async (addressId: string) => {
    if (!user) return;

    try {
      const addressService = new AddressService(graphqlClient);
      if (isContact(user) && user.company) {
        await addressService.updateCompanyAddress({
          id: Number(addressId),
          companyId: user.company.companyId,
          isDefault: Enums.YesNo.Y
        });
      } else if (isCustomer(user)) {
        await addressService.updateCustomerAddress({
          id: Number(addressId),
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

  const handleSaveNewAddress = async (address: AddressFormData) => {
    if (!user) return;

    try {
      const addressService = new AddressService(graphqlClient);

      // Convert CartAddressType to AddressType if needed
      let addressType = address.type || Enums.AddressType.invoice;
      if (addressType === Enums.CartAddressType.INVOICE) {
        addressType = Enums.AddressType.invoice;
      } else if (addressType === Enums.CartAddressType.DELIVERY) {
        addressType = Enums.AddressType.delivery;
      }

      const commonData = {
        company: address.company,
        gender: address.gender,
        firstName: address.firstName,
        middleName: address.middleName,
        lastName: address.lastName,
        email: address.email,
        street: address.street || '',
        number: address.number,
        numberExtension: address.numberExtension,
        postalCode: address.postalCode || '',
        city: address.city || '',
        country: address.country || '',
        notes: address.notes,
        isDefault: address.isDefault as Enums.YesNo,
        type: addressType as Enums.AddressType
      };

      if (isContact(user) && user.company) {
        const input: CompanyAddressCreateInput = {
          ...commonData,
          companyId: user.company.companyId
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
                address={defaultAddresses.invoice}
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
                address={defaultAddresses.delivery}
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
        <AddressModal
          addressType={addModalType}
          onSave={handleSaveNewAddress}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
