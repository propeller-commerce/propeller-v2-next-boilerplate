/**
 * useAuth (React) — Login, registration, and forgot-password flows.
 *
 * React mirror of vue/useAuth.ts.
 * Mirrors RegisterForm.tsx, LoginForm.tsx, ForgotPassword.tsx.
 *
 * Responsibilities:
 * - login: LoginService + getViewer for session token + user
 * - registerContact: createCompany → registerContact (ContactRegisterInput wrapper) → createCompanyAddress
 * - registerCustomer: registerCustomer (CustomerRegisterInput wrapper) → login → createCustomerAddress
 * - forgotPassword: UserService.sendPasswordResetEmail
 */

import { useState, useCallback } from 'react';
import { getServices } from '@/lib/api';
import { AddressType, Gender, YesNo } from 'propeller-sdk-v2';
import type {
  GraphQLClient,
  Contact,
  Customer,
  CreateCompanyInput,
  CompanyAddressCreateInput,
  CustomerAddressCreateInput,
} from 'propeller-sdk-v2';
import type {
  ViewerInput,
  ContactRegisterInput,
  CustomerRegisterInput,
  PasswordResetInput,
} from 'propeller-sdk-v2';
import { isCustomer } from '../shared/utils/userIdentity';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LoginResult {
  success: boolean;
  user?: Contact | Customer;
  error?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}

export interface RegisterContactInput {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  gender?: Gender;
  companyName?: string;
  vatNumber?: string;
  cocNumber?: string;
  street?: string;
  number?: string;
  numberExtension?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  deliveryStreet?: string;
  deliveryNumber?: string;
  deliveryNumberExtension?: string;
  deliveryPostalCode?: string;
  deliveryCity?: string;
  deliveryCountry?: string;
  sameDeliveryAsBilling?: boolean;
}

export interface RegisterCustomerInput {
  email: string;
  password: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  phone?: string;
  gender?: Gender;
  street?: string;
  number?: string;
  numberExtension?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  deliveryStreet?: string;
  deliveryNumber?: string;
  deliveryNumberExtension?: string;
  deliveryPostalCode?: string;
  deliveryCity?: string;
  deliveryCountry?: string;
  sameDeliveryAsBilling?: boolean;
}

export interface UseAuthOptions {
  graphqlClient: GraphQLClient;
  language?: string;
  onAuthHeaderUpdate?: (token: string) => void;
  configuration?: any;
}

