'use client';

import { createContext, useContext, useMemo, ReactNode } from 'react';
import { GraphQLClient, Contact, Customer } from 'propeller-sdk-v2';
import { graphqlClient } from '@/lib/api';
import { config } from '@/data/config';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { usePrice } from '@/context/PriceContext';
import { useLanguage } from '@/context/LanguageContext';

/**
 * Tier 1 infrastructure context. Aggregates the repetitive "infra" values
 * (graphqlClient, user, companyId, language, includeTax, configuration,
 * portalMode) that ~20 propeller components otherwise receive as cascaded
 * props. Reads the already-mounted Auth/Company/Price/Language providers plus
 * the module-level singletons so pages no longer have to wire these manually.
 */
export interface PropellerInfra {
  graphqlClient: GraphQLClient;
  user: Contact | Customer | null;
  companyId: number | undefined;
  language: string;
  includeTax: boolean;
  configuration: typeof config;
  portalMode: string;
}

const PropellerContext = createContext<PropellerInfra | null>(null);

export function PropellerProvider({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const { selectedCompany } = useCompany();
  const { includeTax } = usePrice();
  const { language } = useLanguage();

  const user = state.user;
  const companyId = selectedCompany?.companyId;

  // Only the 4 reactive values are deps. graphqlClient/config/portalMode are
  // module constants and never change at runtime, so a stable value object is
  // produced — context consumers only re-render on intentional cache-busts
  // (auth/company/language/tax), not on every parent render.
  const value = useMemo<PropellerInfra>(
    () => ({
      graphqlClient,
      user,
      companyId,
      language,
      includeTax,
      configuration: config,
      portalMode: config.portal.mode,
    }),
    [user, companyId, language, includeTax],
  );

  return (
    <PropellerContext.Provider value={value}>
      {children}
    </PropellerContext.Provider>
  );
}

/**
 * Non-throwing accessor: returns null outside the provider so components stay
 * usable standalone / in tests (backward-compat with explicit-prop callers).
 */
export function usePropellerContext(): PropellerInfra | null {
  return useContext(PropellerContext);
}
