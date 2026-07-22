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

import { useEffect, useMemo, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@propeller-commerce/propeller-v2-react-ui';

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
  const router = useRouter();
  const { state } = useAuth();
  const { selectedCompany } = useCompany();
  const { includeTax } = usePrice();
  const { language } = useLanguage();

  // The selected company can be a STALE `selected_company` left in localStorage
  // by a previously logged-in identity — CompanyContext hydrates it
  // synchronously, before the current user is known. Sending a companyId the
  // signed-in contact isn't a member of makes PricingV2 reject the request
  // ("Provided companyId N does not match the contact's companies") until
  // CompanyContext's `userRefreshed` reconciler catches up — one render too late,
  // so the first catalog/parts fetch errors. Only expose a company the current
  // user actually belongs to; otherwise fall back to their default. Same
  // validation `resolveInstallationIds` already applies to the machine sourceIds.
  const companyId = useMemo<number | undefined>(() => {
    const selId = selectedCompany?.companyId;
    const u = state.user as
      | { company?: { companyId?: number }; companies?: { items?: { companyId?: number }[] } }
      | null;
    // Anonymous / user not resolved yet: no contact to mismatch, keep the selection.
    if (!u) return selId;
    const candidates = [...(u.companies?.items ?? []), ...(u.company ? [u.company] : [])];
    if (selId != null && candidates.some((c) => c?.companyId === selId)) return selId;
    return u.company?.companyId ?? undefined;
  }, [selectedCompany?.companyId, state.user]);

  // Tier 2 scope — only the 4 reactive store values are deps; the memo keeps
  // the context value stable across unrelated parent renders so scope
  // consumers only re-render on intentional cache-busts.
  const scope = useMemo<PropellerScope>(
    () => ({
      user: state.user,
      companyId,
      language,
      includeTax,
      portalMode: config.portal.mode,
    }),
    [state.user, companyId, language, includeTax]
  );

  // When the active company changes, ask Next to re-run the current Server
  // Component. CompanyContext has already mirrored the new selection into the
  // `selected_company_id` cookie, so the new server pass reads it via
  // `lib/server.ts:getServerInfra()` and re-fetches the category / search /
  // PDP / cluster data scoped to the new company. The PDP price block and
  // anything else seeded from server-fetched props refreshes for free.
  //
  // The grids (`<ProductGrid>`) ALSO re-query client-side because their
  // `companyId` infra prop changes — the two requests dedupe via the Next
  // fetch cache for anonymous routes, and for authenticated routes the
  // grid's effect is what actually replaces the stale items. Either path
  // alone leaves a gap (server-only misses post-hydration interactions;
  // client-only misses SSR data like cluster info that has no client
  // refetch hook), so we keep both.
  const lastCompanyIdRef = useRef<number | undefined>(selectedCompany?.companyId);
  useEffect(() => {
    if (lastCompanyIdRef.current === selectedCompany?.companyId) return;
    lastCompanyIdRef.current = selectedCompany?.companyId;
    router.refresh();
  }, [selectedCompany?.companyId, router]);

  return (
    <PropellerDepsProvider value={deps}>
      <PropellerProvider value={scope}>{children}</PropellerProvider>
    </PropellerDepsProvider>
  );
}
