/**
 * useAddress (Vue) — Address display and CRUD.
 *
 * Covers: AddressCard component.
 * Vue mirror of react/useAddress.ts.
 * Mirrors AddressCard.lite.tsx.
 *
 * Uses proper SDK types for all address service calls.
 * CompanyAddressUpdateInput / CustomerAddressUpdateInput do not have a `type` field —
 * the address type is only set on creation.
 */

import { ref, type Ref } from 'vue';
import { AddressService, Enums } from 'propeller-sdk-v2';
import type {
  GraphQLClient,
  Address,
  CompanyAddressCreateInput,
  CustomerAddressCreateInput,
  CompanyAddressUpdateInput,
  CustomerAddressUpdateInput,
} from 'propeller-sdk-v2';
import type { AnyUser } from '../shared/utils/userIdentity';
import { isContact, isCustomer } from '../shared/utils/userIdentity';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AddressInput {
  type?: Enums.AddressType;
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
  gender?: Enums.Gender;
  isDefault?: Enums.YesNo;
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
  setDefaultAddress: (addressId: number) => Promise<{ success: boolean; error?: string }>;
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useAddress(options: UseAddressOptions): UseAddressReturn {
  const { graphqlClient, user } = options;
  const companyIdRef = options.companyId ?? ref<number | undefined>(undefined);

  const loading = ref(false);
  const error = ref<string | null>(null);

  function resolveIds(): { companyId?: number; customerId?: number } {
    const u = user.value;
    if (!u) return {};
    if (isContact(u)) return { companyId: companyIdRef.value ?? u.company?.companyId };
    if (isCustomer(u)) return { customerId: u.customerId };
    return {};
  }

  // ── Create address ────────────────────────────────────────────────────────

  async function createAddress(input: AddressInput): Promise<{ success: boolean; address?: Address; error?: string }> {
    loading.value = true;
    error.value = null;
    try {
      const service = new AddressService(graphqlClient);
      const ids = resolveIds();
      let address: Address;

      if (ids.companyId) {
        const createInput: CompanyAddressCreateInput = {
          street: input.street,
          postalCode: input.postalCode,
          city: input.city,
          country: input.country,
          type: input.type ?? Enums.AddressType.invoice,
          companyId: ids.companyId,
          ...(input.firstName && { firstName: input.firstName }),
          ...(input.lastName && { lastName: input.lastName }),
          ...(input.middleName && { middleName: input.middleName }),
          ...(input.company && { company: input.company }),
          ...(input.number && { number: input.number }),
          ...(input.numberExtension && { numberExtension: input.numberExtension }),
          ...(input.email && { email: input.email }),
          ...(input.phone && { phone: input.phone }),
          ...(input.mobile && { mobile: input.mobile }),
          ...(input.gender && { gender: input.gender }),
          ...(input.isDefault && { isDefault: input.isDefault }),
          ...(input.notes && { notes: input.notes }),
        };
        address = await service.createCompanyAddress(createInput);
      } else if (ids.customerId) {
        const createInput: CustomerAddressCreateInput = {
          street: input.street,
          postalCode: input.postalCode,
          city: input.city,
          country: input.country,
          type: input.type ?? Enums.AddressType.home,
          customerId: ids.customerId,
          ...(input.firstName && { firstName: input.firstName }),
          ...(input.lastName && { lastName: input.lastName }),
          ...(input.middleName && { middleName: input.middleName }),
          ...(input.number && { number: input.number }),
          ...(input.numberExtension && { numberExtension: input.numberExtension }),
          ...(input.email && { email: input.email }),
          ...(input.phone && { phone: input.phone }),
          ...(input.mobile && { mobile: input.mobile }),
          ...(input.gender && { gender: input.gender }),
          ...(input.isDefault && { isDefault: input.isDefault }),
          ...(input.notes && { notes: input.notes }),
        };
        address = await service.createCustomerAddress(createInput);
      } else {
        return { success: false, error: 'No user context for address creation' };
      }

      return { success: true, address };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create address';
      error.value = msg;
      return { success: false, error: msg };
    } finally {
      loading.value = false;
    }
  }

  // ── Update address ────────────────────────────────────────────────────────
  // Note: SDK update inputs do not have a `type` field; type is fixed at creation.

  async function updateAddress(addressId: number, input: Partial<AddressInput>): Promise<{ success: boolean; address?: Address; error?: string }> {
    loading.value = true;
    error.value = null;
    try {
      const service = new AddressService(graphqlClient);
      const ids = resolveIds();
      let address: Address;

      if (ids.companyId) {
        const updateInput: CompanyAddressUpdateInput = {
          id: addressId,
          companyId: ids.companyId,
          ...(input.firstName && { firstName: input.firstName }),
          ...(input.lastName && { lastName: input.lastName }),
          ...(input.middleName && { middleName: input.middleName }),
          ...(input.company && { company: input.company }),
          ...(input.street && { street: input.street }),
          ...(input.number !== undefined && { number: input.number }),
          ...(input.numberExtension && { numberExtension: input.numberExtension }),
          ...(input.postalCode && { postalCode: input.postalCode }),
          ...(input.city && { city: input.city }),
          ...(input.country && { country: input.country }),
          ...(input.email && { email: input.email }),
          ...(input.phone && { phone: input.phone }),
          ...(input.mobile && { mobile: input.mobile }),
          ...(input.gender && { gender: input.gender }),
          ...(input.isDefault && { isDefault: input.isDefault }),
          ...(input.notes && { notes: input.notes }),
        };
        address = await service.updateCompanyAddress(updateInput);
      } else if (ids.customerId) {
        const updateInput: CustomerAddressUpdateInput = {
          id: addressId,
          customerId: ids.customerId,
          ...(input.firstName && { firstName: input.firstName }),
          ...(input.lastName && { lastName: input.lastName }),
          ...(input.middleName && { middleName: input.middleName }),
          ...(input.street && { street: input.street }),
          ...(input.number !== undefined && { number: input.number }),
          ...(input.numberExtension && { numberExtension: input.numberExtension }),
          ...(input.postalCode && { postalCode: input.postalCode }),
          ...(input.city && { city: input.city }),
          ...(input.country && { country: input.country }),
          ...(input.email && { email: input.email }),
          ...(input.phone && { phone: input.phone }),
          ...(input.mobile && { mobile: input.mobile }),
          ...(input.gender && { gender: input.gender }),
          ...(input.isDefault && { isDefault: input.isDefault }),
          ...(input.notes && { notes: input.notes }),
        };
        address = await service.updateCustomerAddress(updateInput);
      } else {
        return { success: false, error: 'No user context for address update' };
      }

      return { success: true, address };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to update address';
      error.value = msg;
      return { success: false, error: msg };
    } finally {
      loading.value = false;
    }
  }

  // ── Delete address ────────────────────────────────────────────────────────

  async function deleteAddress(addressId: number): Promise<{ success: boolean; error?: string }> {
    loading.value = true;
    error.value = null;
    try {
      const service = new AddressService(graphqlClient);
      const ids = resolveIds();
      if (ids.companyId) {
        await service.deleteCompanyAddress({ id: addressId, companyId: ids.companyId });
      } else if (ids.customerId) {
        await service.deleteCustomerAddress({ id: addressId, customerId: ids.customerId });
      } else {
        return { success: false, error: 'No user context for address deletion' };
      }
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to delete address';
      error.value = msg;
      return { success: false, error: msg };
    } finally {
      loading.value = false;
    }
  }

  async function setDefaultAddress(addressId: number): Promise<{ success: boolean; error?: string }> {
    return updateAddress(addressId, { isDefault: Enums.YesNo.Y });
  }

  return { loading, error, createAddress, updateAddress, deleteAddress, setDefaultAddress };
}
