/**
 * useAddress (React) — Address display and CRUD.
 *
 * React mirror of vue/useAddress.ts.
 */

import { useState, useCallback } from 'react';
import { AddressService } from 'propeller-sdk-v2';
import type { GraphQLClient, Address, Contact, Customer } from 'propeller-sdk-v2';
import type { AnyUser } from '../shared/utils/userIdentity';
import { isContact } from '../shared/utils/userIdentity';

export interface AddressInput {
  type: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  company?: string;
  street: string;
  number: string;
  numberExtension?: string;
  postalCode: string;
  city: string;
  country: string;
  email?: string;
  phone?: string;
  mobile?: string;
  gender?: string;
  isDefault?: 'Y' | 'N';
  notes?: string;
}

export interface UseAddressOptions {
  graphqlClient: GraphQLClient;
  user: AnyUser;
  companyId?: number;
}

export interface UseAddressReturn {
  loading: boolean;
  error: string | null;
  createAddress: (input: AddressInput) => Promise<{ success: boolean; address?: Address; error?: string }>;
  updateAddress: (addressId: number, input: Partial<AddressInput>) => Promise<{ success: boolean; address?: Address; error?: string }>;
  deleteAddress: (addressId: number) => Promise<{ success: boolean; error?: string }>;
  setDefaultAddress: (addressId: number, type: string) => Promise<{ success: boolean; error?: string }>;
}

export function useAddress(options: UseAddressOptions): UseAddressReturn {
  const { graphqlClient, user, companyId } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function getEntityId() {
    if (!user) return {};
    if (isContact(user)) return { contactId: user.contactId, companyId: companyId ?? user.company?.companyId };
    return { customerId: (user as Customer).customerId };
  }

  const createAddress = useCallback(
    async (input: AddressInput): Promise<{ success: boolean; address?: Address; error?: string }> => {
      setLoading(true); setError(null);
      try {
        const service = new AddressService(graphqlClient);
        const ids = getEntityId();
        let address: Address;
        if (ids.companyId) { address = await service.createCompanyAddress({ ...input, companyId: ids.companyId } as any); }
        else if (ids.customerId) { address = await service.createCustomerAddress({ ...input, customerId: ids.customerId } as any); }
        else return { success: false, error: 'No user context' };
        return { success: true, address };
      } catch (e: any) { const msg = e?.message || 'Failed to create address'; setError(msg); return { success: false, error: msg }; }
      finally { setLoading(false); }
    },
    [graphqlClient, user, companyId]
  );

  const updateAddress = useCallback(
    async (addressId: number, input: Partial<AddressInput>): Promise<{ success: boolean; address?: Address; error?: string }> => {
      setLoading(true); setError(null);
      try {
        const service = new AddressService(graphqlClient);
        const ids = getEntityId();
        let address: Address;
        if (ids.companyId) { address = await service.updateCompanyAddress({ id: addressId, companyId: ids.companyId, ...input } as any); }
        else if (ids.customerId) { address = await service.updateCustomerAddress({ id: addressId, customerId: ids.customerId, ...input } as any); }
        else return { success: false, error: 'No user context' };
        return { success: true, address };
      } catch (e: any) { const msg = e?.message || 'Failed to update address'; setError(msg); return { success: false, error: msg }; }
      finally { setLoading(false); }
    },
    [graphqlClient, user, companyId]
  );

  const deleteAddress = useCallback(
    async (addressId: number): Promise<{ success: boolean; error?: string }> => {
      setLoading(true); setError(null);
      try {
        const service = new AddressService(graphqlClient);
        const ids = getEntityId();
        if (ids.companyId) { await service.deleteCompanyAddress({ id: addressId, companyId: ids.companyId }); }
        else if (ids.customerId) { await service.deleteCustomerAddress({ id: addressId, customerId: ids.customerId }); }
        else return { success: false, error: 'No user context' };
        return { success: true };
      } catch (e: any) { const msg = e?.message || 'Failed to delete address'; setError(msg); return { success: false, error: msg }; }
      finally { setLoading(false); }
    },
    [graphqlClient, user, companyId]
  );

  const setDefaultAddress = useCallback(
    async (addressId: number, type: string) => updateAddress(addressId, { isDefault: 'Y', type }),
    [updateAddress]
  );

  return { loading, error, createAddress, updateAddress, deleteAddress, setDefaultAddress };
}
