/**
 * userIdentity — Pure TS helpers for Contact vs Customer detection.
 *
 * Framework-agnostic. Used by both vue/ and react/ composables.
 */

import type { Contact, Customer, Address, Company } from 'propeller-sdk-v2';

export type AnyUser = Contact | Customer | null;

export function isContact(user: AnyUser): user is Contact {
  return !!user && 'contactId' in user;
}

export function isCustomer(user: AnyUser): user is Customer {
  return !!user && 'customerId' in user && !('contactId' in user);
}

export function getUserId(user: AnyUser): number | null {
  if (!user) return null;
  if (isContact(user)) return user.contactId ?? null;
  if (isCustomer(user)) return user.customerId ?? null;
  return null;
}

export function getCompany(user: AnyUser): Company | null {
  if (!user || !isContact(user)) return null;
  return (user as Contact).company ?? null;
}

export function getCompanyId(user: AnyUser): number | null {
  return getCompany(user)?.companyId ?? null;
}

export function getAddresses(user: AnyUser): Address[] {
  if (!user) return [];
  if (isContact(user)) {
    return ((user as Contact).company?.addresses as Address[]) ?? [];
  }
  return ((user as Customer).addresses as Address[]) ?? [];
}

export function getDefaultInvoiceAddress(user: AnyUser): Address | undefined {
  return getAddresses(user).find(
    (addr) => addr.isDefault === 'Y' && addr.type === 'invoice'
  );
}

export function getDefaultDeliveryAddress(user: AnyUser): Address | undefined {
  return getAddresses(user).find(
    (addr) => addr.isDefault === 'Y' && addr.type === 'delivery'
  );
}
