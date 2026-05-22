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
    // URL is the authoritative source for the current page language.
    // Reading localStorage here would return a stale value from a previous
    // session and cause a hydration mismatch → extra re-render → extra fetch.
    return detectLanguageFromPath(window.location.pathname);
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

    // Update URL prefix BEFORE dispatching the event so that getLanguageSnapshot()
    // (which reads the URL) returns the new language when triggered by the event.
    //
    // Pass the CURRENT `window.history.state`, not `null`: the App Router keeps
    // its navigation tree key there, and clobbering it with `null` desyncs the
    // router from the real URL — which breaks `<title>` updates on later
    // soft navigations.
    if (prev !== value && typeof window !== 'undefined') {
      const basePath = stripLanguagePrefix(window.location.pathname);
      const newPrefix = getLanguagePrefix(value);
      const newPath = basePath === '/' && newPrefix ? newPrefix : newPrefix + basePath;
      const search = window.location.search;
      window.history.replaceState(window.history.state, '', (newPath || '/') + search);
    }

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
