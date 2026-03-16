'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const STORAGE_KEY = 'price_include_tax';

interface PriceContextType {
  includeTax: boolean;
  setIncludeTax: (includeTax: boolean) => void;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export const PriceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [includeTax, setIncludeTaxState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored !== null ? stored === 'true' : true;
      } catch {
        return true;
      }
    }
    return true;
  });

  const setIncludeTax = useCallback((value: boolean) => {
    setIncludeTaxState(value);
    localStorage.setItem(STORAGE_KEY, String(value));
    window.dispatchEvent(new CustomEvent('priceToggleChanged', { detail: value }));
  }, []);

  // Sync when another component dispatches priceToggleChanged
  useEffect(() => {
    const handlePriceToggle = (e: Event) => {
      const value = (e as CustomEvent<boolean>).detail;
      setIncludeTaxState(value === true || (value as any) === 'true');
    };

    window.addEventListener('priceToggleChanged', handlePriceToggle);
    return () => window.removeEventListener('priceToggleChanged', handlePriceToggle);
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