export interface UseAuthReturn {
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, onLoginSubmit?: (email: string, password: string) => Promise<Contact | Customer>) => Promise<LoginResult>;
  registerContact: (input: RegisterContactInput, preferredLanguage?: string, autoLogin?: boolean) => Promise<LoginResult>;
  registerCustomer: (input: RegisterCustomerInput, preferredLanguage?: string, autoLogin?: boolean) => Promise<LoginResult>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useAuth(options: UseAuthOptions): UseAuthReturn {
  const { graphqlClient, language = 'NL', onAuthHeaderUpdate, configuration } = options;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Login ─────────────────────────────────────────────────────────────────

  const login = useCallback(async (
    email: string,
    password: string,
    onLoginSubmit?: (email: string, password: string) => Promise<Contact | Customer>,
  ): Promise<LoginResult> => {
    setLoading(true);
    setError(null);
    try {
      if (onLoginSubmit) {
        const user = await onLoginSubmit(email, password);
        return { success: true, user };
      }
      const loginService = getServices(graphqlClient).login;
      const loginResult = await loginService.login({ email, password });
      const session = loginResult?.session;
      const accessToken = session?.accessToken;
      const refreshToken = session?.refreshToken;
      const expiresAt = session?.expirationTime;
      if (accessToken) {
        graphqlClient.setAccessToken(accessToken);
        onAuthHeaderUpdate?.(accessToken);
      }
      const userService = getServices(graphqlClient).user;
      const viewerInput: ViewerInput = {
        ...(configuration?.contactTrackAttributes?.length && {
          contactAttributesInput: { attributeDescription: { names: configuration.contactTrackAttributes } },
        }),
        ...(configuration?.customerTrackAttributes?.length && {
          customerAttributesInput: { attributeDescription: { names: configuration.customerTrackAttributes } },
        }),
        ...(configuration?.companyTrackAttributes?.length && {
          companyAttributesInput: { attributeDescription: { names: configuration.companyTrackAttributes } },
        }),
        ...(configuration?.contactPAConfigInput && {
          contactPAConfigInput: configuration.contactPAConfigInput,
        }),
      };
      const viewer = await userService.getViewer(viewerInput);
      const user = viewer as Contact | Customer;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));
      }
      return { success: true, user, accessToken, refreshToken, expiresAt };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Login failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [graphqlClient, language, onAuthHeaderUpdate, configuration]);

  // ── Register contact ──────────────────────────────────────────────────────
  // Mirrors RegisterForm.tsx contact registration path:
  // createCompany → registerContact (ContactRegisterInput) → createCompanyAddress(es)

  const registerContact = useCallback(async (
    input: RegisterContactInput,
    preferredLanguage = language,
    autoLogin = true,
  ): Promise<LoginResult> => {
    setLoading(true);
    setError(null);
    try {
      const userService = getServices(graphqlClient).user;
      const companyService = getServices(graphqlClient).company;
      const addressService = getServices(graphqlClient).address;

      let companyId: number | undefined;
      if (input.companyName) {
        const companyInput: CreateCompanyInput = {
          name: input.companyName,
          ...(input.vatNumber && { taxNumber: input.vatNumber }),
          ...(input.cocNumber && { cocNumber: input.cocNumber }),
          email: input.email,
          ...(input.phone && { phone: input.phone }),
        };
        const company = await companyService.createCompany({
          input: companyInput,
          contactPAConfigInput: { page: 1, offset: 10 },
          companyAttributesInput: {},
          contactSearchArguments: { page: 1, offset: 10 },
        });
        companyId = company.companyId;
      }

      const contactInput: ContactRegisterInput = {
        contactRegisterInput: {
          email: input.email,
          password: input.password,
          firstName: input.firstName,
          ...(input.middleName && { middleName: input.middleName }),
          lastName: input.lastName,
          ...(input.phone && { phone: input.phone }),
          ...(input.gender && { gender: input.gender }),
          primaryLanguage: preferredLanguage,
          parentId: companyId as number,
        },
        companyAttributesInput: {},
        contactAttributesInput: {},
        contactPAConfigInput: { page: 1, offset: 10 },
      };
      // The contact-register response includes a `favoriteLists` sub-selection
      // that the FavoriteListsV2 service rejects with FORBIDDEN for newly-created
      // contacts (no session active yet). The SDK's executeMutation logs but
      // doesn't throw on partial-data responses, so this try/catch is defensive
      // — if the SDK behavior changes, we still continue past the partial error
      // because the contact was created server-side regardless.
      let registeredContactId: number | undefined;
      try {
        const registerResult = await userService.registerContact(contactInput);
        registeredContactId = (registerResult?.contact as unknown as Contact | undefined)?.contactId;
      } catch {
        // Swallow: contact creation succeeded server-side; the only failing
        // sub-selection is the favoriteLists field, which is empty for new users.
      }

      if (input.street && companyId) {
        const invoiceAddress: CompanyAddressCreateInput = {
          firstName: input.firstName,
          lastName: input.lastName,
          ...(input.gender && { gender: input.gender }),
          street: input.street,
          number: input.number,
          numberExtension: input.numberExtension,
          postalCode: input.postalCode ?? '',
          city: input.city ?? '',
          country: input.country ?? 'NL',
          type: AddressType.invoice,
          isDefault: YesNo.Y,
          companyId,
        };
        await addressService.createCompanyAddress(invoiceAddress);

        // Determine the delivery-address payload:
        // - If "same as billing" is checked, copy the billing fields and only
        //   change `type` to `delivery` so Propeller has a dedicated delivery
        //   record for the contact.
        // - Otherwise, use the separately-entered delivery fields (skip if the
        //   user left them empty).
        if (input.sameDeliveryAsBilling) {
          const deliveryAddress: CompanyAddressCreateInput = {
            ...invoiceAddress,
            type: AddressType.delivery,
          };
          await addressService.createCompanyAddress(deliveryAddress);
        } else if (input.deliveryStreet) {
          const deliveryAddress: CompanyAddressCreateInput = {
            firstName: input.firstName,
            lastName: input.lastName,
            ...(input.gender && { gender: input.gender }),
            street: input.deliveryStreet,
            number: input.deliveryNumber,
            numberExtension: input.deliveryNumberExtension,
            postalCode: input.deliveryPostalCode ?? '',
            city: input.deliveryCity ?? '',
            country: input.deliveryCountry ?? 'NL',
            type: AddressType.delivery,
            isDefault: YesNo.Y,
            companyId,
          };
          await addressService.createCompanyAddress(deliveryAddress);
        }
      }

      if (registeredContactId) {
        try {
          await userService.triggerContactSendWelcomeEmailEvent({
            contactId: registeredContactId,
            language: preferredLanguage,
            ...(configuration?.channelId && { channelId: configuration.channelId }),
          });
        } catch (e) {
          console.error('Failed to send welcome email to contact', e);
        }
      }

      if (autoLogin) {
        return await login(input.email, input.password);
      }
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [graphqlClient, language, login, configuration]);

  // ── Register customer ─────────────────────────────────────────────────────
  // Mirrors RegisterForm.tsx customer registration path:
  // registerCustomer (CustomerRegisterInput) → login → createCustomerAddress

  const registerCustomer = useCallback(async (
    input: RegisterCustomerInput,
    preferredLanguage = language,
    autoLogin = true,
  ): Promise<LoginResult> => {
    setLoading(true);
    setError(null);
    try {
      const userService = getServices(graphqlClient).user;
      const addressService = getServices(graphqlClient).address;

      const customerInput: CustomerRegisterInput = {
        customerRegisterInput: {
          email: input.email,
          password: input.password,
          firstName: input.firstName,
          ...(input.middleName && { middleName: input.middleName }),
          lastName: input.lastName,
          ...(input.phone && { phone: input.phone }),
          ...(input.gender && { gender: input.gender }),
          primaryLanguage: preferredLanguage,
        },
        customerAttributesInput: {},
      };
      await userService.registerCustomer(customerInput);

      const loginResult = await login(input.email, input.password);
      if (!loginResult.success) return loginResult;

      let addressesCreated = false;
      if (input.street && isCustomer(loginResult.user ?? null)) {
        const customer = loginResult.user as Customer;
        const invoiceAddress: CustomerAddressCreateInput = {
          firstName: input.firstName,
          lastName: input.lastName,
          ...(input.gender && { gender: input.gender }),
          street: input.street,
          number: input.number,
          numberExtension: input.numberExtension,
          postalCode: input.postalCode ?? '',
          city: input.city ?? '',
          country: input.country ?? 'NL',
          type: AddressType.invoice,
          isDefault: YesNo.Y,
          customerId: customer.customerId,
        };
        await addressService.createCustomerAddress(invoiceAddress);
        addressesCreated = true;

        // Mirror the contact flow: when "same as billing" is checked, copy the
        // billing fields into a delivery-typed record so Propeller has a
        // dedicated default delivery address. Otherwise, use the separately
        // entered delivery fields (skip if the user left them empty).
        if (input.sameDeliveryAsBilling) {
          const deliveryAddress: CustomerAddressCreateInput = {
            ...invoiceAddress,
            type: AddressType.delivery,
          };
          await addressService.createCustomerAddress(deliveryAddress);
        } else if (input.deliveryStreet) {
          const deliveryAddress: CustomerAddressCreateInput = {
            firstName: input.firstName,
            lastName: input.lastName,
            ...(input.gender && { gender: input.gender }),
            street: input.deliveryStreet,
            number: input.deliveryNumber,
            numberExtension: input.deliveryNumberExtension,
            postalCode: input.deliveryPostalCode ?? '',
            city: input.deliveryCity ?? '',
            country: input.deliveryCountry ?? 'NL',
            type: AddressType.delivery,
            isDefault: YesNo.Y,
            customerId: customer.customerId,
          };
          await addressService.createCustomerAddress(deliveryAddress);
        }
      }

      if (isCustomer(loginResult.user ?? null)) {
        try {
          await userService.triggerCustomerSendWelcomeEmailEvent({
            customerId: (loginResult.user as Customer).customerId,
            language: preferredLanguage,
            ...(configuration?.channelId && { channelId: configuration.channelId }),
          });
        } catch (e) {
          console.error('Failed to send welcome email to customer', e);
        }
      }

      if (!autoLogin) {
        // Address creation needed the customerId from login(); now drop the
        // session so the caller doesn't see this as a logged-in flow.
        graphqlClient.setAccessToken('');
        onAuthHeaderUpdate?.('');
        return { success: true };
      }

      // Re-fetch the viewer so the returned user includes the just-created
      // addresses. The user object captured by login() above is a snapshot
      // taken before the addresses existed, and consumers that store it
      // (auth context, dashboard, /account/addresses) would otherwise see no
      // addresses until the next page load.
      if (addressesCreated) {
        try {
          const viewerInput: ViewerInput = {
            ...(configuration?.customerTrackAttributes?.length && {
              customerAttributesInput: { attributeDescription: { names: configuration.customerTrackAttributes } },
            }),
          };
          const refreshedViewer = await userService.getViewer(viewerInput);
          const refreshedUser = refreshedViewer as Contact | Customer;
          return { ...loginResult, user: refreshedUser };
        } catch {
          // Fall through to original loginResult — addresses still exist
          // server-side; only the local snapshot is stale.
        }
      }
      return loginResult;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [graphqlClient, language, login, onAuthHeaderUpdate, configuration]);

  // ── Forgot password ───────────────────────────────────────────────────────

  const forgotPassword = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);
    try {
      const userService = getServices(graphqlClient).user;
      const resetInput: PasswordResetInput = { email };
      await userService.sendPasswordResetEmail(resetInput);
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to send reset email';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [graphqlClient]);

  return { loading, error, login, registerContact, registerCustomer, forgotPassword };
}
