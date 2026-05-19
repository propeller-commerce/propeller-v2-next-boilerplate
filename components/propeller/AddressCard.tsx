'use client';
import * as React from 'react';

import { useState, useEffect } from 'react';
import { Address, CartAddress, Contact, Customer, Gender, GraphQLClient, OrderAddress, WarehouseAddress, YesNo } from 'propeller-sdk-v2';
import { useAddress } from '@/composables/react/useAddress';
import { useInfraProps } from '@/composables/react/useInfraProps';
import { getLabel } from '@/composables/shared/utils/labelHelpers';
import { getCountryName as _getCountryName } from '@/composables/shared/utils/countries';

export interface AddressCardProps {
  /** GraphQL client for the Propeller SDK (only needed when editing) */
  graphqlClient?: GraphQLClient;

  /** The address to display (Address | CartAddress | WarehouseAddress | OrderAddress) */
  address: Address | CartAddress | WarehouseAddress | OrderAddress | null;

  /** Display company name @default true */
  showCompanyName?: boolean;

  /** Display salutation (Mr./Mrs.) @default true */
  showSalutation?: boolean;

  /** Display full name @default true */
  showFullName?: boolean;

  /** Display street @default true */
  showStreet?: boolean;

  /** Display house number and extension @default true */
  showNumberExtension?: boolean;

  /** Display postal code @default true */
  showPostalCode?: boolean;

  /** Display city @default true */
  showCity?: boolean;

  /** Display country name @default true */
  showCountry?: boolean;

  /** Display email @default false */
  showEmail?: boolean;

  /** Display phone @default false */
  showPhone?: boolean;

  /** Display action buttons (edit, delete, set default) @default true */
  enableActions?: boolean;

  /** Display Edit button @default true */
  enableEdit?: boolean;

  /** Display Delete button @default true */
  enableDelete?: boolean;

  /** Display Set Default button @default true */
  enableSetDefault?: boolean;

  /** Display the "Default ... Address" badge @default false */
  showDefaultBadge?: boolean;

  /** Called when address is edited; receives the updated address object */
  onEdit?: (address: Address) => void | Promise<void>;

  /** Called after address edit completes */
  afterEdit?: (address: Address) => void | Promise<void>;

  /** Called when address is deleted; receives the address ID */
  onDelete?: (addressId: Address) => void;

  /** Called after address deletion completes */
  afterDelete?: (addressId: Address) => void;

  /** Called when address is set as default */
  onSetDefault?: (address: Address) => void;

  /** Called after address is set as default */
  afterSetDefault?: (address: Address) => void;

  /** List of countries for the country dropdown [{code: 'NL', name: 'Netherlands'}, ...] */
  countries?: {
    code: string;
    name: string;
  }[];

  /** When true, renders in "new address" mode: auto-opens the edit form, hides the card body */
  isNew?: boolean;

  /** Called when the form is cancelled in new mode */
  onCancel?: () => void;

  /** When true, renders the form inline instead of in a modal overlay. @default false */
  inline?: boolean;

  /** Address type for new addresses (e.g., 'DELIVERY', 'INVOICE'). Used when creating, not editing. */
  addressType?: string;

  /** Show ICP/ICS (intra-community supply) checkbox. @default false */
  showIcp?: boolean;

  /** Title for the form or section */
  title?: string;

  /** Labels for form fields and buttons */
  labels?: Record<string, string>;

  /** Called before save starts */
  beforeSave?: () => void;

  /** The authenticated user (needed by useAddress for SDK operations) */
  user?: Contact | Customer | null;
}

