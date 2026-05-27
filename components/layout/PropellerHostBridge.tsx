'use client';

/**
 * PropellerHostBridge — host-side glue that wires the boilerplate's auth /
 * company / price / language stores into the package's two-tier provider.
 *
 * After Workstream E the package splits its DI into two providers:
 *   - <PropellerDepsProvider> — Tier 1, app-wide (graphqlClient, services,
 *     currency, configuration). Doesn't change at runtime.
 *   - <PropellerProvider>     — Tier 2, per-scope (user, companyId, language,
 *     includeTax, portalMode). Nestable for impersonation / multi-cart.
 *
 * The bridge mounts both, so package components inside this subtree see a
 * unified PropellerInfra via `useInfraProps()` / `usePropellerContext()`.
 *
 * Mirror file in propeller-vue: a small wrapper component that reads the
 * host's Pinia stores and feeds the same values to <PropellerProvider> after
 * `app.use(propellerVue, deps)` has installed Tier 1 deps.
 */

import { useMemo, ReactNode } from 'react';
import { graphqlClient, services } from '@/lib/api';
import { config } from '@/data/config';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { usePrice } from '@/context/PriceContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  PropellerDepsProvider,
  PropellerProvider,
  type PropellerDeps,
  type PropellerScope,
} from 'propeller-v2-react-ui';

// Tier 1 deps are module-constant — graphqlClient/services/config never
// change at runtime, so hoist outside the component to avoid a fresh object
// per render (which would re-broadcast the deps context to every consumer).
const deps: PropellerDeps = {
  graphqlClient,
  services,
  currency: config.currency,
  configuration: config,
};

export default function PropellerHostBridge({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const { selectedCompany } = useCompany();
  const { includeTax } = usePrice();
  const { language } = useLanguage();

  // Tier 2 scope — only the 4 reactive store values are deps; the memo keeps
  // the context value stable across unrelated parent renders so scope
  // consumers only re-render on intentional cache-busts.
  const scope = useMemo<PropellerScope>(
    () => ({
      user: state.user,
      companyId: selectedCompany?.companyId,
      language,
      includeTax,
      portalMode: config.portal.mode,
    }),
    [state.user, selectedCompany?.companyId, language, includeTax]
  );

  return (
    <PropellerDepsProvider value={deps}>
      <PropellerProvider value={scope}>{children}</PropellerProvider>
    </PropellerDepsProvider>
  );
}
