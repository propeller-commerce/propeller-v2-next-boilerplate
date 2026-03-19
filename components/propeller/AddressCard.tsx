'use client';

import {
  Address,
  CartAddress,
  Enums,
  GraphQLClient,
  OrderAddress,
  WarehouseAddress,
} from 'propeller-sdk-v2';
import { useEffect, useState } from 'react';

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
}
interface AddressCardState {
  showEditModal: boolean;
  showDeleteConfirm: boolean;
  localAddress: any;
  editCompany: string;
  editGender: Enums.Gender;
  editFirstName: string;
  editMiddleName: string;
  editLastName: string;
  editStreet: string;
  editNumber: string;
  editNumberExtension: string;
  editPostalCode: string;
  editCity: string;
  editCountry: string;
  editEmail: string;
  editPhone: string;
  editNotes: string;
  editIcp: Enums.YesNo | boolean;
  getLabel: (key: string, fallback: string) => string;
  getCountryName: (code: string) => string;
  addr: () => any;
  showCard: () => boolean;
  salutation: () => string;
  fullName: () => string;
  streetLine: () => string;
  cityLine: () => string;
  formTitle: () => string;
  openEditModal: () => void;
  handleSaveEdit: (e: any) => Promise<void>;
  confirmDelete: () => void;
  handleSetDefault: () => void;
  closeEditModal: () => void;
}

