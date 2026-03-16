'use client';
import * as React from 'react';

import { useState } from 'react'
  import  { Contact, Customer, GraphQLClient, UserService, CompanyService, AddressService, RegisterContactResponse, RegisterCustomerResponse, Enums, Company, ContactRegisterInput, CustomerRegisterInput, CreateCompanyInput, CustomerAddressCreateInput, CompanyAddressCreateInput } from 'propeller-sdk-v2';



  export interface RegisterFormProps {
/** GraphQL client for the Propeller SDK */
graphqlClient: GraphQLClient;

/** Title of the register form
 * @default "Create account"
 */
title?: string;

/** Subtitle of the register form
 * @default ""
 */
subtitle?: string;

/** Label for the submit button
 * @default "Register"
 */
buttonText?: string;

/**
 * Enable choosing between Contact or Customer if null,
 * otherwise proceed with one user type registration only.
 * 'Contact' = Company account (has company name, VAT, CoC fields)
 * 'Customer' = Consumer/personal account
 * @default null
 */
showUserType?: 'Contact' | 'Customer' | null;

/**
 * Required fields for the registration form.
 * Available field names: firstName, middleName, lastName, email, password,
 * phone, mobile, gender, companyName, vatNumber, cocNumber,
 * street, number, numberExtension, postalCode, city, country
 * @default []
 */
requiredFields?: string[];

/**
 * Contact or Customer is automatically logged in upon registration.
 * @default true
 */
automaticLogin?: boolean;

/**
 * Labels for the registration form fields.
 *
 * Available keys:
 * - firstName, middleName, lastName, email, password, confirmPassword
 * - phone, gender, companyName, vatNumber, cocNumber
 * - street, number, numberExtension, postalCode, city, country
 * - userTypeLabel, contactLabel, customerLabel
 * - emailPlaceholder, passwordPlaceholder, passwordMismatch
 * - billingAddressTitle, deliveryAddressTitle, sameAsDelivery
 * - loginText, loginLink
 * - personalDetailsTitle, passwordTitle
 */
labels?: Record<string, string>;

/** Callback before the registration process starts */
beforeRegistration?: () => void;

/** Callback after the user is registered */
afterRegistration?: (user: Contact | Customer, accessToken?: string, refreshToken?: string, expiresAt?: string) => void;

/** Action for the login link click */
onLoginClick?: () => void;

/** Show/hide the login link
 * @default true
 */
displayLoginLink?: boolean;

/**
 * Prefered language
 * @default 'NL'
 */
preferredLanguage?: string;

/**
 * List of countries to display in the country dropdown
 * @default {}
 */
countries?: Record<string, string>;
}




  function RegisterForm(props:RegisterFormProps) {

  const [_firstName, set_firstName] = useState(() => (''))


const [_middleName, set_middleName] = useState(() => (''))


const [_lastName, set_lastName] = useState(() => (''))


const [_email, set_email] = useState(() => (''))


const [_password, set_password] = useState(() => (''))


const [_confirmPassword, set_confirmPassword] = useState(() => (''))


const [_phone, set_phone] = useState(() => (''))


const [_gender, set_gender] = useState(() => (Enums.Gender.U))


const [_companyName, set_companyName] = useState(() => (''))


const [_vatNumber, set_vatNumber] = useState(() => (''))


const [_cocNumber, set_cocNumber] = useState(() => (''))


const [_billingStreet, set_billingStreet] = useState(() => (''))


const [_billingNumber, set_billingNumber] = useState(() => (''))


const [_billingNumberExtension, set_billingNumberExtension] = useState(() => (''))


const [_billingPostalCode, set_billingPostalCode] = useState(() => (''))


const [_billingCity, set_billingCity] = useState(() => (''))


const [_billingCountry, set_billingCountry] = useState(() => (''))


const [_sameAsDelivery, set_sameAsDelivery] = useState(() => (true))


const [_deliveryStreet, set_deliveryStreet] = useState(() => (''))


const [_deliveryNumber, set_deliveryNumber] = useState(() => (''))


const [_deliveryNumberExtension, set_deliveryNumberExtension] = useState(() => (''))


const [_deliveryPostalCode, set_deliveryPostalCode] = useState(() => (''))


const [_deliveryCity, set_deliveryCity] = useState(() => (''))


const [_deliveryCountry, set_deliveryCountry] = useState(() => (''))


const [_selectedUserType, set_selectedUserType] = useState(() => (''))


const [_loading, set_loading] = useState(() => (false))


const [_error, set_error] = useState(() => (''))


const [_submitted, set_submitted] = useState(() => (false))


function resolvedTitle() {
return props.title !== undefined ? props.title : 'Create account';
}


function resolvedButtonText() {
return props.buttonText || 'Register';
}


function showUserTypeSelector() {
return props.showUserType === undefined || props.showUserType === null;
}


function effectiveUserType() {
if (props.showUserType) return props.showUserType;
return _selectedUserType;
}


function isContact() {
return effectiveUserType() === 'Contact';
}


function isCustomer() {
return effectiveUserType() === 'Customer';
}


function showLoginLink() {
return props.displayLoginLink !== false;
}


function personalDetailsTitle() {
return props.labels?.personalDetailsTitle || 'Your details';
}


function billingAddressTitle() {
return props.labels?.billingAddressTitle || 'Billing address';
}


function deliveryAddressTitle() {
return props.labels?.deliveryAddressTitle || 'Delivery address';
}


function passwordTitle() {
return props.labels?.passwordTitle || 'Password';
}


function sameAsDeliveryLabel() {
return props.labels?.sameAsDelivery || 'Delivery address is the same as billing address';
}


function firstNameLabel() {
return props.labels?.firstName || 'First name';
}


function middleNameLabel() {
return props.labels?.middleName || 'Insertion';
}


function lastNameLabel() {
return props.labels?.lastName || 'Last name';
}


function emailLabel() {
return props.labels?.email || 'Email address';
}


function passwordLabel() {
return props.labels?.password || 'Password';
}


function confirmPasswordLabel() {
return props.labels?.confirmPassword || 'Repeat password';
}


function phoneLabel() {
return props.labels?.phone || 'Phone number';
}


function genderLabel() {
return props.labels?.gender || 'Title';
}


function companyNameLabel() {
return props.labels?.companyName || 'Company name';
}


function vatNumberLabel() {
return props.labels?.vatNumber || 'VAT number';
}


function cocNumberLabel() {
return props.labels?.cocNumber || 'CoC number';
}


function streetLabel() {
return props.labels?.street || 'Street';
}


function numberLabel() {
return props.labels?.number || 'Number';
}


function numberExtensionLabel() {
return props.labels?.numberExtension || 'Apt/Suite/Unit';
}


function postalCodeLabel() {
return props.labels?.postalCode || 'Postal code';
}


function cityLabel() {
return props.labels?.city || 'City';
}


function countryLabel() {
return props.labels?.country || 'Country';
}


function userTypeLabel() {
return props.labels?.userTypeLabel || 'Account type';
}


function contactLabel() {
return props.labels?.contactLabel || 'Company';
}


function customerLabel() {
return props.labels?.customerLabel || 'Consumer';
}


function emailPlaceholder() {
return props.labels?.emailPlaceholder || 'name@example.com';
}


function passwordPlaceholder() {
return props.labels?.passwordPlaceholder || '••••••••';
}


function passwordMismatchText() {
return props.labels?.passwordMismatch || 'Passwords do not match';
}


function loginText() {
return props.labels?.loginText || 'Already have an account?';
}


function loginLinkText() {
return props.labels?.loginLink || 'Log in';
}


function isFieldRequired(fieldName: string) {
if (!props.requiredFields) return false;
return props.requiredFields.indexOf(fieldName) !== -1;
}


async function handleSubmit(e: Event | any) {
e.preventDefault();
if (!effectiveUserType()) {
set_error('Please select an account type.');
return;
}
if (_password !== _confirmPassword) {
set_error(passwordMismatchText());
return;
}
if (_loading) return;
if (props.beforeRegistration) {
props.beforeRegistration();
}
set_loading(true);
set_error('');
try {
const userService = new UserService(props.graphqlClient as GraphQLClient);
const addressService = new AddressService(props.graphqlClient as GraphQLClient);
const baseInput: Record<string, unknown> = {
  email: _email,
  password: _password
};
baseInput.firstName = _firstName;
baseInput.middleName = _middleName;
baseInput.lastName = _lastName;
baseInput.phone = _phone;
baseInput.gender = _gender;
baseInput.primaryLanguage = props.preferredLanguage || 'NL';
let response: RegisterContactResponse | RegisterCustomerResponse;
let userId: number = 0;
let company: Company | null = null;
if (isContact()) {
  // Create company if company fields are filled
  if (_companyName) {
    const companyService = new CompanyService(props.graphqlClient as GraphQLClient);
    const companyInput: CreateCompanyInput = {
      name: _companyName,
      taxNumber: _vatNumber,
      cocNumber: _cocNumber,
      email: _email,
      phone: _phone
    };
    company = await companyService.createCompany(companyInput);
  }
  const contactInput: ContactRegisterInput = {
    contactRegisterInput: {
      ...baseInput,
      parentId: company?.companyId as number
    },
    companyAttributesInput: {},
    contactAttributesInput: {},
    contactPAConfigInput: {
      page: 1,
      offset: 10
    }
  };
  response = await userService.registerContact(contactInput);
  userId = Number((response as RegisterContactResponse)?.contact?.id || 0);

  // Authenticate before creating company/addresses
  const session = (response as RegisterContactResponse)?.session;
  if (session?.accessToken) {
    const currentConfig = (props.graphqlClient as GraphQLClient).getConfig();
    (props.graphqlClient as GraphQLClient).updateConfig({
      headers: {
        ...currentConfig.headers,
        'Authorization': 'Bearer ' + session.accessToken
      }
    });
  }
} else {
  const customerInput: CustomerRegisterInput = {
    customerRegisterInput: {
      ...baseInput,
      gender: _gender,
      primaryLanguage: props.preferredLanguage || 'NL'
    },
    customerAttributesInput: {}
  };
  response = await userService.registerCustomer(customerInput);
  userId = Number((response as RegisterCustomerResponse)?.customer?.id || 0);

  // Authenticate before creating addresses
  const session = (response as RegisterCustomerResponse)?.session;
  if (session?.accessToken) {
    const currentConfig = (props.graphqlClient as GraphQLClient).getConfig();
    (props.graphqlClient as GraphQLClient).updateConfig({
      headers: {
        ...currentConfig.headers,
        'Authorization': 'Bearer ' + session.accessToken
      }
    });
  }
}
const session = (response as RegisterContactResponse | RegisterCustomerResponse)?.session;
const user = isContact() ? (response as RegisterContactResponse)?.contact : (response as RegisterCustomerResponse)?.customer;

// Create invoice/billing address

let invoiceAddress: CustomerAddressCreateInput | CompanyAddressCreateInput;
if (isCustomer()) {
  invoiceAddress = {
    firstName: _firstName,
    middleName: _middleName,
    lastName: _lastName,
    street: _billingStreet,
    number: _billingNumber,
    numberExtension: _billingNumberExtension,
    postalCode: _billingPostalCode,
    city: _billingCity,
    country: _billingCountry,
    type: Enums.AddressType.invoice,
    isDefault: Enums.YesNo.Y,
    customerId: userId
  };
  await addressService.createCustomerAddress(invoiceAddress);
} else {
  invoiceAddress = {
    firstName: _firstName,
    middleName: _middleName,
    lastName: _lastName,
    company: _companyName,
    street: _billingStreet,
    number: _billingNumber,
    numberExtension: _billingNumberExtension,
    postalCode: _billingPostalCode,
    city: _billingCity,
    country: _billingCountry,
    type: Enums.AddressType.invoice,
    isDefault: Enums.YesNo.Y,
    companyId: company?.companyId as number
  };
  await addressService.createCompanyAddress(invoiceAddress);
}

// Create delivery address
if (_sameAsDelivery) {
  if (isCustomer()) {
    const deliveryAddress: CustomerAddressCreateInput = {
      ...(invoiceAddress as CustomerAddressCreateInput)
    };
    deliveryAddress.type = Enums.AddressType.delivery;
    await addressService.createCustomerAddress(deliveryAddress);
  } else {
    const deliveryAddress: CompanyAddressCreateInput = {
      ...(invoiceAddress as CompanyAddressCreateInput)
    };
    deliveryAddress.type = Enums.AddressType.delivery;
    await addressService.createCompanyAddress(deliveryAddress);
  }
} else {
  if (isCustomer()) {
    const deliveryAddress: CustomerAddressCreateInput = {
      firstName: _firstName,
      middleName: _middleName,
      lastName: _lastName,
      street: _deliveryStreet,
      number: _deliveryNumber,
      numberExtension: _deliveryNumberExtension,
      postalCode: _deliveryPostalCode,
      city: _deliveryCity,
      country: _deliveryCountry,
      type: Enums.AddressType.delivery,
      isDefault: Enums.YesNo.Y,
      customerId: userId
    };
    await addressService.createCustomerAddress(deliveryAddress);
  } else {
    const deliveryAddress: CompanyAddressCreateInput = {
      firstName: _firstName,
      middleName: _middleName,
      lastName: _lastName,
      street: _deliveryStreet,
      number: _deliveryNumber,
      numberExtension: _deliveryNumberExtension,
      postalCode: _deliveryPostalCode,
      city: _deliveryCity,
      country: _deliveryCountry,
      type: Enums.AddressType.delivery,
      isDefault: Enums.YesNo.Y,
      companyId: company?.companyId as number
    };
    await addressService.createCompanyAddress(deliveryAddress);
  }
}
set_submitted(true);

// Auto-login if enabled and session tokens are present
if (props.automaticLogin !== false && session?.accessToken && session?.refreshToken) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('userLoggedIn'));
  }
}
if (props.afterRegistration) {
  if (props.automaticLogin !== false && session?.accessToken && session?.refreshToken) {
    props.afterRegistration(user as unknown as Contact | Customer, session?.accessToken, session?.refreshToken, session?.expirationTime);
  } else {
    props.afterRegistration(user as unknown as Contact | Customer);
  }
}
} catch (err: any) {
set_error(err?.message || 'Registration failed. Please try again.');
} finally {
set_loading(false);
}
}











