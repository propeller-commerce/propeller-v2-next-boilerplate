/**
 * useAddress (React) — Address display and CRUD.
 *
 * React mirror of vue/useAddress.ts.
 * Mirrors AddressCard.lite.tsx.
 *
 * Uses proper SDK types for all address service calls.
 * CompanyAddressUpdateInput / CustomerAddressUpdateInput do not have a `type` field —
 * the address type is only set on creation.
 */

import { useState, useCallback } from 'react';
import { AddressService, Enums } from 'propeller-sdk-v2';
import type {
  GraphQLClient,
  Address,
  Customer,
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
  user: AnyUser;
  companyId?: number;
}

export interface UseAddressReturn {
  loading: boolean;
  error: string | null;
  createAddress: (input: AddressInput) => Promise<{ success: boolean; address?: Address; error?: string }>;
  updateAddress: (addressId: number, input: Partial<AddressInput>) => Promise<{ success: boolean; address?: Address; error?: string }>;
  deleteAddress: (addressId: number) => Promise<{ success: boolean; error?: string }>;
  setDefaultAddress: (addressId: number) => Promise<{ success: boolean; error?: string }>;
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useAddress(options: UseAddressOptions): UseAddressReturn {
  const { graphqlClient, user, companyId } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resolveIds(): { companyId?: number; customerId?: number } {
    if (!user) return {};
    if (isContact(user)) return { companyId: companyId ?? user.company?.companyId };
    if (isCustomer(user)) return { customerId: (user as Customer).customerId };
    return {};
  }

  // ── Create address ────────────────────────────────────────────────────────

  const createAddress = useCallback(
    async (input: AddressInput): Promise<{ success: boolean; address?: Address; error?: string }> => {
      setLoading(true);
      setError(null);
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
            type: input.type ?? Enums.AddressType.delivery,
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
          return { success: false, error: 'No user context' };
        }

        return { success: true, address };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to create address';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [graphqlClient, user, companyId]
  );

  // ── Update address ────────────────────────────────────────────────────────
  // Note: SDK update inputs do not have an `type` field; type is fixed at creation.

  const updateAddress = useCallback(
    async (addressId: number, input: Partial<AddressInput>): Promise<{ success: boolean; address?: Address; error?: string }> => {
      setLoading(true);
      setError(null);
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
          return { success: false, error: 'No user context' };
        }

        return { success: true, address };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to update address';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [graphqlClient, user, companyId]
  );

  // ── Delete address ────────────────────────────────────────────────────────

  const deleteAddress = useCallback(
    async (addressId: number): Promise<{ success: boolean; error?: string }> => {
      setLoading(true);
      setError(null);
      try {
        const service = new AddressService(graphqlClient);
        const ids = resolveIds();
        if (ids.companyId) {
          await service.deleteCompanyAddress({ id: addressId, companyId: ids.companyId });
        } else if (ids.customerId) {
          await service.deleteCustomerAddress({ id: addressId, customerId: ids.customerId });
        } else {
          return { success: false, error: 'No user context' };
        }
        return { success: true };
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Failed to delete address';
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [graphqlClient, user, companyId]
  );

  const setDefaultAddress = useCallback(
    async (addressId: number): Promise<{ success: boolean; error?: string }> =>
      updateAddress(addressId, { isDefault: Enums.YesNo.Y }),
    [updateAddress]
  );

  return { loading, error, createAddress, updateAddress, deleteAddress, setDefaultAddress };
}
