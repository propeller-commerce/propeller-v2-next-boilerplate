'use client';

/**
 * PropellerHostBridge — host-side glue that wires the boilerplate's auth /
 * company / price / language stores into the package's PropellerProvider.
 *
 * After Phase D, `PropellerProvider` takes its value object as an explicit
 * prop and imports nothing from `@/context/*`. The aggregation that used to
 * live inside the provider lives here instead. When the propeller surface
 * ships as `@propeller/react`, each adopter writes a thin file like this to
 * map their own state stores into the PropellerInfra shape — there's no
 * assumption baked into the package about how the host manages auth/cart/etc.
 *
 * Mirror file in propeller-vue: a small wrapper component that reads the
 * host's Pinia/Vuex stores and feeds the same value object to the Vue
 * PropellerProvider.
 */

import { useMemo, ReactNode } from 'react';
import { graphqlClient, services } from '@/lib/api';
import { config } from '@/data/config';
import { useAuth } from '@/context/AuthContext';
import { useCompany } from '@/context/CompanyContext';
import { usePrice } from '@/context/PriceContext';
import { useLanguage } from '@/context/LanguageContext';
import { PropellerProvider, PropellerInfra } from 'propeller-v2-react-ui';

export default function PropellerHostBridge({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const { selectedCompany } = useCompany();
  const { includeTax } = usePrice();
  const { language } = useLanguage();

  // Only the 4 reactive values are deps; graphqlClient/services/config/portalMode
  // are module constants and never change at runtime, so a stable value object
  // is produced — context consumers only re-render on intentional cache-busts
  // (auth/company/language/tax), not on every parent render.
  const value = useMemo<PropellerInfra>(
    () => ({
      graphqlClient,
      services,
      user: state.user,
      companyId: selectedCompany?.companyId,
      language,
      includeTax,
      currency: config.currency,
      configuration: config,
      portalMode: config.portal.mode,
    }),
    [state.user, selectedCompany?.companyId, language, includeTax]
  );

  return <PropellerProvider value={value}>{children}</PropellerProvider>;
}
