'use client';

/**
 * The catalog root category id, resolved ONCE on the server and seeded to the
 * client — the same pattern `PriceProvider`/`LanguageProvider` use for the
 * cookie-seeded price and language.
 *
 * Why this exists: the id is `NEXT_PUBLIC_BASE_CATEGORY_ID` when set, otherwise
 * the channel's `catalogRootId` — and the channel is only reachable server-side
 * (`lib/server.ts` `resolveBaseCategoryId()`). Client components used to guess
 * it with a hardcoded `process.env.NEXT_PUBLIC_BASE_CATEGORY_ID || '1'`, which
 * on a tenant that leaves the env unset (the intended default — the channel
 * drives it) queried `category(categoryId: 1)` and got `CATEGORY_NOT_FOUND`.
 * That is what put "Failed to load menu" on every client-only page: the ~12
 * pages that render `<Header />` directly instead of the `<HeaderServer />`
 * wrapper, `/machines` among them (PWP-913).
 *
 * There is deliberately no default here. A missing provider is a wiring bug and
 * should surface as one, not as a silent request for the wrong category.
 */

import { createContext, useContext, type ReactNode } from 'react';

const BaseCategoryContext = createContext<number | null>(null);

export function BaseCategoryProvider({
  baseCategoryId,
  children,
}: {
  baseCategoryId: number;
  children: ReactNode;
}) {
  return (
    <BaseCategoryContext.Provider value={baseCategoryId}>
      {children}
    </BaseCategoryContext.Provider>
  );
}

/**
 * The catalog root category id for the active channel.
 *
 * @throws if rendered outside `<BaseCategoryProvider>` — see the note above on
 * why this is loud rather than defaulted.
 */
export function useBaseCategoryId(): number {
  const id = useContext(BaseCategoryContext);
  if (id === null) {
    throw new Error(
      'useBaseCategoryId must be used inside <BaseCategoryProvider> (see app/layout.tsx)'
    );
  }
  return id;
}
