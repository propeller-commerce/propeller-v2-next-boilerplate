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
interface RegisterFormState {
// Personal details
firstName: string;
middleName: string;
lastName: string;
email: string;
password: string;
confirmPassword: string;
phone: string;
gender: Enums.Gender;
// Company fields (Contact only)
companyName: string;
vatNumber: string;
cocNumber: string;
// Billing/Invoice address
billingStreet: string;
billingNumber: string;
billingNumberExtension: string;
billingPostalCode: string;
billingCity: string;
billingCountry: string;
// Delivery address
sameAsDelivery: boolean;
deliveryStreet: string;
deliveryNumber: string;
deliveryNumberExtension: string;
deliveryPostalCode: string;
deliveryCity: string;
deliveryCountry: string;
// User type
selectedUserType: '' | 'Contact' | 'Customer';
// State
loading: boolean;
error: string;
submitted: boolean;
resolvedTitle: () => string;
resolvedButtonText: () => string;
showUserTypeSelector: () => boolean;
effectiveUserType: () => string;
isContact: () => boolean;
isCustomer: () => boolean;
showLoginLink: () => boolean;
personalDetailsTitle: () => string;
billingAddressTitle: () => string;
deliveryAddressTitle: () => string;
passwordTitle: () => string;
sameAsDeliveryLabel: () => string;
firstNameLabel: () => string;
middleNameLabel: () => string;
lastNameLabel: () => string;
emailLabel: () => string;
passwordLabel: () => string;
confirmPasswordLabel: () => string;
phoneLabel: () => string;
genderLabel: () => string;
companyNameLabel: () => string;
vatNumberLabel: () => string;
cocNumberLabel: () => string;
streetLabel: () => string;
numberLabel: () => string;
numberExtensionLabel: () => string;
postalCodeLabel: () => string;
cityLabel: () => string;
countryLabel: () => string;
userTypeLabel: () => string;
contactLabel: () => string;
customerLabel: () => string;
emailPlaceholder: () => string;
passwordPlaceholder: () => string;
passwordMismatchText: () => string;
loginText: () => string;
loginLinkText: () => string;
isFieldRequired: (fieldName: string) => boolean;
handleSubmit: (e: Event | any) => Promise<void>;
}




  function RegisterForm(props:RegisterFormProps) {

  const [firstName, setFirstName] = useState<RegisterFormState["firstName"]>(() => (''))


const [middleName, setMiddleName] = useState<RegisterFormState["middleName"]>(() => (''))


const [lastName, setLastName] = useState<RegisterFormState["lastName"]>(() => (''))


const [email, setEmail] = useState<RegisterFormState["email"]>(() => (''))


const [password, setPassword] = useState<RegisterFormState["password"]>(() => (''))


const [confirmPassword, setConfirmPassword] = useState<RegisterFormState["confirmPassword"]>(() => (''))


const [phone, setPhone] = useState<RegisterFormState["phone"]>(() => (''))


const [gender, setGender] = useState<RegisterFormState["gender"]>(() => (Enums.Gender.U))


const [companyName, setCompanyName] = useState<RegisterFormState["companyName"]>(() => (''))


const [vatNumber, setVatNumber] = useState<RegisterFormState["vatNumber"]>(() => (''))


const [cocNumber, setCocNumber] = useState<RegisterFormState["cocNumber"]>(() => (''))


const [billingStreet, setBillingStreet] = useState<RegisterFormState["billingStreet"]>(() => (''))


const [billingNumber, setBillingNumber] = useState<RegisterFormState["billingNumber"]>(() => (''))


const [billingNumberExtension, setBillingNumberExtension] = useState<RegisterFormState["billingNumberExtension"]>(() => (''))


const [billingPostalCode, setBillingPostalCode] = useState<RegisterFormState["billingPostalCode"]>(() => (''))


const [billingCity, setBillingCity] = useState<RegisterFormState["billingCity"]>(() => (''))


const [billingCountry, setBillingCountry] = useState<RegisterFormState["billingCountry"]>(() => (''))


const [sameAsDelivery, setSameAsDelivery] = useState<RegisterFormState["sameAsDelivery"]>(() => (true))


const [deliveryStreet, setDeliveryStreet] = useState<RegisterFormState["deliveryStreet"]>(() => (''))


const [deliveryNumber, setDeliveryNumber] = useState<RegisterFormState["deliveryNumber"]>(() => (''))


const [deliveryNumberExtension, setDeliveryNumberExtension] = useState<RegisterFormState["deliveryNumberExtension"]>(() => (''))


const [deliveryPostalCode, setDeliveryPostalCode] = useState<RegisterFormState["deliveryPostalCode"]>(() => (''))


const [deliveryCity, setDeliveryCity] = useState<RegisterFormState["deliveryCity"]>(() => (''))


const [deliveryCountry, setDeliveryCountry] = useState<RegisterFormState["deliveryCountry"]>(() => (''))


const [selectedUserType, setSelectedUserType] = useState<RegisterFormState["selectedUserType"]>(() => (''))


const [loading, setLoading] = useState<RegisterFormState["loading"]>(() => (false))


const [error, setError] = useState<RegisterFormState["error"]>(() => (''))


const [submitted, setSubmitted] = useState<RegisterFormState["submitted"]>(() => (false))


function resolvedTitle(): ReturnType<RegisterFormState["resolvedTitle"]>{
return props.title !== undefined ? props.title : 'Create account';
}


function resolvedButtonText(): ReturnType<RegisterFormState["resolvedButtonText"]>{
return props.buttonText || 'Register';
}


function showUserTypeSelector(): ReturnType<RegisterFormState["showUserTypeSelector"]>{
return props.showUserType === undefined || props.showUserType === null;
}


function effectiveUserType(): ReturnType<RegisterFormState["effectiveUserType"]>{
if (props.showUserType) return props.showUserType;
return selectedUserType;
}


function isContact(): ReturnType<RegisterFormState["isContact"]>{
return effectiveUserType() === 'Contact';
}


function isCustomer(): ReturnType<RegisterFormState["isCustomer"]>{
return effectiveUserType() === 'Customer';
}


function showLoginLink(): ReturnType<RegisterFormState["showLoginLink"]>{
return props.displayLoginLink !== false;
}


function personalDetailsTitle(): ReturnType<RegisterFormState["personalDetailsTitle"]>{
return props.labels?.personalDetailsTitle || 'Your details';
}


function billingAddressTitle(): ReturnType<RegisterFormState["billingAddressTitle"]>{
return props.labels?.billingAddressTitle || 'Billing address';
}


function deliveryAddressTitle(): ReturnType<RegisterFormState["deliveryAddressTitle"]>{
return props.labels?.deliveryAddressTitle || 'Delivery address';
}


function passwordTitle(): ReturnType<RegisterFormState["passwordTitle"]>{
return props.labels?.passwordTitle || 'Password';
}


function sameAsDeliveryLabel(): ReturnType<RegisterFormState["sameAsDeliveryLabel"]>{
return props.labels?.sameAsDelivery || 'Delivery address is the same as billing address';
}


function firstNameLabel(): ReturnType<RegisterFormState["firstNameLabel"]>{
return props.labels?.firstName || 'First name';
}


function middleNameLabel(): ReturnType<RegisterFormState["middleNameLabel"]>{
return props.labels?.middleName || 'Insertion';
}


function lastNameLabel(): ReturnType<RegisterFormState["lastNameLabel"]>{
return props.labels?.lastName || 'Last name';
}


function emailLabel(): ReturnType<RegisterFormState["emailLabel"]>{
return props.labels?.email || 'Email address';
}


function passwordLabel(): ReturnType<RegisterFormState["passwordLabel"]>{
return props.labels?.password || 'Password';
}


function confirmPasswordLabel(): ReturnType<RegisterFormState["confirmPasswordLabel"]>{
return props.labels?.confirmPassword || 'Repeat password';
}


function phoneLabel(): ReturnType<RegisterFormState["phoneLabel"]>{
return props.labels?.phone || 'Phone number';
}


function genderLabel(): ReturnType<RegisterFormState["genderLabel"]>{
return props.labels?.gender || 'Title';
}


function companyNameLabel(): ReturnType<RegisterFormState["companyNameLabel"]>{
return props.labels?.companyName || 'Company name';
}


function vatNumberLabel(): ReturnType<RegisterFormState["vatNumberLabel"]>{
return props.labels?.vatNumber || 'VAT number';
}


function cocNumberLabel(): ReturnType<RegisterFormState["cocNumberLabel"]>{
return props.labels?.cocNumber || 'CoC number';
}


function streetLabel(): ReturnType<RegisterFormState["streetLabel"]>{
return props.labels?.street || 'Street';
}


function numberLabel(): ReturnType<RegisterFormState["numberLabel"]>{
return props.labels?.number || 'Number';
}


function numberExtensionLabel(): ReturnType<RegisterFormState["numberExtensionLabel"]>{
return props.labels?.numberExtension || 'Apt/Suite/Unit';
}


function postalCodeLabel(): ReturnType<RegisterFormState["postalCodeLabel"]>{
return props.labels?.postalCode || 'Postal code';
}


function cityLabel(): ReturnType<RegisterFormState["cityLabel"]>{
return props.labels?.city || 'City';
}


function countryLabel(): ReturnType<RegisterFormState["countryLabel"]>{
return props.labels?.country || 'Country';
}


function userTypeLabel(): ReturnType<RegisterFormState["userTypeLabel"]>{
return props.labels?.userTypeLabel || 'Account type';
}


function contactLabel(): ReturnType<RegisterFormState["contactLabel"]>{
return props.labels?.contactLabel || 'Company';
}


function customerLabel(): ReturnType<RegisterFormState["customerLabel"]>{
return props.labels?.customerLabel || 'Consumer';
}


function emailPlaceholder(): ReturnType<RegisterFormState["emailPlaceholder"]>{
return props.labels?.emailPlaceholder || 'name@example.com';
}


function passwordPlaceholder(): ReturnType<RegisterFormState["passwordPlaceholder"]>{
return props.labels?.passwordPlaceholder || '••••••••';
}


function passwordMismatchText(): ReturnType<RegisterFormState["passwordMismatchText"]>{
return props.labels?.passwordMismatch || 'Passwords do not match';
}


function loginText(): ReturnType<RegisterFormState["loginText"]>{
return props.labels?.loginText || 'Already have an account?';
}


function loginLinkText(): ReturnType<RegisterFormState["loginLinkText"]>{
return props.labels?.loginLink || 'Log in';
}


function isFieldRequired(fieldName: string): ReturnType<RegisterFormState["isFieldRequired"]>{
if (!props.requiredFields) return false;
return props.requiredFields.indexOf(fieldName) !== -1;
}


async function handleSubmit(e: Event | any): ReturnType<RegisterFormState["handleSubmit"]>{
e.preventDefault();
if (!effectiveUserType()) {
setError('Please select an account type.');
return;
}
if (password !== confirmPassword) {
setError(passwordMismatchText());
return;
}
if (loading) return;
if (props.beforeRegistration) {
props.beforeRegistration();
}
setLoading(true);
setError('');
try {
const userService = new UserService(props.graphqlClient as GraphQLClient);
const addressService = new AddressService(props.graphqlClient as GraphQLClient);
const baseInput: Record<string, unknown> = {
  email: email,
  password: password
};
baseInput.firstName = firstName;
baseInput.middleName = middleName;
baseInput.lastName = lastName;
baseInput.phone = phone;
baseInput.gender = gender;
baseInput.primaryLanguage = props.preferredLanguage || 'NL';
let response: RegisterContactResponse | RegisterCustomerResponse;
let userId: number = 0;
let company: Company | null = null;
if (isContact()) {
  // Create company if company fields are filled
  if (companyName) {
    const companyService = new CompanyService(props.graphqlClient as GraphQLClient);
    const companyInput: CreateCompanyInput = {
      name: companyName,
      taxNumber: vatNumber,
      cocNumber: cocNumber,
      email: email,
      phone: phone
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
      gender: gender,
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
    firstName: firstName,
    middleName: middleName,
    lastName: lastName,
    street: billingStreet,
    number: billingNumber,
    numberExtension: billingNumberExtension,
    postalCode: billingPostalCode,
    city: billingCity,
    country: billingCountry,
    type: Enums.AddressType.invoice,
    isDefault: Enums.YesNo.Y,
    customerId: userId
  };
  await addressService.createCustomerAddress(invoiceAddress);
} else {
  invoiceAddress = {
    firstName: firstName,
    middleName: middleName,
    lastName: lastName,
    company: companyName,
    street: billingStreet,
    number: billingNumber,
    numberExtension: billingNumberExtension,
    postalCode: billingPostalCode,
    city: billingCity,
    country: billingCountry,
    type: Enums.AddressType.invoice,
    isDefault: Enums.YesNo.Y,
    companyId: company?.companyId as number
  };
  await addressService.createCompanyAddress(invoiceAddress);
}

// Create delivery address
if (sameAsDelivery) {
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
      firstName: firstName,
      middleName: middleName,
      lastName: lastName,
      street: deliveryStreet,
      number: deliveryNumber,
      numberExtension: deliveryNumberExtension,
      postalCode: deliveryPostalCode,
      city: deliveryCity,
      country: deliveryCountry,
      type: Enums.AddressType.delivery,
      isDefault: Enums.YesNo.Y,
      customerId: userId
    };
    await addressService.createCustomerAddress(deliveryAddress);
  } else {
    const deliveryAddress: CompanyAddressCreateInput = {
      firstName: firstName,
      middleName: middleName,
      lastName: lastName,
      street: deliveryStreet,
      number: deliveryNumber,
      numberExtension: deliveryNumberExtension,
      postalCode: deliveryPostalCode,
      city: deliveryCity,
      country: deliveryCountry,
      type: Enums.AddressType.delivery,
      isDefault: Enums.YesNo.Y,
      companyId: company?.companyId as number
    };
    await addressService.createCompanyAddress(deliveryAddress);
  }
}
setSubmitted(true);

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
setError(err?.message || 'Registration failed. Please try again.');
} finally {
setLoading(false);
}
}