function AddressCard(props: AddressCardProps) {
  const [showEditModal, setShowEditModal] = useState<AddressCardState['showEditModal']>(
    () => false
  );

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<AddressCardState['showDeleteConfirm']>(
    () => false
  );

  const [localAddress, setLocalAddress] = useState<AddressCardState['localAddress']>(() => null);

  const [editCompany, setEditCompany] = useState<AddressCardState['editCompany']>(() => '');

  const [editGender, setEditGender] = useState<AddressCardState['editGender']>(
    () => Enums.Gender.U
  );

  const [editFirstName, setEditFirstName] = useState<AddressCardState['editFirstName']>(() => '');

  const [editMiddleName, setEditMiddleName] = useState<AddressCardState['editMiddleName']>(
    () => ''
  );

  const [editLastName, setEditLastName] = useState<AddressCardState['editLastName']>(() => '');

  const [editStreet, setEditStreet] = useState<AddressCardState['editStreet']>(() => '');

  const [editNumber, setEditNumber] = useState<AddressCardState['editNumber']>(() => '');

  const [editNumberExtension, setEditNumberExtension] = useState<
    AddressCardState['editNumberExtension']
  >(() => '');

  const [editPostalCode, setEditPostalCode] = useState<AddressCardState['editPostalCode']>(
    () => ''
  );

  const [editCity, setEditCity] = useState<AddressCardState['editCity']>(() => '');

  const [editCountry, setEditCountry] = useState<AddressCardState['editCountry']>(() => '');

  const [editEmail, setEditEmail] = useState<AddressCardState['editEmail']>(() => '');

  const [editPhone, setEditPhone] = useState<AddressCardState['editPhone']>(() => '');

  const [editNotes, setEditNotes] = useState<AddressCardState['editNotes']>(() => '');

  const [editIcp, setEditIcp] = useState<AddressCardState['editIcp']>(() => Enums.YesNo.N);

  function getLabel(key: string, fallback: string): ReturnType<AddressCardState['getLabel']> {
    return (props.labels as any)?.[key] || fallback;
  }

  function getCountryName(code: string): ReturnType<AddressCardState['getCountryName']> {
    if (!code) return '';
    const list = props.countries || [];
    for (let i = 0; i < list.length; i++) {
      if (list[i].code === code) return list[i].name;
    }
    return code;
  }

  function addr(): ReturnType<AddressCardState['addr']> {
    return localAddress || props.address;
  }

  function showCard(): ReturnType<AddressCardState['showCard']> {
    if (props.isNew) return false;
    if (props.inline && !props.address) return false;
    return true;
  }

  function salutation(): ReturnType<AddressCardState['salutation']> {
    const g = addr?.()?.gender;
    if (g === 'M') return 'Mr.';
    if (g === 'F') return 'Mrs.';
    return '';
  }

  function fullName(): ReturnType<AddressCardState['fullName']> {
    const parts: string[] = [];
    if (props.showSalutation !== false && salutation()) {
      parts.push(salutation());
    }
    if (addr?.()?.firstName) parts.push(addr().firstName);
    if (addr?.()?.middleName) parts.push(addr().middleName);
    if (addr?.()?.lastName) parts.push(addr().lastName);
    return parts.join(' ');
  }

  function streetLine(): ReturnType<AddressCardState['streetLine']> {
    const parts: string[] = [];
    if (addr?.()?.street) parts.push(addr().street);
    if (props.showNumberExtension !== false) {
      if (addr?.()?.number) parts.push(addr().number);
      if (addr?.()?.numberExtension) parts.push(addr().numberExtension);
    }
    return parts.join(' ');
  }

  function cityLine(): ReturnType<AddressCardState['cityLine']> {
    const parts: string[] = [];
    if (props.showPostalCode !== false && addr?.()?.postalCode) {
      parts.push(addr().postalCode);
    }
    if (props.showCity !== false && addr?.()?.city) {
      parts.push(addr().city);
    }
    return parts.join(' ');
  }

  function formTitle(): ReturnType<AddressCardState['formTitle']> {
    if (props.title) return props.title;
    if (props.isNew) return getLabel('newTitle', 'New Address');
    return getLabel('editTitle', 'Edit Address');
  }

  function openEditModal(): ReturnType<AddressCardState['openEditModal']> {
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
    setEditIcp(a?.icp || false);
    setShowEditModal(true);
  }

  async function handleSaveEdit(e: any): ReturnType<AddressCardState['handleSaveEdit']> {
    e.preventDefault();
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
      icp: editIcp as Enums.YesNo,
    } as unknown as Address;
    setLocalAddress(editedAddress);
    if (props.onEdit) {
      await props.onEdit(editedAddress);
    }
    setShowEditModal(false);
    if (props.afterEdit) {
      await props.afterEdit(editedAddress);
    }
  }

  function confirmDelete(): ReturnType<AddressCardState['confirmDelete']> {
    const id = addr?.()?.id;
    if (id != null) {
      if (props.onDelete) {
        props.onDelete(addr());
      }
      setShowDeleteConfirm(false);
      if (props.afterDelete) {
        props.afterDelete(addr());
      }
    } else {
      setShowDeleteConfirm(false);
    }
  }

  function handleSetDefault(): ReturnType<AddressCardState['handleSetDefault']> {
    if (props.onSetDefault) {
      props.onSetDefault(addr());
    }
    if (props.afterSetDefault) {
      props.afterSetDefault(addr());
    }
  }

  function closeEditModal(): ReturnType<AddressCardState['closeEditModal']> {
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

  return (
    <div>
      {showCard() ? (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
          <div className="flex-grow">
            {props.showCompanyName !== false && addr?.()?.company ? (
              <div className="font-bold text-lg mb-1">{addr?.()?.company}</div>
            ) : null}
            {props.showFullName !== false && fullName() ? (
              <div className="font-medium mb-1">{fullName()}</div>
            ) : null}
            {props.showStreet !== false && streetLine() ? (
              <div className="text-gray-600">{streetLine()}</div>
            ) : null}
            {cityLine() ? <div className="text-gray-600">{cityLine()}</div> : null}
            {props.showCountry !== false && addr?.()?.country ? (
              <div className="text-gray-600">{getCountryName(addr?.()?.country)}</div>
            ) : null}
            {!!props.showEmail && addr?.()?.email ? (
              <div className="text-gray-600">{addr?.()?.email}</div>
            ) : null}
            {!!props.showPhone && addr?.()?.phone ? (
              <div className="text-gray-600">{addr?.()?.phone}</div>
            ) : null}
            {addr?.()?.isDefault === 'Y' ? (
              <div className="mt-2">
                <span className="bg-violet-100 text-violet-800 text-xs px-2 py-1 rounded-full">
                  Default {addr?.()?.type} Address
                </span>
              </div>
            ) : null}
          </div>
          {props.enableActions !== false ? (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">
              {props.enableEdit !== false ? (
                <button
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  onClick={(event) => openEditModal()}
                >
                  {getLabel('edit', 'Edit')}
                </button>
              ) : null}
              {props.enableDelete !== false ? (
                <button
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                  onClick={(event) => {
                    setShowDeleteConfirm(true);
                  }}
                >
                  {getLabel('delete', 'Delete')}
                </button>
              ) : null}
              {props.enableSetDefault !== false && addr?.()?.isDefault !== 'Y' ? (
                <button
                  className="text-yellow-600 hover:text-yellow-800 text-sm font-medium ml-auto"
                  onClick={(event) => handleSetDefault()}
                >
                  {getLabel('setDefault', 'Set Default')}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {props.inline && showEditModal ? (
        <div className="bg-white p-6 rounded-lg border">
          <form onSubmit={(e) => handleSaveEdit(e)}>
            {!!formTitle() ? <h3 className="text-xl font-bold mb-4">{formTitle()}</h3> : null}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel('gender', 'Gender')}
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
                    value={editGender}
                    onChange={(e) => {
                      setEditGender(e.target.value as Enums.Gender);
                    }}
                  >
                    <option value="M">{getLabel('genderMale', 'Male')}</option>
                    <option value="F">{getLabel('genderFemale', 'Female')}</option>
                    <option value="U">{getLabel('genderOther', 'Other')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel('company', 'Company')}
                  </label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 rounded-md border border-gray-300"
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
                    {getLabel('firstName', 'First Name')} *
                  </label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 rounded-md border border-gray-300"
                    value={editFirstName}
                    onChange={(e) => {
                      setEditFirstName(e.target.value);
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel('middleName', 'Middle Name')}
                  </label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 rounded-md border border-gray-300"
                    value={editMiddleName}
                    onChange={(e) => {
                      setEditMiddleName(e.target.value);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel('lastName', 'Last Name')} *
                  </label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 rounded-md border border-gray-300"
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
                    {getLabel('street', 'Street')} *
                  </label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 rounded-md border border-gray-300"
                    value={editStreet}
                    onChange={(e) => {
                      setEditStreet(e.target.value);
                    }}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    {getLabel('number', 'Number')} *
                  </label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 rounded-md border border-gray-300"
                    value={editNumber}
                    onChange={(e) => {
                      setEditNumber(e.target.value);
                    }}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    {getLabel('numberExtension', 'Ext')}
                  </label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 rounded-md border border-gray-300"
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
                    {getLabel('postalCode', 'Postal Code')} *
                  </label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 rounded-md border border-gray-300"
                    value={editPostalCode}
                    onChange={(e) => {
                      setEditPostalCode(e.target.value);
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel('city', 'City')} *
                  </label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 rounded-md border border-gray-300"
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
                  {getLabel('country', 'Country')} *
                </label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
                  value={editCountry}
                  onChange={(e) => {
                    setEditCountry(e.target.value);
                  }}
                  required
                >
                  <option value="">{getLabel('selectCountry', 'Select country')}</option>
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
                    {getLabel('email', 'Email')} *
                  </label>
                  <input
                    type="email"
                    className="w-full h-10 px-3 rounded-md border border-gray-300"
                    value={editEmail}
                    onChange={(e) => {
                      setEditEmail(e.target.value);
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {getLabel('phone', 'Phone')}
                  </label>
                  <input
                    type="tel"
                    className="w-full h-10 px-3 rounded-md border border-gray-300"
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
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={!!editIcp}
                    onChange={(e) => {
                      setEditIcp(e.target.checked);
                    }}
                  />
                  <label htmlFor="icp-inline" className="text-sm font-medium">
                    {getLabel('icp', 'ICP/ICS (Intra-Community Supply)')}
                  </label>
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
              {!props.isNew ? (
                <button
                  type="button"
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                  onClick={(event) => closeEditModal()}
                >
                  {getLabel('cancel', 'Cancel')}
                </button>
              ) : null}
              {props.isNew && !!props.onCancel ? (
                <button
                  type="button"
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                  onClick={(event) => closeEditModal()}
                >
                  {getLabel('cancel', 'Cancel')}
                </button>
              ) : null}
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {getLabel('save', 'Save')}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {!props.inline && showEditModal ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-10">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 shadow-xl">
            <form onSubmit={(e) => handleSaveEdit(e)}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{formTitle()}</h3>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                  onClick={(event) => closeEditModal()}
                >
                  &times;
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel('gender', 'Gender')}
                    </label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
                      value={editGender}
                      onChange={(e) => {
                        setEditGender(e.target.value as Enums.Gender);
                      }}
                    >
                      <option value="M">{getLabel('genderMale', 'Male')}</option>
                      <option value="F">{getLabel('genderFemale', 'Female')}</option>
                      <option value="U">{getLabel('genderOther', 'Other')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel('company', 'Company')}
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 rounded-md border border-gray-300"
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
                      {getLabel('firstName', 'First Name')} *
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 rounded-md border border-gray-300"
                      value={editFirstName}
                      onChange={(e) => {
                        setEditFirstName(e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel('middleName', 'Middle Name')}
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 rounded-md border border-gray-300"
                      value={editMiddleName}
                      onChange={(e) => {
                        setEditMiddleName(e.target.value);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel('lastName', 'Last Name')} *
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 rounded-md border border-gray-300"
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
                      {getLabel('street', 'Street')} *
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 rounded-md border border-gray-300"
                      value={editStreet}
                      onChange={(e) => {
                        setEditStreet(e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      {getLabel('number', 'Number')} *
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 rounded-md border border-gray-300"
                      value={editNumber}
                      onChange={(e) => {
                        setEditNumber(e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">
                      {getLabel('numberExtension', 'Ext')}
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 rounded-md border border-gray-300"
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
                      {getLabel('postalCode', 'Postal Code')} *
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 rounded-md border border-gray-300"
                      value={editPostalCode}
                      onChange={(e) => {
                        setEditPostalCode(e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel('city', 'City')} *
                    </label>
                    <input
                      type="text"
                      className="w-full h-10 px-3 rounded-md border border-gray-300"
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
                    {getLabel('country', 'Country')} *
                  </label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"
                    value={editCountry}
                    onChange={(e) => {
                      setEditCountry(e.target.value);
                    }}
                    required
                  >
                    <option value="">{getLabel('selectCountry', 'Select country')}</option>
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
                      {getLabel('email', 'Email')} *
                    </label>
                    <input
                      type="email"
                      className="w-full h-10 px-3 rounded-md border border-gray-300"
                      value={editEmail}
                      onChange={(e) => {
                        setEditEmail(e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {getLabel('phone', 'Phone')}
                    </label>
                    <input
                      type="tel"
                      className="w-full h-10 px-3 rounded-md border border-gray-300"
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
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={!!editIcp}
                      onChange={(e) => {
                        setEditIcp(e.target.checked);
                      }}
                    />
                    <label htmlFor="icp-modal" className="text-sm font-medium">
                      {getLabel('icp', 'ICP/ICS (Intra-Community Supply)')}
                    </label>
                  </div>
                ) : null}
              </div>
              <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
                <button
                  type="button"
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                  onClick={(event) => closeEditModal()}
                >
                  {getLabel('cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {getLabel('save', 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {showDeleteConfirm ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-4">
              {getLabel('confirmDeleteTitle', 'Confirm Delete')}
            </h3>
            <p className="mb-6 text-gray-600">
              {getLabel('confirmDeleteMessage', 'Are you sure you want to delete this address?')}
            </p>
            <div className="flex justify-end gap-4">
              <button
                className="px-4 py-2 border rounded hover:bg-gray-100"
                onClick={(event) => {
                  setShowDeleteConfirm(false);
                }}
              >
                {getLabel('cancel', 'Cancel')}
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={(event) => confirmDelete()}
              >
                {getLabel('delete', 'Delete')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AddressCard;
