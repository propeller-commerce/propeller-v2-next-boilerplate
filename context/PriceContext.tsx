'use client';

import React, { createContext, useContext, useCallback, useSyncExternalStore, ReactNode } from 'react';

/**
 * VAT-inclusive pricing preference.
 *
 * Stored in a plain (non-httpOnly) cookie so the SERVER can read it on every
 * request and render the right prices in the initial HTML — no client island
 * needed to flip the leading PDP price after hydration, and no first-paint
 * flash for users with the toggle on.
 *
 * The cookie is non-httpOnly because the toggle is set client-side (a Header
 * switch the user flips); httpOnly would prevent that. It carries no
 * authentication value, so this is safe.
 *
 * Cookie format: `'1'` (gross / VAT-inclusive) or `'0'` (net). Absent → net.
 */
const COOKIE_NAME = 'price_include_tax';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

interface PriceContextType {
  includeTax: boolean;
  setIncludeTax: (includeTax: boolean) => void;
}

const PriceContext = createContext<PriceContextType | undefined>(undefined);

function readCookie(): boolean {
  if (typeof document === 'undefined') return false;
  const match = document.cookie.match(/(?:^|;\s*)price_include_tax=([^;]+)/);
  return match?.[1] === '1';
}

function writeCookie(value: boolean): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=${value ? '1' : '0'}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

function subscribeToPriceToggle(callback: () => void) {
  const handler = () => callback();
  window.addEventListener('priceToggleChanged', handler);
  return () => {
    window.removeEventListener('priceToggleChanged', handler);
  };
}

export interface PriceProviderProps {
  /**
   * Server-seeded initial value. The root layout reads the cookie via
   * `next/headers` and forwards it so SSR and the client's first snapshot
   * agree — without this React would hydrate against `false` and flip to the
   * cookie value, producing a visible flash for gross-price users.
   */
  initialIncludeTax?: boolean;
  children: ReactNode;
}

export const PriceProvider: React.FC<PriceProviderProps> = ({ initialIncludeTax = false, children }) => {
  // `useSyncExternalStore`'s server snapshot is the SSR value. The client
  // snapshot reads the live cookie (in case it changed between the server
  // render and hydration, e.g. via another tab).
  const includeTax = useSyncExternalStore(
    subscribeToPriceToggle,
    readCookie,
    () => initialIncludeTax,
  );

  const setIncludeTax = useCallback((value: boolean) => {
    writeCookie(value);
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
