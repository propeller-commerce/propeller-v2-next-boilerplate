'use client';

import React, { createContext, useContext, useCallback, useSyncExternalStore, ReactNode } from 'react';

const STORAGE_KEY = 'preferred_language';
const DEFAULT_LANGUAGE = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL';

interface LanguageContextType {
  language: string;
  setLanguage: (language: string) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function subscribeToLanguageChange(callback: () => void) {
  const handler = () => callback();
  window.addEventListener('languageChanged', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('languageChanged', handler);
    window.removeEventListener('storage', handler);
  };
}

function getLanguageSnapshot(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function getLanguageServerSnapshot(): string {
  return DEFAULT_LANGUAGE;
}

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const language = useSyncExternalStore(
    subscribeToLanguageChange,
    getLanguageSnapshot,
    getLanguageServerSnapshot,
  );

  const setLanguage = useCallback((value: string) => {
    localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: value }));
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
