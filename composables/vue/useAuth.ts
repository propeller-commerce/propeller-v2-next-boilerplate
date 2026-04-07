/**
 * useAuth (Vue) — Login, registration, and forgot-password flows.
 *
 * Covers: LoginForm, RegisterForm, ForgotPassword components.
 */

import { ref, type Ref } from 'vue';
import { LoginService, UserService, CompanyService, AddressService, Enums } from 'propeller-sdk-v2';
import type { GraphQLClient, Contact, Customer } from 'propeller-sdk-v2';

export interface UseAuthOptions {
  graphqlClient: GraphQLClient;
  language?: string;
  onAuthHeaderUpdate?: (token: string) => void;
}

export interface LoginResult {
  success: boolean;
  user?: Contact | Customer;
  error?: string;
}

export interface RegisterContactInput {
  email: string; password: string; firstName: string; middleName?: string; lastName: string;
  phone?: string; gender?: Enums.Gender; companyName?: string; vatNumber?: string; cocNumber?: string;
  street?: string; number?: string; numberExtension?: string; postalCode?: string; city?: string; country?: string;
  deliveryStreet?: string; deliveryNumber?: string; deliveryPostalCode?: string; deliveryCity?: string; deliveryCountry?: string;
  sameDeliveryAsBilling?: boolean;
}

export interface RegisterCustomerInput {
  email: string; password: string; firstName: string; middleName?: string; lastName: string;
  phone?: string; gender?: Enums.Gender; street?: string; number?: string; postalCode?: string; city?: string; country?: string;
}

export interface UseAuthReturn {
  loading: Ref<boolean>;
  error: Ref<string | null>;
  login: (email: string, password: string, onLoginSubmit?: (email: string, password: string) => Promise<Contact | Customer>) => Promise<LoginResult>;
  registerContact: (input: RegisterContactInput, preferredLanguage?: string) => Promise<LoginResult>;
  registerCustomer: (input: RegisterCustomerInput, preferredLanguage?: string) => Promise<LoginResult>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

export function useAuth(options: UseAuthOptions): UseAuthReturn {
  const { graphqlClient, language = 'NL', onAuthHeaderUpdate } = options;
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function login(
    email: string, password: string,
    onLoginSubmit?: (email: string, password: string) => Promise<Contact | Customer>
  ): Promise<LoginResult> {
    loading.value = true; error.value = null;
    try {
      if (onLoginSubmit) { const user = await onLoginSubmit(email, password); return { success: true, user }; }
      const loginService = new LoginService(graphqlClient);
      const loginResult = await loginService.login({ email, password });
      const accessToken = loginResult?.session?.accessToken;
      if (accessToken) onAuthHeaderUpdate?.(accessToken);
      const userService = new UserService(graphqlClient);
      const viewer = await userService.getViewer({} as any);
      const user = viewer as unknown as Contact | Customer;
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('userLoggedIn', { detail: { user } }));
      return { success: true, user };
    } catch (e: any) {
      const msg = e?.message || 'Login failed'; error.value = msg; return { success: false, error: msg };
    } finally { loading.value = false; }
  }

  async function registerContact(input: RegisterContactInput, preferredLanguage = language): Promise<LoginResult> {
    loading.value = true; error.value = null;
    try {
      const userService = new UserService(graphqlClient);
      const companyService = new CompanyService(graphqlClient);
      const addressService = new AddressService(graphqlClient);
      let companyId: number | undefined;
      if (input.companyName) {
        const company = await companyService.createCompany({ name: input.companyName, ...(input.vatNumber && { vatNumber: input.vatNumber }), ...(input.cocNumber && { cocNumber: input.cocNumber }) } as any);
        companyId = company.companyId;
      }
      await userService.registerContact({
        email: input.email, password: input.password, firstName: input.firstName,
        ...(input.middleName && { middleName: input.middleName }), lastName: input.lastName,
        ...(input.phone && { phone: input.phone }), ...(input.gender && { gender: input.gender }),
        preferredLanguage, ...(companyId && { companyId }),
      } as any);
      if (input.street && companyId) {
        await addressService.createCompanyAddress({
          companyId, type: 'invoice' as any, firstName: input.firstName, lastName: input.lastName,
          street: input.street, number: input.number || '', postalCode: input.postalCode || '',
          city: input.city || '', country: input.country || 'NL', isDefault: 'Y' as any,
        } as any);
        if (!input.sameDeliveryAsBilling && input.deliveryStreet) {
          await addressService.createCompanyAddress({
            companyId, type: 'delivery' as any, firstName: input.firstName, lastName: input.lastName,
            street: input.deliveryStreet, number: input.deliveryNumber || '', postalCode: input.deliveryPostalCode || '',
            city: input.deliveryCity || '', country: input.deliveryCountry || 'NL', isDefault: 'Y' as any,
          } as any);
        }
      }
      return await login(input.email, input.password);
    } catch (e: any) {
      const msg = e?.message || 'Registration failed'; error.value = msg; return { success: false, error: msg };
    } finally { loading.value = false; }
  }

  async function registerCustomer(input: RegisterCustomerInput, preferredLanguage = language): Promise<LoginResult> {
    loading.value = true; error.value = null;
    try {
      const userService = new UserService(graphqlClient);
      const addressService = new AddressService(graphqlClient);
      await userService.registerCustomer({
        email: input.email, password: input.password, firstName: input.firstName,
        ...(input.middleName && { middleName: input.middleName }), lastName: input.lastName,
        ...(input.phone && { phone: input.phone }), ...(input.gender && { gender: input.gender }), preferredLanguage,
      } as any);
      const loginResult = await login(input.email, input.password);
      if (!loginResult.success) return loginResult;
      if (input.street && (loginResult.user as any)?.customerId) {
        await addressService.createCustomerAddress({
          customerId: (loginResult.user as any).customerId, type: 'invoice' as any,
          firstName: input.firstName, lastName: input.lastName, street: input.street,
          number: input.number || '', postalCode: input.postalCode || '', city: input.city || '',
          country: input.country || 'NL', isDefault: 'Y' as any,
        } as any);
      }
      return loginResult;
    } catch (e: any) {
      const msg = e?.message || 'Registration failed'; error.value = msg; return { success: false, error: msg };
    } finally { loading.value = false; }
  }

  async function forgotPassword(email: string): Promise<{ success: boolean; error?: string }> {
    loading.value = true; error.value = null;
    try {
      const userService = new UserService(graphqlClient);
      await (userService as any).sendPasswordResetEmail({ email });
      return { success: true };
    } catch (e: any) {
      const msg = e?.message || 'Failed to send reset email'; error.value = msg; return { success: false, error: msg };
    } finally { loading.value = false; }
  }

  return { loading, error, login, registerContact, registerCustomer, forgotPassword };
}