return (


  <div className="register-form">{resolvedTitle() ? (
  <div className="space-y-1 text-center mb-6"><h2 className="text-2xl font-bold">{resolvedTitle()}</h2>{props.subtitle ? (
  <p className="text-sm text-gray-500">{props.subtitle}</p>
) : null}</div>
) : null}{!_submitted ? (
  <form className="space-y-6"  onSubmit={(e) => handleSubmit(e) }><div className="space-y-4"><h3 className="text-lg font-semibold border-b pb-2">{personalDetailsTitle()}</h3>{showUserTypeSelector() ? (
  <div className="space-y-2"><label className="text-sm font-medium leading-none">{userTypeLabel()}</label><div className="flex gap-3"><button  type="button"  onClick={(event) => {
set_selectedUserType('Contact');
} }  className={'flex-1 h-10 px-4 py-2 text-sm font-medium rounded-md border transition-colors ' + (_selectedUserType === 'Contact' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 hover:bg-gray-50')}>{contactLabel()}</button><button  type="button"  onClick={(event) => {
set_selectedUserType('Customer');
} }  className={'flex-1 h-10 px-4 py-2 text-sm font-medium rounded-md border transition-colors ' + (_selectedUserType === 'Customer' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 hover:bg-gray-50')}>{customerLabel()}</button></div></div>
) : null}<div className="space-y-2"><label className="text-sm font-medium leading-none">{genderLabel()}</label><div className="flex gap-4"><label className="flex items-center gap-2 text-sm"><input  type="radio"  name="gender"  value="M" className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"  checked={_gender === Enums.Gender.M}  onChange={(event) => {
set_gender(Enums.Gender.M);
} }  disabled={_loading}  />
                                Mr.
                            </label><label className="flex items-center gap-2 text-sm"><input  type="radio"  name="gender"  value="F" className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"  checked={_gender === Enums.Gender.F}  onChange={(event) => {
set_gender(Enums.Gender.F);
} }  disabled={_loading}  />
                                Mrs.
                            </label><label className="flex items-center gap-2 text-sm"><input  type="radio"  name="gender"  value="U" className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"  checked={_gender === Enums.Gender.U}  onChange={(event) => {
set_gender(Enums.Gender.U);
} }  disabled={_loading}  />
                                Other
                            </label></div></div><div className="space-y-2"><label  htmlFor="register-email" className="text-sm font-medium leading-none">{emailLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="email"  id="register-email"  name="email" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_email}  onChange={(e) => {
set_email((e.target as HTMLInputElement).value);
} }  placeholder={emailPlaceholder()}  required  disabled={_loading}  /></div>{isContact() ? (
  <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-vatNumber" className="text-sm font-medium leading-none">{vatNumberLabel()}{isFieldRequired('vatNumber') ? (
  <span className="text-red-500 ml-1">*</span>
) : null}</label><input  type="text"  id="register-vatNumber"  name="vatNumber" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_vatNumber}  onChange={(e) => {
set_vatNumber((e.target as HTMLInputElement).value);
} }  required={isFieldRequired('vatNumber')}  disabled={_loading}  /></div><div className="space-y-2"><label  htmlFor="register-cocNumber" className="text-sm font-medium leading-none">{cocNumberLabel()}{isFieldRequired('cocNumber') ? (
  <span className="text-red-500 ml-1">*</span>
) : null}</label><input  type="text"  id="register-cocNumber"  name="cocNumber" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_cocNumber}  onChange={(e) => {
set_cocNumber((e.target as HTMLInputElement).value);
} }  required={isFieldRequired('cocNumber')}  disabled={_loading}  /></div></div><div className="space-y-2"><label  htmlFor="register-companyName" className="text-sm font-medium leading-none">{companyNameLabel()}{isFieldRequired('companyName') ? (
  <span className="text-red-500 ml-1">*</span>
) : null}</label><input  type="text"  id="register-companyName"  name="companyName" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_companyName}  onChange={(e) => {
set_companyName((e.target as HTMLInputElement).value);
} }  required={isFieldRequired('companyName')}  disabled={_loading}  /></div></div>
) : null}<div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-firstName" className="text-sm font-medium leading-none">{firstNameLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-firstName"  name="firstName" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_firstName}  onChange={(e) => {
set_firstName((e.target as HTMLInputElement).value);
} }  required  disabled={_loading}  /></div><div className="space-y-2"><label  htmlFor="register-middleName" className="text-sm font-medium leading-none">{middleNameLabel()}</label><input  type="text"  id="register-middleName"  name="middleName" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_middleName}  onChange={(e) => {
set_middleName((e.target as HTMLInputElement).value);
} }  disabled={_loading}  /></div></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-lastName" className="text-sm font-medium leading-none">{lastNameLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-lastName"  name="lastName" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_lastName}  onChange={(e) => {
set_lastName((e.target as HTMLInputElement).value);
} }  required  disabled={_loading}  /></div><div className="space-y-2"><label  htmlFor="register-phone" className="text-sm font-medium leading-none">{phoneLabel()}{isFieldRequired('phone') ? (
  <span className="text-red-500 ml-1">*</span>
) : null}</label><input  type="tel"  id="register-phone"  name="phone" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_phone}  onChange={(e) => {
set_phone((e.target as HTMLInputElement).value);
} }  required={isFieldRequired('phone')}  disabled={_loading}  /></div></div></div><div className="space-y-4"><h3 className="text-lg font-semibold border-b pb-2">{billingAddressTitle()}</h3><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-billingPostalCode" className="text-sm font-medium leading-none">{postalCodeLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-billingPostalCode"  name="billingPostalCode" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_billingPostalCode}  onChange={(e) => {
set_billingPostalCode((e.target as HTMLInputElement).value);
} }  required  disabled={_loading}  /></div><div className="space-y-2"><label  htmlFor="register-billingStreet" className="text-sm font-medium leading-none">{streetLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-billingStreet"  name="billingStreet" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_billingStreet}  onChange={(e) => {
set_billingStreet((e.target as HTMLInputElement).value);
} }  required  disabled={_loading}  /></div></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-billingNumber" className="text-sm font-medium leading-none">{numberLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-billingNumber"  name="billingNumber" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_billingNumber}  onChange={(e) => {
set_billingNumber((e.target as HTMLInputElement).value);
} }  required  disabled={_loading}  /></div><div className="space-y-2"><label  htmlFor="register-billingNumberExtension" className="text-sm font-medium leading-none">{numberExtensionLabel()}</label><input  type="text"  id="register-billingNumberExtension"  name="billingNumberExtension" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_billingNumberExtension}  onChange={(e) => {
set_billingNumberExtension((e.target as HTMLInputElement).value);
} }  disabled={_loading}  /></div></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-billingCity" className="text-sm font-medium leading-none">{cityLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-billingCity"  name="billingCity" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_billingCity}  onChange={(e) => {
set_billingCity((e.target as HTMLInputElement).value);
} }  required  disabled={_loading}  /></div><div className="space-y-2"><label  htmlFor="register-billingCountry" className="text-sm font-medium leading-none">{countryLabel()}<span className="text-red-500 ml-1">*</span></label><select  id="register-billingCountry"  name="billingCountry" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_billingCountry}  onChange={(e) => {
set_billingCountry((e.target as HTMLSelectElement).value);
} }  required  disabled={_loading}><option  value="">Select country</option>{Object.entries(props.countries || {})?.map((entry) => (
  <option  key={entry[0]}  value={entry[0]}>{entry[1]}</option>
))}</select></div></div></div><div className="space-y-4"><h3 className="text-lg font-semibold border-b pb-2">{deliveryAddressTitle()}</h3><div className="flex items-center gap-2"><input  type="checkbox"  id="register-sameAsDelivery"  name="sameAsDelivery" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"  checked={_sameAsDelivery}  onChange={(e) => {
set_sameAsDelivery((e.target as HTMLInputElement).checked);
} }  disabled={_loading}  /><label  htmlFor="register-sameAsDelivery" className="text-sm font-medium leading-none">{sameAsDeliveryLabel()}</label></div>{!_sameAsDelivery ? (
  <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-deliveryPostalCode" className="text-sm font-medium leading-none">{postalCodeLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-deliveryPostalCode"  name="deliveryPostalCode" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_deliveryPostalCode}  onChange={(e) => {
set_deliveryPostalCode((e.target as HTMLInputElement).value);
} }  required  disabled={_loading}  /></div><div className="space-y-2"><label  htmlFor="register-deliveryStreet" className="text-sm font-medium leading-none">{streetLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-deliveryStreet"  name="deliveryStreet" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_deliveryStreet}  onChange={(e) => {
set_deliveryStreet((e.target as HTMLInputElement).value);
} }  required  disabled={_loading}  /></div></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-deliveryNumber" className="text-sm font-medium leading-none">{numberLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-deliveryNumber"  name="deliveryNumber" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_deliveryNumber}  onChange={(e) => {
set_deliveryNumber((e.target as HTMLInputElement).value);
} }  required  disabled={_loading}  /></div><div className="space-y-2"><label  htmlFor="register-deliveryNumberExtension" className="text-sm font-medium leading-none">{numberExtensionLabel()}</label><input  type="text"  id="register-deliveryNumberExtension"  name="deliveryNumberExtension" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_deliveryNumberExtension}  onChange={(e) => {
set_deliveryNumberExtension((e.target as HTMLInputElement).value);
} }  disabled={_loading}  /></div></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-deliveryCity" className="text-sm font-medium leading-none">{cityLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-deliveryCity"  name="deliveryCity" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_deliveryCity}  onChange={(e) => {
set_deliveryCity((e.target as HTMLInputElement).value);
} }  required  disabled={_loading}  /></div><div className="space-y-2"><label  htmlFor="register-deliveryCountry" className="text-sm font-medium leading-none">{countryLabel()}<span className="text-red-500 ml-1">*</span></label><select  id="register-deliveryCountry"  name="deliveryCountry" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_deliveryCountry}  onChange={(e) => {
set_deliveryCountry((e.target as HTMLSelectElement).value);
} }  required  disabled={_loading}><option  value="">Select country</option>{Object.entries(props.countries || {})?.map((entry) => (
  <option  key={entry[0]}  value={entry[0]}>{entry[1]}</option>
))}</select></div></div></div>
) : null}</div><div className="space-y-4"><h3 className="text-lg font-semibold border-b pb-2">{passwordTitle()}</h3><div className="space-y-2"><label  htmlFor="register-password" className="text-sm font-medium leading-none">{passwordLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="password"  id="register-password"  name="password" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_password}  onChange={(e) => {
set_password((e.target as HTMLInputElement).value);
} }  placeholder={passwordPlaceholder()}  required  disabled={_loading}  /></div><div className="space-y-2"><label  htmlFor="register-confirmPassword" className="text-sm font-medium leading-none">{confirmPasswordLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="password"  id="register-confirmPassword"  name="confirmPassword" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={_confirmPassword}  onChange={(e) => {
set_confirmPassword((e.target as HTMLInputElement).value);
} }  placeholder={passwordPlaceholder()}  required  disabled={_loading}  /></div></div>{_error ? (
  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{_error}</div>
) : null}<button  type="submit" className="inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"  disabled={_loading}>{_loading ? (
  <svg  xmlns="http://www.w3.org/2000/svg"  fill="none"  viewBox="0 0 24 24" className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"><circle  cx="12"  cy="12"  r="10"  stroke="currentColor"  strokeWidth="4" className="opacity-25"  /><path  fill="currentColor"  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"  /></svg>
) : null}{_loading ? (
  <>Registering...</>
) : <>{resolvedButtonText()}</>}</button></form>
) : null}{_submitted ? (
  <div className="text-center space-y-4"><div className="flex justify-center"><svg  xmlns="http://www.w3.org/2000/svg"  fill="none"  viewBox="0 0 24 24"  stroke="currentColor"  strokeWidth="2" className="h-12 w-12 text-green-500"><path  strokeLinecap="round"  strokeLinejoin="round"  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"  /></svg></div><p className="text-sm text-gray-600">
                    Your account has been created successfully.
                </p></div>
) : null}{showLoginLink() ? (
  <div className="mt-6 border-t pt-6"><div className="text-center"><p className="text-sm text-gray-500 mb-2">{loginText()}</p><button  type="button" className="text-sm text-blue-600 hover:underline"  onClick={(event) => {
if (props.onLoginClick) props.onLoginClick();
} }>{loginLinkText()}</button></div></div>
) : null}</div>


);
}




  export default RegisterForm;


