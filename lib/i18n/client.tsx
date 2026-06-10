'use client';
import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { getTranslationProvider } from './index';

interface TranslationsContextValue {
  locale: string;
}

const TranslationsContext = createContext<TranslationsContextValue | null>(null);

/**
 * Wraps the React tree so client components can read translations via useTranslations().
 * Must be mounted inside <LanguageProvider> — reads the current language from LanguageContext
 * so language changes automatically re-render consumers.
 */
export function TranslationsProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const value = useMemo<TranslationsContextValue>(
    () => ({ locale: language.toLowerCase() }),
    [language],
  );
  return (
    <TranslationsContext.Provider value={value}>
      {children}
    </TranslationsContext.Provider>
  );
}

/**
 * Read a namespace's translated strings for the current language.
 * Returns an empty object if the locale or namespace is unknown; downstream
 * components fall back to their English defaults via getLabel.
 *
 * The returned object is reference-stable per (locale, namespace) pair because
 * the file provider's registry is static — no extra useMemo needed at call sites.
 */
export function useTranslations(namespace: string): Record<string, string> {
  const ctx = useContext(TranslationsContext);
  const locale = ctx?.locale ?? 'nl';
  return getTranslationProvider().getNamespace(locale, namespace);
}
