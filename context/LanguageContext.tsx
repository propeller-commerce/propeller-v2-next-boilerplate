'use client';

import React, { createContext, useContext, useCallback, useEffect, useSyncExternalStore, ReactNode } from 'react';
import { getLanguagePrefix, stripLanguagePrefix, detectLanguageFromPath } from '@/data/config';

const STORAGE_KEY = 'preferred_language';
const DEFAULT_LANGUAGE = process.env.NEXT_PUBLIC_DEFAULT_LANGUAGE || 'NL';

/** Mirror the choice into a cookie — Server Components can't read localStorage. */
function writeLanguageCookie(value: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${STORAGE_KEY}=${value}; path=/; max-age=31536000; samesite=lax`;
}

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

function readLanguageCookie(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)preferred_language=([^;]+)/);
  return match?.[1]?.toUpperCase();
}

function getLanguageSnapshot(): string {
  try {
    // A prefixed URL is authoritative; otherwise fall back to the cookie so the
    // choice survives navigation to unprefixed routes. The server resolves the
    // same order, so this matches what it rendered.
    const fromPath = detectLanguageFromPath(window.location.pathname);
    if (fromPath !== DEFAULT_LANGUAGE) return fromPath;
    return readLanguageCookie() || DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export const LanguageProvider: React.FC<{ children: ReactNode; initialLanguage?: string }> = ({
  children,
  initialLanguage,
}) => {
  // Must match what the server rendered, or hydration falls back to default.
  const serverSnapshot = useCallback(
    () => (initialLanguage || DEFAULT_LANGUAGE).toUpperCase(),
    [initialLanguage],
  );
  const language = useSyncExternalStore(
    subscribeToLanguageChange,
    getLanguageSnapshot,
    serverSnapshot,
  );

  // Sync storage from a PREFIXED url only (e.g. a deep link to /en/...). An
  // unprefixed path is the default language for that request, not a choice —
  // syncing from it reset the preference on every navigation.
  useEffect(() => {
    const urlLang = detectLanguageFromPath(window.location.pathname);
    if (urlLang === DEFAULT_LANGUAGE) return;
    const storedLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;
    if (urlLang !== storedLang) {
      localStorage.setItem(STORAGE_KEY, urlLang);
      writeLanguageCookie(urlLang);
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: urlLang }));
    }
  }, []);

  const setLanguage = useCallback((value: string) => {
    const prev = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANGUAGE;
    localStorage.setItem(STORAGE_KEY, value);
    writeLanguageCookie(value);

    // Navigate, not replaceState — SSR content is fetched per request language.
    if (prev !== value && typeof window !== 'undefined') {
      const basePath = stripLanguagePrefix(window.location.pathname);
      const newPrefix = getLanguagePrefix(value);
      const newPath = basePath === '/' && newPrefix ? newPrefix : newPrefix + basePath;
      window.location.assign((newPath || '/') + window.location.search);
      return;
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
