/**
 * useCompany (Vue) — Company switcher and Purchase Authorization Configurator.
 *
 * Covers: CompanySwitcher, PurchaseAuthorizationConfigurator, PurchaseAuthorizationRequests.
 * Vue mirror of react/useCompany.ts.
 * Mirrors PurchaseAuthorizationConfigurator.lite.tsx and PurchaseAuthorizationRequests.lite.tsx.
 *
 * Responsibilities:
 * - fetchCompany: CompanyService.getCompany() with correctly-typed CompanyVariables
 * - fetchPendingCarts: CartService.getCarts() with Enums.CartStatus.PENDING_PURCHASE_AUTHORIZATION
 * - createPac / updatePac / deletePac: PurchaseAuthorizationConfigService with proper input types
 * - acceptCartRequest: CartService.acceptPurchaseAuthorizationRequest()
 */

import { ref, type Ref } from 'vue';
import {
  CompanyService,
  CartService,
  PurchaseAuthorizationConfigService,
  Enums,
} from 'propeller-sdk-v2';
import type {
  GraphQLClient,
  Company,
  Cart,
  CompanyVariables,
  ContactSearchArguments,
  ContactPurchaseAuthorizationConfigSearchInput,
  AttributeResultSearchInput,
  PurchaseAuthorizationConfigCreateInput,
  PurchaseAuthorizationConfigUpdateInput,
} from 'propeller-sdk-v2';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseCompanyOptions {
  graphqlClient: GraphQLClient;
  language?: Ref<string>;
}

export interface UseCompanyReturn {
  company: Ref<Company | null>;
  pendingCarts: Ref<Cart[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  fetchCompany: (companyId: number, overrides?: Partial<Omit<CompanyVariables, 'id'>>) => Promise<void>;
  fetchPendingCarts: (companyId: number) => Promise<void>;
  createPac: (input: PurchaseAuthorizationConfigCreateInput) => Promise<{ success: boolean; error?: string }>;
  updatePac: (pacId: string, input: PurchaseAuthorizationConfigUpdateInput) => Promise<{ success: boolean; error?: string }>;
  deletePac: (pacId: string) => Promise<{ success: boolean; error?: string }>;
  acceptCartRequest: (cartId: string) => Promise<{ success: boolean; error?: string }>;
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useCompany(options: UseCompanyOptions): UseCompanyReturn {
  const { graphqlClient } = options;

  const company = ref<Company | null>(null) as Ref<Company | null>;
  const pendingCarts = ref<Cart[]>([]) as Ref<Cart[]>;
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ── Fetch company ─────────────────────────────────────────────────────────
  // Mirrors PurchaseAuthorizationConfigurator.lite.tsx loadCompany():
  // - contactSearchArguments: { page: 1, offset: 50 }
  // - contactPAConfigInput: { companyIds: [companyId], page: 1, offset: 100 }
  // - companyAttributesInput: {}

  async function fetchCompany(companyId: number, overrides?: Partial<Omit<CompanyVariables, 'id'>>): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const service = new CompanyService(graphqlClient);
      const contactSearchArguments: ContactSearchArguments = { page: 1, offset: 50 };
      const contactPAConfigInput: ContactPurchaseAuthorizationConfigSearchInput = {
        companyIds: [companyId],
        page: 1,
        offset: 100,
      };
      const companyAttributesInput: AttributeResultSearchInput = {};
      const variables: CompanyVariables = {
        id: companyId,
        contactSearchArguments: overrides?.contactSearchArguments ?? contactSearchArguments,
        contactPAConfigInput: overrides?.contactPAConfigInput ?? contactPAConfigInput,
        companyAttributesInput: overrides?.companyAttributesInput ?? companyAttributesInput,
      };
      const result = await service.getCompany(variables);
      company.value = result;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch company';
    } finally {
      loading.value = false;
    }
  }

  // ── Fetch pending carts ───────────────────────────────────────────────────
  // Mirrors PurchaseAuthorizationRequests.lite.tsx:
  // - statuses: [CartStatus.PENDING_PURCHASE_AUTHORIZATION]

  async function fetchPendingCarts(companyId: number): Promise<void> {
    loading.value = true;
    try {
      const service = new CartService(graphqlClient);
      const result = await service.getCarts({
        companyIds: [companyId],
        statuses: [Enums.CartStatus.PENDING_PURCHASE_AUTHORIZATION],
        offset: 50,
      });
      pendingCarts.value = result.items ?? [];
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch pending carts';
    } finally {
      loading.value = false;
    }
  }

  // ── PAC CRUD ──────────────────────────────────────────────────────────────

  async function createPac(
    input: PurchaseAuthorizationConfigCreateInput,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const service = new PurchaseAuthorizationConfigService(graphqlClient);
      await service.createPurchaseAuthorizationConfig(input);
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to create PAC' };
    }
  }

  async function updatePac(
    pacId: string,
    input: PurchaseAuthorizationConfigUpdateInput,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const service = new PurchaseAuthorizationConfigService(graphqlClient);
      await service.updatePurchaseAuthorizationConfig(pacId, input);
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to update PAC' };
    }
  }

  async function deletePac(pacId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const service = new PurchaseAuthorizationConfigService(graphqlClient);
      await service.deletePurchaseAuthorizationConfig(pacId);
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to delete PAC' };
    }
  }

  async function acceptCartRequest(cartId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const service = new CartService(graphqlClient);
      await service.acceptPurchaseAuthorizationRequest({ id: cartId });
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to accept request' };
    }
  }

  return {
    company,
    pendingCarts,
    loading,
    error,
    fetchCompany,
    fetchPendingCarts,
    createPac,
    updatePac,
    deletePac,
    acceptCartRequest,
  };
}