function AddressCard(rawProps: AddressCardProps) {
  // Explicit props win; otherwise infra is resolved from <PropellerProvider>.
  const props = useInfraProps(rawProps);
  // useAddress is used when graphqlClient + user are available for SDK-backed operations.
  // The component also supports callback-only mode (onEdit/onDelete props).
  const addressHook = props.graphqlClient && props.user
    ? useAddress({ graphqlClient: props.graphqlClient, user: props.user })
    : null;

  const [showEditModal, setShowEditModal] = useState(() => false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(() => false);
  const [saving, setSaving] = useState(() => false);
  const [localAddress, setLocalAddress] = useState<any>(() => null);
  const [editCompany, setEditCompany] = useState(() => '');
  const [editGender, setEditGender] = useState<Gender>(() => Gender.U);
  const [editFirstName, setEditFirstName] = useState(() => '');
  const [editMiddleName, setEditMiddleName] = useState(() => '');
  const [editLastName, setEditLastName] = useState(() => '');
  const [editStreet, setEditStreet] = useState(() => '');
  const [editNumber, setEditNumber] = useState(() => '');
  const [editNumberExtension, setEditNumberExtension] = useState(() => '');
  const [editPostalCode, setEditPostalCode] = useState(() => '');
  const [editCity, setEditCity] = useState(() => '');
  const [editCountry, setEditCountry] = useState(() => '');
  const [editEmail, setEditEmail] = useState(() => '');
  const [editPhone, setEditPhone] = useState(() => '');
  const [editNotes, setEditNotes] = useState(() => '');
  const [editIcp, setEditIcp] = useState<YesNo>(() => YesNo.N);

  const isSaving = addressHook ? addressHook.loading : saving;

  

  function getCountryName(code: string): string {
    return _getCountryName(code, props.countries);
  }

  function addr(): any {
    return localAddress || props.address;
  }

  function showCard(): boolean {
    if (props.isNew) return false;
    if (props.inline && !props.address) return false;
    return true;
  }

  function salutation(): string {
    const g = addr?.()?.gender;
    if (g === 'M') return 'Mr.';
    if (g === 'F') return 'Mrs.';
    return '';
  }

  function fullName(): string {
    const parts: string[] = [];
    if (props.showSalutation !== false && salutation()) {
      parts.push(salutation());
    }
    if (addr?.()?.firstName) parts.push(addr().firstName);
    if (addr?.()?.middleName) parts.push(addr().middleName);
    if (addr?.()?.lastName) parts.push(addr().lastName);
    return parts.join(' ');
  }

  function streetLine(): string {
    const parts: string[] = [];
    if (addr?.()?.street) parts.push(addr().street);
    if (props.showNumberExtension !== false) {
      if (addr?.()?.number) parts.push(addr().number);
      if (addr?.()?.numberExtension) parts.push(addr().numberExtension);
    }
    return parts.join(' ');
  }

  function cityLine(): string {
    const parts: string[] = [];
    if (props.showPostalCode !== false && addr?.()?.postalCode) {
      parts.push(addr().postalCode);
    }
    if (props.showCity !== false && addr?.()?.city) {
      parts.push(addr().city);
    }
    return parts.join(' ');
  }

  function formTitle(): string {
    if (props.title) return props.title;
    if (props.isNew) return getLabel(props.labels, 'newTitle', 'New Address');
    return getLabel(props.labels, 'editTitle', 'Edit Address');
  }

  function openEditModal() {
    const a = addr();
    setEditCompany(a?.company || '');
    setEditGender(a?.gender || 'M');
    setEditFirstName(a?.firstName || '');
    setEditMiddleName(a?.middleName || '');
    setEditLastName(a?.lastName || '');
    setEditStreet(a?.street || '');
    setEditNumber(a?.number || '');
    setEditNumberExtension(a?.numberExtension || '');
    setEditPostalCode(a?.postalCode || '');
    setEditCity(a?.city || '');
    setEditCountry(a?.country || '');
    setEditEmail(a?.email || '');
    setEditPhone(a?.phone || '');
    setEditNotes(a?.notes || '');
    setEditIcp(a?.icp || YesNo.N);
    setShowEditModal(true);
  }

  async function handleSaveEdit(e: any) {
    e.preventDefault();
    if (isSaving) return;
    if (props.beforeSave) {
      props.beforeSave();
    }
    const editedAddress = {
      id: addr?.()?.id,
      type: addr?.()?.type || props.addressType || '',
      isDefault: addr?.()?.isDefault,
      company: editCompany,
      gender: editGender,
      firstName: editFirstName,
      middleName: editMiddleName,
      lastName: editLastName,
      street: editStreet,
      number: editNumber,
      numberExtension: editNumberExtension,
      postalCode: editPostalCode,
      city: editCity,
      country: editCountry,
      email: editEmail,
      phone: editPhone,
      notes: editNotes,
      icp: editIcp as YesNo,
    } as unknown as Address;
    setLocalAddress(editedAddress);
    setSaving(true);
    try {
      if (props.onEdit) {
        await props.onEdit(editedAddress);
      } else if (addressHook && addr?.()?.id) {
        await addressHook.updateAddress(addr().id, editedAddress as any);
      }
      setShowEditModal(false);
      if (props.afterEdit) {
        await props.afterEdit(editedAddress);
      }
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    const id = addr?.()?.id;
    if (id != null) {
      if (props.onDelete) {
        props.onDelete(addr());
      } else if (addressHook) {
        addressHook.deleteAddress(id);
      }
      setShowDeleteConfirm(false);
      if (props.afterDelete) {
        props.afterDelete(addr());
      }
    } else {
      setShowDeleteConfirm(false);
    }
  }

  function handleSetDefault() {
    if (props.onSetDefault) {
      props.onSetDefault(addr());
    } else if (addressHook && addr?.()?.id) {
      addressHook.setDefaultAddress(addr().id);
    }
    if (props.afterSetDefault) {
      props.afterSetDefault(addr());
    }
  }

  function closeEditModal() {
    setShowEditModal(false);
    if (props.isNew && props.onCancel) {
      props.onCancel();
    }
  }

  useEffect(() => {
    if (props.isNew || (props.inline && !props.address)) {
      openEditModal();
    }
  }, []);

  useEffect(() => {
    setLocalAddress(null);
  }, [props.address]);

  return (
    <div className="propeller-address-card">
      {showCard() ? (
        <div
          className="propeller-address-card__card bg-card p-4 rounded-container shadow-sm border border-border h-full flex flex-col"
          data-default={addr?.()?.isDefault === 'Y' ? 'true' : 'false'}
          data-type={addr?.()?.type || ''}
        >
          <div className="propeller-address-card__body flex-grow">
            {props.showCompanyName !== false && addr?.()?.company ? (
              <div className="propeller-address-card__company font-bold text-lg mb-1">{addr?.()?.company}</div>
            ) : null}
            {props.showFullName !== false && fullName() ? (
              <div className="propeller-address-card__name font-medium mb-1">{fullName()}</div>
            ) : null}
            {props.showStreet !== false && streetLine() ? (
              <div className="propeller-address-card__street text-muted-foreground">{streetLine()}</div>
            ) : null}
            {cityLine() ? <div className="propeller-address-card__city text-muted-foreground">{cityLine()}</div> : null}
            {props.showCountry !== false && addr?.()?.country ? (
              <div className="propeller-address-card__country text-muted-foreground">{getCountryName(addr?.()?.country)}</div>
            ) : null}
            {!!props.showEmail && addr?.()?.email ? (
              <div className="propeller-address-card__email text-muted-foreground">{addr?.()?.email}</div>
            ) : null}
            {!!props.showPhone && addr?.()?.phone ? (
              <div className="propeller-address-card__phone text-muted-foreground">{addr?.()?.phone}</div>
            ) : null}
            {props.showDefaultBadge === true && addr?.()?.isDefault === 'Y' ? (
              <div className="mt-2">
                <span className="propeller-address-card__default-badge bg-secondary/10 text-secondary text-xs px-2 py-1 rounded-full">
                  Default {addr?.()?.type} Address
                </span>
              </div>
            ) : null}
          </div>
          {props.enableActions !== false ? (
            <div className="propeller-address-card__actions mt-4 pt-4 border-t border-border-subtle flex flex-wrap gap-2">
              {props.enableEdit !== false ? (
                <button
                  className="propeller-address-card__edit-btn text-primary hover:text-primary/80 text-sm font-medium"
                  onClick={(event) => openEditModal()}
                >
                  {getLabel(props.labels, 'edit', 'Edit')}
                </button>
              ) : null}
              {props.enableDelete !== false ? (
                <button
                  className="propeller-address-card__delete-btn text-muted-foreground hover:text-foreground text-sm font-medium"
                  onClick={(event) => {
                    setShowDeleteConfirm(true);
                  }}
                >
                  {getLabel(props.labels, 'delete', 'Delete')}
                </button>
              ) : null}
              {props.enableSetDefault !== false && addr?.()?.isDefault !== 'Y' ? (
                <button
                  className="propeller-address-card__default-btn text-primary hover:text-primary/80 text-sm font-medium ml-auto"
                  onClick={(event) => handleSetDefault()}
                >
                  {getLabel(props.labels, 'setDefault', 'Set Default')}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {props.inline && showEditModal ? (
        <div className="propeller-address-card__form bg-card p-6 rounded-container border border-border">
          <form onSubmit={(e) => handleSaveEdit(e)}>
            {!!formTitle() ? <h3 className="text-xl font-bold mb-4">{formTitle()}</h3> : null}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel(props.labels, 'gender', 'Gender')}
                  </label>
                  <select
                    className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input bg-card"
                    value={editGender}
                    onChange={(e) => {
                      setEditGender(e.target.value as Gender);
                    }}
                  >
                    <option value="M">{getLabel(props.labels, 'genderMale', 'Male')}</option>
                    <option value="F">{getLabel(props.labels, 'genderFemale', 'Female')}</option>
                    <option value="U">{getLabel(props.labels, 'genderOther', 'Other')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel(props.labels, 'company', 'Company')}
                  </label>
                  <input
                    type="text"
                    className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                    value={editCompany}
                    onChange={(e) => {
                      setEditCompany(e.target.value);
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel(props.labels, 'firstName', 'First Name')} *
                  </label>
                  <input
                    type="text"
                    className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                    value={editFirstName}
                    onChange={(e) => {
                      setEditFirstName(e.target.value);
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel(props.labels, 'middleName', 'Middle Name')}
                  </label>
                  <input
                    type="text"
                    className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                    value={editMiddleName}
                    onChange={(e) => {
                      setEditMiddleName(e.target.value);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel(props.labels, 'lastName', 'Last Name')} *
                  </label>
                  <input
                    type="text"
                    className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                    value={editLastName}
                    onChange={(e) => {
                      setEditLastName(e.target.value);
                    }}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-8">
                  <label className="block text-sm font-medium mb-1">
                    {getLabel(props.labels, 'street', 'Street')} *
                  </label>
                  <input
                    type="text"
                    className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                    value={editStreet}
                    onChange={(e) => {
                      setEditStreet(e.target.value);
                    }}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    {getLabel(props.labels, 'number', 'Number')} *
                  </label>
                  <input
                    type="text"
                    className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                    value={editNumber}
                    onChange={(e) => {
                      setEditNumber(e.target.value);
                    }}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    {getLabel(props.labels, 'numberExtension', 'Ext')}
                  </label>
                  <input
                    type="text"
                    className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                    value={editNumberExtension}
                    onChange={(e) => {
                      setEditNumberExtension(e.target.value);
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel(props.labels, 'postalCode', 'Postal Code')} *
                  </label>
                  <input
                    type="text"
                    className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                    value={editPostalCode}
                    onChange={(e) => {
                      setEditPostalCode(e.target.value);
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel(props.labels, 'city', 'City')} *
                  </label>
                  <input
                    type="text"
                    className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                    value={editCity}
                    onChange={(e) => {
                      setEditCity(e.target.value);
                    }}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {getLabel(props.labels, 'country', 'Country')} *
                </label>
                <select
                  className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input bg-card"
                  value={editCountry}
                  onChange={(e) => {
                    setEditCountry(e.target.value);
                  }}
                  required
                >
                  <option value="">{getLabel(props.labels, 'selectCountry', 'Select country')}</option>
                  {(props.countries || []).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel(props.labels, 'email', 'Email')} *
                  </label>
                  <input
                    type="email"
                    className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                    value={editEmail}
                    onChange={(e) => {
                      setEditEmail(e.target.value);
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel(props.labels, 'phone', 'Phone')}
                  </label>
                  <input
                    type="tel"
                    className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                    value={editPhone}
                    onChange={(e) => {
                      setEditPhone(e.target.value);
                    }}
                  />
                </div>
              </div>
              {!!props.showIcp ? (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="icp-inline"
                    className="propeller-address-card__checkbox h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    checked={editIcp === YesNo.Y}
                    onChange={(e) => {
                      setEditIcp(e.target.checked ? YesNo.Y : YesNo.N);
                    }}
                  />
                  <label htmlFor="icp-inline" className="text-sm font-medium">
                    {getLabel(props.labels, 'icp', 'ICP/ICS (Intra-Community Supply)')}
                  </label>
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
              {!props.isNew ? (
                <button
                  type="button"
                  className="propeller-address-card__cancel-btn px-4 py-2 border border-border rounded-control hover:bg-surface-hover disabled:opacity-50"
                  onClick={(event) => closeEditModal()}
                  disabled={isSaving}
                >
                  {getLabel(props.labels, 'cancel', 'Cancel')}
                </button>
              ) : null}
              {props.isNew && !!props.onCancel ? (
                <button
                  type="button"
                  className="propeller-address-card__cancel-btn px-4 py-2 border border-border rounded-control hover:bg-surface-hover disabled:opacity-50"
                  onClick={(event) => closeEditModal()}
                  disabled={isSaving}
                >
                  {getLabel(props.labels, 'cancel', 'Cancel')}
                </button>
              ) : null}
              <button
                type="submit"
                className="propeller-address-card__submit-btn px-4 py-2 bg-primary text-primary-foreground rounded-control hover:bg-primary/90 disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? <>{getLabel(props.labels, 'saving', 'Saving...')}</> : <>{getLabel(props.labels, 'save', 'Save')}</>}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {!props.inline && showEditModal ? (
        <div className="propeller-address-card__modal fixed inset-0 bg-foreground/50 flex items-center justify-center z-50 overflow-y-auto py-10">
          <div className="propeller-address-card__modal-content bg-card p-6 rounded-container max-w-2xl w-full mx-4 shadow-xl">
            <form onSubmit={(e) => handleSaveEdit(e)}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{formTitle()}</h3>
                <button
                  type="button"
                  className="propeller-address-card__modal-close text-muted-foreground hover:text-foreground text-xl leading-none"
                  onClick={(event) => closeEditModal()}
                >
                  &times;
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel(props.labels, 'gender', 'Gender')}
                    </label>
                    <select
                      className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input bg-card"
                      value={editGender}
                      onChange={(e) => {
                        setEditGender(e.target.value as Gender);
                      }}
                    >
                      <option value="M">{getLabel(props.labels, 'genderMale', 'Male')}</option>
                      <option value="F">{getLabel(props.labels, 'genderFemale', 'Female')}</option>
                      <option value="U">{getLabel(props.labels, 'genderOther', 'Other')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel(props.labels, 'company', 'Company')}
                    </label>
                    <input
                      type="text"
                      className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                      value={editCompany}
                      onChange={(e) => {
                        setEditCompany(e.target.value);
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel(props.labels, 'firstName', 'First Name')} *
                    </label>
                    <input
                      type="text"
                      className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                      value={editFirstName}
                      onChange={(e) => {
                        setEditFirstName(e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel(props.labels, 'middleName', 'Middle Name')}
                    </label>
                    <input
                      type="text"
                      className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                      value={editMiddleName}
                      onChange={(e) => {
                        setEditMiddleName(e.target.value);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel(props.labels, 'lastName', 'Last Name')} *
                    </label>
                    <input
                      type="text"
                      className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                      value={editLastName}
                      onChange={(e) => {
                        setEditLastName(e.target.value);
                      }}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-8">
                    <label className="block text-sm font-medium mb-1">
                      {getLabel(props.labels, 'street', 'Street')} *
                    </label>
                    <input
                      type="text"
                      className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                      value={editStreet}
                      onChange={(e) => {
                        setEditStreet(e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      {getLabel(props.labels, 'number', 'Number')} *
                    </label>
                    <input
                      type="text"
                      className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                      value={editNumber}
                      onChange={(e) => {
                        setEditNumber(e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      {getLabel(props.labels, 'numberExtension', 'Ext')}
                    </label>
                    <input
                      type="text"
                      className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                      value={editNumberExtension}
                      onChange={(e) => {
                        setEditNumberExtension(e.target.value);
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel(props.labels, 'postalCode', 'Postal Code')} *
                    </label>
                    <input
                      type="text"
                      className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                      value={editPostalCode}
                      onChange={(e) => {
                        setEditPostalCode(e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel(props.labels, 'city', 'City')} *
                    </label>
                    <input
                      type="text"
                      className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                      value={editCity}
                      onChange={(e) => {
                        setEditCity(e.target.value);
                      }}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel(props.labels, 'country', 'Country')} *
                  </label>
                  <select
                    className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input bg-card"
                    value={editCountry}
                    onChange={(e) => {
                      setEditCountry(e.target.value);
                    }}
                    required
                  >
                    <option value="">{getLabel(props.labels, 'selectCountry', 'Select country')}</option>
                    {(props.countries || []).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel(props.labels, 'email', 'Email')} *
                    </label>
                    <input
                      type="email"
                      className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                      value={editEmail}
                      onChange={(e) => {
                        setEditEmail(e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel(props.labels, 'phone', 'Phone')}
                    </label>
                    <input
                      type="tel"
                      className="propeller-address-card__input w-full h-10 px-3 rounded-control border border-input"
                      value={editPhone}
                      onChange={(e) => {
                        setEditPhone(e.target.value);
                      }}
                    />
                  </div>
                </div>
                {!!props.showIcp ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="icp-modal"
                      className="propeller-address-card__checkbox h-4 w-4 rounded border-input text-primary focus:ring-primary"
                      checked={editIcp === YesNo.Y}
                      onChange={(e) => {
                        setEditIcp(e.target.checked ? YesNo.Y : YesNo.N);
                      }}
                    />
                    <label htmlFor="icp-modal" className="text-sm font-medium">
                      {getLabel(props.labels, 'icp', 'ICP/ICS (Intra-Community Supply)')}
                    </label>
                  </div>
                ) : null}
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                <button
                  type="button"
                  className="propeller-address-card__cancel-btn px-4 py-2 border border-border rounded-control hover:bg-surface-hover disabled:opacity-50"
                  onClick={(event) => closeEditModal()}
                  disabled={isSaving}
                >
                  {getLabel(props.labels, 'cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="propeller-address-card__submit-btn px-4 py-2 bg-primary text-primary-foreground rounded-control hover:bg-primary/90 disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>{getLabel(props.labels, 'saving', 'Saving...')}</>
                  ) : (
                    <>{getLabel(props.labels, 'save', 'Save')}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {showDeleteConfirm ? (
        <div className="propeller-address-card__delete-modal fixed inset-0 bg-foreground/50 flex items-center justify-center z-50">
          <div className="propeller-address-card__delete-modal-content bg-card p-6 rounded-container max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-4">
              {getLabel(props.labels, 'confirmDeleteTitle', 'Confirm Delete')}
            </h3>
            <p className="propeller-address-card__delete-message mb-6 text-muted-foreground">
              {getLabel(props.labels, 'confirmDeleteMessage', 'Are you sure you want to delete this address?')}
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="propeller-address-card__cancel-btn px-4 py-2 border border-border rounded-control hover:bg-surface-hover"
                onClick={(event) => {
                  setShowDeleteConfirm(false);
                }}
              >
                {getLabel(props.labels, 'cancel', 'Cancel')}
              </button>
              <button
                className="propeller-address-card__confirm-btn px-4 py-2 bg-primary text-primary-foreground rounded-control hover:bg-primary/80"
                onClick={(event) => confirmDelete()}
              >
                {getLabel(props.labels, 'delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AddressCard;
