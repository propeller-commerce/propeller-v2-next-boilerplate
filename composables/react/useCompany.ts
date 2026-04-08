/**
 * useCompany (React) — Company switcher and Purchase Authorization Configurator.
 *
 * React mirror of vue/useCompany.ts.
 * Mirrors PurchaseAuthorizationConfigurator.lite.tsx and PurchaseAuthorizationRequests.lite.tsx.
 *
 * Responsibilities:
 * - fetchCompany: CompanyService.getCompany() with correctly-typed CompanyVariables
 * - fetchPendingCarts: CartService.getCarts() with Enums.CartStatus.PENDING_PURCHASE_AUTHORIZATION
 * - createPac / updatePac / deletePac: PurchaseAuthorizationConfigService with proper input types
 * - acceptCartRequest: CartService.acceptPurchaseAuthorizationRequest()
 */

import { useState, useCallback } from 'react';
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
  language?: string;
}

export interface UseCompanyReturn {
  company: Company | null;
  pendingCarts: Cart[];
  loading: boolean;
  error: string | null;
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

  const [company, setCompany] = useState<Company | null>(null);
  const [pendingCarts, setPendingCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch company ─────────────────────────────────────────────────────────
  // Mirrors PurchaseAuthorizationConfigurator.lite.tsx loadCompany():
  // - $contactSearchArguments: { page: 1, offset: 50 }
  // - $contactPAConfigInput: { companyIds: [companyId], page: 1, offset: 100 }
  // - $companyAttributesInput: {}

  const fetchCompany = useCallback(async (companyId: number, overrides?: Partial<Omit<CompanyVariables, 'id'>>): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const service = new CompanyService(graphqlClient);
      const $contactSearchArguments: ContactSearchArguments = { page: 1, offset: 50 };
      const $contactPAConfigInput: ContactPurchaseAuthorizationConfigSearchInput = {
        companyIds: [companyId],
        page: 1,
        offset: 100,
      };
      const $companyAttributesInput: AttributeResultSearchInput = {};
      const variables: CompanyVariables = {
        id: companyId,
        $contactSearchArguments: overrides?.$contactSearchArguments ?? $contactSearchArguments,
        $contactPAConfigInput: overrides?.$contactPAConfigInput ?? $contactPAConfigInput,
        $companyAttributesInput: overrides?.$companyAttributesInput ?? $companyAttributesInput,
      };
      const result = await service.getCompany(variables);
      setCompany(result);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch company');
    } finally {
      setLoading(false);
    }
  }, [graphqlClient]);

  // ── Fetch pending carts ───────────────────────────────────────────────────
  // Mirrors PurchaseAuthorizationRequests.lite.tsx:
  // - statuses: [CartStatus.PENDING_PURCHASE_AUTHORIZATION]

  const fetchPendingCarts = useCallback(async (companyId: number): Promise<void> => {
    setLoading(true);
    try {
      const service = new CartService(graphqlClient);
      const result = await service.getCarts({
        companyIds: [companyId],
        statuses: [Enums.CartStatus.PENDING_PURCHASE_AUTHORIZATION],
        offset: 50,
      });
      setPendingCarts(result.items ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch pending carts');
    } finally {
      setLoading(false);
    }
  }, [graphqlClient]);

  // ── PAC CRUD ──────────────────────────────────────────────────────────────

  const createPac = useCallback(async (
    input: PurchaseAuthorizationConfigCreateInput,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const service = new PurchaseAuthorizationConfigService(graphqlClient);
      await service.createPurchaseAuthorizationConfig(input);
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to create PAC' };
    }
  }, [graphqlClient]);

  const updatePac = useCallback(async (
    pacId: string,
    input: PurchaseAuthorizationConfigUpdateInput,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const service = new PurchaseAuthorizationConfigService(graphqlClient);
      await service.updatePurchaseAuthorizationConfig(pacId, input);
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to update PAC' };
    }
  }, [graphqlClient]);

  const deletePac = useCallback(async (pacId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const service = new PurchaseAuthorizationConfigService(graphqlClient);
      await service.deletePurchaseAuthorizationConfig(pacId);
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to delete PAC' };
    }
  }, [graphqlClient]);

  const acceptCartRequest = useCallback(async (cartId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const service = new CartService(graphqlClient);
      await service.acceptPurchaseAuthorizationRequest({ id: cartId });
      return { success: true };
    } catch (e: unknown) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to accept request' };
    }
  }, [graphqlClient]);

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
