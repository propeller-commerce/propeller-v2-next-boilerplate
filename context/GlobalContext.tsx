'use client';

import { createContext, useContext } from 'react';
import type { CmsGlobal } from '@/lib/cms/types';

const GlobalContext = createContext<CmsGlobal | null>(null);

export function GlobalProvider({
  globalData,
  children,
}: {
  globalData: CmsGlobal | null;
  children: React.ReactNode;
}) {
  return (
    <GlobalContext.Provider value={globalData}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobal(): CmsGlobal | null {
  return useContext(GlobalContext);
}
