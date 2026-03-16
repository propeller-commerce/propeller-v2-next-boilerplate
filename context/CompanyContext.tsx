'use client';

import { Company } from 'propeller-sdk-v2';
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const STORAGE_KEY = 'selected_company';

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
    window.dispatchEvent(new CustomEvent('companySwitched', { detail: company }));
  }, []);

  const clearSelectedCompany = useCallback(() => {
    setSelectedCompanyState(null);
    localStorage.removeItem(STORAGE_KEY);
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
