'use client';
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Contact, Customer, Company, Address } from 'propeller-sdk-v2';

export interface UserDetailsProps {
  /** The currently logged in user (Contact or Customer) */
  user: Contact | Customer;

  /**
   * Display basic company information for the default company if the user is Contact
   * @default true
   */
  showCompanyInfo?: boolean;

  /**
   * Display a list of all companies if the user is Contact
   * @default false
   */
  listAllContactCompanies?: boolean;

  /**
   * Display details of the user's default invoice address
   * @default true
   */
  showDefaultInvoiceAddress?: boolean;

  /**
   * Display details of the user's default delivery address
   * @default false
   */
  showDefaultDeliveryAddress?: boolean;
}

function UserDetails(props: UserDetailsProps) {
  const [_isMounted, set_isMounted] = useState(false);
  const [_selectedCompanyId, set_selectedCompanyId] = useState<number | null>(null);

  function isContact(): boolean {
    return props.user !== null && 'company' in props.user;
  }

  function getName(): string {
    const user = props.user as any;
    if (user && user.firstName) {
      return [user.firstName, user.lastName].filter(Boolean).join(' ');
    }
    if (user && user.name) {
      return user.name;
    }
    return 'User';
  }

  function getActiveCompany(): Company | null {
    if (!isContact()) return null;
    const contact = props.user as Contact;
    if (_selectedCompanyId !== null) {
      const companies = getCompanies();
      const found = companies.find((c: Company) => c.companyId === _selectedCompanyId);
      if (found) return found;
    }
    return (contact.company as Company | undefined) ?? null;
  }

  function getCompanies(): Company[] {
    if (!isContact()) return [];
    const contact = props.user as Contact;
    const companiesRaw = contact.companies as any;
    const items = (companiesRaw?.items ?? companiesRaw?._items) as Company[] | undefined;
    if (Array.isArray(items) && items.length > 0) {
      return items;
    }
    const defaultCompany = contact.company;
    if (defaultCompany) {
      return [defaultCompany];
    }
    return [];
  }

  function getAllAddresses(): Address[] {
    if (isContact()) {
      const company = getActiveCompany();
      if (company && company.addresses) {
        return company.addresses;
      }
      return [];
    }
    const customer = props.user as Customer;
    if (customer.addresses) {
      return customer.addresses;
    }
    return [];
  }

  function getDefaultInvoiceAddress(): Address | null {
    const addresses = getAllAddresses();
    return addresses.find((addr: Address) => addr.type === 'invoice' && addr.isDefault === 'Y') ?? null;
  }

  function getDefaultDeliveryAddress(): Address | null {
    const addresses = getAllAddresses();
    return addresses.find((addr: Address) => addr.type === 'delivery' && addr.isDefault === 'Y') ?? null;
  }

  function getAddressName(addr: Address): string {
    const parts = [(addr as any).firstName, (addr as any).middleName, (addr as any).lastName].filter(Boolean);
    return parts.join(' ');
  }

  function getAddressLine1(addr: Address): string {
    const parts = [addr.street, (addr as any).number, (addr as any).numberExtension].filter(Boolean);
    return parts.join(' ');
  }

  function getAddressLine2(addr: Address): string {
    const parts = [addr.postalCode, addr.city].filter(Boolean);
    return parts.join(' ');
  }

  function shouldShowCompanyInfo(): boolean {
    return props.showCompanyInfo !== false && isContact();
  }

  function shouldListCompanies(): boolean {
    return props.listAllContactCompanies === true && isContact();
  }

  function shouldShowInvoiceAddress(): boolean {
    return props.showDefaultInvoiceAddress !== false;
  }

  function shouldShowDeliveryAddress(): boolean {
    return props.showDefaultDeliveryAddress === true;
  }

  useEffect(() => {
    set_isMounted(true);
    const storedCompanyId = localStorage.getItem('selected_company_id');
    if (storedCompanyId) {
      set_selectedCompanyId(parseInt(storedCompanyId, 10));
    }

    const listener = (event: any) => {
      const company = event.detail;
      if (company && company.companyId) {
        set_selectedCompanyId(company.companyId);
      }
    };
    window.addEventListener('companySwitched', listener);

    return () => {
      window.removeEventListener('companySwitched', listener);
    };
  }, []);

  return (
    <div className="user-details space-y-6">
      {_isMounted ? (
        <>
          {/* Personal Information */}
          <div className="user-details__personal rounded-lg bg-card text-card-foreground shadow-sm">
            <div className="p-6 pb-2">
              <h3 className="text-lg font-semibold">Personal Information</h3>
            </div>
            <div className="p-6 pt-2 space-y-4">
              <div className="grid grid-cols-1 gap-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</label>
                <div className="font-medium">{getName()}</div>
              </div>
              <div className="grid grid-cols-1 gap-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</label>
                <div className="font-medium">{props.user.email}</div>
              </div>
            </div>
          </div>

          {/* Company Information */}
          {shouldShowCompanyInfo() && getActiveCompany() ? (
            <div className="user-details__company rounded-lg bg-card text-card-foreground shadow-sm">
              <div className="p-6 pb-2">
                <h3 className="text-lg font-semibold">Company Information</h3>
              </div>
              <div className="p-6 pt-2 space-y-4">
                <div className="grid grid-cols-1 gap-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Company Name</label>
                  <div className="font-medium">{getActiveCompany()?.name}</div>
                </div>
                {getActiveCompany()?.taxNumber ? (
                  <div className="grid grid-cols-1 gap-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tax Number</label>
                    <div className="font-medium">{getActiveCompany()?.taxNumber}</div>
                  </div>
                ) : null}
                {getActiveCompany()?.cocNumber ? (
                  <div className="grid grid-cols-1 gap-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CoC Number</label>
                    <div className="font-medium">{getActiveCompany()?.cocNumber}</div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* All Companies List */}
          {shouldListCompanies() && getCompanies().length > 0 ? (
            <div className="user-details__companies rounded-lg bg-card text-card-foreground shadow-sm">
              <div className="p-6 pb-2">
                <h3 className="text-lg font-semibold">Companies</h3>
              </div>
              <div className="p-6 pt-2">
                <ul className="space-y-2">
                  {getCompanies()?.map((company) => (
                    <li
                      key={String(company.companyId)}
                      className={`flex items-center gap-2 py-2 px-3 rounded-md ${
                        getActiveCompany()?.companyId === company.companyId
                          ? 'bg-primary/10 font-semibold text-primary'
                          : 'text-foreground'
                      }`}
                    >
                      <span className="truncate">{company.name}</span>
                      {getActiveCompany()?.companyId === company.companyId ? (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Active</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}

          {/* Default Addresses */}
          {shouldShowInvoiceAddress() || shouldShowDeliveryAddress() ? (
            <div className="user-details__addresses rounded-lg bg-card text-card-foreground shadow-sm">
              <div className="p-6 pb-2">
                <h3 className="text-lg font-semibold">Default Addresses</h3>
              </div>
              <div className="p-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Invoice Address */}
                  {shouldShowInvoiceAddress() ? (
                    <div className="space-y-3">
                      <h4 className="text-base font-bold">Invoice Address</h4>
                      {getDefaultInvoiceAddress() ? (
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                          {(getDefaultInvoiceAddress() as any)?.company ? (
                            <div className="font-bold text-lg mb-1">{(getDefaultInvoiceAddress() as any)?.company}</div>
                          ) : null}
                          {getAddressName(getDefaultInvoiceAddress()!) ? (
                            <div className="font-medium mb-1">{getAddressName(getDefaultInvoiceAddress()!)}</div>
                          ) : null}
                          <div className="text-gray-600">{getAddressLine1(getDefaultInvoiceAddress()!)}</div>
                          <div className="text-gray-600">{getAddressLine2(getDefaultInvoiceAddress()!)}</div>
                          {getDefaultInvoiceAddress()?.country ? (
                            <div className="text-gray-600">{getDefaultInvoiceAddress()?.country}</div>
                          ) : null}
                        </div>
                      ) : null}
                      {!getDefaultInvoiceAddress() ? (
                        <p className="text-gray-500 italic">No invoice address found</p>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Delivery Address */}
                  {shouldShowDeliveryAddress() ? (
                    <div className="space-y-3">
                      <h4 className="text-base font-bold">Delivery Address</h4>
                      {getDefaultDeliveryAddress() ? (
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                          {(getDefaultDeliveryAddress() as any)?.company ? (
                            <div className="font-bold text-lg mb-1">{(getDefaultDeliveryAddress() as any)?.company}</div>
                          ) : null}
                          {getAddressName(getDefaultDeliveryAddress()!) ? (
                            <div className="font-medium mb-1">{getAddressName(getDefaultDeliveryAddress()!)}</div>
                          ) : null}
                          <div className="text-gray-600">{getAddressLine1(getDefaultDeliveryAddress()!)}</div>
                          <div className="text-gray-600">{getAddressLine2(getDefaultDeliveryAddress()!)}</div>
                          {getDefaultDeliveryAddress()?.country ? (
                            <div className="text-gray-600">{getDefaultDeliveryAddress()?.country}</div>
                          ) : null}
                        </div>
                      ) : null}
                      {!getDefaultDeliveryAddress() ? (
                        <p className="text-gray-500 italic">No delivery address found</p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default UserDetails;
