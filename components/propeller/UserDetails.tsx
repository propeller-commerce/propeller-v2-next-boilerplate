'use client';

import { Address, Company, Contact, Customer } from 'propeller-sdk-v2';
import { useEffect, useState } from 'react';

export interface UserDetailsProps {
  /** The currently logged in user (Contact or Customer) */
  user: Contact | Customer;

  /**
   * The currently active company
   */
  activeCompany: Company | null;

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
   * Display details of the user's default invoice address  * @default true  */ showDefaultInvoiceAddress?: boolean
  /**  * Display details of the user's default delivery address
   * @default false
   */;
  showDefaultDeliveryAddress?: boolean;
}
interface UserDetailsState {
  isMounted: boolean;
  isContact: () => boolean;
  getName: () => string;
  getActiveCompany: () => Company | null;
  getCompanies: () => Company[];
  getAllAddresses: () => Address[];
  getDefaultInvoiceAddress: () => Address | null;
  getDefaultDeliveryAddress: () => Address | null;
  getAddressName: (addr: Address) => string;
  getAddressLine1: (addr: Address) => string;
  getAddressLine2: (addr: Address) => string;
  shouldShowCompanyInfo: () => boolean;
  shouldListCompanies: () => boolean;
  shouldShowInvoiceAddress: () => boolean;
  shouldShowDeliveryAddress: () => boolean;
}

