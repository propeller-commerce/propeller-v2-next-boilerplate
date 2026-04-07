/**
 * useMenu (React) — Category tree fetch with localStorage caching.
 *
 * React mirror of vue/useMenu.ts.
 */

import { useState, useCallback } from 'react';
import { CategoryService } from 'propeller-sdk-v2';
import type { GraphQLClient } from 'propeller-sdk-v2';

export interface MenuCategory {
  id: number;
  name: string;
  slug?: string;
  url?: string;
  children?: MenuCategory[];
  [key: string]: any;
}

export interface UseMenuOptions {
  graphqlClient: GraphQLClient;
  language?: string;
  cacheTtlMs?: number;
}

export interface UseMenuReturn {
  categories: MenuCategory[];
  loading: boolean;
  error: string | null;
  fetchMenu: (rootCategoryId: number, userKey?: string) => Promise<void>;
  clearCache: (rootCategoryId: number, language: string, userKey?: string) => void;
}

const CACHE_TTL_DEFAULT = 12 * 60 * 60 * 1000;

export function useMenu(options: UseMenuOptions): UseMenuReturn {
  const { graphqlClient } = options;
  const language = options.language || 'NL';
  const cacheTtlMs = options.cacheTtlMs ?? CACHE_TTL_DEFAULT;

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function cacheKey(categoryId: number, lang: string, userKey = ''): string {
    return `propeller_menu_${categoryId}_${lang}_${userKey}`;
  }

  function getFromCache(key: string): MenuCategory[] | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() > parsed.expiresAt) { localStorage.removeItem(key); return null; }
      return parsed.data;
    } catch { return null; }
  }

  function saveToCache(key: string, data: MenuCategory[]): void {
    if (typeof window === 'undefined') return;
    try { localStorage.setItem(key, JSON.stringify({ data, expiresAt: Date.now() + cacheTtlMs })); } catch {}
  }

  const clearCache = useCallback((rootCategoryId: number, lang: string, userKey = ''): void => {
    if (typeof window === 'undefined') return;
    try { localStorage.removeItem(cacheKey(rootCategoryId, lang, userKey)); } catch {}
  }, []);

  const fetchMenu = useCallback(async (rootCategoryId: number, userKey = ''): Promise<void> => {
    const key = cacheKey(rootCategoryId, language, userKey);
    const cached = getFromCache(key);
    if (cached) { setCategories(cached); return; }
    setLoading(true); setError(null);
    try {
      const service = new CategoryService(graphqlClient);
      const result = await service.getCategories({ id: rootCategoryId, language } as any);
      const items = (result as unknown as MenuCategory[]) || [];
      setCategories(items);
      saveToCache(key, items);
    } catch (e: any) { setError(e?.message || 'Failed to fetch menu'); }
    finally { setLoading(false); }
  }, [graphqlClient, language, cacheTtlMs]);

  return { categories, loading, error, fetchMenu, clearCache };
}
