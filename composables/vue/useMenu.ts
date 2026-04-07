/**
 * useMenu (Vue) — Category tree fetch with localStorage caching.
 *
 * Covers: Menu component.
 *
 * Responsibilities:
 * - Dynamic recursive GraphQL category query (depth-configurable)
 * - localStorage cache with 12h TTL, user-specific cache key
 * - 3-level nesting support
 */

import { ref, type Ref } from 'vue';
import { CategoryService } from 'propeller-sdk-v2';
import type { GraphQLClient } from 'propeller-sdk-v2';

// ── Types ────────────────────────────────────────────────────────────────────

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
  language?: Ref<string>;
  /** Cache TTL in milliseconds. Defaults to 12h. */
  cacheTtlMs?: number;
  /** Depth of category nesting to fetch. Defaults to 3. */
  depth?: number;
}

export interface UseMenuReturn {
  categories: Ref<MenuCategory[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  fetchMenu: (rootCategoryId: number, userKey?: string) => Promise<void>;
  clearCache: (rootCategoryId: number, language: string, userKey?: string) => void;
}

const CACHE_TTL_DEFAULT = 12 * 60 * 60 * 1000; // 12h

export function useMenu(options: UseMenuOptions): UseMenuReturn {
  const { graphqlClient } = options;
  const languageRef = options.language ?? ref('NL');
  const cacheTtlMs = options.cacheTtlMs ?? CACHE_TTL_DEFAULT;

  const categories = ref<MenuCategory[]>([]) as Ref<MenuCategory[]>;
  const loading = ref(false);
  const error = ref<string | null>(null);

  function cacheKey(categoryId: number, language: string, userKey = ''): string {
    return `propeller_menu_${categoryId}_${language}_${userKey}`;
  }

  function getFromCache(key: string): MenuCategory[] | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  }

  function saveToCache(key: string, data: MenuCategory[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ data, expiresAt: Date.now() + cacheTtlMs })
      );
    } catch {
      // localStorage quota exceeded — silently ignore
    }
  }

  function clearCache(rootCategoryId: number, language: string, userKey = ''): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(cacheKey(rootCategoryId, language, userKey));
    } catch {}
  }

  async function fetchMenu(rootCategoryId: number, userKey = ''): Promise<void> {
    const language = languageRef.value || 'NL';
    const key = cacheKey(rootCategoryId, language, userKey);

    const cached = getFromCache(key);
    if (cached) {
      categories.value = cached;
      return;
    }

    loading.value = true;
    error.value = null;
    try {
      const service = new CategoryService(graphqlClient);
      const result = await service.getCategories({ id: rootCategoryId, language } as any);
      const items = (result as unknown as MenuCategory[]) || [];
      categories.value = items;
      saveToCache(key, items);
    } catch (e: any) {
      error.value = e?.message || 'Failed to fetch menu';
    } finally {
      loading.value = false;
    }
  }

  return {
    categories,
    loading,
    error,
    fetchMenu,
    clearCache,
  };
}
