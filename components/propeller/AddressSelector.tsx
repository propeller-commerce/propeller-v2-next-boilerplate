'use client';
import * as React from 'react';

import { useState } from 'react';
import { Contact, Customer, Address, Company, Enums } from 'propeller-sdk-v2';
import AddressCard from './AddressCard';

export interface AddressSelectorProps {
  /** Authenticated user — addresses are derived from their profile. */
  user: Contact | Customer | null;

  /**
   * Active company ID (for Contact users).
   * Pass the value from the company switcher so the correct company's addresses are listed.  */ companyId?: number;
  /**  * Filter addresses to this type.  * Defaults to Enums.AddressType.delivery.  */ addressType?: string;
  /** Called when the user picks an address from the modal. Supports async. */ onAddressSelected?: (
    address: Address
  ) => void | Promise<void>;
  /** Country list forwarded to AddressCard [{code: 'NL', name: 'Netherlands'}, ...] */ countries?: {
    code: string;
    name: string;
  }[];
  /** Label overrides. Keys: chooseAddress, modalTitle, noAddresses */ labels?: Record<
    string,
    string
  >;
  /** Extra CSS class on the root element. */ className?: string;
}
interface AddressSelectorState {
  showModal: boolean;
  selectedAddress: Address | null;
  isLoading: boolean;
  getLabel: (key: string, fallback: string) => string;
  getActiveCompany: () => Company | null;
  getAddresses: () => Address[];
  handleTileClick: (address: Address) => void;
  handleConfirm: () => Promise<void>;
}
function AddressSelector(props: AddressSelectorProps) {
  const [showModal, setShowModal] = useState<AddressSelectorState['showModal']>(() => false);
  const [selectedAddress, setSelectedAddress] = useState<AddressSelectorState['selectedAddress']>(
    () => null
  );
  const [isLoading, setIsLoading] = useState<AddressSelectorState['isLoading']>(() => false);
  function getLabel(key: string, fallback: string): ReturnType<AddressSelectorState['getLabel']> {
    return (props.labels as any)?.[key] || fallback;
  }
  function getActiveCompany(): ReturnType<AddressSelectorState['getActiveCompany']> {
    const user = props.user as Contact | Customer | null;
    if (!user || !('contactId' in user)) return null;
    const contact = user as Contact;
    const cid = props.companyId as number;
    if (cid) {
      const companiesRaw = (contact as any).companies;
      const items = (companiesRaw?.items ?? companiesRaw) as Company[] | undefined;
      if (Array.isArray(items)) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].companyId === cid) return items[i];
        }
      }
      if ((contact.company as Company)?.companyId === cid) return contact.company as Company;
    }
    return (contact.company as Company | undefined) ?? null;
  }
  function getAddresses(): ReturnType<AddressSelectorState['getAddresses']> {
    const user = props.user as Contact | Customer | null;
    if (!user) return [];
    const type = (props.addressType as string) || Enums.AddressType.delivery;
    let all: Address[] = [];
    if ('contactId' in user) {
      const company = getActiveCompany();
      all = ((company as any)?.addresses || []) as Address[];
    } else if ('customerId' in user) {
      all = ((user as Customer).addresses || []) as Address[];
    }
    return all.filter((a: Address) => a.type === type);
  }
  function handleTileClick(address: Address): ReturnType<AddressSelectorState['handleTileClick']> {
    setSelectedAddress(address);
  }
  async function handleConfirm(): ReturnType<AddressSelectorState['handleConfirm']> {
    if (!selectedAddress || isLoading) return;
    setIsLoading(true);
    try {
      if (props.onAddressSelected) {
        await props.onAddressSelected(selectedAddress as Address);
      }
      setShowModal(false);
      setSelectedAddress(null as any);
    } finally {
      setIsLoading(false);
    }
  }
  return (
    <div className={`propeller-address-selector ${(props.className as string) || ''}`}>
      <button
        type="button"
        className="propeller-address-selector__trigger inline-flex items-center gap-2 px-4 py-2 border border-input rounded-control text-sm font-medium text-foreground bg-card hover:bg-surface-hover transition-colors"
        onClick={(event) => {
          setShowModal(true);
        }}
      >
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            strokeWidth={2}
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            strokeWidth={2}
          />
        </svg>
        {getLabel('chooseAddress', 'Choose address')}
      </button>
      {showModal ? (
        <div className="propeller-address-selector__modal fixed inset-0 bg-foreground/50 flex items-start justify-center z-50 overflow-y-auto py-10">
          <div className="propeller-address-selector__modal-content bg-card p-6 rounded-container max-w-2xl w-full mx-4 shadow-xl">
            <div className="propeller-address-selector__modal-header flex justify-between items-center mb-6">
              <h3 className="propeller-address-selector__modal-title text-xl font-bold">{getLabel('modalTitle', 'Choose an address')}</h3>
              <button
                type="button"
                className="propeller-address-selector__modal-close text-muted-foreground hover:text-foreground text-xl leading-none"
                onClick={(event) => {
                  setShowModal(false);
                }}
              >
                {' '}
                &times;{' '}
              </button>
            </div>
            {getAddresses().length === 0 ? (
              <p className="propeller-address-selector__empty text-muted-foreground italic">
                {getLabel('noAddresses', 'No addresses found.')}
              </p>
            ) : null}
            {getAddresses().length > 0 ? (
              <>
                <div className="propeller-address-selector__list grid grid-cols-2 gap-4">
                  {getAddresses()?.map((address) => (
                    <div
                      key={(address as any).id}
                      onClick={(event) => handleTileClick(address)}
                      data-selected={(selectedAddress as any)?.id === (address as any).id ? 'true' : 'false'}
                      className={`propeller-address-selector__option cursor-pointer rounded-container transition-all ring-2 ${(selectedAddress as any)?.id === (address as any).id ? 'ring-primary' : 'ring-transparent hover:ring-primary/40'}`}
                    >
                      <AddressCard
                        address={address}
                        enableActions={false}
                        countries={props.countries}
                      />
                    </div>
                  ))}
                </div>{' '}
                <div className="propeller-address-selector__modal-actions flex justify-end mt-6 pt-4 border-t border-border-subtle">
                  <button
                    type="button"
                    className="propeller-address-selector__confirm-btn inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-control text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    disabled={!selectedAddress || isLoading}
                    onClick={(event) => handleConfirm()}
                  >
                    {isLoading ? (
                      <svg fill="none" viewBox="0 0 24 24" className="w-4 h-4 animate-spin">
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="opacity-25"
                        />
                        <path
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          className="opacity-75"
                        />
                      </svg>
                    ) : null}
                    {isLoading ? (
                      <>{getLabel('updating', 'Updating...')}</>
                    ) : (
                      <>{getLabel('useThisAddress', 'Use this address')}</>
                    )}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
export default AddressSelector;
