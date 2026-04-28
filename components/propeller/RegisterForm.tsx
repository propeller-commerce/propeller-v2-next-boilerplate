'use client';
import * as React from 'react';

import { useState } from 'react';
import {
  Cart,
  Contact,
  Customer,
  GraphQLClient,
  Enums,
} from 'propeller-sdk-v2';
import { useAuth } from '@/composables/react/useAuth';

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
   * When true (default) the new contact/customer is automatically logged in
   * after registration: the SDK access token is set on the GraphQL client and
   * forwarded to `afterRegistration` so the parent can populate auth state.
   * When false, registration completes server-side but no session is kept;
   * `afterRegistration` is called without tokens so the parent can redirect
   * the user to the login page.
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

  /** Callback after the user is registered.
   * `anonymousCart` is the cart held in the parent's state at the moment of submission,
   * forwarded so the parent can merge it into the new user's cart.
   */
  afterRegistration?: (
    user: Contact | Customer,
    accessToken?: string,
    refreshToken?: string,
    expiresAt?: string,
    anonymousCart?: Cart | null
  ) => void;

  /** Anonymous cart snapshot from the parent's state — forwarded to `afterRegistration`. */
  cart?: Cart | null;

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

function RegisterForm(props: RegisterFormProps) {
  // Personal details
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Enums.Gender>(Enums.Gender.U);
  // Company fields (Contact only)
  const [companyName, setCompanyName] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [cocNumber, setCocNumber] = useState('');
  // Billing/Invoice address
  const [billingStreet, setBillingStreet] = useState('');
  const [billingNumber, setBillingNumber] = useState('');
  const [billingNumberExtension, setBillingNumberExtension] = useState('');
  const [billingPostalCode, setBillingPostalCode] = useState('');
  const [billingCity, setBillingCity] = useState('');
  const [billingCountry, setBillingCountry] = useState('');
  // Delivery address
  const [sameAsDelivery, setSameAsDelivery] = useState(true);
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryNumber, setDeliveryNumber] = useState('');
  const [deliveryNumberExtension, setDeliveryNumberExtension] = useState('');
  const [deliveryPostalCode, setDeliveryPostalCode] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryCountry, setDeliveryCountry] = useState('');
  // User type
  const [selectedUserType, setSelectedUserType] = useState<'' | 'Contact' | 'Customer'>('');
  // State
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { loading, registerContact, registerCustomer } = useAuth({
    graphqlClient: props.graphqlClient,
    language: props.preferredLanguage || 'NL',
  });

  function resolvedTitle(): string {
    return props.title !== undefined ? props.title : 'Create account';
  }
  function resolvedButtonText(): string {
    return props.buttonText || 'Register';
  }
  function showUserTypeSelector(): boolean {
    return props.showUserType === undefined || props.showUserType === null;
  }
  function effectiveUserType(): string {
    if (props.showUserType) return props.showUserType;
    return selectedUserType;
  }
  function isContact(): boolean {
    return effectiveUserType() === 'Contact';
  }
  function isCustomer(): boolean {
    return effectiveUserType() === 'Customer';
  }
  function showLoginLink(): boolean {
    return props.displayLoginLink !== false;
  }
  function personalDetailsTitle(): string {
    return props.labels?.personalDetailsTitle || 'Your details';
  }
  function billingAddressTitle(): string {
    return props.labels?.billingAddressTitle || 'Billing address';
  }
  function deliveryAddressTitle(): string {
    return props.labels?.deliveryAddressTitle || 'Delivery address';
  }
  function passwordTitle(): string {
    return props.labels?.passwordTitle || 'Password';
  }
  function sameAsDeliveryLabel(): string {
    return props.labels?.sameAsDelivery || 'Delivery address is the same as billing address';
  }
  function firstNameLabel(): string {
    return props.labels?.firstName || 'First name';
  }
  function middleNameLabel(): string {
    return props.labels?.middleName || 'Insertion';
  }
  function lastNameLabel(): string {
    return props.labels?.lastName || 'Last name';
  }
  function emailLabel(): string {
    return props.labels?.email || 'Email address';
  }
  function passwordLabel(): string {
    return props.labels?.password || 'Password';
  }
  function confirmPasswordLabel(): string {
    return props.labels?.confirmPassword || 'Repeat password';
  }
  function phoneLabel(): string {
    return props.labels?.phone || 'Phone number';
  }
  function genderLabel(): string {
    return props.labels?.gender || 'Title';
  }
  function companyNameLabel(): string {
    return props.labels?.companyName || 'Company name';
  }
  function vatNumberLabel(): string {
    return props.labels?.vatNumber || 'VAT number';
  }
  function cocNumberLabel(): string {
    return props.labels?.cocNumber || 'CoC number';
  }
  function streetLabel(): string {
    return props.labels?.street || 'Street';
  }
  function numberLabel(): string {
    return props.labels?.number || 'Number';
  }
  function numberExtensionLabel(): string {
    return props.labels?.numberExtension || 'Apt/Suite/Unit';
  }
  function postalCodeLabel(): string {
    return props.labels?.postalCode || 'Postal code';
  }
  function cityLabel(): string {
    return props.labels?.city || 'City';
  }
  function countryLabel(): string {
    return props.labels?.country || 'Country';
  }
  function userTypeLabel(): string {
    return props.labels?.userTypeLabel || 'Account type';
  }
  function contactLabel(): string {
    return props.labels?.contactLabel || 'Company';
  }
  function customerLabel(): string {
    return props.labels?.customerLabel || 'Consumer';
  }
  function emailPlaceholder(): string {
    return props.labels?.emailPlaceholder || 'name@example.com';
  }
  function passwordPlaceholder(): string {
    return props.labels?.passwordPlaceholder || '••••••••';
  }
  function passwordMismatchText(): string {
    return props.labels?.passwordMismatch || 'Passwords do not match';
  }
  function loginText(): string {
    return props.labels?.loginText || 'Already have an account?';
  }
  function loginLinkText(): string {
    return props.labels?.loginLink || 'Log in';
  }
  function isFieldRequired(fieldName: string): boolean {
    if (fieldName === 'companyName' && isContact()) return true;
    if (!props.requiredFields) return false;
    return props.requiredFields.indexOf(fieldName) !== -1;
  }
  async function handleSubmit(e: Event | any): Promise<void> {
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
    setError('');

    const autoLogin = props.automaticLogin !== false;
    let result;
    if (isContact()) {
      result = await registerContact({
        email,
        password,
        firstName,
        middleName,
        lastName,
        phone,
        gender,
        companyName,
        vatNumber,
        cocNumber,
        street: billingStreet,
        number: billingNumber,
        numberExtension: billingNumberExtension,
        postalCode: billingPostalCode,
        city: billingCity,
        country: billingCountry,
        deliveryStreet: sameAsDelivery ? billingStreet : deliveryStreet,
        deliveryNumber: sameAsDelivery ? billingNumber : deliveryNumber,
        deliveryNumberExtension: sameAsDelivery ? billingNumberExtension : deliveryNumberExtension,
        deliveryPostalCode: sameAsDelivery ? billingPostalCode : deliveryPostalCode,
        deliveryCity: sameAsDelivery ? billingCity : deliveryCity,
        deliveryCountry: sameAsDelivery ? billingCountry : deliveryCountry,
        sameDeliveryAsBilling: sameAsDelivery,
      }, props.preferredLanguage || 'NL', autoLogin);
    } else {
      result = await registerCustomer({
        email,
        password,
        firstName,
        middleName,
        lastName,
        phone,
        gender,
        street: billingStreet,
        number: billingNumber,
        numberExtension: billingNumberExtension,
        postalCode: billingPostalCode,
        city: billingCity,
        country: billingCountry,
        deliveryStreet: sameAsDelivery ? billingStreet : deliveryStreet,
        deliveryNumber: sameAsDelivery ? billingNumber : deliveryNumber,
        deliveryNumberExtension: sameAsDelivery ? billingNumberExtension : deliveryNumberExtension,
        deliveryPostalCode: sameAsDelivery ? billingPostalCode : deliveryPostalCode,
        deliveryCity: sameAsDelivery ? billingCity : deliveryCity,
        deliveryCountry: sameAsDelivery ? billingCountry : deliveryCountry,
        sameDeliveryAsBilling: sameAsDelivery,
      }, props.preferredLanguage || 'NL', autoLogin);
    }

    if (result.success) {
      setSubmitted(true);
      if (autoLogin && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userLoggedIn'));
      }
      if (props.afterRegistration) {
        props.afterRegistration(
          (result.user ?? null) as Contact | Customer,
          autoLogin ? result.accessToken : undefined,
          autoLogin ? result.refreshToken : undefined,
          autoLogin ? result.expiresAt : undefined,
          props.cart ?? null
        );
      }
    } else if (result.error) {
      setError(result.error);
    }
  }
  return (
    <div className="propeller-register-form" data-loading={loading ? 'true' : 'false'} data-user-type={selectedUserType}>
      {resolvedTitle() ? (
        <div className="propeller-register-form__header space-y-1 text-center mb-6">
          <h2 className="propeller-register-form__title text-2xl font-bold">{resolvedTitle()}</h2>
          {props.subtitle ? <p className="propeller-register-form__subtitle text-sm text-muted-foreground">{props.subtitle}</p> : null}
        </div>
      ) : null}
      {!submitted ? (
        <form className="space-y-6" onSubmit={(e) => handleSubmit(e)}>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">{personalDetailsTitle()}</h3>
            {showUserTypeSelector() ? (
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">{userTypeLabel()}</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={(event) => {
                      setSelectedUserType('Contact');
                    }}
                    className={
                      'flex-1 h-10 px-4 py-2 text-sm font-medium rounded-md border transition-colors ' +
                      (selectedUserType === 'Contact'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-input hover:bg-surface-hover')
                    }
                  >
                    {contactLabel()}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      setSelectedUserType('Customer');
                    }}
                    className={
                      'flex-1 h-10 px-4 py-2 text-sm font-medium rounded-md border transition-colors ' +
                      (selectedUserType === 'Customer'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-input hover:bg-surface-hover')
                    }
                  >
                    {customerLabel()}
                  </button>
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">{genderLabel()}</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="gender"
                    value="M"
                    className="propeller-register-form__radio h-4 w-4 border-input text-primary focus:ring-primary"
                    checked={gender === Enums.Gender.M}
                    onChange={(event) => {
                      setGender(Enums.Gender.M);
                    }}
                    disabled={loading}
                  />
                  Mr.
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="gender"
                    value="F"
                    className="propeller-register-form__radio h-4 w-4 border-input text-primary focus:ring-primary"
                    checked={gender === Enums.Gender.F}
                    onChange={(event) => {
                      setGender(Enums.Gender.F);
                    }}
                    disabled={loading}
                  />
                  Mrs.
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="gender"
                    value="U"
                    className="propeller-register-form__radio h-4 w-4 border-input text-primary focus:ring-primary"
                    checked={gender === Enums.Gender.U}
                    onChange={(event) => {
                      setGender(Enums.Gender.U);
                    }}
                    disabled={loading}
                  />
                  Other
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="register-email" className="text-sm font-medium leading-none">
                {emailLabel()}
                <span className="propeller-register-form__required text-destructive ml-1">*</span>
              </label>
              <input
                type="email"
                id="register-email"
                name="email"
                className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                value={email}
                onChange={(e) => {
                  setEmail((e.target as HTMLInputElement).value);
                }}
                placeholder={emailPlaceholder()}
                required
                disabled={loading}
              />
            </div>
            {isContact() ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label
                      htmlFor="register-vatNumber"
                      className="text-sm font-medium leading-none"
                    >
                      {vatNumberLabel()}
                      {isFieldRequired('vatNumber') ? (
                        <span className="propeller-register-form__required text-destructive ml-1">*</span>
                      ) : null}
                    </label>
                    <input
                      type="text"
                      id="register-vatNumber"
                      name="vatNumber"
                      className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                      value={vatNumber}
                      onChange={(e) => {
                        setVatNumber((e.target as HTMLInputElement).value);
                      }}
                      required={isFieldRequired('vatNumber')}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="register-cocNumber"
                      className="text-sm font-medium leading-none"
                    >
                      {cocNumberLabel()}
                      {isFieldRequired('cocNumber') ? (
                        <span className="propeller-register-form__required text-destructive ml-1">*</span>
                      ) : null}
                    </label>
                    <input
                      type="text"
                      id="register-cocNumber"
                      name="cocNumber"
                      className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                      value={cocNumber}
                      onChange={(e) => {
                        setCocNumber((e.target as HTMLInputElement).value);
                      }}
                      required={isFieldRequired('cocNumber')}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="register-companyName"
                    className="text-sm font-medium leading-none"
                  >
                    {companyNameLabel()}
                    {isFieldRequired('companyName') ? (
                      <span className="propeller-register-form__required text-destructive ml-1">*</span>
                    ) : null}
                  </label>
                  <input
                    type="text"
                    id="register-companyName"
                    name="companyName"
                    className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName((e.target as HTMLInputElement).value);
                    }}
                    required={isFieldRequired('companyName')}
                    disabled={loading}
                  />
                </div>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="register-firstName" className="text-sm font-medium leading-none">
                  {firstNameLabel()}
                  <span className="propeller-register-form__required text-destructive ml-1">*</span>
                </label>
                <input
                  type="text"
                  id="register-firstName"
                  name="firstName"
                  className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName((e.target as HTMLInputElement).value);
                  }}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="register-middleName" className="text-sm font-medium leading-none">
                  {middleNameLabel()}
                </label>
                <input
                  type="text"
                  id="register-middleName"
                  name="middleName"
                  className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  value={middleName}
                  onChange={(e) => {
                    setMiddleName((e.target as HTMLInputElement).value);
                  }}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="register-lastName" className="text-sm font-medium leading-none">
                  {lastNameLabel()}
                  <span className="propeller-register-form__required text-destructive ml-1">*</span>
                </label>
                <input
                  type="text"
                  id="register-lastName"
                  name="lastName"
                  className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  value={lastName}
                  onChange={(e) => {
                    setLastName((e.target as HTMLInputElement).value);
                  }}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="register-phone" className="text-sm font-medium leading-none">
                  {phoneLabel()}
                  {isFieldRequired('phone') ? <span className="propeller-register-form__required text-destructive ml-1">*</span> : null}
                </label>
                <input
                  type="tel"
                  id="register-phone"
                  name="phone"
                  className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  value={phone}
                  onChange={(e) => {
                    setPhone((e.target as HTMLInputElement).value);
                  }}
                  required={isFieldRequired('phone')}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">{billingAddressTitle()}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label
                  htmlFor="register-billingPostalCode"
                  className="text-sm font-medium leading-none"
                >
                  {postalCodeLabel()}
                  <span className="propeller-register-form__required text-destructive ml-1">*</span>
                </label>
                <input
                  type="text"
                  id="register-billingPostalCode"
                  name="billingPostalCode"
                  className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  value={billingPostalCode}
                  onChange={(e) => {
                    setBillingPostalCode((e.target as HTMLInputElement).value);
                  }}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="register-billingStreet"
                  className="text-sm font-medium leading-none"
                >
                  {streetLabel()}
                  <span className="propeller-register-form__required text-destructive ml-1">*</span>
                </label>
                <input
                  type="text"
                  id="register-billingStreet"
                  name="billingStreet"
                  className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  value={billingStreet}
                  onChange={(e) => {
                    setBillingStreet((e.target as HTMLInputElement).value);
                  }}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label
                  htmlFor="register-billingNumber"
                  className="text-sm font-medium leading-none"
                >
                  {numberLabel()}
                  <span className="propeller-register-form__required text-destructive ml-1">*</span>
                </label>
                <input
                  type="text"
                  id="register-billingNumber"
                  name="billingNumber"
                  className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  value={billingNumber}
                  onChange={(e) => {
                    setBillingNumber((e.target as HTMLInputElement).value);
                  }}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="register-billingNumberExtension"
                  className="text-sm font-medium leading-none"
                >
                  {numberExtensionLabel()}
                </label>
                <input
                  type="text"
                  id="register-billingNumberExtension"
                  name="billingNumberExtension"
                  className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  value={billingNumberExtension}
                  onChange={(e) => {
                    setBillingNumberExtension((e.target as HTMLInputElement).value);
                  }}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="register-billingCity" className="text-sm font-medium leading-none">
                  {cityLabel()}
                  <span className="propeller-register-form__required text-destructive ml-1">*</span>
                </label>
                <input
                  type="text"
                  id="register-billingCity"
                  name="billingCity"
                  className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  value={billingCity}
                  onChange={(e) => {
                    setBillingCity((e.target as HTMLInputElement).value);
                  }}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="register-billingCountry"
                  className="text-sm font-medium leading-none"
                >
                  {countryLabel()}
                  <span className="propeller-register-form__required text-destructive ml-1">*</span>
                </label>
                <select
                  id="register-billingCountry"
                  name="billingCountry"
                  className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                  value={billingCountry}
                  onChange={(e) => {
                    setBillingCountry((e.target as HTMLSelectElement).value);
                  }}
                  required
                  disabled={loading}
                >
                  <option value="">Select country</option>
                  {Object.entries(props.countries || {})?.map((entry) => (
                    <option key={entry[0]} value={entry[0]}>
                      {entry[1]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">{deliveryAddressTitle()}</h3>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="register-sameAsDelivery"
                name="sameAsDelivery"
                className="propeller-register-form__checkbox h-4 w-4 rounded border-input text-primary focus:ring-primary"
                checked={sameAsDelivery}
                onChange={(e) => {
                  setSameAsDelivery((e.target as HTMLInputElement).checked);
                }}
                disabled={loading}
              />
              <label htmlFor="register-sameAsDelivery" className="text-sm font-medium leading-none">
                {sameAsDeliveryLabel()}
              </label>
            </div>
            {!sameAsDelivery ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label
                      htmlFor="register-deliveryPostalCode"
                      className="text-sm font-medium leading-none"
                    >
                      {postalCodeLabel()}
                      <span className="propeller-register-form__required text-destructive ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      id="register-deliveryPostalCode"
                      name="deliveryPostalCode"
                      className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                      value={deliveryPostalCode}
                      onChange={(e) => {
                        setDeliveryPostalCode((e.target as HTMLInputElement).value);
                      }}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="register-deliveryStreet"
                      className="text-sm font-medium leading-none"
                    >
                      {streetLabel()}
                      <span className="propeller-register-form__required text-destructive ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      id="register-deliveryStreet"
                      name="deliveryStreet"
                      className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                      value={deliveryStreet}
                      onChange={(e) => {
                        setDeliveryStreet((e.target as HTMLInputElement).value);
                      }}
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label
                      htmlFor="register-deliveryNumber"
                      className="text-sm font-medium leading-none"
                    >
                      {numberLabel()}
                      <span className="propeller-register-form__required text-destructive ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      id="register-deliveryNumber"
                      name="deliveryNumber"
                      className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                      value={deliveryNumber}
                      onChange={(e) => {
                        setDeliveryNumber((e.target as HTMLInputElement).value);
                      }}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="register-deliveryNumberExtension"
                      className="text-sm font-medium leading-none"
                    >
                      {numberExtensionLabel()}
                    </label>
                    <input
                      type="text"
                      id="register-deliveryNumberExtension"
                      name="deliveryNumberExtension"
                      className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                      value={deliveryNumberExtension}
                      onChange={(e) => {
                        setDeliveryNumberExtension((e.target as HTMLInputElement).value);
                      }}
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label
                      htmlFor="register-deliveryCity"
                      className="text-sm font-medium leading-none"
                    >
                      {cityLabel()}
                      <span className="propeller-register-form__required text-destructive ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      id="register-deliveryCity"
                      name="deliveryCity"
                      className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                      value={deliveryCity}
                      onChange={(e) => {
                        setDeliveryCity((e.target as HTMLInputElement).value);
                      }}
                      required
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="register-deliveryCountry"
                      className="text-sm font-medium leading-none"
                    >
                      {countryLabel()}
                      <span className="propeller-register-form__required text-destructive ml-1">*</span>
                    </label>
                    <select
                      id="register-deliveryCountry"
                      name="deliveryCountry"
                      className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                      value={deliveryCountry}
                      onChange={(e) => {
                        setDeliveryCountry((e.target as HTMLSelectElement).value);
                      }}
                      required
                      disabled={loading}
                    >
                      <option value="">Select country</option>
                      {Object.entries(props.countries || {})?.map((entry) => (
                        <option key={entry[0]} value={entry[0]}>
                          {entry[1]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">{passwordTitle()}</h3>
            <div className="space-y-2">
              <label htmlFor="register-password" className="text-sm font-medium leading-none">
                {passwordLabel()}
                <span className="propeller-register-form__required text-destructive ml-1">*</span>
              </label>
              <input
                type="password"
                id="register-password"
                name="password"
                className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                value={password}
                onChange={(e) => {
                  setPassword((e.target as HTMLInputElement).value);
                }}
                placeholder={passwordPlaceholder()}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="register-confirmPassword"
                className="text-sm font-medium leading-none"
              >
                {confirmPasswordLabel()}
                <span className="propeller-register-form__required text-destructive ml-1">*</span>
              </label>
              <input
                type="password"
                id="register-confirmPassword"
                name="confirmPassword"
                className="propeller-register-form__input flex h-10 w-full rounded-control border border-input bg-card px-3 py-2 text-sm placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword((e.target as HTMLInputElement).value);
                }}
                placeholder={passwordPlaceholder()}
                required
                disabled={loading}
              />
            </div>
          </div>
          {error ? (
            <div className="propeller-register-form__error text-sm text-destructive bg-destructive/10 p-3 rounded-control">{error}</div>
          ) : null}
          <button
            type="submit"
            className="propeller-register-form__submit inline-flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-control hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="propeller-register-form__spinner animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground"
              >
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  className="opacity-75"
                />
              </svg>
            ) : null}
            {loading ? <>Registering...</> : <>{resolvedButtonText()}</>}
          </button>
        </form>
      ) : null}
      {submitted ? (
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
              className="propeller-register-form__success-icon h-12 w-12 text-success"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="propeller-register-form__success-message text-sm text-muted-foreground">Your account has been created successfully.</p>
        </div>
      ) : null}
      {showLoginLink() && !submitted ? (
        <div className="mt-6 border-t pt-6">
          <div className="text-center">
            <p className="propeller-register-form__login-prompt text-sm text-muted-foreground mb-2">{loginText()}</p>
            <button
              type="button"
              className="text-sm text-primary hover:underline"
              onClick={(event) => {
                if (props.onLoginClick) props.onLoginClick();
              }}
            >
              {loginLinkText()}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default RegisterForm;
