'use client';

import { useAuth } from '@/context/AuthContext';
import AddressCard from '@/components/account/AddressCard';
import { AddressType } from 'propeller-sdk-v2/dist/enum/AddressType';
import { YesNo } from 'propeller-sdk-v2/dist/enum/YesNo';
import { Contact, Customer, Address } from 'propeller-sdk-v2';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AccountPage() {
  const { state } = useAuth();
  
  // Use auth state directly instead of local state
  const user = state.user;

  // Type guards
  const isContact = (user: Contact | Customer | null): user is Contact => {
    return user !== null && 'company' in user;
  };

  const getAllAddresses = (): Address[] => {
    if (!user) return [];
    
    if (isContact(user) && user.company?.addresses) {
      return user.company.addresses;
    }
    if ('addresses' in user && user.addresses) {
      return user.addresses;
    }
    return [];
  };

  const getDefaultAddresses = () => {
    const addresses = getAllAddresses();
    return {
      invoice: addresses.find((addr: Address) => addr.type === AddressType.invoice && addr.isDefault === YesNo.Y),
      delivery: addresses.find((addr: Address) => addr.type === AddressType.delivery && addr.isDefault === YesNo.Y)
    };
  };

  if (!state.isAuthenticated || !user) return null;

  const defaultAddresses = getDefaultAddresses();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Personal Information */}
        <Card className="border-none">
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</label>
              <div className="font-medium">
                {(() => {
                  if (user && 'firstName' in user && 'lastName' in user) {
                    return [user.firstName, user.lastName].filter(Boolean).join(' ');
                  }
                  if (user && 'name' in user) {
                    return (user as { name: string }).name;
                  }
                  return 'User';
                })()}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
              <div className="font-medium">{user.email}</div>
            </div>

            {isContact(user) && user.company && (
              <div className="grid grid-cols-1 gap-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Company</label>
                <div className="font-medium">{user.company.name}</div>
              </div>
            )}

            <div className="pt-2">
              {/* Placeholder for edit profile */}
              <Button variant="outline" size="sm" disabled>Edit Profile</Button>
            </div>
          </CardContent>
        </Card>

        {/* Default Addresses */}
        <Card className="border-none pb-5">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Default Addresses</CardTitle>
            <Button variant="link" size="sm" asChild className="px-0">
              <Link href="/account/addresses">Manage all &rarr;</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="text-xl font-bold">Invoice Address</h3>
                    {(() => {
                        const invoiceAddress = defaultAddresses.invoice;
                        return invoiceAddress ? (
                            <AddressCard address={invoiceAddress} showActions={false} />
                        ) : (
                            <p className="text-gray-500 italic">No invoice address found</p>
                        );
                    })()}
                </div>
                <div className="space-y-4">
                    <h3 className="text-xl font-bold">Delivery Address</h3>
                    {(() => {
                        const deliveryAddress = defaultAddresses.delivery;
                        return deliveryAddress ? (
                            <AddressCard address={deliveryAddress} showActions={false} />
                        ) : (
                            <p className="text-gray-500 italic">No delivery address found</p>
                        );
                    })()}
                </div>
            </div>
          </CardContent>
          <CardFooter />
        </Card>
      </div>
    </div>
  );
}
