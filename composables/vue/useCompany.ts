/**
 * useCompany (Vue) — Company switcher and Purchase Authorization Configurator.
 *
 * Covers: CompanySwitcher, PurchaseAuthorizationConfigurator, PurchaseAuthorizationRequests.
 */

import { ref, type Ref } from 'vue';
import { CompanyService, CartService, PurchaseAuthorizationConfigService } from 'propeller-sdk-v2';
import type { GraphQLClient, Company, Cart, Contact } from 'propeller-sdk-v2';

export interface PacCreateInput {
  contactId: number;
  purchaseRole: string;
  authorizationLimit: number;
}

export interface PacUpdateInput {
  purchaseRole?: string;
  authorizationLimit?: number;
}

export interface UseCompanyOptions {
  graphqlClient: GraphQLClient;
  user: Ref<Contact | null>;
  language?: Ref<string>;
}

export interface UseCompanyReturn {
  company: Ref<Company | null>;
  pendingCarts: Ref<Cart[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  fetchCompany: (companyId: number, variables?: any) => Promise<void>;
  fetchPendingCarts: (companyId: number) => Promise<void>;
  createPac: (input: any) => Promise<{ success: boolean; error?: string }>;
  updatePac: (pacId: string, input: any) => Promise<{ success: boolean; error?: string }>;
  deletePac: (pacId: string) => Promise<{ success: boolean; error?: string }>;
  acceptCartRequest: (cartId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useCompany(options: UseCompanyOptions): UseCompanyReturn {
  const { graphqlClient } = options;

  const company = ref<Company | null>(null) as Ref<Company | null>;
  const pendingCarts = ref<Cart[]>([]) as Ref<Cart[]>;
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchCompany(companyId: number, variables?: any): Promise<void> {
    loading.value = true; error.value = null;
    try {
      const service = new CompanyService(graphqlClient);
      const result = await service.getCompany({ id: companyId, ...variables } as any);
      company.value = result;
    } catch (e: any) { error.value = e?.message || 'Failed to fetch company'; }
    finally { loading.value = false; }
  }

  async function fetchPendingCarts(companyId: number): Promise<void> {
    loading.value = true;
    try {
      const service = new CartService(graphqlClient);
      const result = await service.getCarts({ companyIds: [companyId], statuses: ['PENDING' as any], offset: 50 });
      pendingCarts.value = (result as any)?.items || [];
    } catch (e: any) { error.value = e?.message || 'Failed to fetch pending carts'; }
    finally { loading.value = false; }
  }

  async function createPac(input: any): Promise<{ success: boolean; error?: string }> {
    try {
      const service = new PurchaseAuthorizationConfigService(graphqlClient);
      await service.createPurchaseAuthorizationConfig(input);
      return { success: true };
    } catch (e: any) { return { success: false, error: e?.message || 'Failed to create PAC' }; }
  }

  async function updatePac(pacId: string, input: any): Promise<{ success: boolean; error?: string }> {
    try {
      const service = new PurchaseAuthorizationConfigService(graphqlClient);
      await service.updatePurchaseAuthorizationConfig(pacId, input);
      return { success: true };
    } catch (e: any) { return { success: false, error: e?.message || 'Failed to update PAC' }; }
  }

  async function deletePac(pacId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const service = new PurchaseAuthorizationConfigService(graphqlClient);
      await service.deletePurchaseAuthorizationConfig(pacId);
      return { success: true };
    } catch (e: any) { return { success: false, error: e?.message || 'Failed to delete PAC' }; }
  }

  async function acceptCartRequest(cartId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const service = new CartService(graphqlClient);
      await service.acceptPurchaseAuthorizationRequest({ id: cartId });
      return { success: true };
    } catch (e: any) { return { success: false, error: e?.message || 'Failed to accept request' }; }
  }

  return { company, pendingCarts, loading, error, fetchCompany, fetchPendingCarts, createPac, updatePac, deletePac, acceptCartRequest };
}