return (


  <div className="register-form">{resolvedTitle() ? (
  <div className="space-y-1 text-center mb-6"><h2 className="text-2xl font-bold">{resolvedTitle()}</h2>{props.subtitle ? (
  <p className="text-sm text-gray-500">{props.subtitle}</p>
) : null}</div>
) : null}{!submitted ? (
  <form className="space-y-6"  onSubmit={(e) => handleSubmit(e) }><div className="space-y-4"><h3 className="text-lg font-semibold border-b pb-2">{personalDetailsTitle()}</h3>{showUserTypeSelector() ? (
  <div className="space-y-2"><label className="text-sm font-medium leading-none">{userTypeLabel()}</label><div className="flex gap-3"><button  type="button"  onClick={(event) => {
setSelectedUserType('Contact');
} }  className={'flex-1 h-10 px-4 py-2 text-sm font-medium rounded-md border transition-colors ' + (selectedUserType === 'Contact' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 hover:bg-gray-50')}>{contactLabel()}</button><button  type="button"  onClick={(event) => {
setSelectedUserType('Customer');
} }  className={'flex-1 h-10 px-4 py-2 text-sm font-medium rounded-md border transition-colors ' + (selectedUserType === 'Customer' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-300 hover:bg-gray-50')}>{customerLabel()}</button></div></div>
) : null}<div className="space-y-2"><label className="text-sm font-medium leading-none">{genderLabel()}</label><div className="flex gap-4"><label className="flex items-center gap-2 text-sm"><input  type="radio"  name="gender"  value="M" className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"  checked={gender === Enums.Gender.M}  onChange={(event) => {
setGender(Enums.Gender.M);
} }  disabled={loading}  />
                                Mr.
                            </label><label className="flex items-center gap-2 text-sm"><input  type="radio"  name="gender"  value="F" className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"  checked={gender === Enums.Gender.F}  onChange={(event) => {
setGender(Enums.Gender.F);
} }  disabled={loading}  />
                                Mrs.
                            </label><label className="flex items-center gap-2 text-sm"><input  type="radio"  name="gender"  value="U" className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"  checked={gender === Enums.Gender.U}  onChange={(event) => {
setGender(Enums.Gender.U);
} }  disabled={loading}  />
                                Other
                            </label></div></div><div className="space-y-2"><label  htmlFor="register-email" className="text-sm font-medium leading-none">{emailLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="email"  id="register-email"  name="email" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={email}  onChange={(e) => {
setEmail((e.target as HTMLInputElement).value);
} }  placeholder={emailPlaceholder()}  required  disabled={loading}  /></div>{isContact() ? (
  <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-vatNumber" className="text-sm font-medium leading-none">{vatNumberLabel()}{isFieldRequired('vatNumber') ? (
  <span className="text-red-500 ml-1">*</span>
) : null}</label><input  type="text"  id="register-vatNumber"  name="vatNumber" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={vatNumber}  onChange={(e) => {
setVatNumber((e.target as HTMLInputElement).value);
} }  required={isFieldRequired('vatNumber')}  disabled={loading}  /></div><div className="space-y-2"><label  htmlFor="register-cocNumber" className="text-sm font-medium leading-none">{cocNumberLabel()}{isFieldRequired('cocNumber') ? (
  <span className="text-red-500 ml-1">*</span>
) : null}</label><input  type="text"  id="register-cocNumber"  name="cocNumber" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={cocNumber}  onChange={(e) => {
setCocNumber((e.target as HTMLInputElement).value);
} }  required={isFieldRequired('cocNumber')}  disabled={loading}  /></div></div><div className="space-y-2"><label  htmlFor="register-companyName" className="text-sm font-medium leading-none">{companyNameLabel()}{isFieldRequired('companyName') ? (
  <span className="text-red-500 ml-1">*</span>
) : null}</label><input  type="text"  id="register-companyName"  name="companyName" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={companyName}  onChange={(e) => {
setCompanyName((e.target as HTMLInputElement).value);
} }  required={isFieldRequired('companyName')}  disabled={loading}  /></div></div>
) : null}<div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-firstName" className="text-sm font-medium leading-none">{firstNameLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-firstName"  name="firstName" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={firstName}  onChange={(e) => {
setFirstName((e.target as HTMLInputElement).value);
} }  required  disabled={loading}  /></div><div className="space-y-2"><label  htmlFor="register-middleName" className="text-sm font-medium leading-none">{middleNameLabel()}</label><input  type="text"  id="register-middleName"  name="middleName" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={middleName}  onChange={(e) => {
setMiddleName((e.target as HTMLInputElement).value);
} }  disabled={loading}  /></div></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-lastName" className="text-sm font-medium leading-none">{lastNameLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-lastName"  name="lastName" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={lastName}  onChange={(e) => {
setLastName((e.target as HTMLInputElement).value);
} }  required  disabled={loading}  /></div><div className="space-y-2"><label  htmlFor="register-phone" className="text-sm font-medium leading-none">{phoneLabel()}{isFieldRequired('phone') ? (
  <span className="text-red-500 ml-1">*</span>
) : null}</label><input  type="tel"  id="register-phone"  name="phone" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={phone}  onChange={(e) => {
setPhone((e.target as HTMLInputElement).value);
} }  required={isFieldRequired('phone')}  disabled={loading}  /></div></div></div><div className="space-y-4"><h3 className="text-lg font-semibold border-b pb-2">{billingAddressTitle()}</h3><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-billingPostalCode" className="text-sm font-medium leading-none">{postalCodeLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-billingPostalCode"  name="billingPostalCode" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={billingPostalCode}  onChange={(e) => {
setBillingPostalCode((e.target as HTMLInputElement).value);
} }  required  disabled={loading}  /></div><div className="space-y-2"><label  htmlFor="register-billingStreet" className="text-sm font-medium leading-none">{streetLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-billingStreet"  name="billingStreet" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={billingStreet}  onChange={(e) => {
setBillingStreet((e.target as HTMLInputElement).value);
} }  required  disabled={loading}  /></div></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-billingNumber" className="text-sm font-medium leading-none">{numberLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-billingNumber"  name="billingNumber" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={billingNumber}  onChange={(e) => {
setBillingNumber((e.target as HTMLInputElement).value);
} }  required  disabled={loading}  /></div><div className="space-y-2"><label  htmlFor="register-billingNumberExtension" className="text-sm font-medium leading-none">{numberExtensionLabel()}</label><input  type="text"  id="register-billingNumberExtension"  name="billingNumberExtension" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={billingNumberExtension}  onChange={(e) => {
setBillingNumberExtension((e.target as HTMLInputElement).value);
} }  disabled={loading}  /></div></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-billingCity" className="text-sm font-medium leading-none">{cityLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-billingCity"  name="billingCity" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={billingCity}  onChange={(e) => {
setBillingCity((e.target as HTMLInputElement).value);
} }  required  disabled={loading}  /></div><div className="space-y-2"><label  htmlFor="register-billingCountry" className="text-sm font-medium leading-none">{countryLabel()}<span className="text-red-500 ml-1">*</span></label><select  id="register-billingCountry"  name="billingCountry" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={billingCountry}  onChange={(e) => {
setBillingCountry((e.target as HTMLSelectElement).value);
} }  required  disabled={loading}><option  value="">Select country</option>{Object.entries(props.countries || {})?.map((entry) => (
  <option  key={entry[0]}  value={entry[0]}>{entry[1]}</option>
))}</select></div></div></div><div className="space-y-4"><h3 className="text-lg font-semibold border-b pb-2">{deliveryAddressTitle()}</h3><div className="flex items-center gap-2"><input  type="checkbox"  id="register-sameAsDelivery"  name="sameAsDelivery" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"  checked={sameAsDelivery}  onChange={(e) => {
setSameAsDelivery((e.target as HTMLInputElement).checked);
} }  disabled={loading}  /><label  htmlFor="register-sameAsDelivery" className="text-sm font-medium leading-none">{sameAsDeliveryLabel()}</label></div>{!sameAsDelivery ? (
  <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-deliveryPostalCode" className="text-sm font-medium leading-none">{postalCodeLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-deliveryPostalCode"  name="deliveryPostalCode" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={deliveryPostalCode}  onChange={(e) => {
setDeliveryPostalCode((e.target as HTMLInputElement).value);
} }  required  disabled={loading}  /></div><div className="space-y-2"><label  htmlFor="register-deliveryStreet" className="text-sm font-medium leading-none">{streetLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-deliveryStreet"  name="deliveryStreet" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={deliveryStreet}  onChange={(e) => {
setDeliveryStreet((e.target as HTMLInputElement).value);
} }  required  disabled={loading}  /></div></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-deliveryNumber" className="text-sm font-medium leading-none">{numberLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-deliveryNumber"  name="deliveryNumber" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={deliveryNumber}  onChange={(e) => {
setDeliveryNumber((e.target as HTMLInputElement).value);
} }  required  disabled={loading}  /></div><div className="space-y-2"><label  htmlFor="register-deliveryNumberExtension" className="text-sm font-medium leading-none">{numberExtensionLabel()}</label><input  type="text"  id="register-deliveryNumberExtension"  name="deliveryNumberExtension" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={deliveryNumberExtension}  onChange={(e) => {
setDeliveryNumberExtension((e.target as HTMLInputElement).value);
} }  disabled={loading}  /></div></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><label  htmlFor="register-deliveryCity" className="text-sm font-medium leading-none">{cityLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="text"  id="register-deliveryCity"  name="deliveryCity" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={deliveryCity}  onChange={(e) => {
setDeliveryCity((e.target as HTMLInputElement).value);
} }  required  disabled={loading}  /></div><div className="space-y-2"><label  htmlFor="register-deliveryCountry" className="text-sm font-medium leading-none">{countryLabel()}<span className="text-red-500 ml-1">*</span></label><select  id="register-deliveryCountry"  name="deliveryCountry" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={deliveryCountry}  onChange={(e) => {
setDeliveryCountry((e.target as HTMLSelectElement).value);
} }  required  disabled={loading}><option  value="">Select country</option>{Object.entries(props.countries || {})?.map((entry) => (
  <option  key={entry[0]}  value={entry[0]}>{entry[1]}</option>
))}</select></div></div></div>
) : null}</div><div className="space-y-4"><h3 className="text-lg font-semibold border-b pb-2">{passwordTitle()}</h3><div className="space-y-2"><label  htmlFor="register-password" className="text-sm font-medium leading-none">{passwordLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="password"  id="register-password"  name="password" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={password}  onChange={(e) => {
setPassword((e.target as HTMLInputElement).value);
} }  placeholder={passwordPlaceholder()}  required  disabled={loading}  /></div><div className="space-y-2"><label  htmlFor="register-confirmPassword" className="text-sm font-medium leading-none">{confirmPasswordLabel()}<span className="text-red-500 ml-1">*</span></label><input  type="password"  id="register-confirmPassword"  name="confirmPassword" className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"  value={confirmPassword}  onChange={(e) => {
setConfirmPassword((e.target as HTMLInputElement).value);
} }  placeholder={passwordPlaceholder()}  required  disabled={loading}  /></div></div>{error ? (
  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
) : null}<button  type="submit" className="inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"  disabled={loading}>{loading ? (
  <svg  xmlns="http://www.w3.org/2000/svg"  fill="none"  viewBox="0 0 24 24" className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"><circle  cx="12"  cy="12"  r="10"  stroke="currentColor"  strokeWidth="4" className="opacity-25"  /><path  fill="currentColor"  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"  /></svg>
) : null}{loading ? (
  <>Registering...</>
) : <>{resolvedButtonText()}</>}</button></form>
) : null}{submitted ? (
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


