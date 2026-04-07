/**
 * useCompany (React) — Company switcher and Purchase Authorization Configurator.
 *
 * React mirror of vue/useCompany.ts.
 */

import { useState, useCallback } from 'react';
import { CompanyService, CartService, PurchaseAuthorizationConfigService } from 'propeller-sdk-v2';
import type { GraphQLClient, Company, Cart } from 'propeller-sdk-v2';

export interface UseCompanyOptions {
  graphqlClient: GraphQLClient;
  language?: string;
}

export interface UseCompanyReturn {
  company: Company | null;
  pendingCarts: Cart[];
  loading: boolean;
  error: string | null;
  fetchCompany: (companyId: number, variables?: any) => Promise<void>;
  fetchPendingCarts: (companyId: number) => Promise<void>;
  createPac: (input: any) => Promise<{ success: boolean; error?: string }>;
  updatePac: (pacId: string, input: any) => Promise<{ success: boolean; error?: string }>;
  deletePac: (pacId: string) => Promise<{ success: boolean; error?: string }>;
  acceptCartRequest: (cartId: string) => Promise<{ success: boolean; error?: string }>;
}

export function useCompany(options: UseCompanyOptions): UseCompanyReturn {
  const { graphqlClient } = options;

  const [company, setCompany] = useState<Company | null>(null);
  const [pendingCarts, setPendingCarts] = useState<Cart[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCompany = useCallback(async (companyId: number, variables?: any): Promise<void> => {
    setLoading(true); setError(null);
    try {
      const service = new CompanyService(graphqlClient);
      const result = await service.getCompany({ id: companyId, ...variables } as any);
      setCompany(result);
    } catch (e: any) { setError(e?.message || 'Failed to fetch company'); }
    finally { setLoading(false); }
  }, [graphqlClient]);

  const fetchPendingCarts = useCallback(async (companyId: number): Promise<void> => {
    setLoading(true);
    try {
      const service = new CartService(graphqlClient);
      const result = await service.getCarts({ companyIds: [companyId], statuses: ['PENDING' as any], offset: 50 });
      setPendingCarts((result as any)?.items || []);
    } catch (e: any) { setError(e?.message || 'Failed to fetch pending carts'); }
    finally { setLoading(false); }
  }, [graphqlClient]);

  const createPac = useCallback(async (input: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const service = new PurchaseAuthorizationConfigService(graphqlClient);
      await service.createPurchaseAuthorizationConfig(input);
      return { success: true };
    } catch (e: any) { return { success: false, error: e?.message || 'Failed to create PAC' }; }
  }, [graphqlClient]);

  const updatePac = useCallback(async (pacId: string, input: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const service = new PurchaseAuthorizationConfigService(graphqlClient);
      await service.updatePurchaseAuthorizationConfig(pacId, input);
      return { success: true };
    } catch (e: any) { return { success: false, error: e?.message || 'Failed to update PAC' }; }
  }, [graphqlClient]);

  const deletePac = useCallback(async (pacId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const service = new PurchaseAuthorizationConfigService(graphqlClient);
      await service.deletePurchaseAuthorizationConfig(pacId);
      return { success: true };
    } catch (e: any) { return { success: false, error: e?.message || 'Failed to delete PAC' }; }
  }, [graphqlClient]);

  const acceptCartRequest = useCallback(async (cartId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const service = new CartService(graphqlClient);
      await service.acceptPurchaseAuthorizationRequest({ id: cartId });
      return { success: true };
    } catch (e: any) { return { success: false, error: e?.message || 'Failed to accept request' }; }
  }, [graphqlClient]);

  return { company, pendingCarts, loading, error, fetchCompany, fetchPendingCarts, createPac, updatePac, deletePac, acceptCartRequest };
}
