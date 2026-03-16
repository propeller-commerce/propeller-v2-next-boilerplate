'use client';
import * as React from 'react';

import { useState, useEffect } from 'react'
  import  { GraphQLClient } from 'propeller-sdk-v2';



  export interface AddressCardProps {
/** GraphQL client for the Propeller SDK (only needed when editing) */
graphqlClient?: GraphQLClient;

/** The address to display (Address | CartAddress | WarehouseAddress | ExternalAddress) */
address: any;

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

/** Display action buttons (edit, delete, set default) @default true */
enableActions?: boolean;

/** Display Edit button @default true */
enableEdit?: boolean;

/** Display Delete button @default true */
enableDelete?: boolean;

/** Display Set Default button @default true */
enableSetDefault?: boolean;

/** Called when address is edited; receives the updated address object */
onEdit?: (address: any) => void | Promise<void>;

/** Called after address edit completes */
afterEdit?: (address: any) => void | Promise<void>;

/** Called when address is deleted; receives the address ID */
onDelete?: (addressId: number) => void;

/** Called after address deletion completes */
afterDelete?: (addressId: number) => void;

/** Called when address is set as default */
onSetDefault?: (address: any) => void;

/** Called after address is set as default */
afterSetDefault?: (address: any) => void;

/** List of countries for the country dropdown [{code: 'NL', name: 'Netherlands'}, ...] */
countries?: {
  code: string;
  name: string;
}[];

/** When true, renders in "new address" mode: auto-opens the edit modal, hides the card body */
isNew?: boolean;

/** Called when the modal is cancelled in new mode */
onCancel?: () => void;
}




  function AddressCard(props:AddressCardProps) {

  const [_showEditModal, set_showEditModal] = useState(() => (false))


const [_showDeleteConfirm, set_showDeleteConfirm] = useState(() => (false))


const [_localAddress, set_localAddress] = useState(() => (null))


const [_editCompany, set_editCompany] = useState(() => (''))


const [_editGender, set_editGender] = useState(() => (''))


const [_editFirstName, set_editFirstName] = useState(() => (''))


const [_editMiddleName, set_editMiddleName] = useState(() => (''))


const [_editLastName, set_editLastName] = useState(() => (''))


const [_editStreet, set_editStreet] = useState(() => (''))


const [_editNumber, set_editNumber] = useState(() => (''))


const [_editNumberExtension, set_editNumberExtension] = useState(() => (''))


const [_editPostalCode, set_editPostalCode] = useState(() => (''))


const [_editCity, set_editCity] = useState(() => (''))


const [_editCountry, set_editCountry] = useState(() => (''))


const [_editEmail, set_editEmail] = useState(() => (''))


const [_editPhone, set_editPhone] = useState(() => (''))


const [_editNotes, set_editNotes] = useState(() => (''))


function addr() {
return _localAddress || props.address;
}


function salutation() {
const g = addr?.()?.gender;
if (g === 'M') return 'Mr.';
if (g === 'F') return 'Mrs.';
return '';
}


function fullName() {
const parts: string[] = [];
if (props.showSalutation !== false && salutation()) {
parts.push(salutation());
}
if (addr?.()?.firstName) parts.push(addr().firstName);
if (addr?.()?.middleName) parts.push(addr().middleName);
if (addr?.()?.lastName) parts.push(addr().lastName);
return parts.join(' ');
}


function streetLine() {
const parts: string[] = [];
if (addr?.()?.street) parts.push(addr().street);
if (props.showNumberExtension !== false) {
if (addr?.()?.number) parts.push(addr().number);
if (addr?.()?.numberExtension) parts.push(addr().numberExtension);
}
return parts.join(' ');
}


function cityLine() {
const parts: string[] = [];
if (props.showPostalCode !== false && addr?.()?.postalCode) {
parts.push(addr().postalCode);
}
if (props.showCity !== false && addr?.()?.city) {
parts.push(addr().city);
}
return parts.join(' ');
}


function openEditModal() {
const a = addr();
set_editCompany(a?.company || '');
set_editGender(a?.gender || 'M');
set_editFirstName(a?.firstName || '');
set_editMiddleName(a?.middleName || '');
set_editLastName(a?.lastName || '');
set_editStreet(a?.street || '');
set_editNumber(a?.number || '');
set_editNumberExtension(a?.numberExtension || '');
set_editPostalCode(a?.postalCode || '');
set_editCity(a?.city || '');
set_editCountry(a?.country || '');
set_editEmail(a?.email || '');
set_editPhone(a?.phone || '');
set_editNotes(a?.notes || '');
set_showEditModal(true);
}


async function handleSaveEdit(e: any) {
e.preventDefault();
const editedAddress = {
id: addr?.()?.id,
type: addr?.()?.type,
isDefault: addr?.()?.isDefault,
company: _editCompany,
gender: _editGender,
firstName: _editFirstName,
middleName: _editMiddleName,
lastName: _editLastName,
street: _editStreet,
number: _editNumber,
numberExtension: _editNumberExtension,
postalCode: _editPostalCode,
city: _editCity,
country: _editCountry,
email: _editEmail,
phone: _editPhone,
notes: _editNotes
};
set_localAddress(editedAddress);
if (props.onEdit) {
await props.onEdit(editedAddress);
}
set_showEditModal(false);
if (props.afterEdit) {
await props.afterEdit(editedAddress);
}
}


function confirmDelete() {
const id = addr?.()?.id;
if (id != null) {
if (props.onDelete) {
  props.onDelete(Number(id));
}
set_showDeleteConfirm(false);
if (props.afterDelete) {
  props.afterDelete(Number(id));
}
} else {
set_showDeleteConfirm(false);
}
}


function handleSetDefault() {
if (props.onSetDefault) {
props.onSetDefault(addr());
}
if (props.afterSetDefault) {
props.afterSetDefault(addr());
}
}


function closeEditModal() {
set_showEditModal(false);
if (props.isNew && props.onCancel) {
props.onCancel();
}
}







useEffect(() => {
      if (props.isNew) {
openEditModal();
}
    }, [])



return (


  <div>{!props.isNew ? (
  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 h-full flex flex-col"><div className="flex-grow">{props.showCompanyName !== false && addr?.()?.company ? (
  <div className="font-bold text-lg mb-1">{addr?.()?.company}</div>
) : null}{props.showFullName !== false && fullName() ? (
  <div className="font-medium mb-1">{fullName()}</div>
) : null}{props.showStreet !== false && streetLine() ? (
  <div className="text-gray-600">{streetLine()}</div>
) : null}{cityLine() ? (
  <div className="text-gray-600">{cityLine()}</div>
) : null}{props.showCountry !== false && addr?.()?.country ? (
  <div className="text-gray-600">{addr?.()?.country}</div>
) : null}{addr?.()?.isDefault === 'Y' ? (
  <div className="mt-2"><span className="bg-violet-100 text-violet-800 text-xs px-2 py-1 rounded-full">
                            Default {addr?.()?.type} Address
                        </span></div>
) : null}</div>{props.enableActions !== false ? (
  <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2">{props.enableEdit !== false ? (
  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium"  onClick={(event) => openEditModal() }>
                            Edit
                        </button>
) : null}{props.enableDelete !== false ? (
  <button className="text-red-600 hover:text-red-800 text-sm font-medium"  onClick={(event) => {
set_showDeleteConfirm(true);
} }>
                            Delete
                        </button>
) : null}{props.enableSetDefault !== false && addr?.()?.isDefault !== 'Y' ? (
  <button className="text-yellow-600 hover:text-yellow-800 text-sm font-medium ml-auto"  onClick={(event) => handleSetDefault() }>
                            Set Default
                        </button>
) : null}</div>
) : null}</div>
) : null}{_showEditModal ? (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-10"><div className="bg-white p-6 rounded-lg max-w-2xl w-full mx-4 shadow-xl"><form  onSubmit={(e) => handleSaveEdit(e) }><div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold">{props.isNew ? (
  <>New Address</>
) : <>Edit Address</>}</h3><button  type="button" className="text-gray-500 hover:text-gray-700 text-xl leading-none"  onClick={(event) => closeEditModal() }>
                                &times;
                            </button></div><div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Gender</label><select className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"  value={_editGender}  onChange={(e) => {
set_editGender(e.target.value);
} }><option  value="M">Male</option><option  value="F">Female</option><option  value="U">Other</option></select></div><div><label className="block text-sm font-medium mb-1">Company</label><input  type="text" className="w-full h-10 px-3 rounded-md border border-gray-300"  value={_editCompany}  onChange={(e) => {
set_editCompany(e.target.value);
} }  /></div></div><div className="grid grid-cols-3 gap-4"><div><label className="block text-sm font-medium mb-1">First Name *</label><input  type="text" className="w-full h-10 px-3 rounded-md border border-gray-300"  value={_editFirstName}  onChange={(e) => {
set_editFirstName(e.target.value);
} }  required  /></div><div><label className="block text-sm font-medium mb-1">Middle Name</label><input  type="text" className="w-full h-10 px-3 rounded-md border border-gray-300"  value={_editMiddleName}  onChange={(e) => {
set_editMiddleName(e.target.value);
} }  /></div><div><label className="block text-sm font-medium mb-1">Last Name *</label><input  type="text" className="w-full h-10 px-3 rounded-md border border-gray-300"  value={_editLastName}  onChange={(e) => {
set_editLastName(e.target.value);
} }  required  /></div></div><div className="grid grid-cols-12 gap-4"><div className="col-span-8"><label className="block text-sm font-medium mb-1">Street *</label><input  type="text" className="w-full h-10 px-3 rounded-md border border-gray-300"  value={_editStreet}  onChange={(e) => {
set_editStreet(e.target.value);
} }  required  /></div><div className="col-span-2"><label className="block text-sm font-medium mb-1">Number</label><input  type="text" className="w-full h-10 px-3 rounded-md border border-gray-300"  value={_editNumber}  onChange={(e) => {
set_editNumber(e.target.value);
} }  /></div><div className="col-span-2"><label className="block text-sm font-medium mb-1">Ext</label><input  type="text" className="w-full h-10 px-3 rounded-md border border-gray-300"  value={_editNumberExtension}  onChange={(e) => {
set_editNumberExtension(e.target.value);
} }  /></div></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Postal Code *</label><input  type="text" className="w-full h-10 px-3 rounded-md border border-gray-300"  value={_editPostalCode}  onChange={(e) => {
set_editPostalCode(e.target.value);
} }  required  /></div><div><label className="block text-sm font-medium mb-1">City *</label><input  type="text" className="w-full h-10 px-3 rounded-md border border-gray-300"  value={_editCity}  onChange={(e) => {
set_editCity(e.target.value);
} }  required  /></div></div><div><label className="block text-sm font-medium mb-1">Country *</label><select className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white"  value={_editCountry}  onChange={(e) => {
set_editCountry(e.target.value);
} }  required><option  value="">Select country</option>{props.countries || []?.map((c) => (
  <option  key={c.code}  value={c.code}>{c.name}</option>
))}</select></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-1">Email</label><input  type="email" className="w-full h-10 px-3 rounded-md border border-gray-300"  value={_editEmail}  onChange={(e) => {
set_editEmail(e.target.value);
} }  /></div><div><label className="block text-sm font-medium mb-1">Phone</label><input  type="tel" className="w-full h-10 px-3 rounded-md border border-gray-300"  value={_editPhone}  onChange={(e) => {
set_editPhone(e.target.value);
} }  /></div></div></div><div className="flex justify-end gap-3 pt-4 mt-4 border-t"><button  type="button" className="px-4 py-2 border rounded hover:bg-gray-100"  onClick={(event) => closeEditModal() }>
                                Cancel
                            </button><button  type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                                Save
                            </button></div></form></div></div>
) : null}{_showDeleteConfirm ? (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4"><h3 className="text-xl font-bold mb-4">Confirm Delete</h3><p className="mb-6 text-gray-600">Are you sure you want to delete this address?</p><div className="flex justify-end gap-4"><button className="px-4 py-2 border rounded hover:bg-gray-100"  onClick={(event) => {
set_showDeleteConfirm(false);
} }>
                            Cancel
                        </button><button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"  onClick={(event) => confirmDelete() }>
                            Delete
                        </button></div></div></div>
) : null}</div>


);
}




  export default AddressCard;