function UserDetails(props: UserDetailsProps) {
  const [isMounted, setIsMounted] = useState<UserDetailsState['isMounted']>(() => false);

  function isContact(): ReturnType<UserDetailsState['isContact']> {
    return props.user !== null && 'company' in props.user;
  }

  function getName(): ReturnType<UserDetailsState['getName']> {
    if (props.user && props.user.firstName) {
      return [props.user.firstName, props.user.lastName].filter(Boolean).join(' ');
    }
    return 'User';
  }

  function getActiveCompany(): ReturnType<UserDetailsState['getActiveCompany']> {
    return isContact() ? props.activeCompany : null;
  }

  function getCompanies(): ReturnType<UserDetailsState['getCompanies']> {
    if (!isContact()) return [];
    const contact = props.user as Contact;
    const companiesResponse = contact.companies;
    if (companiesResponse?.items && companiesResponse.items.length > 0) {
      return companiesResponse.items;
    }
    const defaultCompany = contact.company;
    if (defaultCompany) {
      return [defaultCompany];
    }
    return [];
  }

  function getAllAddresses(): ReturnType<UserDetailsState['getAllAddresses']> {
    if (isContact()) {
      const company = getActiveCompany();
      return company?.addresses || [];
    }
    const customer = props.user as Customer;
    return customer.addresses || [];
  }

  function getDefaultInvoiceAddress(): ReturnType<UserDetailsState['getDefaultInvoiceAddress']> {
    const addresses = getAllAddresses();
    return (
      addresses.find((addr: Address) => addr.type === 'invoice' && addr.isDefault === 'Y') ?? null
    );
  }

  function getDefaultDeliveryAddress(): ReturnType<UserDetailsState['getDefaultDeliveryAddress']> {
    const addresses = getAllAddresses();
    return (
      addresses.find((addr: Address) => addr.type === 'delivery' && addr.isDefault === 'Y') ?? null
    );
  }

  function getAddressName(addr: Address): ReturnType<UserDetailsState['getAddressName']> {
    const parts = [addr.firstName, addr.middleName, addr.lastName].filter(Boolean);
    return parts.join(' ');
  }

  function getAddressLine1(addr: Address): ReturnType<UserDetailsState['getAddressLine1']> {
    const parts = [addr.street, addr.number, addr.numberExtension].filter(Boolean);
    return parts.join(' ');
  }

  function getAddressLine2(addr: Address): ReturnType<UserDetailsState['getAddressLine2']> {
    const parts = [addr.postalCode, addr.city].filter(Boolean);
    return parts.join(' ');
  }

  function shouldShowCompanyInfo(): ReturnType<UserDetailsState['shouldShowCompanyInfo']> {
    return props.showCompanyInfo !== false && isContact();
  }

  function shouldListCompanies(): ReturnType<UserDetailsState['shouldListCompanies']> {
    return props.listAllContactCompanies === true && isContact();
  }

  function shouldShowInvoiceAddress(): ReturnType<UserDetailsState['shouldShowInvoiceAddress']> {
    return props.showDefaultInvoiceAddress !== false;
  }

  function shouldShowDeliveryAddress(): ReturnType<UserDetailsState['shouldShowDeliveryAddress']> {
    return props.showDefaultDeliveryAddress === true;
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="user-details space-y-6">
      {isMounted ? (
        <>
          <div className="user-details__personal rounded-lg bg-card text-card-foreground shadow-sm">
            <div className="p-6 pb-2">
              <h3 className="text-lg font-semibold">Personal Information</h3>
            </div>
            <div className="p-6 pt-2 space-y-4">
              <div className="grid grid-cols-1 gap-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Name
                </label>
                <div className="font-medium">{getName()}</div>
              </div>
              <div className="grid grid-cols-1 gap-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Email
                </label>
                <div className="font-medium">{props.user.email}</div>
              </div>
            </div>
          </div>
          {shouldShowCompanyInfo() && getActiveCompany() ? (
            <div className="user-details__company rounded-lg bg-card text-card-foreground shadow-sm">
              <div className="p-6 pb-2">
                <h3 className="text-lg font-semibold">Company Information</h3>
              </div>
              <div className="p-6 pt-2 space-y-4">
                <div className="grid grid-cols-1 gap-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Company Name
                  </label>
                  <div className="font-medium">{getActiveCompany()?.name}</div>
                </div>
                {getActiveCompany()?.taxNumber ? (
                  <div className="grid grid-cols-1 gap-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Tax Number
                    </label>
                    <div className="font-medium">{getActiveCompany()?.taxNumber}</div>
                  </div>
                ) : null}
                {getActiveCompany()?.cocNumber ? (
                  <div className="grid grid-cols-1 gap-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      CoC Number
                    </label>
                    <div className="font-medium">{getActiveCompany()?.cocNumber}</div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
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
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
          {shouldShowInvoiceAddress() || shouldShowDeliveryAddress() ? (
            <div className="user-details__addresses rounded-lg bg-card text-card-foreground shadow-sm">
              <div className="p-6 pb-2">
                <h3 className="text-lg font-semibold">Default Addresses</h3>
              </div>
              <div className="p-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {shouldShowInvoiceAddress() ? (
                    <div className="space-y-3">
                      <h4 className="text-base font-bold">Invoice Address</h4>
                      {getDefaultInvoiceAddress() ? (
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                          {getDefaultInvoiceAddress()?.company ? (
                            <div className="font-bold text-lg mb-1">
                              {getDefaultInvoiceAddress()?.company}
                            </div>
                          ) : null}
                          {getAddressName(getDefaultInvoiceAddress()!) ? (
                            <div className="font-medium mb-1">
                              {getAddressName(getDefaultInvoiceAddress()!)}
                            </div>
                          ) : null}
                          <div className="text-gray-600">
                            {getAddressLine1(getDefaultInvoiceAddress()!)}
                          </div>
                          <div className="text-gray-600">
                            {getAddressLine2(getDefaultInvoiceAddress()!)}
                          </div>
                          {getDefaultInvoiceAddress()?.country ? (
                            <div className="text-gray-600">
                              {getDefaultInvoiceAddress()?.country}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      {!getDefaultInvoiceAddress() ? (
                        <p className="text-gray-500 italic">No invoice address found</p>
                      ) : null}
                    </div>
                  ) : null}
                  {shouldShowDeliveryAddress() ? (
                    <div className="space-y-3">
                      <h4 className="text-base font-bold">Delivery Address</h4>
                      {getDefaultDeliveryAddress() ? (
                        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                          {getDefaultDeliveryAddress()?.company ? (
                            <div className="font-bold text-lg mb-1">
                              {getDefaultDeliveryAddress()?.company}
                            </div>
                          ) : null}
                          {getAddressName(getDefaultDeliveryAddress()!) ? (
                            <div className="font-medium mb-1">
                              {getAddressName(getDefaultDeliveryAddress()!)}
                            </div>
                          ) : null}
                          <div className="text-gray-600">
                            {getAddressLine1(getDefaultDeliveryAddress()!)}
                          </div>
                          <div className="text-gray-600">
                            {getAddressLine2(getDefaultDeliveryAddress()!)}
                          </div>
                          {getDefaultDeliveryAddress()?.country ? (
                            <div className="text-gray-600">
                              {getDefaultDeliveryAddress()?.country}
                            </div>
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
