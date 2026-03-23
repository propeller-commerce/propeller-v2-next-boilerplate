'use client';

import React, { createContext, useContext, useCallback, useEffect, useSyncExternalStore, ReactNode } from 'react';
import { getLanguagePrefix, stripLanguagePrefix, detectLanguageFromPath } from '@/data/config';

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

  // On mount, sync localStorage with URL prefix (e.g., user navigated directly to /en/...)
  useEffect(() => {
    const urlLang = detectLanguageFromPath(window.location.pathname);
    const storedLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;
    if (urlLang !== storedLang) {
      localStorage.setItem(STORAGE_KEY, urlLang);
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: urlLang }));
    }
  }, []);

  const setLanguage = useCallback((value: string) => {
    const prev = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;
    localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: value }));

    // Update URL prefix when language changes
    if (prev !== value && typeof window !== 'undefined') {
      const basePath = stripLanguagePrefix(window.location.pathname);
      const newPrefix = getLanguagePrefix(value);
      const newPath = basePath === '/' && newPrefix ? newPrefix : newPrefix + basePath;
      const search = window.location.search;
      window.history.replaceState(null, '', (newPath || '/') + search);
    }
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
