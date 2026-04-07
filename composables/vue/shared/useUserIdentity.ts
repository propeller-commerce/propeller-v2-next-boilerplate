/**
 * useUserIdentity (Vue) — Contact vs Customer detection and ID extraction.
 *
 * Wraps the pure-TS helpers from shared/utils/userIdentity.ts with Vue reactivity.
 */

import { computed, type Ref, type ComputedRef } from 'vue';
import type { Contact, Customer, Address, Company } from 'propeller-sdk-v2';
import {
  isContact as _isContact,
  isCustomer as _isCustomer,
  getUserId,
  getCompany,
  getCompanyId,
  getAddresses,
  getDefaultInvoiceAddress,
  getDefaultDeliveryAddress,
} from '../../shared/utils/userIdentity';

export interface UserIdentity {
  isContact: ComputedRef<boolean>;
  isCustomer: ComputedRef<boolean>;
  userId: ComputedRef<number | null>;
  companyId: ComputedRef<number | null>;
  company: ComputedRef<Company | null>;
  addresses: ComputedRef<Address[]>;
  defaultInvoiceAddress: ComputedRef<Address | undefined>;
  defaultDeliveryAddress: ComputedRef<Address | undefined>;
}

export function useUserIdentity(user: Ref<Contact | Customer | null>): UserIdentity {
  const isContact = computed(() => _isContact(user.value));
  const isCustomer = computed(() => _isCustomer(user.value));
  const userId = computed(() => getUserId(user.value));
  const company = computed(() => getCompany(user.value));
  const companyId = computed(() => getCompanyId(user.value));
  const addresses = computed(() => getAddresses(user.value));
  const defaultInvoiceAddress = computed(() => getDefaultInvoiceAddress(user.value));
  const defaultDeliveryAddress = computed(() => getDefaultDeliveryAddress(user.value));

  return {
    isContact,
    isCustomer,
    userId,
    companyId,
    company,
    addresses,
    defaultInvoiceAddress,
    defaultDeliveryAddress,
  };
}
