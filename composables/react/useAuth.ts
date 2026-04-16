/**
 * useAuth (React) — Login, registration, and forgot-password flows.
 *
 * React mirror of vue/useAuth.ts.
 * Mirrors RegisterForm.lite.tsx, LoginForm.lite.tsx, ForgotPassword.lite.tsx.
 *
 * Responsibilities:
 * - login: LoginService + getViewer for session token + user
 * - registerContact: createCompany → registerContact (ContactRegisterInput wrapper) → createCompanyAddress
 * - registerCustomer: registerCustomer (CustomerRegisterInput wrapper) → login → createCustomerAddress
 * - forgotPassword: UserService.sendPasswordResetEmail
 */

import { useState, useCallback } from 'react';
import {
  LoginService,
  UserService,
  CompanyService,
  AddressService,
  Enums,
} from 'propeller-sdk-v2';
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
  gender?: Enums.Gender;
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
  gender?: Enums.Gender;
  street?: string;
  number?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

export interface UseAuthOptions {
  graphqlClient: GraphQLClient;
  language?: string;
  onAuthHeaderUpdate?: (token: string) => void;
}

export interface UseAuthReturn {
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, onLoginSubmit?: (email: string, password: string) => Promise<Contact | Customer>) => Promise<LoginResult>;
  registerContact: (input: RegisterContactInput, preferredLanguage?: string) => Promise<LoginResult>;
  registerCustomer: (input: RegisterCustomerInput, preferredLanguage?: string) => Promise<LoginResult>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useAuth(options: UseAuthOptions): UseAuthReturn {
  const { graphqlClient, language = 'NL', onAuthHeaderUpdate } = options;
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
      const loginService = new LoginService(graphqlClient);
      const loginResult = await loginService.login({ email, password });
      const session = loginResult?.session;
      const accessToken = session?.accessToken;
      const refreshToken = session?.refreshToken;
      const expiresAt = session?.expirationTime;
      if (accessToken) {
        graphqlClient.setAccessToken(accessToken);
        onAuthHeaderUpdate?.(accessToken);
      }
      const userService = new UserService(graphqlClient);
      const viewerInput: ViewerInput = {};
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
  }, [graphqlClient, language, onAuthHeaderUpdate]);

  // ── Register contact ──────────────────────────────────────────────────────
  // Mirrors RegisterForm.lite.tsx contact registration path:
  // createCompany → registerContact (ContactRegisterInput) → createCompanyAddress(es)

  const registerContact = useCallback(async (
    input: RegisterContactInput,
    preferredLanguage = language,
  ): Promise<LoginResult> => {
    setLoading(true);
    setError(null);
    try {
      const userService = new UserService(graphqlClient);
      const companyService = new CompanyService(graphqlClient);
      const addressService = new AddressService(graphqlClient);

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
      await userService.registerContact(contactInput);

      if (input.street && companyId) {
        const invoiceAddress: CompanyAddressCreateInput = {
          firstName: input.firstName,
          lastName: input.lastName,
          street: input.street,
          number: input.number,
          numberExtension: input.numberExtension,
          postalCode: input.postalCode ?? '',
          city: input.city ?? '',
          country: input.country ?? 'NL',
          type: Enums.AddressType.invoice,
          isDefault: Enums.YesNo.Y,
          companyId,
        };
        await addressService.createCompanyAddress(invoiceAddress);

        if (!input.sameDeliveryAsBilling && input.deliveryStreet) {
          const deliveryAddress: CompanyAddressCreateInput = {
            firstName: input.firstName,
            lastName: input.lastName,
            street: input.deliveryStreet,
            number: input.deliveryNumber,
            postalCode: input.deliveryPostalCode ?? '',
            city: input.deliveryCity ?? '',
            country: input.deliveryCountry ?? 'NL',
            type: Enums.AddressType.delivery,
            isDefault: Enums.YesNo.Y,
            companyId,
          };
          await addressService.createCompanyAddress(deliveryAddress);
        }
      }

      return await login(input.email, input.password);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [graphqlClient, language, login]);

  // ── Register customer ─────────────────────────────────────────────────────
  // Mirrors RegisterForm.lite.tsx customer registration path:
  // registerCustomer (CustomerRegisterInput) → login → createCustomerAddress

  const registerCustomer = useCallback(async (
    input: RegisterCustomerInput,
    preferredLanguage = language,
  ): Promise<LoginResult> => {
    setLoading(true);
    setError(null);
    try {
      const userService = new UserService(graphqlClient);
      const addressService = new AddressService(graphqlClient);

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

      if (input.street && isCustomer(loginResult.user ?? null)) {
        const customer = loginResult.user as Customer;
        const invoiceAddress: CustomerAddressCreateInput = {
          firstName: input.firstName,
          lastName: input.lastName,
          street: input.street,
          number: input.number,
          postalCode: input.postalCode ?? '',
          city: input.city ?? '',
          country: input.country ?? 'NL',
          type: Enums.AddressType.invoice,
          isDefault: Enums.YesNo.Y,
          customerId: customer.customerId,
        };
        await addressService.createCustomerAddress(invoiceAddress);
      }

      return loginResult;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, [graphqlClient, language, login]);

  // ── Forgot password ───────────────────────────────────────────────────────

  const forgotPassword = useCallback(async (email: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    setError(null);
    try {
      const userService = new UserService(graphqlClient);
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
