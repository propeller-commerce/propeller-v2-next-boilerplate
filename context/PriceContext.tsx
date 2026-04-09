'use client';

import React, { createContext, useContext, useCallback, useSyncExternalStore, ReactNode } from 'react';

const STORAGE_KEY = 'price_include_tax';

interface PriceContextType {
  includeTax: boolean;
  setIncludeTax: (includeTax: boolean) => void;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

function subscribeToPriceToggle(callback: () => void) {
  const handler = () => callback();
  window.addEventListener('priceToggleChanged', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('priceToggleChanged', handler);
    window.removeEventListener('storage', handler);
  };
}

function getIncludeTaxSnapshot(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored !== null ? stored === 'true' : false;
  } catch {
    return false;
  }
}

function getIncludeTaxServerSnapshot(): boolean {
  return false;
}

export const PriceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const includeTax = useSyncExternalStore(
    subscribeToPriceToggle,
    getIncludeTaxSnapshot,
    getIncludeTaxServerSnapshot,
  );

  const setIncludeTax = useCallback((value: boolean) => {
    localStorage.setItem(STORAGE_KEY, String(value));
    window.dispatchEvent(new CustomEvent('priceToggleChanged', { detail: value }));
  }, []);

  return (
    <PriceContext.Provider value={{ includeTax, setIncludeTax }}>
      {children}
    </PriceContext.Provider>
  );
};

export const usePrice = (): PriceContextType => {
  const context = useContext(PriceContext);
  if (context === undefined) {
    throw new Error('usePrice must be used within a PriceProvider');
  }
  return context;
};
