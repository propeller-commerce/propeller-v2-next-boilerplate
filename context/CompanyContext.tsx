'use client';

import { Company } from '@propeller-commerce/propeller-sdk-v2';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const STORAGE_KEY = 'selected_company';
/**
 * Non-httpOnly cookie shadowing the localStorage selection so server-side
 * fetchers (`lib/server.ts:getServerInfra`) can scope queries by the active
 * company on the very first SSR render — without it the server would always
 * use the user's default company while the client uses the picked one,
 * silently desynchronising prices, assortment, and filter facets.
 */
const COOKIE_KEY = 'selected_company_id';

function writeCompanyCookie(companyId: number | undefined): void {
  if (typeof document === 'undefined') return;
  if (companyId === undefined) {
    document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; samesite=lax`;
    return;
  }
  // 30-day persistence; matches typical session cookie lifetime — long enough
  // to survive a tab close, short enough that an abandoned device eventually
  // drops the selection.
  document.cookie = `${COOKIE_KEY}=${companyId}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
}

interface CompanyContextType {
  selectedCompany: Company | null;
  setSelectedCompany: (company: Company) => void;
  clearSelectedCompany: () => void;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? (JSON.parse(stored) as Company) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const setSelectedCompany = useCallback((company: Company) => {
    setSelectedCompanyState(company);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(company));
    writeCompanyCookie(company.companyId);
    window.dispatchEvent(new CustomEvent('companySwitched', { detail: company }));
  }, []);

  const clearSelectedCompany = useCallback(() => {
    setSelectedCompanyState(null);
    localStorage.removeItem(STORAGE_KEY);
    writeCompanyCookie(undefined);
  }, []);

  // After hydration, mirror the localStorage-restored selection into the
  // cookie. The cookie can be missing (first visit on a new device, cookie
  // cleared while localStorage survived, …) while localStorage carries the
  // last pick — without this sync the next SSR render would scope to the
  // user's default company instead of what the UI is showing.
  useEffect(() => {
    if (selectedCompany?.companyId) writeCompanyCookie(selectedCompany.companyId);
  }, []);

  // Sync when another tab/component dispatches companySwitched
  useEffect(() => {
    const handleCompanySwitched = (e: Event) => {
      const company = (e as CustomEvent<Company>).detail;
      setSelectedCompanyState(company);
    };

    window.addEventListener('companySwitched', handleCompanySwitched);
    return () => window.removeEventListener('companySwitched', handleCompanySwitched);
  }, []);

  // Clear on logout
  useEffect(() => {
    const handleLogout = () => clearSelectedCompany();
    window.addEventListener('userLoggedOut', handleLogout);
    return () => window.removeEventListener('userLoggedOut', handleLogout);
  }, [clearSelectedCompany]);

  // Re-sync the selected company when the user is refreshed (e.g. after an
  // address edit calls refreshUser). `selectedCompany` is a separate snapshot
  // that the dashboard reads addresses + company info off — without this it
  // keeps the stale copy and shows the old addresses. Re-point it at the FRESH
  // company carried on the refreshed user, matching the current companyId
  // (multi-company contacts), else the user's default. State-only — this is the
  // same data the user already selected, so no `companySwitched` dispatch and
  // no localStorage churn beyond keeping the snapshot current.
  useEffect(() => {
    const handleUserRefreshed = (e: Event) => {
      const user = (e as CustomEvent<{ user: unknown }>).detail?.user as
        | { company?: Company; companies?: { items?: Company[] } }
        | null
        | undefined;
      if (!user) return;
      setSelectedCompanyState((current) => {
        const targetId = current?.companyId;
        const candidates: Company[] = [
          ...(user.companies?.items ?? []),
          ...(user.company ? [user.company] : []),
        ];
        // Prefer the FRESH copy of the currently-selected company (keeps the
        // user's choice, just with up-to-date data). If the current selection
        // isn't one of THIS user's companies — e.g. a stale `selected_company`
        // left over from a previously logged-in identity — fall back to their
        // default company. This is what stops `fetchActiveCart` from filtering
        // `carts` by a company the user isn't a member of → "Unauthorized use
        // of companyIds".
        const next =
          (targetId != null && candidates.find((c) => c?.companyId === targetId)) ||
          user.company ||
          null;
        // Reconcile localStorage + cookie with the resolved selection so a
        // later reload (which reads it back) doesn't resurrect the stale
        // company, and the server-side scoping cookie tracks the change.
        try {
          if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          else localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* storage full / unavailable — in-memory state still updates */
        }
        writeCompanyCookie(next?.companyId);
        return next;
      });
    };
    window.addEventListener('userRefreshed', handleUserRefreshed);
    return () => window.removeEventListener('userRefreshed', handleUserRefreshed);
  }, []);

  return (
    <CompanyContext.Provider value={{ selectedCompany, setSelectedCompany, clearSelectedCompany }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
