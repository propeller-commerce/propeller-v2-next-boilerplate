/**
 * useUserIdentity (React) — Contact vs Customer detection and ID extraction.
 *
 * React hook mirror of vue/shared/useUserIdentity.ts.
 * Derives all values from the user argument without internal state
 * (caller passes user from their own useState).
 */

import { useMemo } from 'react';
import type { Contact, Customer, Address, Company } from 'propeller-sdk-v2';
import {
  isContact,
  isCustomer,
  getUserId,
  getCompany,
  getCompanyId,
  getAddresses,
  getDefaultInvoiceAddress,
  getDefaultDeliveryAddress,
} from '../../shared/utils/userIdentity';

export interface UserIdentityResult {
  isContact: boolean;
  isCustomer: boolean;
  userId: number | null;
  companyId: number | null;
  company: Company | null;
  addresses: Address[];
  defaultInvoiceAddress: Address | undefined;
  defaultDeliveryAddress: Address | undefined;
}

export function useUserIdentity(user: Contact | Customer | null): UserIdentityResult {
  return useMemo(() => ({
    isContact: isContact(user),
    isCustomer: isCustomer(user),
    userId: getUserId(user),
    companyId: getCompanyId(user),
    company: getCompany(user),
    addresses: getAddresses(user),
    defaultInvoiceAddress: getDefaultInvoiceAddress(user),
    defaultDeliveryAddress: getDefaultDeliveryAddress(user),
  }), [user]);
}
