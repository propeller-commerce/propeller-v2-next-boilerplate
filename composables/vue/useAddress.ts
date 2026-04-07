/**
 * useAddress (Vue) — Address display and CRUD.
 *
 * Covers: AddressCard component.
 * AddressService methods take flat input objects (companyId is a field in input).
 */

import { ref, type Ref } from 'vue';
import { AddressService } from 'propeller-sdk-v2';
import type { GraphQLClient, Address, Customer } from 'propeller-sdk-v2';
import type { AnyUser } from '../shared/utils/userIdentity';
import { isContact } from '../shared/utils/userIdentity';

export interface AddressInput {
  type: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  company?: string;
  street: string;
  number?: string;
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
  user: Ref<AnyUser>;
  companyId?: Ref<number | undefined>;
}

export interface UseAddressReturn {
  loading: Ref<boolean>;
  error: Ref<string | null>;
  createAddress: (input: AddressInput) => Promise<{ success: boolean; address?: Address; error?: string }>;
  updateAddress: (addressId: number, input: Partial<AddressInput>) => Promise<{ success: boolean; address?: Address; error?: string }>;
  deleteAddress: (addressId: number) => Promise<{ success: boolean; error?: string }>;
  setDefaultAddress: (addressId: number, type: string) => Promise<{ success: boolean; error?: string }>;
}

export function useAddress(options: UseAddressOptions): UseAddressReturn {
  const { graphqlClient, user } = options;
  const companyIdRef = options.companyId ?? ref<number | undefined>(undefined);

  const loading = ref(false);
  const error = ref<string | null>(null);

  function getCompanyId(): number | undefined {
    const u = user.value;
    if (!u) return undefined;
    if (isContact(u)) return companyIdRef.value ?? u.company?.companyId;
    return undefined;
  }

  function getCustomerId(): number | undefined {
    const u = user.value;
    if (!u || isContact(u)) return undefined;
    return (u as Customer).customerId;
  }

  async function createAddress(input: AddressInput): Promise<{ success: boolean; address?: Address; error?: string }> {
    loading.value = true; error.value = null;
    try {
      const service = new AddressService(graphqlClient);
      const companyId = getCompanyId();
      const customerId = getCustomerId();
      let address: Address;
      if (companyId) {
        address = await service.createCompanyAddress({ ...input, companyId } as any);
      } else if (customerId) {
        address = await service.createCustomerAddress({ ...input, customerId } as any);
      } else { return { success: false, error: 'No user context for address creation' }; }
      return { success: true, address };
    } catch (e: any) { const msg = e?.message || 'Failed to create address'; error.value = msg; return { success: false, error: msg }; }
    finally { loading.value = false; }
  }

  async function updateAddress(addressId: number, input: Partial<AddressInput>): Promise<{ success: boolean; address?: Address; error?: string }> {
    loading.value = true; error.value = null;
    try {
      const service = new AddressService(graphqlClient);
      const companyId = getCompanyId();
      const customerId = getCustomerId();
      let address: Address;
      if (companyId) {
        address = await service.updateCompanyAddress({ id: addressId, companyId, ...input } as any);
      } else if (customerId) {
        address = await service.updateCustomerAddress({ id: addressId, customerId, ...input } as any);
      } else { return { success: false, error: 'No user context for address update' }; }
      return { success: true, address };
    } catch (e: any) { const msg = e?.message || 'Failed to update address'; error.value = msg; return { success: false, error: msg }; }
    finally { loading.value = false; }
  }

  async function deleteAddress(addressId: number): Promise<{ success: boolean; error?: string }> {
    loading.value = true; error.value = null;
    try {
      const service = new AddressService(graphqlClient);
      const companyId = getCompanyId();
      const customerId = getCustomerId();
      if (companyId) { await service.deleteCompanyAddress({ id: addressId, companyId } as any); }
      else if (customerId) { await service.deleteCustomerAddress({ id: addressId, customerId } as any); }
      else { return { success: false, error: 'No user context for address deletion' }; }
      return { success: true };
    } catch (e: any) { const msg = e?.message || 'Failed to delete address'; error.value = msg; return { success: false, error: msg }; }
    finally { loading.value = false; }
  }

  async function setDefaultAddress(addressId: number, type: string): Promise<{ success: boolean; error?: string }> {
    return updateAddress(addressId, { isDefault: 'Y', type });
  }

  return { loading, error, createAddress, updateAddress, deleteAddress, setDefaultAddress };
}
