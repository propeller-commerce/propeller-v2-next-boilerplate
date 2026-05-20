'use client';

import { createContext, useContext, ReactNode } from 'react';
import { GraphQLClient, Contact, Customer } from 'propeller-sdk-v2';

/**
 * Tier 1 infrastructure context. Aggregates the repetitive "infra" values
 * that ~20 propeller components otherwise receive as cascaded props.
 *
 * Phase D refactor (2026-05-20): the provider now takes its value object as
 * an explicit prop. Previously it imported the host app's AuthContext /
 * CompanyContext / PriceContext / LanguageContext directly, which was fine
 * for the monolithic boilerplate but blocks extraction into a standalone
 * package — a published `@propeller/react` cannot assume the consumer's
 * auth library or react-context naming. The host now does the aggregation
 * and passes the result in via `value`. See app/layout.tsx in this repo
 * for the canonical wire-up.
 */
export interface PropellerInfra {
  graphqlClient: GraphQLClient;
  user: Contact | Customer | null;
  companyId: number | undefined;
  language: string;
  includeTax: boolean;
  /**
   * Free-form configuration bag forwarded to components. Today the only
   * field the propeller surface reads from it is `currency`, but kept as
   * `unknown` so consumers can stuff extra config in for their own use
   * without changing this interface.
   */
  configuration: unknown;
  portalMode: string;
}

const PropellerContext = createContext<PropellerInfra | null>(null);

export interface PropellerProviderProps {
  /** The infra value object. Reactive — the provider passes it through as-is. */
  value: PropellerInfra;
  children: ReactNode;
}

/**
 * Provider — host wires its own Auth / Company / Price / Language stores
 * into the `value` object. The package imports zero host contexts.
 *
 * @example
 * // host app/layout.tsx
 * function Providers({ children }) {
 *   const { state } = useAuth();
 *   const { selectedCompany } = useCompany();
 *   const { includeTax } = usePrice();
 *   const { language } = useLanguage();
 *   const value = useMemo(() => ({
 *     graphqlClient, user: state.user, companyId: selectedCompany?.companyId,
 *     language, includeTax, configuration: config, portalMode: config.portal.mode,
 *   }), [state.user, selectedCompany, includeTax, language]);
 *   return <PropellerProvider value={value}>{children}</PropellerProvider>;
 * }
 */
export function PropellerProvider({ value, children }: PropellerProviderProps) {
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
